/**
 * Always point automated browser and API tests at the disposable local DB
 * created by db-test-reset.mjs. Never inherit a remote DATABASE_URL from .env.
 */
export function disposableTestDatabaseUrl() {
  const username = encodeURIComponent("postgres");
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD ?? "postgres");
  return `postgresql://${username}:${password}@127.0.0.1:5432/hp_os_test`;
}
