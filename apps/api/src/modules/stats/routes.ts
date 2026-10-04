import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../auth/rbac.js";
import { noStore, parseQuery } from "../../utils/http.js";
import { auditQuerySchema } from "@hp/shared";

const requireStatsRead = requirePermission("content:read");
const requireAuditRead = requirePermission("audit:read");

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // Operational counts are private admin data, never part of the public API.
  app.get("/", { preHandler: [requireStatsRead] }, async (_req, reply) => {
    noStore(reply);
    const [projects, featuredProjects, certificates, skills, timelineItems, chatQueries, contactMessages, unreadMessages, pageViews] =
      await Promise.all([
        prisma.project.count({ where: { status: { not: "draft" } } }),
        prisma.project.count({ where: { featured: true, status: { not: "draft" } } }),
        prisma.certificate.count(),
        prisma.skill.count(),
        prisma.timelineItem.count(),
        prisma.analyticsEvent.count({ where: { type: "chat_query" } }),
        prisma.contactMessage.count(),
        prisma.contactMessage.count({ where: { status: "NEW" } }),
        prisma.analyticsEvent.count({ where: { type: "page_view" } }),
      ]);

    return {
      projects,
      featuredProjects,
      certificates,
      skills,
      timelineItems,
      chatQueries,
      contactMessages,
      unreadMessages,
      pageViews,
    };
  });

  app.get("/overview", { preHandler: [requireStatsRead] }, async (_req, reply) => {
    noStore(reply);
    const [recentMessages, recentAudit] = await Promise.all([
      prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return { recentMessages, recentAudit };
  });

  app.get("/audit", { preHandler: [requireAuditRead] }, async (req, reply) => {
    noStore(reply);
    const q = parseQuery(req, auditQuerySchema);
    const where: Prisma.AuditLogWhereInput = {};
    if (q.q) {
      where.OR = [
        { action: { contains: q.q, mode: "insensitive" } },
        { actor: { contains: q.q, mode: "insensitive" } },
        { entity: { contains: q.q, mode: "insensitive" } },
      ];
    }
    if (q.action && q.action !== "ALL") where.action = q.action;
    if (q.entity && q.entity !== "ALL") where.entity = q.entity;
    const orderBy = q.sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page: q.page, pageSize: q.pageSize };
  });

  app.get("/security-events", { preHandler: [requireAuditRead] }, async (_req, reply) => {
    noStore(reply);
    const actions = [
      "AUTH_LOGIN_SUCCESS",
      "AUTH_LOGIN_FAILURE",
      "AUTH_LOGIN_2FA_REQUIRED",
      "AUTH_LOGOUT",
      "AUTH_SESSION_CREATED",
      "AUTH_SESSION_REVOKED",
      "AUTH_PASSWORD_CHANGED",
      "AUTH_2FA_SETUP_STARTED",
      "AUTH_2FA_ENABLED",
      "AUTH_2FA_DISABLED",
      "AUTH_RECOVERY_CODE_USED",
      "AUTH_RECOVERY_CODES_REGENERATED",
      "AUTH_REAUTH_SUCCESS",
      "AUTH_REAUTH_FAILURE",
    ];
    const logs = await prisma.auditLog.findMany({
      where: { action: { in: actions } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { logs };
  });
}
