import nodemailer, { type Transporter } from "nodemailer";

import { config, isEmailConfigured, isSmtpConfigured } from "../../config.js";

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

export function emailSetupHint(): string {
  return "Set RESEND_API_KEY and EMAIL_FROM or SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD, then try again.";
}

interface OutgoingMail {
  fromName: string;
  fromAddress: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/**
 * HTTPS email API (Resend) — the production path on hosts that block
 * outbound SMTP. Same templates as SMTP;
 * only the transport differs. Uses built-in fetch: no new dependency.
 */
async function sendViaResend(mail: OutgoingMail): Promise<void> {
  const from = mail.fromName ? `${mail.fromName} <${mail.fromAddress}>` : mail.fromAddress;
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.email.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        reply_to: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new Error(`Email API request failed: ${e instanceof Error ? e.message : "network error"}`);
  }
  if (!res.ok) {
    let detail = `Email API rejected the message (HTTP ${res.status})`;
    try {
      const data = (await res.json()) as { message?: unknown; error?: unknown };
      const msg = typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : null;
      if (msg) detail = `Email API error: ${msg.slice(0, 200)}`;
    } catch {
      /* keep generic detail; never leak the API key */
    }
    throw new Error(detail);
  }
}

async function sendMail(mail: OutgoingMail): Promise<void> {
  if (config.email.provider === "resend") {
    await sendViaResend(mail);
    return;
  }
  const tx = getTransporter();
  if (!tx) {
    throw new Error(`SMTP is not configured. ${emailSetupHint()}`);
  }
  await tx.sendMail({
    from: { name: mail.fromName, address: mail.fromAddress },
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
  });
}

function senderAddress(): string {
  // Resend sends from the verified EMAIL_FROM identity; SMTP authenticates
  // as the SMTP user, so the envelope must match it.
  if (config.email.provider === "resend") {
    const match = config.email.from.match(/<([^<>]+)>\s*$/);
    return (match?.[1] ?? config.email.from).trim();
  }
  return config.smtp.user;
}

function senderName(fallback: string): string {
  if (config.email.provider === "resend") {
    const match = config.email.from.match(/^\s*"?([^"<]*?)"?\s*<[^<>]+>\s*$/);
    const name = (match?.[1] ?? "").trim();
    return cleanHeader(name || fallback, 80);
  }
  return cleanHeader(fallback, 80);
}

/** Best-effort email notification. Contact messages are always persisted first. */
export async function sendContactNotification(message: ContactMessageLike): Promise<void> {
  if (!isEmailConfigured() || !config.smtp.notifyEmail) {
    // The message is already persisted. Do not log visitor PII when email is
    // intentionally not configured; operators can review it in the inbox.
    return;
  }
  await sendMail({
    fromName: "HP//OS",
    fromAddress: senderAddress(),
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
 * Throws when no email provider is configured so the route can return a
 * clear 503.
 */
export async function sendMessageReply(reply: DirectReply): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(`Email sending is not configured. ${emailSetupHint()}`);
  }
  const fromName = senderName(config.smtp.replyFromName || "Harsh Pandey");
  await sendMail({
    fromName,
    fromAddress: senderAddress(),
    to: cleanAddress(reply.toEmail),
    replyTo: cleanAddress(config.smtp.notifyEmail || senderAddress()),
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
