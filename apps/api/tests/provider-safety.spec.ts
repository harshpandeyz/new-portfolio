import { describe, expect, it } from "vitest";

import { ProviderCooldowns } from "../src/modules/ai-providers/cooldowns.js";
import { normalizeProviderBaseUrl } from "../src/modules/ai-providers/safe-request.js";

describe("AI provider request safety", () => {
  it("accepts a public HTTPS provider URL and normalizes its path", () => {
    expect(normalizeProviderBaseUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1");
  });

  it.each([
    "http://api.openai.com/v1",
    "https://user:pass@api.openai.com/v1",
    "https://127.0.0.1/v1",
    "https://10.0.0.8/v1",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/v1",
    "https://internal.example.local/v1",
    "https://api.openai.com/v1?redirect=anything",
    "https://api.openai.com/v1#fragment",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => normalizeProviderBaseUrl(url)).toThrow();
  });

  it("opens a cooldown after repeated failures and clears it on recovery", () => {
    let now = 10_000;
    const cooldowns = new ProviderCooldowns(() => now);
    expect(cooldowns.isCoolingDown("db:primary")).toBe(false);

    cooldowns.failed("db:primary");
    expect(cooldowns.isCoolingDown("db:primary")).toBe(false);
    cooldowns.failed("db:primary");
    expect(cooldowns.isCoolingDown("db:primary")).toBe(true);

    now += 30_001;
    expect(cooldowns.isCoolingDown("db:primary")).toBe(false);
    cooldowns.succeeded("db:primary");
    cooldowns.failed("db:primary");
    expect(cooldowns.isCoolingDown("db:primary")).toBe(false);
  });
});
