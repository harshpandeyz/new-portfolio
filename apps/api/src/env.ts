/**
 * Lightweight, dependency-free .env loader.
 *
 * Reads KEY=VALUE entries from a .env file in the repository root (or the API
 * package root) and exposes them on process.env — without overriding variables
 * that are already present in the process environment (real env wins).
 *
 * This keeps local `npm run dev`, db:seed, admin:create and tests working from
 * a fresh clone exactly as the README describes, while remaining a no-op when
 * secrets are injected as real environment variables in production.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
];

export function loadEnv(): void {
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!key) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return; // use the first .env found
  }
}

loadEnv();
