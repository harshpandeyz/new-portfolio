import { readFileSync } from "node:fs";
import { npxCommand, npmCommand, run } from "./command.mjs";
import { disposableTestDatabaseUrl } from "./test-database-url.mjs";

function localEnvValue(name) {
  if (process.env[name] !== undefined) return process.env[name];
  try {
    const line = readFileSync(".env", "utf8").split(/\r?\n/).find((entry) => new RegExp(`^\\s*${name}\\s*=`).test(entry));
    if (!line) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

run(process.execPath, ["scripts/db-test-up.mjs"]);
run(process.execPath, ["scripts/db-test-reset.mjs"]);

const testDatabaseUrl = disposableTestDatabaseUrl();
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? localEnvValue("ADMIN_EMAIL") ?? "admin@harshpandey.dev";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? localEnvValue("ADMIN_PASSWORD");
if (!adminPassword || adminPassword.length < 12) {
  throw new Error("E2E requires E2E_ADMIN_PASSWORD or ADMIN_PASSWORD (at least 12 characters) to seed the disposable test database.");
}
const e2eEnv = {
  ...process.env,
  NODE_ENV: "test",
  TEST_MODE: "1",
  APP_URL: new URL(process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_WEB_PORT ?? "5174"}`).origin,
  TRUST_PROXY: "",
  UPLOAD_DIR: "/tmp/hp-os-e2e-uploads",
  MAX_UPLOAD_MB: "25",
  CERTIFICATES_SOURCE_DIR: "",
  SESSION_SECRET: "e2e-only-session-secret-not-for-production",
  SESSION_SECRET_PREVIOUS: "",
  AI_CONFIG_KEY: "e2e-only-ai-config-key-not-production",
  AI_CONFIG_KEY_PREVIOUS: "",
  TOTP_ENCRYPTION_KEY: "e2e-only-totp-key-not-for-production",
  TOTP_ENCRYPTION_KEY_PREVIOUS: "",
  LLM_PROVIDER: "none",
  LLM_API_KEY: "",
  LLM_MODEL: "",
  LLM_BASE_URL: "",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  CONTACT_NOTIFY_EMAIL: "",
  SMTP_HOST: "",
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  GITHUB_TOKEN: "",
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
  TEST_MODE: "1",
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD: adminPassword,
  E2E_ADMIN_EMAIL: adminEmail,
  E2E_ADMIN_PASSWORD: adminPassword,
  E2E_API_PORT: process.env.E2E_API_PORT ?? "4010",
  E2E_WEB_PORT: process.env.E2E_WEB_PORT ?? "5174",
};

run(npmCommand, ["run", "db:migrate"], { env: e2eEnv });
run(npmCommand, ["run", "db:seed"], { env: e2eEnv });
run(npxCommand, ["--no-install", "playwright", "test", ...process.argv.slice(2)], { env: e2eEnv });
