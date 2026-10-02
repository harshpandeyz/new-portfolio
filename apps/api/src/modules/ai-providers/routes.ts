import type { FastifyInstance } from "fastify";
import { aiProviderCreateSchema, aiProviderUpdateSchema } from "@hp/shared";

import { prisma } from "../../db/prisma.js";
import { config } from "../../config.js";
import { requireCsrf } from "../auth/routes.js";
import { requireAdminRole, requirePermission } from "../auth/rbac.js";
import { audit, clientIp, HttpError, noStore, notFound, parseBody } from "../../utils/http.js";
import { rateLimit } from "../../utils/rate-limit.js";
import { decryptApiKey, encryptApiKey, keyHintFor } from "./secrets.js";
import { aiProviderTableReady, listProviderRows, toPublicProvider } from "./store.js";
import { normalizeProviderBaseUrl, requestProviderJson } from "./safe-request.js";

const DEFAULT_BASE_URL: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
  groq: "https://api.groq.com/openai/v1",
  custom: "https://api.openai.com/v1",
};

function requireTable() {
  return aiProviderTableReady().then((ready) => {
    if (!ready) throw new HttpError(503, "NOT_READY", "AI provider storage is not migrated yet. Run database migrations first.");
  });
}

function maskError(message: string): string {
  // Never leak key material or upstream internals; keep short status codes.
  return message.slice(0, 300);
}

