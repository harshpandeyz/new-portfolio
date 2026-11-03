import { execFileSync } from "node:child_process";
import { dockerCommand, run } from "./command.mjs";
import { testComposeArgs, testComposeEnvironment, TEST_POSTGRES_PORT } from "./test-compose-env.mjs";

// Automated tests use a separate Compose project, volume, and host port. This
// prevents a production .env project name or port from redirecting test DB
// reset commands to the deployed database.
run(dockerCommand, [...testComposeArgs, "up", "-d", "db"], { env: testComposeEnvironment });

const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  try {
    const container = execFileSync(dockerCommand, [...testComposeArgs, "ps", "-q", "db"], { encoding: "utf8", env: testComposeEnvironment }).trim();
    if (container) {
      const state = execFileSync(dockerCommand, ["inspect", "--format", "{{.State.Health.Status}}", container], { encoding: "utf8" }).trim();
      if (state === "healthy") {
        console.log(`[test-db] Isolated PostgreSQL is healthy on localhost:${TEST_POSTGRES_PORT} in Compose project hp-os-test.`);
        process.exit(0);
      }
    }
  } catch {
    // The test container may still be creating its network or volume.
  }
  execFileSync(process.platform === "win32" ? "timeout.exe" : "sleep", process.platform === "win32" ? ["2"] : ["2"]);
}

console.error("[test-db] Isolated PostgreSQL did not become healthy within 120 seconds.");
process.exit(1);
