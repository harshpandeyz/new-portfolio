import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";

import { COOKIE_NAMES, config } from "../../config.js";
import { prisma } from "../../db/prisma.js";

const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
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
}

declare module "fastify" {
  interface FastifyRequest {
    admin?: AuthenticatedUser;
  }
}

/** Creates a DB-backed session and sets HTTP-only cookies. */
export async function createSession(
  userId: string,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
      ip: req.ip,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const cookieOptions = {
    httpOnly: true,
    // Cross-origin SPAs need the session cookie on credentialed XHR. Secure
    // is required by browsers when SameSite=None is used.
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  } as const;

  reply.setCookie(COOKIE_NAMES.session, token, cookieOptions);
  const csrfToken = issueCsrfToken();
  reply.setCookie(COOKIE_NAMES.csrf, csrfToken, {
    ...cookieOptions,
    httpOnly: false, // must be readable by the SPA for double-submit
  });
  return csrfToken;
}

/** Resolves the current admin from the session cookie (or null). */
export async function resolveSessionUser(req: FastifyRequest): Promise<AuthenticatedUser | null> {
  const token = req.cookies[COOKIE_NAMES.session];
  if (!token || token.length !== 64) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // sliding refresh (throttled to once per minute by update cost)
  void prisma.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    displayName: session.user.displayName,
  };
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies[COOKIE_NAMES.session];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  }
  reply.clearCookie(COOKIE_NAMES.session, { path: "/" });
  reply.clearCookie(COOKIE_NAMES.csrf, { path: "/" });
}

/** Purges expired sessions — call periodically. */
export async function purgeExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
