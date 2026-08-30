import type { FastifyInstance } from "fastify";
import { messageStatusSchema, contactSchema } from "@hp/shared";

import { config } from "../../config.js";
import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, clientIp, notFound, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { sendContactNotification } from "./mailer.js";

const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX = 3;

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  // ── public: receive a message ────────────────────────────────
  app.post("/", async (req, reply) => {
    const ip = clientIp(req);

    const limit = rateLimit(`contact:${ip}`, CONTACT_MAX, CONTACT_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      return reply.code(429).send({ error: "RATE_LIMITED", message: "Too many messages. Try again later." });
    }

    const input = parseBody(req, contactSchema);

    // honeypot: bots fill hidden fields — pretend success, store nothing
    if (input.company) {
      return reply.code(202).send({ ok: true });
    }

    const recent = await prisma.contactMessage.count({
      where: { email: input.email.toLowerCase(), createdAt: { gte: new Date(Date.now() - EMAIL_WINDOW_MS) } },
    });
    if (recent >= EMAIL_MAX) {
      return reply.code(429).send({ error: "RATE_LIMITED", message: "Message limit reached for this email. Try again later." });
    }

    const message = await prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        subject: input.subject || null,
        message: input.message,
        ip,
      },
    });

    await audit(req, "contact.received", "contact_message", message.id, { from: message.email });
    void sendContactNotification(message).catch((err) => app.log.warn({ err }, "contact notification failed"));

    reply.code(201);
    return { ok: true, id: message.id };
  });

  // ── admin: inbox ─────────────────────────────────────────────
  app.get("/", { preHandler: [requireAdmin] }, async (req) => {
    const { status, page } = req.query as { status?: string; page?: string };
    const pageSize = 25;
    const pageNum = Math.max(1, Number(page ?? "1") || 1);
    const where = status && status !== "ALL" ? { status } : {};
    const [messages, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
    ]);
    return { messages, total, unread, page: pageNum, pageSize };
  });

  app.get("/unread-count", { preHandler: [requireAdmin] }, async () => {
    const unread = await prisma.contactMessage.count({ where: { status: "NEW" } });
    return { unread };
  });

  app.patch("/:id/status", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const { status } = parseBody(req, messageStatusSchema);
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) notFound("Contact message");
    const message = await prisma.contactMessage.update({ where: { id }, data: { status } });
    await audit(req, "contact.status", "contact_message", id, { status });
    return { message };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) notFound("Contact message");
    await prisma.contactMessage.delete({ where: { id } });
    await audit(req, "contact.delete", "contact_message", id);
    return { ok: true };
  });
}
