import { execFileSync } from "node:child_process";
import { dockerCommand, run } from "./command.mjs";

run(dockerCommand, ["compose", "up", "-d", "db"]);

const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  try {
    const health = execFileSync(dockerCommand, ["compose", "ps", "-q", "db"], { encoding: "utf8" }).trim();
    if (health) {
      const state = execFileSync(dockerCommand, ["inspect", "--format", "{{.State.Health.Status}}", health], { encoding: "utf8" }).trim();
      if (state === "healthy") {
        console.log("[db] PostgreSQL is healthy on localhost:5432");
        process.exit(0);
      }
    }
  } catch {
    // The container may still be creating its network/volume.
  }
  execFileSync(process.platform === "win32" ? "timeout.exe" : "sleep", process.platform === "win32" ? ["2"] : ["2"]);
}

console.error("[db] PostgreSQL did not become healthy within 120 seconds.");
process.exit(1);
