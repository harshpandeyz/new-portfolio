import type { FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import type { ZodTypeAny } from "zod";

import { config } from "../config.js";

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

export function parseQuery<T extends ZodTypeAny>(req: FastifyRequest, schema: T): import("zod").infer<T> {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Query parameters failed validation", {
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

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "session",
  "csrf",
  "x-csrf-token",
  "totp",
  "secret",
  "totpsecret",
  "recovery",
  "recoverycode",
  "code",
  "cookie",
  "authorization",
  "set-cookie",
  "database_url",
  "api_key",
  "apikey",
  "smtp_password",
  "apikeyenc",
  "llm_api_key",
  "resend_api_key",
]);

/** Strips sensitive values from audit metadata. Never logs secrets. */
export function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
      continue;
    }
    if (v !== null && typeof v === "object") {
      out[k] = "[object]";
      continue;
    }
    out[k] = v;
  }
  return out;
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
        meta: sanitizeMeta(meta) as Prisma.InputJsonValue | undefined,
        ip: clientIp(req),
      },
    });
  } catch (err) {
    // auditing must never break the request path, but log the failure
    console.error("[audit] failed to write audit log", err instanceof Error ? err.name : "unknown error");
  }
}

/**
 * Origin validation for state-changing requests. The API serves a
 * cross-origin SPA (Netlify -> Render), so we allow only the configured
 * APP_URL origins. Missing Origin (same-origin / curl / mobile) is allowed
 * because CSRF double-submit is still enforced.
 */
export function assertAllowedOrigin(req: FastifyRequest): void {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!config.corsOrigins.includes(origin)) {
    throw new HttpError(403, "FORBIDDEN_ORIGIN", "Request origin is not allowed");
  }
}

export function noStore(reply: FastifyReply): void {
  reply.header("cache-control", "no-store, no-cache, must-revalidate, private");
  reply.header("pragma", "no-cache");
}
