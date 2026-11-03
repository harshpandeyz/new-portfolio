/**
 * Idempotently creates the initial administrator without resetting an
 * existing account. Use admin:set-password for an explicit password reset.
 * Production does not inject ADMIN_PASSWORD into the long-running API.
 */
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import "../apps/api/src/env.js";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function promptHidden(question: string): Promise<string> {
  if (!input.isTTY) throw new Error("No interactive terminal or ADMIN_PASSWORD was supplied.");
  return new Promise((resolve) => {
    const rl = createInterface({ input, output });
    const onData = (char: Buffer) => {
      const value = char.toString();
      if (value === "\r" || value === "\n" || value === "\u0004") return;
      output.write(`\u001b[2K\u001b[200D${question}${"*".repeat((rl as unknown as { line?: string }).line?.length ?? 0)}`);
    };
    (input as unknown as { on: (event: string, listener: (chunk: Buffer) => void) => void }).on("data", onData);
    rl.question(question, (answer) => {
      (input as unknown as { removeListener: (event: string, listener: (chunk: Buffer) => void) => void }).removeListener("data", onData);
      rl.close();
      output.write("\n");
      resolve(answer);
    });
  });
}

function validatePassword(password: string): void {
  const classes = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (password.length < 16 || classes < 3 || /password|change[-_ ]?me|example|admin123/i.test(password)) {
    throw new Error("Administrator password must be at least 16 characters, use three character classes, and avoid common placeholders.");
  }
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid administrator email address with --email.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error("An account with this email already exists without the ADMIN role; no credentials or permissions were changed.");
    }
    console.log(`Administrator ${email} already exists; credentials were left unchanged.`);
    console.log("Use npm run admin:set-password for an explicit password reset.");
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? await promptHidden("New administrator password: ");
  validatePassword(password);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash, role: "ADMIN", displayName: "Harsh Pandey" },
  });
  console.log(`Administrator ${email} created with a bcrypt password hash.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Administrator creation failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
