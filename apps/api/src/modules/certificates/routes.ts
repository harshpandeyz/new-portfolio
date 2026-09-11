import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { certificateInputSchema, certificateQuerySchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireCsrf } from "../auth/routes.js";
import { requirePermission } from "../auth/rbac.js";
import { clientIp } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { HttpError } from "../../utils/http.js";
import { audit, notFound, parseBody, parseQuery } from "../../utils/http.js";
import { invalidateKnowledge } from "../chat/knowledge.js";

const requireEditor = requirePermission("content:write");

export async function certificateRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { category, search, page: pageNum } = parseQuery(req, certificateQuerySchema);
    const pageSize = 24;

    const where: Prisma.CertificateWhereInput = {
      ...(category && category !== "ALL" ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { issuer: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        orderBy: [{ featured: "desc" }, { order: "asc" }, { issuedOn: "desc" }],
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.certificate.count({ where }),
    ]);

    return { certificates, total, page: pageNum, pageSize };
  });

  app.get("/:id", async (req) => {
    const { id } = req.params as { id: string };
    const certificate = await prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw notFound("Certificate");
    void prisma.analyticsEvent
      .create({ data: { type: "certificate_view", ref: certificate.title } })
      .catch(() => undefined);
    return { certificate };
  });

  app.post("/", { preHandler: [requireEditor, requireCsrf] }, async (req, reply) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const input = parseBody(req, certificateInputSchema);
    const certificate = await prisma.certificate.create({ data: input });
    await audit(req, "CONTENT_CREATED", "certificate", certificate.id, { title: certificate.title });
    invalidateKnowledge();
    reply.code(201);
    return { certificate };
  });

  app.patch("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    const input = parseBody(req, certificateInputSchema.partial());
    const certificate = await prisma.certificate.update({ where: { id }, data: input });
    await audit(req, "CONTENT_UPDATED", "certificate", id, { title: certificate.title });
    invalidateKnowledge();
    return { certificate };
  });

  app.delete("/:id", { preHandler: [requireEditor, requireCsrf] }, async (req) => {
    const wl = rateLimit(`write:${clientIp(req)}`, 60, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    const { id } = req.params as { id: string };
    await prisma.certificate.delete({ where: { id } });
    await audit(req, "CONTENT_DELETED", "certificate", id);
    invalidateKnowledge();
    return { ok: true };
  });
}
