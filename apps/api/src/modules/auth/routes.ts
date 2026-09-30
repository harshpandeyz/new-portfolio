import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { COOKIE_NAMES, config } from "../../config.js";
import { HttpError, assertAllowedOrigin, audit, clientIp, noStore, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { bcryptCompare, bcryptHash } from "./password.js";
import {
  REAUTH_WINDOW_MS,
  createSession,
  destroySession,
  describeDevice,
  hashToken,
  isFreshlyAuthenticated,
  issueCsrfToken,
  resolveSessionUser,
  touchReauth,
  verifyCsrf as verify,
} from "./session.js";
import { normalizeRole, requireAdminRole } from "./rbac.js";
import {
  changePasswordSchema,
  loginSchema,
  reauthSchema,
  strongPasswordSchema,
  twoFactorSetupVerifySchema,
  twoFactorVerifySchema,
} from "@hp/shared";
import { prisma } from "../../db/prisma.js";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  totpQrDataUrl,
  totpUri,
  verifyRecoveryCodeHash,
  verifyTotp,
} from "./totp.js";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_IP = 8;
const LOGIN_MAX_ACCOUNT = 5;
const TOTP_WINDOW_MS = 10 * 60 * 1000;
const TOTP_MAX = 8;

/** Backward-compatible: ADMIN-only guard used by older imports. Prefer RBAC helpers for new code. */
export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  await requireAdminRole(req, _reply);
}

/** Any authenticated user (ADMIN | EDITOR | VIEWER). */
export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveSessionUser(req);
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  req.admin = user;
}

/** Mutating requests must present the matching double-submit CSRF token + allowed Origin. */
export async function requireCsrf(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  assertAllowedOrigin(req);
  const cookieToken = req.cookies[COOKIE_NAMES.csrf];
  const headerToken = req.headers["x-csrf-token"];
  if (!verify(cookieToken, typeof headerToken === "string" ? headerToken : undefined)) {
    throw new HttpError(403, "CSRF", "Missing or invalid CSRF token");
  }
}

export { requireAdminRole, normalizeRole };
export { bcryptHash };

// ── login challenge (password step -> 2FA step), stateless HMAC ──
// Challenges are single-use: consumed nonces are remembered until expiry
// so a captured challenge+code cannot mint a second session in the TOTP window.
const consumedChallenges = new Map<string, number>();

function signChallenge(payload: string): string {
  return createHmac("sha256", config.sessionSecret).update(`login-challenge:${payload}`).digest("hex");
}

