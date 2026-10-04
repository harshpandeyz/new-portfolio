import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analyticsEventValues } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../auth/rbac.js";
import { clientIp, parseBody, parseQuery } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { isTest } from "../../config.js";
import { trackAnalyticsEvent } from "./track.js";

const EVENTS_WINDOW_MS = 60 * 1000;
const EVENTS_MAX = 30;

const eventSchema = z.object({
  type: z.enum(analyticsEventValues),
  ref: z.string().trim().max(200).optional(),
});

const summaryQuerySchema = z.object({
  days: z.enum(["7", "30", "90"]).default("30").transform(Number),
});

/** Privacy-conscious analytics: aggregate counters only, no fingerprinting, no PII. */
const requireStatsRead = requirePermission("content:read");

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (req, reply) => {
    if (!isTest) {
      const limit = await rateLimit(`events:${clientIp(req)}`, EVENTS_MAX, EVENTS_WINDOW_MS);
      if (!limit.allowed) {
        reply.header("retry-after", limit.retryAfterSeconds);
        reply.code(429);
        return { error: "RATE_LIMITED", message: "Too many events. Try again later." };
      }
    }
    const input = parseBody(req, eventSchema);
    const recorded = await trackAnalyticsEvent(input.type, input.ref);
    reply.code(202);
    return recorded ? { ok: true } : { ok: true, disabled: true };
  });

  app.get("/summary", { preHandler: [requireStatsRead] }, async (req) => {
    const { days } = parseQuery(req, summaryQuerySchema);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const since = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);
    const [currentGroups, previousGroups, dailyRows, projectRows] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: previousSince, lt: since } },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${since} AND type = 'page_view'
      GROUP BY 1 ORDER BY 1 ASC
      `,
      prisma.$queryRaw<{ ref: string; count: bigint }[]>`
        SELECT ref, COUNT(*) AS count
        FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${since} AND type = 'project_view' AND ref IS NOT NULL
        GROUP BY ref ORDER BY count DESC LIMIT 8
      `,
    ]);

    const dayCounts = new Map(dailyRows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]));
    const daily = Array.from({ length: days }, (_, index) => {
      const day = new Date(since.getTime() + index * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      return { day: key, count: dayCounts.get(key) ?? 0 };
    });
    const projectSlugs = projectRows.map((row) => row.ref);
    const projects = projectSlugs.length
      ? await prisma.project.findMany({ where: { slug: { in: projectSlugs } }, select: { slug: true, title: true } })
      : [];
    const projectTitles = new Map(projects.map((project) => [project.slug, project.title]));
    const eventCounts = currentGroups.map((group) => ({ type: group.type, count: group._count._all }));
    const previousEventCounts = previousGroups.map((group) => ({ type: group.type, count: group._count._all }));

    return {
      days,
      since: since.toISOString(),
      eventCounts,
      previousEventCounts,
      // Kept for existing internal clients while the dashboard moves to a
      // selectable range. The field describes the selected range now.
      last30Days: eventCounts,
      daily,
      projectPerformance: projectRows.map((row) => ({
        slug: row.ref,
        title: projectTitles.get(row.ref) ?? row.ref,
        count: Number(row.count),
      })),
    };
  });
}
