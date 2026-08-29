import type { FastifyInstance } from "fastify";

import { prisma } from "../../db/prisma.js";
import { requireAdmin } from "../auth/routes.js";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // Operational counts are private admin data, never part of the public API.
  app.get("/", { preHandler: [requireAdmin] }, async () => {
    const [projects, featuredProjects, certificates, skills, timelineItems, chatQueries, contactMessages, unreadMessages, pageViews] =
      await Promise.all([
        prisma.project.count({ where: { status: { not: "draft" } } }),
        prisma.project.count({ where: { featured: true, status: { not: "draft" } } }),
        prisma.certificate.count(),
        prisma.skill.count(),
        prisma.timelineItem.count(),
        prisma.chatQueryLog.count(),
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

  app.get("/audit", { preHandler: [requireAdmin] }, async (req) => {
    const { page } = req.query as { page?: string };
    const pageSize = 50;
    const pageNum = Math.max(1, Number(page ?? "1") || 1);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, total, page: pageNum, pageSize };
  });
}
