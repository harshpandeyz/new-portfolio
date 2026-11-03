import { chmodSync, lstatSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const volumeName = process.argv[2] ?? "";
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(volumeName)) {
  console.error("Volume name must contain only letters, numbers, dot, underscore, and dash.");
  process.exit(2);
}

const envPath = ".env";
let contents;
try {
  contents = readFileSync(envPath, "utf8");
} catch {
  console.error("Cannot update the upload volume: create the host-only .env file first.");
  process.exit(1);
}
const stat = lstatSync(envPath);
if (!stat.isFile()) {
  console.error("Refusing to update .env because it is not a regular file.");
  process.exit(1);
}
const mode = (stat.mode & 0o077) !== 0 ? 0o600 : stat.mode & 0o777;
const lines = contents.split(/\r?\n/);
const index = lines.findIndex((line) => /^\s*UPLOAD_VOLUME_NAME\s*=/.test(line));
if (index >= 0) lines[index] = `UPLOAD_VOLUME_NAME=${volumeName}`;
else lines.push(`UPLOAD_VOLUME_NAME=${volumeName}`);

const tempPath = `${envPath}.upload-${process.pid}.tmp`;
writeFileSync(tempPath, lines.join("\n"), { mode });
chmodSync(tempPath, mode);
renameSync(tempPath, envPath);
console.log(`Recorded upload volume '${volumeName}' in the host-only .env file.`);
