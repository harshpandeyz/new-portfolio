import type { FastifyInstance } from "fastify";
import { timelineInputSchema, timelineQuerySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { clientIp } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { audit, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

const requireEditor = requirePermission("content:write");

export async function timelineRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { type } = parseQuery(req, timelineQuerySchema);
    const items = await prisma.timelineItem.findMany({
      where: type && type !== "ALL" ? { type } : {},
      orderBy: [{ order: "asc" }],
    });
    return { items };
  });

  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, timelineInputSchema);
    const item = await prisma.timelineItem.create({ data: input });
    await audit(req, "CONTENT_CREATED", "timeline", item.id, { title: item.title });
    invalidateKnowledge();
    reply.code(201);
    return { item };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, timelineInputSchema.partial());
    const item = await prisma.timelineItem.update({ where: { id }, data: input });
    await audit(req, "CONTENT_UPDATED", "timeline", id, { title: item.title });
    invalidateKnowledge();
    return { item };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.timelineItem.delete({ where: { id } });
    await audit(req, "CONTENT_DELETED", "timeline", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
