import { chmodSync, lstatSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const tag = process.argv[2] ?? "";
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(tag)) {
  console.error("Release tag must use letters, numbers, dot, underscore, or dash (max 64 characters).");
  process.exit(2);
}

const envPath = ".env";
let contents;
try {
  contents = readFileSync(envPath, "utf8");
} catch {
  console.error("Cannot persist the release image tags: create the host-only .env file first.");
  process.exit(1);
}

const fileStat = lstatSync(envPath);
if (!fileStat.isFile()) {
  console.error("Refusing to update .env because it is not a regular file.");
  process.exit(1);
}
const originalMode = fileStat.mode & 0o777;
const mode = originalMode & 0o077 ? 0o600 : originalMode;
const updates = {
  API_IMAGE: `hp-os-api:${tag}`,
  WEB_IMAGE: `hp-os-web:${tag}`,
};
const lines = contents.split(/\r?\n/);
for (const [key, value] of Object.entries(updates)) {
  const index = lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
  if (index >= 0) lines[index] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}

const tempPath = `${envPath}.release-${process.pid}.tmp`;
writeFileSync(tempPath, lines.join("\n"), { mode });
chmodSync(tempPath, mode);
renameSync(tempPath, envPath);
console.log("Recorded the active versioned API and web image tags in the host-only .env file.");
