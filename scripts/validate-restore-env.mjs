import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-restore-env.mjs /path/to/.env.restore");
  process.exit(2);
}

const values = {};
for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator > 0) values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

const requiredValues = [
  "POSTGRES_PASSWORD",
  "POSTGRES_APP_PASSWORD",
  "POSTGRES_MIGRATOR_PASSWORD",
  "SESSION_SECRET",
  "AI_CONFIG_KEY",
  "TOTP_ENCRYPTION_KEY",
  "APP_URL",
  "VITE_SITE_URL",
  "TRUST_PROXY",
];
const missing = requiredValues.filter((key) => !values[key]);
if (missing.length) {
  console.error(`Restore environment is missing required Compose values: ${missing.join(", ")}`);
  process.exit(1);
}

const expectedIsolation = {
  COMPOSE_PROJECT_NAME: "hp-os-restore",
  POSTGRES_HOST_PORT: "55433",
  DATABASE_VOLUME_NAME: "hp-os-restore_hp_pgdata",
  UPLOAD_VOLUME_NAME: "hp-os-restore_hp_uploads",
  APP_SUBNET: "172.31.254.0/24",
  DB_IPV4: "172.31.254.10",
  API_IPV4: "172.31.254.20",
  WEB_IPV4: "172.31.254.30",
};
const mismatches = Object.entries(expectedIsolation)
  .filter(([key, expected]) => values[key] !== expected)
  .map(([key, expected]) => `${key} must be ${expected}`);
if (mismatches.length) {
  console.error(`Restore environment is not isolated: ${mismatches.join("; ")}.`);
  process.exit(1);
}

for (const key of ["POSTGRES_PASSWORD", "POSTGRES_APP_PASSWORD", "POSTGRES_MIGRATOR_PASSWORD"]) {
  if (!/^[a-f0-9]{64}$/i.test(values[key])) {
    console.error(`${key} in the disposable restore environment must be a unique 64-character hex value.`);
    process.exit(1);
  }
}

console.log("Disposable restore environment is isolated (secret values were not printed).");
