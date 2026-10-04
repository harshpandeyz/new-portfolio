import { mkdir } from "node:fs/promises";
import path from "node:path";

import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance, type FastifyServerOptions } from "fastify";

import { COOKIE_NAMES, config } from "./config.js";
import { prisma } from "./db/prisma.js";
import { authRoutes, requireAdmin, requireCsrf } from "./modules/auth/routes.js";
import { HttpError } from "./utils/http.js";
import { profileRoutes } from "./modules/profile/routes.js";
import { projectRoutes } from "./modules/projects/routes.js";
import { certificateRoutes } from "./modules/certificates/routes.js";
import { skillRoutes } from "./modules/skills/routes.js";
import { timelineRoutes } from "./modules/timeline/routes.js";
import { educationRoutes } from "./modules/education/routes.js";
import { contactRoutes } from "./modules/contact/routes.js";
import { chatRoutes } from "./modules/chat/routes.js";
import { mediaRoutes } from "./modules/media/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { githubRoutes } from "./modules/github/routes.js";
import { statsRoutes } from "./modules/stats/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";
import { aiProviderRoutes } from "./modules/ai-providers/routes.js";
import { publicHomeData, publicRoutes } from "./modules/public/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProd
      ? true
      : { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname,reqId,res" } }, level: "warn" },
    trustProxy: config.trustProxy as FastifyServerOptions["trustProxy"],
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cookie);

  await app.register(helmet, {
    contentSecurityPolicy: false, // API serves JSON + static uploads only
    crossOriginResourcePolicy: { policy: "cross-origin" }, // uploads are embedded by the web app
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    maxAge: 600,
  });

  // Private/admin API responses must never be cached by browsers or CDNs.
  // Public content GETs get a short shared cache (60s) to cut TTFB + DB load
  // behind a reverse proxy; mutations and private routes stay no-store.
  app.addHook("onSend", async (req, reply, payload) => {
    const url = req.url;
    const pathname = url.split("?", 1)[0] ?? url;
    if (url.startsWith("/api/public/home") || pathname === "/api/home") {
      // Runtime flags must reflect admin changes on the next page load. The
      // bootstrap is small enough to skip browser/CDN caching entirely.
      reply.header("cache-control", "no-store, no-cache, must-revalidate, private");
      reply.header("pragma", "no-cache");
      return payload;
    }
    if (
      url.startsWith("/api/auth") ||
      url.startsWith("/api/contact") ||
      url.startsWith("/api/stats") ||
      url.startsWith("/api/media") ||
      url.startsWith("/api/settings") ||
      url.startsWith("/api/chat") ||
      url.startsWith("/api/github") ||
      url.startsWith("/api/ai-providers") ||
      url.startsWith("/api/projects/admin") ||
      url.startsWith("/api/events/summary")
    ) {
      reply.header("cache-control", "no-store, no-cache, must-revalidate, private");
      reply.header("pragma", "no-cache");
      return payload;
    }
    const cacheablePublicContent =
      pathname === "/api/profile" ||
      pathname === "/api/projects" ||
      (pathname.startsWith("/api/projects/") && !pathname.startsWith("/api/projects/admin")) ||
      pathname === "/api/certificates" || pathname.startsWith("/api/certificates/") ||
      pathname === "/api/skills" ||
      pathname === "/api/timeline" ||
      pathname === "/api/education";
    if (req.method === "GET" && reply.statusCode === 200 && cacheablePublicContent) {
      // Only known public content routes get a shared cache. Vary on Origin so
      // CORS caches stay correct behind nginx; all unknown routes stay uncached.
      reply.header("cache-control", "public, max-age=60, stale-while-revalidate=120");
      reply.header("vary", "Origin");
    }
    return payload;
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxUploadMb * 1024 * 1024,
      files: 1,
    },
  });

  await mkdir(config.uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: config.uploadDir,
    prefix: "/static/",
    decorateReply: true,
    maxAge: "7d",
    immutable: false,
  });

  // ── error shaping ────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    const error = err as FastifyError & { details?: unknown };
    if (error instanceof HttpError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
      return;
    }
    if (error.statusCode === 413 || error.code === "FST_PART_FILE_TOO_LARGE" || error.code === "FST_REQ_FILE_TOO_LARGE") {
      reply.code(413).send({ error: "PAYLOAD_TOO_LARGE", message: `File exceeds the ${config.maxUploadMb}MB limit` });
      return;
    }
    if (error.statusCode === 415 || error.statusCode === 400) {
      reply.code(error.statusCode).send({ error: "BAD_REQUEST", message: error.message });
      return;
    }
    // Prisma errors should never become opaque 500s for ordinary client
    // mistakes. Keep database details out of the response, but preserve the
    // correct HTTP semantics for missing records and uniqueness conflicts.
    if (error.code === "P2025") {
      reply.code(404).send({ error: "NOT_FOUND", message: "The requested record was not found" });
      return;
    }
    if (error.code === "P2002") {
      reply.code(409).send({ error: "CONFLICT", message: "A record with those values already exists" });
      return;
    }
    if (error.code === "P2003") {
      reply.code(409).send({ error: "CONFLICT", message: "The record is still referenced by other data" });
      return;
    }
    app.log.error(error);
    reply.code(500).send({ error: "INTERNAL", message: "Internal system error" });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "NOT_FOUND", message: "Unknown route" });
  });

  // Periodic cleanup is safe across replicas; all operations are idempotent.
  const runMaintenance = () => {
    void Promise.allSettled([
      import("./modules/auth/session.js").then((m) => m.purgeExpiredSessions()),
      import("./modules/analytics/retention.js").then((m) => m.purgeRetainedData()),
    ]);
  };
  runMaintenance();
  const purgeTimer = setInterval(runMaintenance, 60 * 60 * 1000);
  purgeTimer.unref?.();
  app.addHook("onClose", async () => {
    clearInterval(purgeTimer);
  });

  // ── routes ───────────────────────────────────────────────────
  // Liveness: cheap, no DB. Readiness: DB + migrations reachable.
  app.get("/api/health", async () => ({ status: "ok", time: new Date().toISOString() }));
  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));
  app.get("/api/ready", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready", time: new Date().toISOString() };
    } catch {
      reply.code(503);
      return { status: "not-ready", time: new Date().toISOString() };
    }
  });
  app.get("/ready", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready", time: new Date().toISOString() };
    } catch {
      reply.code(503);
      return { status: "not-ready", time: new Date().toISOString() };
    }
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(profileRoutes, { prefix: "/api/profile" });
  await app.register(publicRoutes, { prefix: "/api/public" });
  // Keep the concise path for local integrations; both paths share one public projection.
  app.get("/api/home", publicHomeData);
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(certificateRoutes, { prefix: "/api/certificates" });
  await app.register(skillRoutes, { prefix: "/api/skills" });
  await app.register(timelineRoutes, { prefix: "/api/timeline" });
  await app.register(educationRoutes, { prefix: "/api/education" });
  await app.register(contactRoutes, { prefix: "/api/contact" });
  await app.register(chatRoutes, { prefix: "/api/chat" });
  await app.register(mediaRoutes, { prefix: "/api/media" });
  await app.register(analyticsRoutes, { prefix: "/api/events" });
  await app.register(githubRoutes, { prefix: "/api/github" });
  await app.register(statsRoutes, { prefix: "/api/stats" });
  await app.register(settingsRoutes, { prefix: "/api/settings" });
  await app.register(aiProviderRoutes, { prefix: "/api/ai-providers" });

  // admin bootstrap helper (used by scripts/admin-create.ts via direct import too)
  app.decorate("requireAdmin", requireAdmin);
  app.decorate("requireCsrf", requireCsrf);

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: typeof requireAdmin;
    requireCsrf: typeof requireCsrf;
  }
}
