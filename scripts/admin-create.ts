/**
 * Creates or resets the admin operator account.
 *   npm run admin:create -- --email you@domain.com --password 'long-random-password'
 * Password is hashed with bcrypt (12 rounds) and stored server-side only.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import "../apps/api/src/env.js";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "admin@harshpandey.dev").toLowerCase();
  const password = arg("password") ?? process.env.ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    console.error("Provide a password of at least 12 characters:");
    console.error('  npm run admin:create -- --email you@domain.com --password "long-random-password"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    console.log(`Password reset for operator: ${email}`);
  } else {
    await prisma.user.create({ data: { email, passwordHash, role: "ADMIN", displayName: "Harsh Pandey" } });
    console.log(`Operator created: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