async function probeProvider(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  mode: "connection" | "model";
}): Promise<{ latencyMs: number; modelEcho?: string }> {
  const started = Date.now();
  if (opts.mode === "connection") {
    // Prefer /models (cheap, no tokens). Fall back only when unsupported.
    const models = await requestProviderJson(opts.baseUrl, "models", {
      apiKey: opts.apiKey,
      timeoutMs: opts.timeoutMs,
    });
    if (models.status >= 200 && models.status < 300) return { latencyMs: Date.now() - started };
    if (models.status !== 404 && models.status !== 405) throw new Error(`Provider responded with HTTP ${models.status}`);
  }
  const res = await requestProviderJson(opts.baseUrl, "chat/completions", {
    apiKey: opts.apiKey,
    method: "POST",
    timeoutMs: opts.timeoutMs,
    body: {
        model: opts.model,
        messages: [{ role: "user", content: "Reply with exactly: ok" }],
        max_tokens: 8,
        temperature: 0,
        stream: false,
    },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Provider responded with HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; model?: string };
  return { latencyMs: Date.now() - started, modelEcho: (data.choices?.[0]?.message?.content ?? "").slice(0, 200) || data.model };
}

export async function aiProviderRoutes(app: FastifyInstance): Promise<void> {
  const db = () => (prisma as unknown as {
    aiProviderConfig: {
      findMany: (a: unknown) => Promise<never[]>;
      findUnique: (a: unknown) => Promise<Record<string, unknown> | null>;
      create: (a: unknown) => Promise<Record<string, unknown>>;
      update: (a: unknown) => Promise<Record<string, unknown>>;
      delete: (a: unknown) => Promise<unknown>;
      count: () => Promise<number>;
    };
  }).aiProviderConfig;

  // ── list (masked) ──
  app.get("/", { preHandler: [requirePermission("content:read")] }, async (_req, reply) => {
    noStore(reply);
    await requireTable();
    const rows = await listProviderRows();
    return {
      providers: rows.map(toPublicProvider),
      envFallback: {
        provider: config.llm.provider,
        model: config.llm.model || null,
        baseUrl: config.llm.baseUrl || null,
        configured: Boolean(config.llm.apiKey),
      },
    };
  });

  // ── create (ADMIN only — writes secrets) ──
  app.post("/", { preHandler: [requireAdminRole, requireCsrf] }, async (req, reply) => {
    const wl = await rateLimit(`ai-prov:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    await requireTable();
    const input = parseBody(req, aiProviderCreateSchema);
    let baseUrl: string;
    try {
      baseUrl = normalizeProviderBaseUrl(input.baseUrl || DEFAULT_BASE_URL[input.kind]!);
    } catch {
      throw new HttpError(400, "INVALID_PROVIDER_URL", "Use a public HTTPS provider URL. Private and reserved addresses are not allowed.");
    }
    try {
      const created = (await db().create({
        data: {
          name: input.name,
          kind: input.kind,
          baseUrl,
          model: input.model,
          apiKeyEnc: encryptApiKey(input.apiKey),
          keyHint: keyHintFor(input.apiKey),
          temperature: input.temperature ?? 0.2,
          maxTokens: input.maxTokens ?? 500,
          timeoutMs: input.timeoutMs ?? 20000,
          enabled: input.enabled ?? true,
          priority: input.priority ?? 0,
          isFallback: input.isFallback ?? false,
        },
      })) as unknown as Parameters<typeof toPublicProvider>[0];
      await audit(req, "AI_PROVIDER_CREATED", "ai_provider", created.id as unknown as string, { name: input.name, kind: input.kind });
      reply.code(201);
      return { provider: toPublicProvider(created) };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") throw new HttpError(409, "CONFLICT", "A provider with that name already exists");
      throw e;
    }
  });

  // ── update (ADMIN only) ──
  app.patch("/:id", { preHandler: [requireAdminRole, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`ai-prov:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many changes. Try again later.");
    await requireTable();
    const { id } = req.params as { id: string };
    if (!id || id.length > 64) throw notFound("AI provider");
    const input = parseBody(req, aiProviderUpdateSchema);
    const existing = (await db().findUnique({ where: { id } })) as unknown as Parameters<typeof toPublicProvider>[0] | null;
    if (!existing) throw notFound("AI provider");
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.baseUrl !== undefined) {
      try {
        data.baseUrl = normalizeProviderBaseUrl(input.baseUrl);
      } catch {
        throw new HttpError(400, "INVALID_PROVIDER_URL", "Use a public HTTPS provider URL. Private and reserved addresses are not allowed.");
      }
    }
    if (input.model !== undefined) data.model = input.model;
    if (input.temperature !== undefined) data.temperature = input.temperature;
    if (input.maxTokens !== undefined) data.maxTokens = input.maxTokens;
    if (input.timeoutMs !== undefined) data.timeoutMs = input.timeoutMs;
    if (input.enabled !== undefined) {
      data.enabled = input.enabled;
      if (!input.enabled) data.health = "disabled";
      else if ((existing.health as string) === "disabled") data.health = "unknown";
    }
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.isFallback !== undefined) data.isFallback = input.isFallback;
    if (input.apiKey?.trim()) {
      data.apiKeyEnc = encryptApiKey(input.apiKey.trim());
      data.keyHint = keyHintFor(input.apiKey.trim());
    }
    try {
      const updated = (await db().update({ where: { id }, data })) as unknown as Parameters<typeof toPublicProvider>[0];
      await audit(req, "AI_PROVIDER_UPDATED", "ai_provider", id, { keys: Object.keys(data).filter((k) => k !== "apiKeyEnc") });
      return { provider: toPublicProvider(updated) };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") throw new HttpError(409, "CONFLICT", "A provider with that name already exists");
      throw e;
    }
  });

  // ── delete (ADMIN only) ──
  app.delete("/:id", { preHandler: [requireAdminRole, requireCsrf] }, async (req) => {
    await requireTable();
    const { id } = req.params as { id: string };
    if (!id || id.length > 64) throw notFound("AI provider");
    const existing = await db().findUnique({ where: { id } });
    if (!existing) throw notFound("AI provider");
    await db().delete({ where: { id } });
    await audit(req, "AI_PROVIDER_DELETED", "ai_provider", id);
    return { ok: true };
  });

  // ── test connection / test model (ADMIN only, never returns key) ──
  app.post("/:id/test", { preHandler: [requireAdminRole, requireCsrf] }, async (req) => {
    const wl = await rateLimit(`ai-test:${clientIp(req)}`, 20, 10 * 60 * 1000);
    if (!wl.allowed) throw new HttpError(429, "RATE_LIMITED", "Too many tests. Try again later.");
    await requireTable();
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { mode?: string };
    const mode = body.mode === "model" ? "model" : "connection";
    const existing = (await db().findUnique({ where: { id } })) as unknown as Parameters<typeof toPublicProvider>[0] & { apiKeyEnc: string | null } | null;
    if (!existing) throw notFound("AI provider");
    const apiKey = decryptApiKey(existing.apiKeyEnc);
    if (!apiKey) throw new HttpError(400, "NO_KEY", "This provider has no API key stored. Save a key first.");
    const started = Date.now();
    try {
      const result = await probeProvider({
        baseUrl: (existing.baseUrl as string) || DEFAULT_BASE_URL[(existing.kind as string) ?? "custom"]!,
        apiKey,
        model: existing.model as string,
        timeoutMs: (existing.timeoutMs as number) ?? 20000,
        mode,
      });
      const latency = Date.now() - started;
      const updated = (await db().update({
        where: { id },
        data: { health: "ok", lastLatencyMs: result.latencyMs, lastError: null, lastCheckedAt: new Date() },
      })) as unknown as Parameters<typeof toPublicProvider>[0];
      await audit(req, "AI_PROVIDER_TESTED", "ai_provider", id, { mode, latencyMs: latency, ok: true });
      return { ok: true, latencyMs: result.latencyMs, echo: result.modelEcho ?? null, provider: toPublicProvider(updated) };
    } catch (e) {
      const message = maskError(e instanceof Error ? e.message : "Probe failed");
      const updated = (await db().update({
        where: { id },
        data: { health: "error", lastError: message, lastCheckedAt: new Date() },
      }).catch(() => null)) as unknown as Parameters<typeof toPublicProvider>[0] | null;
      await audit(req, "AI_PROVIDER_TESTED", "ai_provider", id, { mode, ok: false });
      throw new HttpError(502, "PROVIDER_UNREACHABLE", message);
    }
  });

  // ── rotate hint: explicit endpoint so UI can label it clearly ──
  app.post("/:id/rotate", { preHandler: [requireAdminRole, requireCsrf] }, async (req) => {
    await requireTable();
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { apiKey?: string };
    const raw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (raw.length < 8) throw new HttpError(400, "VALIDATION_ERROR", "A new API key is required to rotate");
    const existing = await db().findUnique({ where: { id } });
    if (!existing) throw notFound("AI provider");
    const updated = (await db().update({
      where: { id },
      data: { apiKeyEnc: encryptApiKey(raw), keyHint: keyHintFor(raw), health: "unknown", lastError: null },
    })) as unknown as Parameters<typeof toPublicProvider>[0];
    await audit(req, "AI_PROVIDER_KEY_ROTATED", "ai_provider", id);
    return { provider: toPublicProvider(updated) };
  });
}
