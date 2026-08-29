import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requireAdmin } from "../auth/routes.js";
import { clientIp, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";

const EVENTS_WINDOW_MS = 60 * 1000;
const EVENTS_MAX = 30;

const eventSchema = z.object({
  type: z.enum(["page_view", "project_view", "certificate_view", "chat_query", "contact_submit", "resume_download", "recruiter_view"]),
  ref: z.string().trim().max(200).optional(),
  meta: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .refine((m) => Object.keys(m).length <= 10, "meta accepts at most 10 keys")
    .optional(),
});

/** Privacy-conscious analytics: aggregate counters only, no fingerprinting, no PII. */
export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (req, reply) => {
    const limit = rateLimit(`events:${clientIp(req)}`, EVENTS_MAX, EVENTS_WINDOW_MS);
    if (!limit.allowed) {
      reply.header("retry-after", limit.retryAfterSeconds);
      reply.code(429);
      return { error: "RATE_LIMITED", message: "Too many events. Try again later." };
    }
    const input = parseBody(req, eventSchema);
    await prisma.analyticsEvent.create({
      data: { type: input.type, ref: input.ref ?? null, meta: input.meta ?? undefined },
    });
    reply.code(202);
    return { ok: true };
  });

  app.get("/summary", { preHandler: [requireAdmin] }, async () => {
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const grouped = await prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
    });
    const daily = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${since30}
      GROUP BY 1 ORDER BY 1 ASC
    `;
    return {
      last30Days: grouped.map((g) => ({ type: g.type, count: g._count._all })),
      daily: daily.map((d) => ({ day: d.day, count: Number(d.count) })),
    };
  });
}
