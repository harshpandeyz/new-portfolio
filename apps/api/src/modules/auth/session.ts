import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";

import { COOKIE_NAMES, config } from "../../config.js";
import { prisma } from "../../db/prisma.js";

export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000;
/** Idle timeout: session expires if inactive this long (absolute cap still applies). */
export const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
/** Sensitive actions require a fresh authentication within this window. */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", config.sessionSecret).update(value).digest("hex");
}

/** Cryptographically-bound CSRF token (double-submit + HMAC signature). */
export function issueCsrfToken(): string {
  const nonce = randomBytes(24).toString("hex");
  return `${nonce}.${sign(nonce)}`;
}

export function verifyCsrf(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length > 200 || headerToken.length > 200) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const [nonce, signature] = headerToken.split(".");
  if (!nonce || !signature) return false;
  const expected = sign(nonce);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  sessionId: string;
  /** Fresh-auth timestamp for step-up checks. */
  reauthAt: number;
  totpEnabled: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    admin?: AuthenticatedUser;
    sessionId?: string;
  }
}

function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    // Cross-origin SPAs need the session cookie on credentialed XHR. Secure
    // is required by browsers when SameSite=None is used.
    sameSite: config.isProd ? ("none" as const) : ("lax" as const),
    secure: config.isProd,
    path: "/",
    maxAge: maxAgeSec,
  } as const;
}

/** Creates a DB-backed session and sets HTTP-only cookies. Rotates: each login gets a fresh token. */
export async function createSession(
  userId: string,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
      ip: req.ip,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      lastSeenAt: now,
      reauthAt: now,
    },
  });

  reply.setCookie(COOKIE_NAMES.session, token, sessionCookieOptions(SESSION_TTL_MS / 1000));
  const csrfToken = issueCsrfToken();
  reply.setCookie(COOKIE_NAMES.csrf, csrfToken, {
    ...sessionCookieOptions(SESSION_TTL_MS / 1000),
    httpOnly: false, // must be readable by the SPA for double-submit
  });
  return csrfToken;
}

/** Resolves the current admin from the session cookie (or null). Enforces expiry, idle, revocation. */
export async function resolveSessionUser(req: FastifyRequest): Promise<AuthenticatedUser | null> {
  const token = req.cookies[COOKIE_NAMES.session];
  if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // sliding activity refresh (fire-and-forget, throttled to 5m to avoid a DB write per request)
  if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    void prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    displayName: session.user.displayName,
    sessionId: session.id,
    reauthAt: session.reauthAt.getTime(),
    totpEnabled: session.user.totpEnabled,
  };
}

/** Step-up: is the current session freshly authenticated? */
export function isFreshlyAuthenticated(user: AuthenticatedUser | undefined, windowMs = REAUTH_WINDOW_MS): boolean {
  if (!user) return false;
  return Date.now() - user.reauthAt < windowMs;
}

export async function touchReauth(sessionId: string): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { reauthAt: new Date() } }).catch(() => undefined);
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies[COOKIE_NAMES.session];
  if (token && token.length === 64) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  }
  const clearOpts = { path: "/", sameSite: config.isProd ? ("none" as const) : ("lax" as const), secure: config.isProd } as const;
  reply.clearCookie(COOKIE_NAMES.session, clearOpts);
  reply.clearCookie(COOKIE_NAMES.csrf, clearOpts);
}

export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  let os = "Unknown OS";
  if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";
  return `${browser} · ${os}`;
}

/** Purges expired + old-revoked sessions — call periodically. */
export async function purgeExpiredSessions(): Promise<void> {
  const now = new Date();
  await prisma.session
    .deleteMany({ where: { expiresAt: { lt: now } } })
    .catch(() => undefined);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  await prisma.session
    .deleteMany({ where: { revokedAt: { lt: weekAgo } } })
    .catch(() => undefined);
}
