import type { FastifyInstance } from "fastify";
import { timelineInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, notFound, parseBody } from "../../utils/http.js";

export async function timelineRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { type } = req.query as { type?: string };
    const items = await prisma.timelineItem.findMany({
      where: type && type !== "ALL" ? { type } : {},
      orderBy: [{ order: "asc" }],
    });
    return { items };
  });

  app.post("/", { preHandler: [requireAdmin, requireCsrf] }, async (req, reply) => {
    const input = parseBody(req, timelineInputSchema);
    const item = await prisma.timelineItem.create({ data: input });
    await audit(req, "timeline.create", "timeline", item.id, { title: item.title });
    reply.code(201);
    return { item };
  });

  app.patch("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const input = parseBody(req, timelineInputSchema.partial());
    const item = await prisma.timelineItem.update({ where: { id }, data: input });
    await audit(req, "timeline.update", "timeline", id, { title: item.title });
    return { item };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.timelineItem.delete({ where: { id } });
    await audit(req, "timeline.delete", "timeline", id);
    return { ok: true };
  });
}
