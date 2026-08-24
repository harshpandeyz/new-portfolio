import type { FastifyInstance } from "fastify";
import { profileInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, parseBody } from "../../utils/http.js";

async function getProfile() {
  let profile = await prisma.profile.findFirst({ include: { socials: { orderBy: { order: "asc" } } } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        name: "Harsh Pandey",
        headline: "Full-Stack Engineer",
        subHeadline: "Backend • AI • Systems",
        bio: "Profile not configured yet.",
        location: "Pune, India",
        email: "harshap17058@gmail.com",
        socials: { create: [] },
      },
      include: { socials: { orderBy: { order: "asc" } } },
    });
  }
  return profile;
}

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const profile = await getProfile();
    return { profile };
  });

  app.patch("/", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const input = parseBody(req, profileInputSchema);
    const existing = await getProfile();
    const { socials, ...data } = input;

    const updated = await prisma.profile.update({
      where: { id: existing.id },
      data: {
        ...data,
        socials: {
          deleteMany: {},
          create: socials.map((s) => ({ label: s.label, url: s.url, handle: s.handle ?? null, order: s.order })),
        },
      },
      include: { socials: { orderBy: { order: "asc" } } },
    });
    await audit(req, "profile.update", "profile", updated.id);
    return { profile: updated };
  });
}
