/**
 * LLMProvider abstraction — environment config + admin-managed DB providers.
 *
 * Priority chain (first configured + enabled wins, fallbacks last):
 *   1. Admin AiProviderConfig rows (OpenAI-compatible /chat/completions,
 *      supports OpenRouter, NVIDIA, OpenAI, Groq, custom endpoints)
 *   2. Legacy env config (LLM_PROVIDER / LLM_API_KEY / LLM_MODEL / LLM_BASE_URL)
 *   3. Noop → deterministic knowledge-base answers, zero hallucination surface
 *
 * Secrets are decrypted server-side only and never leave the backend.
 */

import { config } from "../../config.js";
import { decryptApiKey } from "../ai-providers/secrets.js";
import { enabledProviderRows } from "../ai-providers/store.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(messages: LlmMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<string>;
}

class OpenAiCompatibleProvider implements LlmProvider {
  constructor(
    readonly name: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number,
    private readonly defaultTemperature: number,
    private readonly defaultMaxTokens: number,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(messages: LlmMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const baseUrl = this.baseUrl.replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(Math.max(this.timeoutMs, 2000), 60000));
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`LLM provider error ${res.status}`);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned empty content");
      return content.trim();
    } finally {
      clearTimeout(timeout);
    }
  }
}

class NoopProvider implements LlmProvider {
  readonly name = "knowledge-base";
  isConfigured(): boolean {
    return false;
  }
  async complete(): Promise<string> {
    throw new Error("No LLM provider configured");
  }
}

function envProvider(): LlmProvider | null {
  switch (config.llm.provider) {
    case "openai":
      return new OpenAiCompatibleProvider("openai", config.llm.baseUrl || "https://api.openai.com/v1", config.llm.model || "gpt-4o-mini", config.llm.apiKey, 20000, 0.2, 500);
    case "groq":
      return new OpenAiCompatibleProvider("groq", config.llm.baseUrl || "https://api.groq.com/openai/v1", config.llm.model || "llama-3.1-8b-instant", config.llm.apiKey, 20000, 0.2, 500);
    case "openrouter":
      return new OpenAiCompatibleProvider("openrouter", config.llm.baseUrl || "https://openrouter.ai/api/v1", config.llm.model || "meta-llama/llama-3.1-8b-instruct:free", config.llm.apiKey, 25000, 0.2, 500);
    case "nvidia":
      return new OpenAiCompatibleProvider("nvidia", config.llm.baseUrl || "https://integrate.api.nvidia.com/v1", config.llm.model || "meta/llama-3.1-8b-instruct", config.llm.apiKey, 25000, 0.2, 500);
    case "custom":
      return new OpenAiCompatibleProvider("custom", config.llm.baseUrl || "https://api.openai.com/v1", config.llm.model || "gpt-4o-mini", config.llm.apiKey, 20000, 0.2, 500);
    default:
      return null;
  }
}

/** All usable providers in priority order (DB first, env fallback last). */
export async function getLlmProviders(): Promise<LlmProvider[]> {
  const out: LlmProvider[] = [];
  try {
    const rows = await enabledProviderRows();
    for (const row of rows) {
      const key = decryptApiKey(row.apiKeyEnc);
      if (!key) continue;
      out.push(
        new OpenAiCompatibleProvider(
          `db:${row.name}`,
          row.baseUrl,
          row.model,
          key,
          row.timeoutMs,
          row.temperature,
          row.maxTokens,
        ),
      );
    }
  } catch {
    // DB providers unavailable (pre-migration) — fall through to env.
  }
  const env = envProvider();
  if (env?.isConfigured()) out.push(env);
  return out;
}

export function getLlmProvider(): LlmProvider {
  // Synchronous legacy accessor (env only). Prefer getLlmProviders() for the
  // full DB-backed chain.
  return envProvider() ?? new NoopProvider();
}

/** Try each provider in order; returns answer + provider name, or throws. */
export async function completeWithFallback(
  messages: LlmMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<{ text: string; provider: string }> {
  const providers = await getLlmProviders();
  let lastError: unknown = null;
  for (const p of providers) {
    try {
      const text = await p.complete(messages, options);
      return { text, provider: p.name };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("No LLM provider configured");
}
