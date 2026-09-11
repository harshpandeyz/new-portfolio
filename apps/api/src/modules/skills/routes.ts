import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { skillInputSchema, skillQuerySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { clientIp } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { audit, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

const requireEditor = requirePermission("content:write");

export async function skillRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { category } = parseQuery(req, skillQuerySchema);
    const where: Prisma.SkillWhereInput = category && category !== "ALL" ? { category } : {};
    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return { skills };
  });

  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, skillInputSchema);
    const skill = await prisma.skill.create({ data: input });
    await audit(req, "CONTENT_CREATED", "skill", skill.id, { name: skill.name });
    invalidateKnowledge();
    reply.code(201);
    return { skill };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, skillInputSchema.partial());
    const skill = await prisma.skill.update({ where: { id }, data: input });
    await audit(req, "CONTENT_UPDATED", "skill", id, { name: skill.name });
    invalidateKnowledge();
    return { skill };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.skill.delete({ where: { id } });
    await audit(req, "CONTENT_DELETED", "skill", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
