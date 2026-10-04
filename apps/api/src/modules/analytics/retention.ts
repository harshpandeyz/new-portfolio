import { prisma } from "../../db/prisma.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Purge stored data on a bounded schedule without retaining chat contents. */
export async function purgeRetainedData(): Promise<void> {
  const now = Date.now();
  const analyticsBefore = new Date(now - 90 * DAY_MS);
  const auditBefore = new Date(now - 365 * DAY_MS);
  const contactIpBefore = new Date(now - 30 * DAY_MS);

  const results = await Promise.allSettled([
    prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: analyticsBefore } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditBefore } } }),
    prisma.contactMessage.updateMany({
      where: { createdAt: { lt: contactIpBefore }, ip: { not: null } },
      data: { ip: null },
    }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") console.error("[retention] cleanup failed", result.reason instanceof Error ? result.reason.name : "unknown error");
  }
}
