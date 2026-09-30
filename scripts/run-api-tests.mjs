import { npmCommand, run } from "./command.mjs";
import { disposableTestDatabaseUrl } from "./test-database-url.mjs";

run(process.execPath, ["scripts/db-up.mjs"]);
run(process.execPath, ["scripts/db-test-reset.mjs"]);
const testDatabaseUrl = disposableTestDatabaseUrl();
run(npmCommand, ["run", "test", "--workspace", "@hp/api"], {
  env: { ...process.env, TEST_DATABASE_URL: testDatabaseUrl, DATABASE_URL: testDatabaseUrl },
});
