/**
 * LLMProvider abstraction — swap providers via environment config.
 *   LLM_PROVIDER = openai | groq | custom | none
 * Any OpenAI-compatible /chat/completions endpoint works through `custom`.
 * With `none` (default) the engine answers deterministically from the
 * knowledge base — no external calls, no hallucination surface.
 */

import { config } from "../../config.js";

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
    private readonly defaultBaseUrl: string,
    private readonly defaultModel: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(config.llm.apiKey);
  }

  async complete(messages: LlmMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const baseUrl = (config.llm.baseUrl || this.defaultBaseUrl).replace(/\/$/, "");
    const model = config.llm.model || this.defaultModel;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.llm.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options?.maxTokens ?? 500,
          temperature: options?.temperature ?? 0.2,
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

export function getLlmProvider(): LlmProvider {
  switch (config.llm.provider) {
    case "openai":
      return new OpenAiCompatibleProvider("openai", "https://api.openai.com/v1", "gpt-4o-mini");
    case "groq":
      return new OpenAiCompatibleProvider("groq", "https://api.groq.com/openai/v1", "llama-3.1-8b-instant");
    case "custom":
      return new OpenAiCompatibleProvider("custom", "https://api.openai.com/v1", "gpt-4o-mini");
    default:
      return new NoopProvider();
  }
}
