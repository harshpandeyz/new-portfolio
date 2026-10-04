import type { FastifyInstance } from "fastify";
import { contactQuerySchema, messageBulkDeleteSchema, messageBulkStatusSchema, messageStatusSchema, contactSchema, messageReplySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, clientIp, noStore, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { sendContactNotification, sendMessageReply } from "./mailer.js";
import { HttpError } from "../../utils/http.js";
import { getSiteSettings } from "../settings/store.js";
import { isEmailConfigured } from "../../config.js";
import { emailSetupHint } from "./mailer.js";

const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX = 3;

const requireMessagesRead = requirePermission("messages:read");
const requireMessagesWrite = requirePermission("messages:write");
const requireMessagesDelete = requirePermission("messages:delete");

const REPLY_WINDOW_MS = 10 * 60 * 1000;
const REPLY_MAX_PER_IP = 20;
const REPLY_MAX_PER_MESSAGE = 5;

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  // ── public: receive a message ────────────────────────────────
  app.post("/", async (req, reply) => {
    if (!(await getSiteSettings()).contactEnabled) {
      return reply.code(503).send({ error: "CONTACT_DISABLED", message: "The contact form is temporarily unavailable." });
    }
    const ip = clientIp(req);

    const limit = await rateLimit(`contact:${ip}`, CONTACT_MAX, CONTACT_WINDOW_MS);
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
      reply.header("retry-after", Math.ceil(EMAIL_WINDOW_MS / 1000));
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

    await audit(req, "MESSAGE_RECEIVED", "contact_message", message.id, { from: message.email });
    void sendContactNotification(message).catch((err) => app.log.warn({ err }, "contact notification failed"));

    reply.code(201);
    return { ok: true, id: message.id };
  });

  // ── admin: inbox ─────────────────────────────────────────────
  app.get("/", { preHandler: [requireMessagesRead] }, async (req, reply) => {
    noStore(reply);
    const { status, page: pageNum, q, sort } = parseQuery(req, contactQuerySchema);
    const pageSize = 25;
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
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
    const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };
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
    if (id.length > 64) throw notFound("Contact message");
    const message = await prisma.contactMessage.findUnique({
      where: { id },
      include: { replies: { orderBy: { sentAt: "asc" } } },
    });
    if (!message) throw notFound("Contact message");
    return { message };
  });

  // ── admin: reply directly by email (no mail app involved) ──────
  app.post("/:id/reply", { preHandler: [requireMessagesWrite, requireCsrf] }, async (req, reply) => {
    const ipLimit = await rateLimit(`reply:${clientIp(req)}`, REPLY_MAX_PER_IP, REPLY_WINDOW_MS);
    if (!ipLimit.allowed) {
      reply.header("retry-after", ipLimit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "Too many replies. Try again later.");
    }
    const { id } = req.params as { id: string };
    if (id.length > 64) throw notFound("Contact message");
    const msgLimit = await rateLimit(`reply:msg:${id}`, REPLY_MAX_PER_MESSAGE, 60 * 60 * 1000);
    if (!msgLimit.allowed) {
      reply.header("retry-after", msgLimit.retryAfterSeconds);
      throw new HttpError(429, "RATE_LIMITED", "This conversation already received several replies recently. Try again later.");
    }
    const { subject, body } = parseBody(req, messageReplySchema);
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw notFound("Contact message");

    if (!isEmailConfigured()) {
      throw new HttpError(
        503,
        "EMAIL_NOT_CONFIGURED",
        `Email sending is not configured. ${emailSetupHint()}`,
      );
    }

    const finalSubject = (
      (subject ?? "").trim() || `Re: ${message.subject?.trim() || "your message"}`
    ).slice(0, 140);
    const trimmedBody = body.trim();
    try {
      await sendMessageReply({
        toName: message.name,
        toEmail: message.email,
        subject: finalSubject,
        body: trimmedBody,
        originalSubject: message.subject,
        originalMessage: message.message,
        originalDate: message.createdAt,
      });
    } catch (e) {
      app.log.warn({ err: e }, "direct reply failed");
      throw new HttpError(502, "REPLY_FAILED", e instanceof Error ? e.message : "Could not send the reply. Check SMTP settings and try again.");
    }

    // The email is already sent at this point: if persistence fails the
    // admin must know (not silently lose history or blindly resend).
    try {
      const [updated, sent] = await prisma.$transaction([
        prisma.contactMessage.update({
          where: { id },
          data: { status: "REPLIED", repliedAt: new Date() },
        }),
        prisma.messageReply.create({
          data: { messageId: id, to: message.email, subject: finalSubject, body: trimmedBody, sentBy: req.admin?.email ?? null },
        }),
      ]);
      await audit(req, "MESSAGE_REPLIED", "contact_message", id, { to: message.email, subject: finalSubject });
      reply.code(201);
      return { message: updated, reply: sent };
    } catch (e) {
      app.log.error({ err: e }, "reply sent but history not recorded");
      throw new HttpError(
        502,
        "SENT_NOT_RECORDED",
        "The email was sent, but saving the reply history failed. Do not resend yet — check the inbox and audit log first.",
      );
    }
  });

  app.patch("/:id/status", { preHandler: [requireMessagesWrite, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const { status } = parseBody(req, messageStatusSchema);
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("Contact message");
    const message = await prisma.contactMessage.update({ where: { id }, data: { status } });
    await audit(req, "MESSAGE_STATUS_CHANGED", "contact_message", id, { status });
    return { message };
  });

  app.post("/bulk/status", { preHandler: [requireMessagesWrite, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { ids, status } = parseBody(req, messageBulkStatusSchema);
    const result = await prisma.contactMessage.updateMany({ where: { id: { in: ids } }, data: { status } });
    await audit(req, "MESSAGE_STATUS_CHANGED", "contact_message", null, { status, count: result.count });
    return { ok: true, count: result.count };
  });

  app.post("/bulk/delete", { preHandler: [requireMessagesDelete, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write-del:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { ids } = parseBody(req, messageBulkDeleteSchema);
    const result = await prisma.contactMessage.deleteMany({ where: { id: { in: ids } } });
    await audit(req, "MESSAGE_DELETED", "contact_message", null, { count: result.count });
    return { ok: true, count: result.count };
  });

  app.delete("/:id", { preHandler: [requireMessagesDelete, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`write-del:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many deletions. Try again later.");
    const { id } = req.params as { id: string };
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("Contact message");
    await prisma.contactMessage.delete({ where: { id } });
    await audit(req, "MESSAGE_DELETED", "contact_message", id);
    return { ok: true };
  });
}
