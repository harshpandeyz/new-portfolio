import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
export const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
export const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(rootDir, ".env"))) {
  for (const rawLine of readFileSync(path.join(rootDir, ".env"), "utf8").split("\n")) {
    const line = rawLine.trim();
    const separator = line.indexOf("=");
    if (!line || line.startsWith("#") || separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
