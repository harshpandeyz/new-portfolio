import { npmCommand, run } from "./command.mjs";
import { disposableTestDatabaseUrl } from "./test-database-url.mjs";

run(process.execPath, ["scripts/db-test-up.mjs"]);
run(process.execPath, ["scripts/db-test-reset.mjs"]);
const testDatabaseUrl = disposableTestDatabaseUrl();
const testEnv = {
  ...process.env,
  NODE_ENV: "test",
  TEST_MODE: "1",
  APP_URL: "http://localhost:5173",
  TRUST_PROXY: "",
  UPLOAD_DIR: "/tmp/hp-os-api-test-uploads",
  MAX_UPLOAD_MB: "25",
  CERTIFICATES_SOURCE_DIR: "",
  SESSION_SECRET: "test-only-session-secret-not-for-prod",
  SESSION_SECRET_PREVIOUS: "",
  AI_CONFIG_KEY: "test-only-ai-config-key-not-for-prod",
  AI_CONFIG_KEY_PREVIOUS: "",
  TOTP_ENCRYPTION_KEY: "test-only-totp-key-not-for-production",
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
  TEST_DATABASE_URL: testDatabaseUrl,
  DATABASE_URL: testDatabaseUrl,
};
run(npmCommand, ["run", "test", "--workspace", "@hp/api"], { env: testEnv });
