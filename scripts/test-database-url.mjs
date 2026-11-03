/**
 * Always point automated browser and API tests at the disposable local DB
 * created by db-test-reset.mjs. Never inherit DATABASE_URL or credentials from
 * .env; this fixed password belongs only to the isolated local test container.
 */
export function disposableTestDatabaseUrl() {
  const username = encodeURIComponent("postgres");
  const password = encodeURIComponent("hp-os-test-local-only");
  return `postgresql://${username}:${password}@127.0.0.1:55432/hp_os_test`;
}
