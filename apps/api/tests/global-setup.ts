/**
 * Global test setup — requires TEST_DATABASE_URL pointing at a disposable
 * Postgres database (docker compose provides hp_os_test).
 * Applies migrations once, truncates content tables between runs via helpers.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Minimal .env loader (repo root) — no dependency needed. */
function loadDotEnv() {
  const candidates = [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const file of candidates) {
    try {
      const raw = readFileSync(file, "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1]!;
        const value = m[2]!.replace(/^["']|["']$/g, "");
        if (!(key in process.env)) process.env[key] = value;
      }
      break;
    } catch {
      /* file missing — try next */
    }
  }
}

export default function setup() {
  loadDotEnv();

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for API tests.\n" +
      "Start the dev database with `docker compose up -d db` and ensure .env defines TEST_DATABASE_URL.",
    );
  }
  process.env.DATABASE_URL = url;
  process.env.TEST_MODE = "1";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-prod";

  const schema = path.resolve(__dirname, "../prisma/schema.prisma");
  execSync(`npx prisma migrate deploy --schema "${schema}"`, { stdio: "inherit" });
}
