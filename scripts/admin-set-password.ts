/**
 * Securely sets the local admin password (interactive, never hard-coded).
 * Usage: npm run admin:set-password [-- --email admin@harshpandey.dev]
 * Prompts with hidden input, validates length, bcrypt-hashes (12 rounds),
 * upserts the user, and clears lockout counters. Leaves 2FA untouched.
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
  return new Promise((resolve) => {
    const rl = createInterface({ input, output });
    // Mute echo for secret entry.
    const onData = (char: Buffer) => {
      const s = char.toString();
      if (s === "\r" || s === "\n" || s === "\u0004") return;
      // Erase the echoed character.
      output.write("\x1B[2K\x1B[200D" + question + "*".repeat((rl as unknown as { line?: string }).line?.length ?? 0));
    };
    (input as unknown as { on: (e: string, f: (c: Buffer) => void) => void }).on("data", onData);
    rl.question(question, (answer) => {
      (input as unknown as { removeListener: (e: string, f: (c: Buffer) => void) => void }).removeListener("data", onData);
      rl.close();
      output.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "admin@harshpandey.dev").toLowerCase();

  const first = await promptHidden("Enter new local admin password: ");
  const second = await promptHidden("Confirm new local admin password: ");
  if (first !== second) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
  if (first.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(first, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
    console.log(`Local admin password updated: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, passwordHash, role: "ADMIN", displayName: "Harsh Pandey", passwordChangedAt: new Date() },
    });
    console.log(`Local admin created: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
