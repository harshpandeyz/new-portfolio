import nodemailer, { type Transporter } from "nodemailer";

import { config, isSmtpConfigured } from "../../config.js";

interface ContactMessageLike {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: Date;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  // Gate matches isSmtpConfigured(): host + user + password are all required.
  // The transporter is cached per process; credential/host rotation needs a
  // restart (documented in .env.example). Tests can call resetTransporter().
  if (!config.smtp.host || !config.smtp.user || !config.smtp.password) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      requireTLS: config.smtp.port !== 465,
      auth: { user: config.smtp.user, pass: config.smtp.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

/** Test hook — drops the cached transporter (e.g. after credential rotation). */
export function resetTransporter(): void {
  transporter = null;
}

function cleanHeader(value: string, max: number): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

/** Header-safe email address: strips CRLF injection vectors. */
function cleanAddress(value: string): string {
  return value.replace(/[\r\n]+/g, "").trim().slice(0, 320);
}

/** Best-effort email notification. Contact messages are always persisted first. */
export async function sendContactNotification(message: ContactMessageLike): Promise<void> {
  const tx = getTransporter();
  if (!tx || !config.smtp.notifyEmail) {
    // The message is already persisted. Do not log visitor PII when SMTP is
    // intentionally not configured; operators can review it in the inbox.
    return;
  }
  await tx.sendMail({
    from: { name: "HP//OS", address: config.smtp.user },
    to: cleanAddress(config.smtp.notifyEmail),
    replyTo: cleanAddress(message.email),
    subject: `[Portfolio] ${cleanHeader(message.subject ?? "New message", 140)} — ${cleanHeader(message.name, 80)}`,
    text: `From: ${cleanHeader(message.name, 80)} <${message.email}>\nDate: ${message.createdAt.toISOString()}\n\n${message.message}`,
  });
}

export interface DirectReply {
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  originalSubject: string | null;
  originalMessage: string;
  originalDate: Date;
}

/**
 * Sends an admin reply directly to the visitor — no mail app involved.
 * Throws when SMTP is not configured so the route can return a clear 503.
 */
export async function sendMessageReply(reply: DirectReply): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.");
  }
  const tx = getTransporter();
  if (!tx) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.");
  }
  const fromName = cleanHeader(config.smtp.replyFromName || "Harsh Pandey", 80);
  await tx.sendMail({
    from: { name: fromName, address: config.smtp.user },
    to: cleanAddress(reply.toEmail),
    replyTo: cleanAddress(config.smtp.notifyEmail || config.smtp.user),
    subject: cleanHeader(reply.subject, 140),
    text: [
      `Hi ${reply.toName},`,
      ``,
      reply.body,
      ``,
      `— ${fromName}`,
      ``,
      `─── Original message (${reply.originalDate.toLocaleString()}) ───`,
      reply.originalSubject ? `Subject: ${reply.originalSubject}` : null,
      reply.originalMessage,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  });
}
