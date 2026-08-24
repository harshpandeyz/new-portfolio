import nodemailer, { type Transporter } from "nodemailer";

import { config } from "../../config.js";

interface ContactMessageLike {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: Date;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host || !config.smtp.user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.password },
    });
  }
  return transporter;
}

/** Best-effort email notification. Contact messages are always persisted first. */
export async function sendContactNotification(message: ContactMessageLike): Promise<void> {
  const tx = getTransporter();
  if (!tx || !config.smtp.notifyEmail) {
    console.log(`[contact] new message from ${message.name} <${message.email}>: ${message.subject ?? "(no subject)"}`);
    return;
  }
  await tx.sendMail({
    from: `"HP//OS" <${config.smtp.user}>`,
    to: config.smtp.notifyEmail,
    replyTo: message.email,
    subject: `[Portfolio] ${message.subject ?? "New message"} — ${message.name}`,
    text: `From: ${message.name} <${message.email}>\nDate: ${message.createdAt.toISOString()}\n\n${message.message}`,
  });
}
