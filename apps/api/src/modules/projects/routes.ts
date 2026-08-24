import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { projectInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, notFound, parseBody } from "../../utils/http.js";

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
  securityNotes: true,
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
  app.get("/", async (req) => {
    const { tier, featured } = req.query as { tier?: string; featured?: string };
    const where: Prisma.ProjectWhereInput = {
      status: { not: "draft" },
      ...(tier ? { tier } : {}),
      ...(featured === "true" ? { featured: true } : {}),
    };
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
      select: PUBLIC_SELECT,
    });
    return { projects };
  });

  app.get("/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const project = await prisma.project.findFirst({
      where: { slug, status: { not: "draft" } },
      select: PUBLIC_SELECT,
    });
    if (!project) notFound("Project");

    void prisma.analyticsEvent
      .create({ data: { type: "project_view", ref: slug } })
      .catch(() => undefined);

    return { project };
  });

  // ── admin ────────────────────────────────────────────────────
  app.post("/", { preHandler: [requireAdmin, requireCsrf] }, async (req, reply) => {
    const input = parseBody(req, projectInputSchema);
    const exists = await prisma.project.findUnique({ where: { slug: input.slug } });
    if (exists) {
      return reply.code(409).send({ error: "CONFLICT", message: "A project with this slug already exists" });
    }
    const project = await prisma.project.create({ data: input });
    await audit(req, "project.create", "project", project.id, { slug: project.slug });
    reply.code(201);
    return { project };
  });

  app.patch("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const input = parseBody(req, projectInputSchema.partial());
    const project = await prisma.project.update({ where: { id }, data: input });
    await audit(req, "project.update", "project", id, { slug: project.slug });
    return { project };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.project.delete({ where: { id } });
    await audit(req, "project.delete", "project", id);
    return { ok: true };
  });
}
