import { existsSync } from "node:fs";
import { isIP } from "node:net";
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

// TEST_MODE relaxes secrets, proxy trust and rate limits for the isolated
// test database. It must never be enabled in a real production process:
// fail fast instead of running weakened.
if (process.env.NODE_ENV === "production" && process.env.TEST_MODE === "1") {
  throw new Error("TEST_MODE=1 is not allowed when NODE_ENV=production.");
}

function isManagedProxyEnv(): boolean {
  // Render (and similar managed hosts) terminate TLS at their own edge and
  // forward via X-Forwarded-* from dynamic IPs. There is no stable /32 to
  // allow-list, so hop-count / boolean trust is the correct setting there.
  // Deliberately keyed ONLY on explicit host signals — never on the cookie
  // mode, so a mis-set COOKIE_SAMESITE cannot silently weaken client-IP
  // trust (rate limits, audit IPs) on single-host deployments.
  return process.env.RENDER === "true" || Boolean(process.env.RENDER_EXTERNAL_URL);
}

function parseTrustProxy(raw: string | undefined): boolean | number | string[] {
  const value = raw?.trim();
  if (!value) {
    if (isTest) return false;
    // On managed hosts without an explicit TRUST_PROXY, trust the first
    // proxy hop (the platform router). Everywhere else keep direct behavior.
    if (isManagedProxyEnv()) return 1;
    return 0;
  }
  if (/^\d+$/.test(value)) return Number(value);
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const rawSessionSecret = required("SESSION_SECRET", isTest ? "test-only-session-secret-not-for-prod" : undefined);
const isProd = process.env.NODE_ENV === "production";
const rawAppUrl = process.env.APP_URL ?? (isTest ? "http://localhost:5173" : "http://localhost:5173");
const rawAiConfigKey = process.env.AI_CONFIG_KEY?.trim() ?? "";
const rawTotpEncryptionKey = process.env.TOTP_ENCRYPTION_KEY?.trim() ?? "";
const rawTrustProxy = process.env.TRUST_PROXY;

function validateStrongSecret(name: string, value: string): void {
  if (
    value.length < 32 ||
    new Set(value).size < 12 ||
    /^(.)\1+$/.test(value) ||
    /^(change[-_ ]?me|replace[-_ ]?this|generate|test[-_ ]only|password|secret|example)/i.test(value)
  ) {
    throw new Error(`${name} must be a strong random value of at least 32 characters.`);
  }
}

function validatePublicOrigin(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid public HTTPS origin.`);
  }
  const hostname = url.hostname.toLowerCase();
  const placeholder =
    hostname === "example.com" || hostname === "example.org" || hostname === "example.net" ||
    hostname.endsWith(".example") || hostname.endsWith(".example.com") || hostname.endsWith(".example.org") || hostname.endsWith(".example.net") ||
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".test") ||
    /your[-_]?domain|change[-_]?me|replace[-_]?this/i.test(value);
  if (
    url.protocol !== "https:" ||
    !hostname ||
    isIP(hostname) !== 0 ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    value !== url.origin ||
    placeholder
  ) {
    throw new Error(`${name} must be the exact public HTTPS origin without credentials, a path, localhost, or a placeholder domain.`);
  }
  return url.origin;
}

// Reject placeholder or weak secrets in production. 32 bytes hex = 64 chars.
if (!isTest && isProd) {
  validateStrongSecret("SESSION_SECRET", rawSessionSecret);
  if (!rawAppUrl.trim()) throw new Error("APP_URL is required in production.");
  // APP_URL may be a single origin (same-origin Docker deploy) or a
  // comma-separated allow-list (split Netlify frontend + custom domains).
  for (const origin of rawAppUrl.split(",").map((s) => s.trim()).filter(Boolean)) {
    validatePublicOrigin("APP_URL", origin);
  }
  if (!rawAiConfigKey) throw new Error("AI_CONFIG_KEY is required in production; generate and persist a separate key with: openssl rand -hex 32");
  if (!rawTotpEncryptionKey) throw new Error("TOTP_ENCRYPTION_KEY is required in production; generate and persist a separate key with: openssl rand -hex 32");
  validateStrongSecret("AI_CONFIG_KEY", rawAiConfigKey);
  validateStrongSecret("TOTP_ENCRYPTION_KEY", rawTotpEncryptionKey);
  if (rawSessionSecret === rawAiConfigKey || rawSessionSecret === rawTotpEncryptionKey || rawAiConfigKey === rawTotpEncryptionKey) {
    throw new Error("SESSION_SECRET, AI_CONFIG_KEY, and TOTP_ENCRYPTION_KEY must be separate persistent keys.");
  }
  // Managed hosts (Render) sit behind dynamic edge IPs: hop-count trust
  // (TRUST_PROXY=1) is the correct setting there. Private Docker/Caddy
  // deployments must still pin the exact proxy IP (/32 or /128 only).
  const managedProxy = isManagedProxyEnv();
  if (!rawTrustProxy && managedProxy) {
    // Allowed: platform router is trusted implicitly (see parseTrustProxy).
  } else if (!rawTrustProxy || /^(true|false|\d+)$/i.test(rawTrustProxy.trim())) {
    if (!managedProxy) {
      throw new Error("TRUST_PROXY must list the exact trusted proxy IP address(es) in production; boolean and hop-count trust are rejected.");
    }
  } else {
    const proxies = rawTrustProxy.split(",").map((item) => item.trim()).filter(Boolean);
    if (proxies.length === 0 || proxies.some((item) => {
      const [address, prefix] = item.split("/");
      const version = isIP(address ?? "");
      return version === 0 || (prefix !== undefined && Number(prefix) !== (version === 4 ? 32 : 128));
    })) {
      throw new Error("TRUST_PROXY must contain exact IP addresses or /32 and /128 entries only.");
    }
  }
}

function safeNumber(raw: string | undefined, fallback: number, min?: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return fallback;
  return n;
}

function normalizeOriginList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function parseCookieSameSite(): "lax" | "none" {
  const raw = (process.env.COOKIE_SAMESITE ?? "").trim().toLowerCase();
  if (raw === "none") return "none";
  return "lax";
}

const cookieSameSite = parseCookieSameSite();

export const config = {
  // Render injects PORT; local Docker Compose uses API_PORT. PORT wins when set.
  port: safeNumber(process.env.PORT ?? process.env.API_PORT, 4000, 1),
  cookieSameSite,
  // SameSite=None requires Secure, so force it on even outside production
  // when cross-site cookies are requested. Explicit COOKIE_SECURE wins.
  cookieSecure: (() => {
    const raw = (process.env.COOKIE_SECURE ?? "").trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return isProd;
    if (cookieSameSite === "none") return true;
    return isProd;
  })(),
  appUrl: rawAppUrl,
  isProd,
  trustProxy: parseTrustProxy(rawTrustProxy),
  sessionSecret: rawSessionSecret,
  sessionSecretPrevious: process.env.SESSION_SECRET_PREVIOUS?.trim() ?? "",
  aiConfigKey: rawAiConfigKey || rawSessionSecret,
  aiConfigKeyPrevious: process.env.AI_CONFIG_KEY_PREVIOUS?.trim() ?? "",
  totpEncryptionKey: rawTotpEncryptionKey || rawSessionSecret,
  totpEncryptionKeyPrevious: process.env.TOTP_ENCRYPTION_KEY_PREVIOUS?.trim() ?? "",
  sessionTtlDays: 7,
  // resolved relative to the API package root in both source and compiled
  // layouts, regardless of the process CWD
  uploadDir: path.resolve(apiRoot, process.env.UPLOAD_DIR ?? "uploads"),
  maxUploadMb: safeNumber(process.env.MAX_UPLOAD_MB, 25, 1),
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  llm: {
    provider: (process.env.LLM_PROVIDER ?? "none").toLowerCase(),
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "",
    baseUrl: process.env.LLM_BASE_URL ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: safeNumber(process.env.SMTP_PORT, 587, 1),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    notifyEmail: process.env.CONTACT_NOTIFY_EMAIL ?? "",
    replyFromName: process.env.REPLY_FROM_NAME ?? "Harsh Pandey",
  },
  email: {
    // Some cloud hosts restrict outbound SMTP ports, so
    // production mail goes over HTTPS. Explicit EMAIL_PROVIDER wins;
    // otherwise a present RESEND_API_KEY selects Resend automatically,
    // keeping local Gmail-SMTP setups working with zero changes.
    provider: (() => {
      const raw = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
      if (raw === "resend" || raw === "smtp") return raw;
      return process.env.RESEND_API_KEY ? "resend" : "smtp";
    })() as "resend" | "smtp",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    // Verified sender, e.g. "Harsh Pandey <hello@yourdomain.com>".
    // Resend test mode accepts "onboarding@resend.dev" (account email only).
    from: process.env.EMAIL_FROM ?? "",
  },
  githubToken: process.env.GITHUB_TOKEN ?? "",
  corsOrigins: normalizeOriginList(process.env.APP_URL ?? "http://localhost:5173"),
} as const;

export const COOKIE_NAMES = {
  session: "hp_session",
  csrf: "hp_csrf",
} as const;

/** True when the server can actually send mail (notifications + replies). */
export function isSmtpConfigured(): boolean {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.password);
}

/** Resend HTTPS API is usable when a key and a sender identity are set. */
export function isResendConfigured(): boolean {
  return Boolean(config.email.resendApiKey && config.email.from);
}

/** True when the active email provider can send (notifications + replies). */
export function isEmailConfigured(): boolean {
  return config.email.provider === "resend" ? isResendConfigured() : isSmtpConfigured();
}
