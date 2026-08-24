import type { FastifyInstance } from "fastify";
import { educationInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, notFound, parseBody } from "../../utils/http.js";

export async function educationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const items = await prisma.education.findMany({ orderBy: { order: "asc" } });
    return { items };
  });

  app.post("/", { preHandler: [requireAdmin, requireCsrf] }, async (req, reply) => {
    const input = parseBody(req, educationInputSchema);
    const item = await prisma.education.create({ data: input });
    await audit(req, "education.create", "education", item.id, { degree: item.degree });
    reply.code(201);
    return { item };
  });

  app.patch("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const input = parseBody(req, educationInputSchema.partial());
    const item = await prisma.education.update({ where: { id }, data: input });
    await audit(req, "education.update", "education", id);
    return { item };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.education.delete({ where: { id } });
    await audit(req, "education.delete", "education", id);
    return { ok: true };
  });
}
