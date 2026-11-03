import { dockerCommand, run } from "./command.mjs";
import { testComposeArgs, testComposeEnvironment } from "./test-compose-env.mjs";

// Only the test-only Compose project, named volume, and hp_os_test database are
// reset. The development and production project names cannot be selected here.
run(dockerCommand, [
  ...testComposeArgs, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
  "-v", "ON_ERROR_STOP=1",
  "-c", "DROP DATABASE IF EXISTS hp_os_test WITH (FORCE);",
  "-c", "CREATE DATABASE hp_os_test;",
], { env: testComposeEnvironment });
console.log("[db] Reset disposable database hp_os_test");
