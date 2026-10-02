import type { FastifyInstance } from "fastify";
import { SIGNATURE_SLUGS } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { getSiteSettings } from "../settings/store.js";
import { PUBLIC_PROJECT_SELECT } from "../projects/public-projection.js";

/** One compact, anonymous payload for the portfolio homepage and recruiter view. */
export async function publicHomeData() {
    const [profile, projectIndex, projects, skills, education, certificates, certTotal, settings] = await Promise.all([
      prisma.profile.findFirst({
        select: {
          id: true, name: true, headline: true, subHeadline: true, bio: true, recruiterSummary: true,
          location: true, email: true, availability: true, avatarUrl: true, resumeUrl: true,
          resumeLabel: true, updatedAt: true,
          socials: { select: { id: true, label: true, url: true, handle: true, order: true }, orderBy: { order: "asc" } },
        },
      }),
      prisma.project.findMany({
        where: { status: { not: "draft" } },
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
        select: { id: true, slug: true, title: true, tier: true, status: true, order: true },
      }),
      prisma.project.findMany({
        where: { status: { not: "draft" }, slug: { in: [...SIGNATURE_SLUGS] } },
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
        select: PUBLIC_PROJECT_SELECT,
      }),
      prisma.skill.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, category: true, level: true, description: true,
          usedInProjectSlugs: true, relatedConcepts: true, recruiterPriority: true, featured: true, order: true,
        },
      }),
      prisma.education.findMany({ orderBy: [{ primary: "desc" }, { order: "asc" }] }),
      prisma.certificate.findMany({
        where: { featured: true },
        orderBy: [{ order: "asc" }, { issuedOn: "desc" }],
        take: 5,
        select: {
          id: true, title: true, issuer: true, issuedOn: true, category: true,
          credentialId: true, credentialUrl: true, fileUrl: true, description: true,
          featured: true, order: true, createdAt: true,
        },
      }),
      prisma.certificate.count(),
      getSiteSettings(),
    ]);

  return {
    profile,
    projects,
    projectIndex,
    projectCount: projectIndex.length,
    skills,
    education,
    certificates,
    certTotal,
    publicSettings: {
      chatEnabled: settings.chatEnabled,
      contactEnabled: settings.contactEnabled,
      maintenanceMode: settings.maintenanceMode,
      analyticsEnabled: settings.analyticsEnabled,
    },
  };
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/home", publicHomeData);
}
