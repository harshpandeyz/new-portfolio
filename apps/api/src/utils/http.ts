import type { FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import type { ZodTypeAny } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Parses and validates a JSON body with the given zod schema. */
export function parseBody<T extends ZodTypeAny>(req: FastifyRequest, schema: T): import("zod").infer<T> {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request payload failed validation", {
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return result.data;
}

export function notFound(entity: string): never {
  throw new HttpError(404, "NOT_FOUND", `${entity} not found`);
}

export function clientIp(req: FastifyRequest): string {
  return req.ip;
}

export async function audit(
  req: FastifyRequest,
  action: string,
  entity: string,
  entityId: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  const actor = req.admin?.email ?? "system";
  try {
    const { prisma } = await import("../db/prisma.js");
    await prisma.auditLog.create({
      data: {
        actor,
        action,
        entity,
        entityId,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
        ip: clientIp(req),
      },
    });
  } catch {
    // auditing must never break the request path
  }
}
