import { PrismaClient } from "@prisma/client";

import { isTest } from "../config.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isTest ? ["error"] : ["warn", "error"],
  });

if (!isTest) {
  globalForPrisma.prisma = prisma;
}