function issueLoginChallenge(userId: string): string {
  const expires = Date.now() + 5 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${userId}.${expires}.${nonce}`;
  return `${payload}.${signChallenge(payload)}`;
}

function verifyLoginChallenge(challenge: string): string | null {
  const parts = challenge.split(".");
  if (parts.length !== 4) return null;
  const [userId, expiresRaw, nonce, sig] = parts as [string, string, string, string];
  if (!userId || !expiresRaw || !nonce || !sig) return null;
  if (userId.length > 64 || nonce.length !== 32) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  if (consumedChallenges.has(nonce)) return null;
  const payload = `${userId}.${expires}.${nonce}`;
  const expected = signChallenge(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

function consumeLoginChallenge(challenge: string): void {
  const nonce = challenge.split(".")[2];
  if (!nonce) return;
  consumedChallenges.set(nonce, Date.now() + 5 * 60 * 1000);
  // opportunistic cleanup
  if (consumedChallenges.size > 1000) {
    const now = Date.now();
    for (const [k, exp] of consumedChallenges) {
      if (exp < now) consumedChallenges.delete(k);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Private auth responses must never be cached.
  app.addHook("onSend", async (req, reply) => {
    if (req.url.startsWith("/api/auth")) noStore(reply);
  });

  app.post("/login", async (req, reply) => {
    const ip = clientIp(req);
    const ipLimit = rateLimit(`login:${ip}`, LOGIN_MAX_IP, LOGIN_WINDOW_MS);
    if (!ipLimit.allowed) {
      reply.header("retry-after", ipLimit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", `Too many attempts. Retry in ${ipLimit.retryAfterSeconds}s.`);
    }

    const { email, password } = parseBody(req, loginSchema);
    const normalizedEmail = email.toLowerCase();

    const acctLimit = rateLimit(`login:acct:${normalizedEmail}`, LOGIN_MAX_ACCOUNT, LOGIN_WINDOW_MS);
    if (!acctLimit.allowed) {
      reply.header("retry-after", acctLimit.retryAfterSeconds);
      // Generic message — do not reveal per-account throttle state distinctly.
      throw new HttpError(429, "RATE_LIMITED", `Too many attempts. Retry in ${acctLimit.retryAfterSeconds}s.`);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await audit(req, "AUTH_LOGIN_FAILURE", "user", user.id, { reason: "locked" });
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Constant-shape response: always compare against a hash to avoid user enumeration timing.
    const hash = user?.passwordHash ?? "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpQ0N1Jtq8mz1d1mZQ1eVRnFQF9mS";
    const ok = await bcryptCompare(password, hash);

    if (!user || !ok) {
      // Small uniform delay blunts online brute force without harming UX.
      await sleep(350);
      if (user) {
        const attempts = (user.failedLoginAttempts ?? 0) + 1;
        const lockedUntil = attempts >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await prisma.user
          .update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil } })
          .catch(() => undefined);
      }
      await audit(req, "AUTH_LOGIN_FAILURE", "user", null, { email: normalizedEmail });
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (user.totpEnabled) {
      const challenge = issueLoginChallenge(user.id);
      await audit(req, "AUTH_LOGIN_2FA_REQUIRED", "user", user.id);
      reply.code(202);
      return { ok: false, requires2FA: true, challenge };
    }

    const csrfToken = await createSession(user.id, req, reply);
    await prisma.user
      .update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })
      .catch(() => undefined);
    await audit(req, "AUTH_LOGIN_SUCCESS", "user", user.id);
    await audit(req, "AUTH_SESSION_CREATED", "session", null, { email: user.email });
    return {
      ok: true,
      csrfToken,
      user: { email: user.email, role: user.role, displayName: user.displayName, totpEnabled: user.totpEnabled },
    };
  });

  app.post("/login/2fa", async (req, reply) => {
    const ip = clientIp(req);
    const { code, challenge } = parseBody(req, twoFactorVerifySchema);
    if (!challenge) throw new HttpError(400, "VALIDATION_ERROR", "Login challenge is required");
    const userId = verifyLoginChallenge(challenge);
    if (!userId) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const limit = rateLimit(`2fa:${ip}:${userId}`, TOTP_MAX, TOTP_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", `Too many attempts. Retry in ${limit.retryAfterSeconds}s.`);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { recoveryCodes: true } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      await sleep(350);
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const secret = decryptSecret(user.totpSecret);
    let ok = secret ? verifyTotp(code, secret) : false;
    let usedRecoveryId: string | null = null;
    if (!ok) {
      const normalized = code.trim().toUpperCase();
      for (const rc of user.recoveryCodes) {
        if (!rc.usedAt && verifyRecoveryCodeHash(normalized, rc.codeHash)) {
          // Conditional claim — concurrent uses of the same code: only one wins.
          const claimed = await prisma.recoveryCode
            .updateMany({ where: { id: rc.id, usedAt: null }, data: { usedAt: new Date() } })
            .catch(() => ({ count: 0 }));
          if (claimed.count > 0) {
            ok = true;
            usedRecoveryId = rc.id;
          }
          break;
        }
      }
    }
    if (!ok) {
      await sleep(350);
      await audit(req, "AUTH_LOGIN_FAILURE", "user", user.id, { reason: "2fa" });
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    consumeLoginChallenge(challenge);
    if (usedRecoveryId) {
      await audit(req, "AUTH_RECOVERY_CODE_USED", "user", user.id);
    }
    const csrfToken = await createSession(user.id, req, reply);
    await prisma.user
      .update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })
      .catch(() => undefined);
    await audit(req, "AUTH_LOGIN_SUCCESS", "user", user.id, { method: usedRecoveryId ? "recovery-code" : "totp" });
    await audit(req, "AUTH_SESSION_CREATED", "session", null, { email: user.email });
    return {
      ok: true,
      csrfToken,
      user: { email: user.email, role: user.role, displayName: user.displayName, totpEnabled: true },
    };
  });

  app.get("/csrf", { preHandler: [requireAuth] }, async (_req, reply) => {
    const csrfToken = issueCsrfToken();
    reply.setCookie(COOKIE_NAMES.csrf, csrfToken, {
      httpOnly: false,
      sameSite: config.isProd ? "none" : "lax",
      secure: config.isProd,
      path: "/",
      maxAge: config.sessionTtlDays * 24 * 60 * 60,
    });
    return { csrfToken };
  });

  app.post("/logout", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const userId = req.admin?.id;
    await destroySession(req, reply);
    if (userId) await audit(req, "AUTH_LOGOUT", "user", userId);
    return { ok: true };
  });

  app.get("/me", { preHandler: [requireAuth] }, async (req, reply) => {
    noStore(reply);
    const u = req.admin!;
    const db = await prisma.user.findUnique({ where: { id: u.id }, select: { totpEnabled: true, email: true, role: true, displayName: true } });
    return {
      user: {
        id: u.id,
        email: db?.email ?? u.email,
        role: db?.role ?? u.role,
        displayName: db?.displayName ?? u.displayName,
        totpEnabled: db?.totpEnabled ?? false,
      },
    };
  });

  // ── password ──
  app.post("/change-password", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    const limit = rateLimit(`pwd:${u.id}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many password attempts. Try again later.");
    }
    const { currentPassword, newPassword } = parseBody(req, changePasswordSchema);
    const db = await prisma.user.findUnique({ where: { id: u.id } });
    if (!db || !(await bcryptCompare(currentPassword, db.passwordHash))) {
      await sleep(350);
      await audit(req, "AUTH_REAUTH_FAILURE", "user", u.id, { reason: "password-change" });
      throw new HttpError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    }
    if (await bcryptCompare(newPassword, db.passwordHash)) {
      throw new HttpError(400, "WEAK_PASSWORD", "New password must differ from the current password");
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcryptHash(newPassword), passwordChangedAt: new Date() },
    });
    // Invalidate all other sessions; keep the current one but mark it freshly authenticated.
    const token = req.cookies[COOKIE_NAMES.session];
    const currentHash = token ? hashToken(token) : null;
    await prisma.session.updateMany({
      where: { userId: u.id, ...(currentHash ? { NOT: { tokenHash: currentHash } } : {}) },
      data: { revokedAt: new Date() },
    });
    await touchReauth(u.sessionId);
    await audit(req, "AUTH_PASSWORD_CHANGED", "user", u.id);
    return { ok: true };
  });

  // ── step-up reauthentication ──
  app.post("/reauth", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    const limit = rateLimit(`reauth:${u.id}:${clientIp(req)}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later.");
    }
    const body = (req.body ?? {}) as { password?: string; code?: string };
    const parsed = reauthSchema.safeParse({ password: body.password ?? "" });
    if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Password is required");
    const db = await prisma.user.findUnique({ where: { id: u.id }, include: { recoveryCodes: true } });
    if (!db || !(await bcryptCompare(parsed.data.password, db.passwordHash))) {
      await sleep(350);
      await audit(req, "AUTH_REAUTH_FAILURE", "user", u.id);
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    if (db.totpEnabled) {
      const code = typeof body.code === "string" ? body.code : "";
      const secret = db.totpSecret ? decryptSecret(db.totpSecret) : null;
      let ok = secret ? verifyTotp(code, secret) : false;
      let usedRecoveryId: string | null = null;
      if (!ok) {
        for (const rc of db.recoveryCodes) {
          if (!rc.usedAt && verifyRecoveryCodeHash(code.trim().toUpperCase(), rc.codeHash)) {
            const claimed = await prisma.recoveryCode
              .updateMany({ where: { id: rc.id, usedAt: null }, data: { usedAt: new Date() } })
              .catch(() => ({ count: 0 }));
            if (claimed.count > 0) {
              ok = true;
              usedRecoveryId = rc.id;
            }
            break;
          }
        }
      }
      if (!ok) {
        await sleep(350);
        await audit(req, "AUTH_REAUTH_FAILURE", "user", u.id, { reason: "2fa" });
        throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }
      if (usedRecoveryId) {
        await audit(req, "AUTH_RECOVERY_CODE_USED", "user", u.id);
      }
    }
    await touchReauth(u.sessionId);
    await audit(req, "AUTH_REAUTH_SUCCESS", "user", u.id);
    return { ok: true, reauthAt: new Date().toISOString() };
  });

  // ── sessions ──
  app.get("/sessions", { preHandler: [requireAuth] }, async (req, reply) => {
    noStore(reply);
    const u = req.admin!;
    const sessions = await prisma.session.findMany({
      where: { userId: u.id },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
    });
    const token = req.cookies[COOKIE_NAMES.session];
    const currentHash = token ? hashToken(token) : null;
    return {
      sessions: sessions
        .filter((s) => !s.revokedAt && s.expiresAt.getTime() > Date.now())
        .map((s) => ({
          id: s.id,
          current: currentHash ? s.tokenHash === currentHash : s.id === u.sessionId,
          ip: s.ip,
          userAgent: s.userAgent ? s.userAgent.slice(0, 160) : null,
          device: describeDevice(s.userAgent),
          createdAt: s.createdAt.toISOString(),
          lastSeenAt: s.lastSeenAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          revoked: Boolean(s.revokedAt),
        })),
    };
  });

  app.delete("/sessions/:id", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    const { id } = req.params as { id: string };
    const target = await prisma.session.findFirst({ where: { id, userId: u.id } });
    if (!target) throw new HttpError(404, "NOT_FOUND", "Session not found");
    await prisma.session.update({ where: { id }, data: { revokedAt: new Date() } }).catch(() => undefined);
    await audit(req, "AUTH_SESSION_REVOKED", "session", id, { current: id === u.sessionId });
    if (id === u.sessionId) {
      await destroySession(req, reply);
    }
    return { ok: true };
  });

  app.post("/sessions/revoke-others", { preHandler: [requireAuth, requireCsrf] }, async (req) => {
    const u = req.admin!;
    await prisma.session.updateMany({ where: { userId: u.id, NOT: { id: u.sessionId } }, data: { revokedAt: new Date() } });
    await audit(req, "AUTH_SESSION_REVOKED", "session", null, { scope: "others" });
    return { ok: true };
  });

  app.post("/sessions/revoke-all", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    await prisma.session.updateMany({ where: { userId: u.id }, data: { revokedAt: new Date() } });
    await audit(req, "AUTH_SESSION_REVOKED", "session", null, { scope: "all" });
    await destroySession(req, reply);
    return { ok: true };
  });

  // ── 2FA ──
  app.get("/2fa/status", { preHandler: [requireAuth] }, async (req, reply) => {
    noStore(reply);
    const u = req.admin!;
    const db = await prisma.user.findUnique({
      where: { id: u.id },
      select: { totpEnabled: true, totpEnabledAt: true, recoveryCodes: { select: { id: true, usedAt: true } } },
    });
    return {
      enabled: db?.totpEnabled ?? false,
      enabledAt: db?.totpEnabledAt?.toISOString() ?? null,
      recoveryRemaining: db ? db.recoveryCodes.filter((c) => !c.usedAt).length : 0,
    };
  });

  app.post("/2fa/setup", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    const limit = rateLimit(`2fa-setup:${u.id}`, 3, 15 * 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later.");
    }
    const db = await prisma.user.findUnique({ where: { id: u.id } });
    if (!db) throw new HttpError(404, "NOT_FOUND", "User not found");
    if (db.totpEnabled) throw new HttpError(409, "CONFLICT", "Two-factor authentication is already enabled");
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: u.id }, data: { totpSecret: encryptSecret(secret) } });
    const uri = totpUri(secret, db.email);
    const qr = await totpQrDataUrl(uri).catch(() => null);
    await audit(req, "AUTH_2FA_SETUP_STARTED", "user", u.id);
    return { secret, otpauthUrl: uri, qrDataUrl: qr };
  });

  app.post("/2fa/setup/cancel", { preHandler: [requireAuth, requireCsrf] }, async (req) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    const db = await prisma.user.findUnique({ where: { id: u.id }, select: { totpEnabled: true, totpSecret: true } });
    if (!db) throw new HttpError(404, "NOT_FOUND", "User not found");
    if (db.totpEnabled) throw new HttpError(409, "CONFLICT", "Two-factor authentication is already enabled");
    if (!db.totpSecret) return { ok: true, cancelled: false };
    await prisma.user.update({ where: { id: u.id }, data: { totpSecret: null } });
    await audit(req, "AUTH_2FA_SETUP_CANCELLED", "user", u.id);
    return { ok: true, cancelled: true };
  });

  app.post("/2fa/enable", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    const limit = rateLimit(`2fa-enable:${u.id}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later.");
    }
    const { code } = parseBody(req, twoFactorSetupVerifySchema);
    const db = await prisma.user.findUnique({ where: { id: u.id } });
    if (!db?.totpSecret) throw new HttpError(400, "NO_PENDING_SETUP", "Start 2FA setup first");
    if (db.totpEnabled) throw new HttpError(409, "CONFLICT", "Two-factor authentication is already enabled");
    const secret = decryptSecret(db.totpSecret);
    if (!secret || !verifyTotp(code, secret)) {
      await audit(req, "AUTH_REAUTH_FAILURE", "user", u.id, { reason: "2fa-enable" });
      throw new HttpError(401, "INVALID_CODE", "Invalid verification code");
    }
    const codes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { totpEnabled: true, totpEnabledAt: new Date() } }),
      prisma.recoveryCode.deleteMany({ where: { userId: u.id } }),
      prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, codeHash: hashRecoveryCode(c) })) }),
    ]);
    await audit(req, "AUTH_2FA_ENABLED", "user", u.id);
    return { ok: true, recoveryCodes: codes };
  });

  app.post("/2fa/disable", { preHandler: [requireAuth, requireCsrf] }, async (req) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    const db = await prisma.user.findUnique({ where: { id: u.id } });
    if (!db?.totpEnabled) throw new HttpError(400, "NOT_ENABLED", "Two-factor authentication is not enabled");
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { totpEnabled: false, totpSecret: null, totpEnabledAt: null } }),
      prisma.recoveryCode.deleteMany({ where: { userId: u.id } }),
    ]);
    await audit(req, "AUTH_2FA_DISABLED", "user", u.id);
    return { ok: true };
  });

  app.post("/2fa/recovery/regenerate", { preHandler: [requireAuth, requireCsrf] }, async (req, reply) => {
    const u = req.admin!;
    if (!isFreshlyAuthenticated(u, REAUTH_WINDOW_MS)) {
      throw new HttpError(403, "REAUTH_REQUIRED", "Recent authentication required. Re-enter your password first.");
    }
    const limit = rateLimit(`2fa-regen:${u.id}`, 3, 15 * 60 * 1000);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later.");
    }
    const db = await prisma.user.findUnique({ where: { id: u.id } });
    if (!db?.totpEnabled) throw new HttpError(400, "NOT_ENABLED", "Enable two-factor authentication first");
    const codes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.recoveryCode.deleteMany({ where: { userId: u.id } }),
      prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, codeHash: hashRecoveryCode(c) })) }),
    ]);
    await audit(req, "AUTH_RECOVERY_CODES_REGENERATED", "user", u.id);
    return { ok: true, recoveryCodes: codes };
  });

  app.get("/security/overview", { preHandler: [requireAuth] }, async (req, reply) => {
    noStore(reply);
    const u = req.admin!;
    const db = await prisma.user.findUnique({
      where: { id: u.id },
      select: {
        email: true,
        role: true,
        displayName: true,
        passwordChangedAt: true,
        totpEnabled: true,
        totpEnabledAt: true,
        lastLoginAt: true,
        recoveryCodes: { select: { usedAt: true } },
        sessions: { select: { id: true, revokedAt: true, expiresAt: true } },
      },
    });
    if (!db) throw new HttpError(404, "NOT_FOUND", "User not found");
    const now = Date.now();
    return {
      email: db.email,
      role: db.role,
      displayName: db.displayName,
      passwordChangedAt: db.passwordChangedAt?.toISOString() ?? null,
      totpEnabled: db.totpEnabled,
      totpEnabledAt: db.totpEnabledAt?.toISOString() ?? null,
      recoveryCodesRemaining: db.recoveryCodes.filter((c) => !c.usedAt).length,
      activeSessions: db.sessions.filter((s) => !s.revokedAt && s.expiresAt.getTime() > now).length,
      lastLoginAt: db.lastLoginAt?.toISOString() ?? null,
    };
  });

  // Validate without side effects (used by change-password UX to surface policy early).
  app.post("/password/validate", { preHandler: [requireAuth, requireCsrf] }, async (req) => {
    const { password } = (req.body ?? {}) as { password?: string };
    const result = strongPasswordSchema.safeParse(password ?? "");
    if (!result.success) {
      throw new HttpError(400, "WEAK_PASSWORD", result.error.issues[0]?.message ?? "Password does not meet policy");
    }
    return { ok: true };
  });
}
