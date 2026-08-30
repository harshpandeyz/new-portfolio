import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findApiRoot(start: string): string {
  let current = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, "prisma", "schema.prisma"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(process.cwd(), "apps/api");
}

const apiRoot = findApiRoot(__dirname);

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const isTest = process.env.TEST_MODE === "1";

function parseTrustProxy(raw: string | undefined): boolean | number | string[] {
  const value = raw?.trim();
  if (!value) return 1; // default: trust exactly one reverse proxy (nginx/Caddy/Render/Railway)
  if (/^\d+$/.test(value)) return Number(value);
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  // treated as a list of trusted proxies (IPs or CIDRs), e.g. "10.0.0.0/8,127.0.0.1"
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const rawSessionSecret = required("SESSION_SECRET", isTest ? "test-only-session-secret-not-for-prod" : undefined);

// Reject placeholder secrets in production
if (!isTest && process.env.NODE_ENV === "production" && /^(generate|change-me|test-only)/i.test(rawSessionSecret)) {
  throw new Error("SESSION_SECRET must be a strong random value in production. Generate one with: openssl rand -hex 32");
}

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  sessionSecret: rawSessionSecret,
  sessionTtlDays: 7,
  // resolved relative to the API package root in both source and compiled
  // layouts, regardless of the process CWD
  uploadDir: path.resolve(apiRoot, process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 25),
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  llm: {
    provider: (process.env.LLM_PROVIDER ?? "none").toLowerCase(),
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "",
    baseUrl: process.env.LLM_BASE_URL ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    notifyEmail: process.env.CONTACT_NOTIFY_EMAIL ?? "",
  },
  githubToken: process.env.GITHUB_TOKEN ?? "",
  corsOrigins: (process.env.APP_URL ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

export const COOKIE_NAMES = {
  session: "hp_session",
  csrf: "hp_csrf",
} as const;
