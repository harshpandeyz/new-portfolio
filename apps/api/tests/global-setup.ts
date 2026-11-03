/**
 * Global test setup — requires TEST_DATABASE_URL pointing at a disposable
 * Postgres database in the isolated hp-os-test Compose project.
 * Applies migrations once, truncates content tables between runs via helpers.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for API tests.\n" +
      "Run through `npm run test:api`; it starts the isolated hp-os-test database and sets TEST_DATABASE_URL. Tests deliberately do not load .env.",
    );
  }
  process.env.DATABASE_URL = url;
  process.env.TEST_MODE = "1";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-prod";

  const schema = path.resolve(__dirname, "../prisma/schema.prisma");
  execSync(`npx prisma migrate deploy --schema "${schema}"`, { stdio: "inherit" });
}
