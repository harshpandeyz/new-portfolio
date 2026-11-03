import { readFileSync } from "node:fs";
import { isIP } from "node:net";

function readDotEnv(file) {
  const values = {};
  try {
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const at = line.indexOf("=");
      if (at <= 0) continue;
      const key = line.slice(0, at).trim();
      let value = line.slice(at + 1).trim();
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch {
    // Real deployment runs this from a directory with a host-only .env file.
  }
  return values;
}

const values = { ...readDotEnv(".env"), ...process.env };
const errors = [];
const required = [
  "POSTGRES_PASSWORD",
  "POSTGRES_APP_PASSWORD",
  "POSTGRES_MIGRATOR_PASSWORD",
  "SESSION_SECRET",
  "AI_CONFIG_KEY",
  "TOTP_ENCRYPTION_KEY",
  "APP_URL",
  "VITE_SITE_URL",
  "TRUST_PROXY",
];

for (const key of required) {
  if (!String(values[key] ?? "").trim()) errors.push(`${key} is required and cannot be empty.`);
}

function strongSecret(key, { hexOnly = false } = {}) {
  const value = String(values[key] ?? "").trim();
  if (!value) return;
  const placeholder = /^(change[-_ ]?me|replace[-_ ]?this|generate|test[-_ ]only|password|secret|example)/i.test(value);
  if (placeholder || value.length < 32 || new Set(value).size < 12 || /^(.)\1+$/.test(value)) {
    errors.push(`${key} must be a unique random secret of at least 32 characters.`);
  }
  if (hexOnly && !/^[a-f0-9]{64}$/i.test(value)) {
    errors.push(`${key} must be 64 hexadecimal characters so it is safe to embed in a PostgreSQL URL.`);
  }
}

strongSecret("POSTGRES_PASSWORD", { hexOnly: true });
strongSecret("POSTGRES_APP_PASSWORD", { hexOnly: true });
strongSecret("POSTGRES_MIGRATOR_PASSWORD", { hexOnly: true });
strongSecret("SESSION_SECRET");
strongSecret("AI_CONFIG_KEY");
strongSecret("TOTP_ENCRYPTION_KEY");

const databasePasswords = [values.POSTGRES_PASSWORD, values.POSTGRES_APP_PASSWORD, values.POSTGRES_MIGRATOR_PASSWORD]
  .map((value) => String(value ?? "").trim())
  .filter(Boolean);
if (new Set(databasePasswords).size !== databasePasswords.length) {
  errors.push("POSTGRES_PASSWORD, POSTGRES_APP_PASSWORD, and POSTGRES_MIGRATOR_PASSWORD must be different values.");
}
for (const [left, right] of [["SESSION_SECRET", "AI_CONFIG_KEY"], ["SESSION_SECRET", "TOTP_ENCRYPTION_KEY"], ["AI_CONFIG_KEY", "TOTP_ENCRYPTION_KEY"]]) {
  if (values[left] && values[left] === values[right]) errors.push(`${left} and ${right} must be separate keys.`);
}

function parseOrigin(key) {
  const raw = String(values[key] ?? "").trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    errors.push(`${key} must be a valid public HTTPS origin.`);
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  const placeholder =
    hostname === "example.com" ||
    hostname === "example.org" ||
    hostname === "example.net" ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".example.com") ||
    hostname.endsWith(".example.org") ||
    hostname.endsWith(".example.net") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test") ||
    /your[-_]?domain|change[-_]?me|replace[-_]?this/i.test(raw);
  const invalid =
    url.protocol !== "https:" ||
    !hostname ||
    isIP(hostname) !== 0 ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    raw !== url.origin ||
    placeholder;
  if (invalid) errors.push(`${key} must be the exact public HTTPS origin without a path, credentials, localhost, or placeholder domain.`);
  return invalid ? null : url.origin;
}

const appOrigin = parseOrigin("APP_URL");
const siteOrigin = parseOrigin("VITE_SITE_URL");
if (appOrigin && siteOrigin && appOrigin !== siteOrigin) {
  errors.push("APP_URL and VITE_SITE_URL must match exactly; rebuild the web image after changing either origin.");
}

const trustedProxy = String(values.TRUST_PROXY ?? "").trim();
const proxyEntries = trustedProxy.split(",").map((part) => part.trim()).filter(Boolean);
if (
  !trustedProxy ||
  /^(true|false|\d+)$/i.test(trustedProxy) ||
  proxyEntries.length === 0 ||
  proxyEntries.some((entry) => {
    const [address, prefix] = entry.split("/");
    const version = isIP(address ?? "");
    return version === 0 || (prefix !== undefined && Number(prefix) !== (version === 4 ? 32 : 128));
  })
) {
  errors.push("TRUST_PROXY must be an explicit comma-separated list of exact proxy IPs; booleans, hop counts, and broad networks are rejected in production.");
}

if (values.ADMIN_EMAIL || values.ADMIN_PASSWORD) {
  const email = String(values.ADMIN_EMAIL ?? "").trim();
  const password = String(values.ADMIN_PASSWORD ?? "");
  if (password && !email) errors.push("ADMIN_EMAIL is required when ADMIN_PASSWORD is set for a one-off bootstrap.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("ADMIN_EMAIL must be a valid email address.");
  if (password) {
    const classes = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    if (password.length < 16 || classes < 3 || /password|change[-_ ]?me|example|admin123/i.test(password)) {
      errors.push("ADMIN_PASSWORD must be at least 16 characters, use three character classes, and avoid common placeholders.");
    }
  }
}

const resendKey = String(values.RESEND_API_KEY ?? "").trim();
const emailFrom = String(values.EMAIL_FROM ?? "").trim();
if ((resendKey && !emailFrom) || (!resendKey && emailFrom)) {
  errors.push("RESEND_API_KEY and EMAIL_FROM must be configured together; the sender must be verified in Resend.");
}

if (errors.length) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production environment validation passed (secret values were not printed).");
