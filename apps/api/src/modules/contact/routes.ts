import type { FastifyInstance } from "fastify";
import { messageBulkDeleteSchema, messageBulkStatusSchema, messageStatusSchema, contactSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, clientIp, noStore, notFound, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { sendContactNotification } from "./mailer.js";
import { HttpError } from "../../utils/http.js";

const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX = 3;

const requireMessagesRead = requirePermission("messages:read");
const requireMessagesWrite = requirePermission("messages:write");
const requireMessagesDelete = requirePermission("messages:delete");

const ALLOWED_STATUSES = new Set(["NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"]);

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
  app.get("/", { preHandler: [requireMessagesRead] }, async (req, reply) => {
    noStore(reply);
    const { status, page, q, sort, order } = req.query as {
      status?: string;
      page?: string;
      q?: string;
      sort?: string;
      order?: string;
    };
    const pageSize = 25;
    const pageNum = Math.max(1, Number(page ?? "1") || 1);
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      if (!ALLOWED_STATUSES.has(status)) throw new HttpError(400, "BAD_REQUEST", "Invalid status filter");
      (where as { status: string }).status = status;
    }
    if (q && q.trim()) {
      const term = q.trim().slice(0, 120);
      (where as { OR: unknown }).OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { subject: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
      ];
    }
    const orderBy =
      sort === "oldest" || order === "asc" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };
    const [messages, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({
        where: where as never,
        orderBy,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactMessage.count({ where: where as never }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
    ]);
    return { messages, total, unread, page: pageNum, pageSize };
  });

  app.get("/unread-count", { preHandler: [requireMessagesRead] }, async (_req, reply) => {
    noStore(reply);
    const unread = await prisma.contactMessage.count({ where: { status: "NEW" } });
    return { unread };
  });

  app.get("/:id", { preHandler: [requireMessagesRead] }, async (req, reply) => {
    noStore(reply);
    const { id } = req.params as { id: string };
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) notFound("Contact message");
    return { message };
  });

  app.patch("/:id/status", { preHandler: [requireMessagesWrite, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const { status } = parseBody(req, messageStatusSchema);
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) notFound("Contact message");
    const message = await prisma.contactMessage.update({ where: { id }, data: { status } });
    await audit(req, "MESSAGE_STATUS_CHANGED", "contact_message", id, { status });
    return { message };
  });

  app.post("/bulk/status", { preHandler: [requireMessagesWrite, requireCsrf] }, async (req) => {
    const { ids, status } = parseBody(req, messageBulkStatusSchema);
    const result = await prisma.contactMessage.updateMany({ where: { id: { in: ids } }, data: { status } });
    await audit(req, "MESSAGE_STATUS_CHANGED", "contact_message", null, { status, count: result.count });
    return { ok: true, count: result.count };
  });

  app.post("/bulk/delete", { preHandler: [requireMessagesDelete, requireCsrf] }, async (req) => {
    const { ids } = parseBody(req, messageBulkDeleteSchema);
    const result = await prisma.contactMessage.deleteMany({ where: { id: { in: ids } } });
    await audit(req, "MESSAGE_DELETED", "contact_message", null, { count: result.count });
    return { ok: true, count: result.count };
  });

  app.delete("/:id", { preHandler: [requireMessagesDelete, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) notFound("Contact message");
    await prisma.contactMessage.delete({ where: { id } });
    await audit(req, "MESSAGE_DELETED", "contact_message", id);
    return { ok: true };
  });
}
