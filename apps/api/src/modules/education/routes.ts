import type { FastifyInstance } from "fastify";
import { educationInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { clientIp } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { audit, notFound, parseBody } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

const requireEditor = requirePermission("content:write");

export async function educationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const items = await prisma.education.findMany({ orderBy: { order: "asc" } });
    return { items };
  });

  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, educationInputSchema);
    const item = await prisma.$transaction(async (tx) => {
      if (input.primary) await tx.education.updateMany({ data: { primary: false } });
      return tx.education.create({ data: input });
    });
    await audit(req, "CONTENT_CREATED", "education", item.id, { degree: item.degree });
    invalidateKnowledge();
    reply.code(201);
    return { item };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, educationInputSchema.partial());
    const item = await prisma.$transaction(async (tx) => {
      if (input.primary) await tx.education.updateMany({ where: { id: { not: id } }, data: { primary: false } });
      return tx.education.update({ where: { id }, data: input });
    });
    await audit(req, "CONTENT_UPDATED", "education", id);
    invalidateKnowledge();
    return { item };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.education.delete({ where: { id } });
    await audit(req, "CONTENT_DELETED", "education", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
