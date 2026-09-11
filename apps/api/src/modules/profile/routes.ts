import type { FastifyInstance } from "fastify";
import { profileInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, HttpError, parseBody } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

async function getProfile() {
  return prisma.profile.findFirst({ include: { socials: { orderBy: { order: "asc" } } } });
}

const requireEditor = requirePermission("content:write");

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const profile = await getProfile();
    return { profile };
  });

  app.patch("/", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const input = parseBody(req, profileInputSchema);
    const existing = await getProfile();
    if (!existing) throw new HttpError(404, "PROFILE_NOT_CONFIGURED", "Profile has not been configured yet");
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
    await audit(req, "CONTENT_UPDATED", "profile", updated.id);
    invalidateKnowledge();
    return { profile: updated };
  });
}
