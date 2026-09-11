import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { projectInputSchema, projectQuerySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { hasPermission, requirePermission } from "../auth/rbac.js";
import { resolveSessionUser } from "../auth/session.js";
import { audit, clientIp, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

const requireEditor = requirePermission("content:write");

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  codename: true,
  shortDescription: true,
  longDescription: true,
  category: true,
  tier: true,
  status: true,
  featured: true,
  year: true,
  order: true,
  problem: true,
  solution: true,
  architecture: true,
  decisions: true,
  challenges: true,
  results: true,
  dataFlow: true,
  stack: true,
  githubUrl: true,
  liveUrl: true,
  heroImage: true,
  gallery: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ── public ───────────────────────────────────────────────────
  // Authenticated content readers (admin) get the full record including
  // securityNotes; anonymous callers get the public projection only.
  app.get("/", async (req) => {
    const { tier, featured } = parseQuery(req, projectQuerySchema);
    const where: Prisma.ProjectWhereInput = {
      status: { not: "draft" },
      ...(tier ? { tier } : {}),
      ...(featured === "true" ? { featured: true } : {}),
    };
    const viewer = await resolveSessionUser(req).catch(() => null);
    const isStaff = viewer ? hasPermission(viewer.role, "content:read") : false;
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
      ...(isStaff ? {} : { select: PUBLIC_SELECT }),
    });
    return { projects };
  });

  app.get("/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const viewer = await resolveSessionUser(req).catch(() => null);
    const isStaff = viewer ? hasPermission(viewer.role, "content:read") : false;
    const project = await prisma.project.findFirst({
      where: { slug, status: { not: "draft" } },
      ...(isStaff ? {} : { select: PUBLIC_SELECT }),
    });
    if (!project) throw notFound("Project");

    void prisma.analyticsEvent
      .create({ data: { type: "project_view", ref: slug } })
      .catch(() => undefined);

    return { project };
  });

  // ── admin ────────────────────────────────────────────────────
  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const ipLimit = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, projectInputSchema);
    const exists = await prisma.project.findUnique({ where: { slug: input.slug } });
    if (exists) {
      return reply.code(409).send({ error: "CONFLICT", message: "A project with this slug already exists" });
    }
    const project = await prisma.project.create({ data: input });
    await audit(req, "CONTENT_CREATED", "project", project.id, { slug: project.slug });
    invalidateKnowledge();
    reply.code(201);
    return { project };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const ipLimit = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, projectInputSchema.partial());
    const project = await prisma.project.update({ where: { id }, data: input });
    await audit(req, "CONTENT_UPDATED", "project", id, { slug: project.slug });
    invalidateKnowledge();
    return { project };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const ipLimit = rateLimit(`write-del:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.project.delete({ where: { id } });
    await audit(req, "CONTENT_DELETED", "project", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
