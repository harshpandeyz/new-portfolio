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
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
    app.log.error(error);
    reply.code(500).send({ error: "INTERNAL", message: "Internal system error" });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "NOT_FOUND", message: "Unknown route" });
  });

  // periodic session purge
  const purgeTimer = setInterval(() => {
    void import("./modules/auth/session.js").then((m) => m.purgeExpiredSessions()).catch(() => undefined);
  }, 60 * 60 * 1000);
  purgeTimer.unref?.();

  // ── routes ───────────────────────────────────────────────────
  app.get("/api/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(profileRoutes, { prefix: "/api/profile" });
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
