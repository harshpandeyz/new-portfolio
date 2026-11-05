import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Real environment variables always win; this only makes the documented
// root .env workflow work when Prisma is invoked from the API workspace.
loadEnv(path.join(rootDir, ".env"));
loadEnv(path.join(rootDir, "apps/api/.env"));

// DANGER GUARD: `prisma migrate diff --shadow-database-url=<dev-db>` EMPTIES
// the referenced database (Prisma uses it as scratch space and deletes its
// contents). The local dev database on :5432 holds real content, so refuse to
// ever use it — or the test database port — as a shadow. Use an empty scratch
// database instead (e.g. create one with `createdb`, or point at the isolated
// hp-os-test container AFTER `npm run db:test:reset`).
{
  const args = process.argv.slice(2);
  const at = args.indexOf("--shadow-database-url");
  const shadow = at >= 0 ? String(args[at + 1] ?? "") : "";
  if (
    shadow &&
    /127\.0\.0\.1:5432|localhost:5432/.test(shadow)
  ) {
    console.error(
      "REFUSED: --shadow-database-url points at the local development database (:5432). " +
        "Prisma deletes the shadow database contents during `migrate diff`; use an empty scratch database instead."
    );
    process.exit(1);
  }
}

const npm = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npm, ["--no-install", "prisma", ...process.argv.slice(2)], {
  cwd: path.join(rootDir, "apps/api"),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Unable to run Prisma: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
