import type { AiProvider } from "@hp/shared";

import { prisma } from "../../db/prisma.js";

export interface DbProviderRow {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  apiKeyEnc: string | null;
  keyHint: string | null;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  enabled: boolean;
  priority: number;
  isFallback: boolean;
  health: string;
  lastLatencyMs: number | null;
  lastError: string | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function hasPrismaModel(): boolean {
  return Boolean((prisma as unknown as Record<string, unknown>).aiProviderConfig);
}

/** True when the migration has been applied (table exists). */
export async function aiProviderTableReady(): Promise<boolean> {
  if (!hasPrismaModel()) return false;
  try {
    await (prisma as unknown as { aiProviderConfig: { count: () => Promise<number> } }).aiProviderConfig.count();
    return true;
  } catch {
    return false;
  }
}

export function toPublicProvider(row: DbProviderRow): AiProvider {
  return {
    id: row.id,
    name: row.name,
    kind: (["openai", "openrouter", "nvidia", "groq", "custom"] as const).includes(row.kind as AiProvider["kind"])
      ? (row.kind as AiProvider["kind"])
      : "custom",
    baseUrl: row.baseUrl,
    model: row.model,
    hasKey: Boolean(row.apiKeyEnc),
    keyHint: row.keyHint,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    timeoutMs: row.timeoutMs,
    enabled: row.enabled,
    priority: row.priority,
    isFallback: row.isFallback,
    health: (["unknown", "ok", "error", "disabled"] as const).includes(row.health as AiProvider["health"])
      ? (row.health as AiProvider["health"])
      : "unknown",
    lastLatencyMs: row.lastLatencyMs,
    lastError: row.lastError,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProviderRows(): Promise<DbProviderRow[]> {
  if (!(await aiProviderTableReady())) return [];
  const rows = await (prisma as unknown as { aiProviderConfig: { findMany: (a: unknown) => Promise<DbProviderRow[]> } }).aiProviderConfig.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rows;
}

/** Enabled providers ordered: primary by priority, fallbacks last. */
export async function enabledProviderRows(): Promise<DbProviderRow[]> {
  const rows = await listProviderRows();
  return rows
    .filter((r) => r.enabled && r.apiKeyEnc)
    .sort((a, b) => Number(a.isFallback) - Number(b.isFallback) || a.priority - b.priority);
}
