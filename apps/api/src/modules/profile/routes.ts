import type { FastifyInstance } from "fastify";
import { profileInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { audit, HttpError, parseBody } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";
import { lockMediaReferenceChanges, validateManagedMediaReferences } from "../media/references.js";

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
    const { socials, ...data } = input;

    const updated = await prisma.$transaction(async (tx) => {
      await lockMediaReferenceChanges(tx);
      const existing = await tx.profile.findFirst({ select: { id: true, avatarUrl: true, resumeUrl: true } });
      if (!existing) throw new HttpError(404, "PROFILE_NOT_CONFIGURED", "Profile has not been configured yet");
      await validateManagedMediaReferences(tx, [
        input.avatarUrl !== existing.avatarUrl ? input.avatarUrl : null,
        input.resumeUrl !== existing.resumeUrl ? input.resumeUrl : null,
      ]);
      return tx.profile.update({
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
    });
    await audit(req, "CONTENT_UPDATED", "profile", updated.id);
    invalidateKnowledge();
    return { profile: updated };
  });
}
