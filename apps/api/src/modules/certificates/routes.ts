import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { certificateInputSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { requireAdmin, requireCsrf } from "../auth/routes.js";
import { audit, notFound, parseBody } from "../../utils/http.js";

export async function certificateRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (req) => {
    const { category, search, page } = req.query as {
      category?: string;
      search?: string;
      page?: string;
    };
    const pageSize = 24;
    const pageNum = Math.max(1, Number(page ?? "1") || 1);

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
    if (!certificate) notFound("Certificate");
    void prisma.analyticsEvent
      .create({ data: { type: "certificate_view", ref: certificate.title } })
      .catch(() => undefined);
    return { certificate };
  });

  app.post("/", { preHandler: [requireAdmin, requireCsrf] }, async (req, reply) => {
    const input = parseBody(req, certificateInputSchema);
    const certificate = await prisma.certificate.create({ data: input });
    await audit(req, "certificate.create", "certificate", certificate.id, { title: certificate.title });
    reply.code(201);
    return { certificate };
  });

  app.patch("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    const input = parseBody(req, certificateInputSchema.partial());
    const certificate = await prisma.certificate.update({ where: { id }, data: input });
    await audit(req, "certificate.update", "certificate", id, { title: certificate.title });
    return { certificate };
  });

  app.delete("/:id", { preHandler: [requireAdmin, requireCsrf] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.certificate.delete({ where: { id } });
    await audit(req, "certificate.delete", "certificate", id);
    return { ok: true };
  });
}
