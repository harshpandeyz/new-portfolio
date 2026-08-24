import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { COOKIE_NAMES, config } from "../../config.js";
import { HttpError } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { bcryptCompare, bcryptHash } from "./password.js";
import {
  createSession,
  destroySession,
  resolveSessionUser,
} from "./session.js";
import { loginSchema } from "@hp/shared";
import { prisma } from "../../db/prisma.js";
import { audit, clientIp, parseBody } from "../../utils/http.js";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveSessionUser(req);
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  }
  if (user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Administrator role required");
  }
  req.admin = user;
}

/** Mutating admin requests must present the matching double-submit CSRF token. */
export async function requireCsrf(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const cookieToken = req.cookies[COOKIE_NAMES.csrf];
  const headerToken = req.headers["x-csrf-token"];
  if (!verify(cookieToken, typeof headerToken === "string" ? headerToken : undefined)) {
    throw new HttpError(403, "CSRF", "Missing or invalid CSRF token");
  }
}

import { verifyCsrf as verify } from "./session.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (req, reply) => {
    const ip = clientIp(req);
    const limit = rateLimit(`login:${ip}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", `Too many attempts. Retry in ${limit.retryAfterSeconds}s.`);
    }

    const { email, password } = parseBody(req, loginSchema);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Constant-shape response: always compare against a hash to avoid user enumeration timing.
    const hash = user?.passwordHash ?? "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpQ0N1Jtq8mz1d1mZQ1eVRnFQF9mS";
    const ok = await bcryptCompare(password, hash);

    if (!user || !ok) {
      await audit(req, "auth.login_failed", "user", null, { email });
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    await createSession(user.id, req, reply);
    await audit(req, "auth.login", "user", user.id);
    return { ok: true, user: { email: user.email, role: user.role, displayName: user.displayName } };
  });

  app.post("/logout", { preHandler: [requireCsrf] }, async (req, reply) => {
    await destroySession(req, reply);
    if (req.admin) await audit(req, "auth.logout", "user", req.admin.id);
    return { ok: true };
  });

  app.get("/me", { preHandler: [requireAdmin] }, async (req) => {
    return { user: req.admin };
  });
}

export { bcryptHash };
