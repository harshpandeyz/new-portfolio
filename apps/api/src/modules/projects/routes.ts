import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { projectInputSchema, projectQuerySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, clientIp, noStore, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";
import { lockMediaReferenceChanges, validateManagedMediaReferences } from "../media/references.js";
import { PUBLIC_PROJECT_SELECT } from "./public-projection.js";

const requireEditor = requirePermission("content:write");
const requireContentRead = requirePermission("content:read");

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ── public ───────────────────────────────────────────────────
  // Public endpoints always use the public projection, including when the owner
  // is signed in. Admin content is available only from the private no-store route.
  app.get("/", async (req) => {
    const { tier, featured } = parseQuery(req, projectQuerySchema);
    const where: Prisma.ProjectWhereInput = {
      status: { not: "draft" },
      ...(tier ? { tier } : {}),
      ...(featured === "true" ? { featured: true } : {}),
    };
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
      select: PUBLIC_PROJECT_SELECT,
    });
    return { projects };
  });

  // The public listing intentionally excludes drafts for every caller. The
  // editor needs its own authenticated listing so draft work can be reviewed
  // and published without ever leaking into a signed-in public-site session.
  app.get("/admin", { preHandler: [requireContentRead] }, async (_req, reply) => {
    noStore(reply);
    const projects = await prisma.project.findMany({
      orderBy: [{ featured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
    });
    return { projects };
  });

  app.get("/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const project = await prisma.project.findFirst({
      where: { slug, status: { not: "draft" } },
      select: PUBLIC_PROJECT_SELECT,
    });
    if (!project) throw notFound("Project");

    return { project };
  });

  // ── admin ────────────────────────────────────────────────────
  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const ipLimit = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, projectInputSchema);
    const project = await prisma.$transaction(async (tx) => {
      await lockMediaReferenceChanges(tx);
      const exists = await tx.project.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (exists) throw new HttpError(409, "CONFLICT", "A project with this slug already exists");
      await validateManagedMediaReferences(tx, [input.heroImage, ...(input.gallery ?? [])]);
      return tx.project.create({ data: input });
    });
    await audit(req, "CONTENT_CREATED", "project", project.id, { slug: project.slug });
    invalidateKnowledge();
    reply.code(201);
    return { project };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const ipLimit = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, projectInputSchema.partial());
    const project = await prisma.$transaction(async (tx) => {
      await lockMediaReferenceChanges(tx);
      const existing = await tx.project.findUnique({ where: { id }, select: { slug: true, heroImage: true, gallery: true } });
      if (!existing) throw notFound("Project");
      await validateManagedMediaReferences(tx, [
        ...(input.heroImage !== undefined && input.heroImage !== existing.heroImage ? [input.heroImage] : []),
        ...(input.gallery !== undefined && JSON.stringify(input.gallery) !== JSON.stringify(existing.gallery) ? input.gallery : []),
      ]);
      const updated = await tx.project.update({ where: { id }, data: input });
      if (updated.slug !== existing.slug) {
        const skills = await tx.skill.findMany({ where: { usedInProjectSlugs: { has: existing.slug } }, select: { id: true, usedInProjectSlugs: true } });
        for (const skill of skills) {
          await tx.skill.update({
            where: { id: skill.id },
            data: { usedInProjectSlugs: skill.usedInProjectSlugs.map((slug) => slug === existing.slug ? updated.slug : slug) },
          });
        }
      }
      return updated;
    });
    await audit(req, "CONTENT_UPDATED", "project", id, { slug: project.slug });
    invalidateKnowledge();
    return { project };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const ipLimit = await rateLimit(`write-del:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!ipLimit.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.$transaction(async (tx) => {
      await lockMediaReferenceChanges(tx);
      const existing = await tx.project.findUnique({ where: { id }, select: { slug: true } });
      if (!existing) throw notFound("Project");
      const skills = await tx.skill.findMany({ where: { usedInProjectSlugs: { has: existing.slug } }, select: { id: true, usedInProjectSlugs: true } });
      for (const skill of skills) {
        await tx.skill.update({
          where: { id: skill.id },
          data: { usedInProjectSlugs: skill.usedInProjectSlugs.filter((slug) => slug !== existing.slug) },
        });
      }
      await tx.project.delete({ where: { id } });
    });
    await audit(req, "CONTENT_DELETED", "project", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
