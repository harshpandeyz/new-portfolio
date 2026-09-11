import { dockerCommand, run } from "./command.mjs";

// Only the disposable test database is reset. The development database and
// persistent uploads are never touched by this command.
run(dockerCommand, [
  "compose", "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
  "-v", "ON_ERROR_STOP=1",
  "-c", "DROP DATABASE IF EXISTS hp_os_test WITH (FORCE);",
  "-c", "CREATE DATABASE hp_os_test;",
]);
console.log("[db] Reset disposable database hp_os_test");
