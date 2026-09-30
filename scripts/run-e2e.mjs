import { npxCommand, npmCommand, run } from "./command.mjs";
import { disposableTestDatabaseUrl } from "./test-database-url.mjs";

run(process.execPath, ["scripts/db-up.mjs"]);
run(process.execPath, ["scripts/db-test-reset.mjs"]);

const testDatabaseUrl = disposableTestDatabaseUrl();
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "admin@harshpandey.dev";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 12) {
  throw new Error("E2E requires E2E_ADMIN_PASSWORD or ADMIN_PASSWORD (at least 12 characters) to seed the disposable test database.");
}
const e2eEnv = {
  ...process.env,
  APP_URL: new URL(process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_WEB_PORT ?? "5174"}`).origin,
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
