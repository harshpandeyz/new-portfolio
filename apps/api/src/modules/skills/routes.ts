import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { skillInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, notFound, parseBody } from "../../utils/http.js";

export async function skillRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { category } = req.query as { category?: string };
    const where: Prisma.SkillWhereInput = category && category !== "ALL" ? { category } : {};
    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return { skills };
  });

  app.post("/", { preHandler: [requireAdmin, requireCsrf] }, async (req, reply) => {
    const input = parseBody(req, skillInputSchema);
    const skill = await prisma.skill.create({ data: input });
    await audit(req, "skill.create", "skill", skill.id, { name: skill.name });
    reply.code(201);
    return { skill };
  });

  app.patch("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const input = parseBody(req, skillInputSchema.partial());
    const skill = await prisma.skill.update({ where: { id }, data: input });
    await audit(req, "skill.update", "skill", id, { name: skill.name });
    return { skill };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.skill.delete({ where: { id } });
    await audit(req, "skill.delete", "skill", id);
    return { ok: true };
  });
}
