import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const isTest = process.env.TEST_MODE === "1";

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: required("SESSION_SECRET", isTest ? "test-only-session-secret-not-for-prod" : undefined),
  sessionTtlDays: 7,
  // resolved relative to the API package root (apps/api) regardless of CWD
  uploadDir: path.resolve(__dirname, "..", process.env.UPLOAD_DIR ?? "uploads"),
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
