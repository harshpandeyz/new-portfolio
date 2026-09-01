#!/bin/sh
set -e

# HP//OS API container entrypoint — migration + idempotent initial seed,
# then hand off to the server process.

echo "[hp//os api] applying database migrations…"
node /app/node_modules/.bin/prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma

NEED_SEED=$(node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); p.$connect().then(() => p.project.count()).then((c) => { console.log(c === 0 ? "1" : "0"); }).catch(() => { console.log("1"); }).finally(() => process.exit(0));')

if [ "$NEED_SEED" = "1" ]; then
  echo "[hp//os api] database empty — seeding verified data…"
  (cd /app/apps/api && node /app/node_modules/.bin/tsx prisma/seed.ts)
else
  echo "[hp//os api] database already seeded — checking media assets…"
  # Seed populates certificates from seed-assets into uploads. On a fresh
  # volume (hp_uploads) the DB survives in hp_pgdata but the files are gone.
  # Ensure the on-disk assets exist even when the DB seed is skipped.
  (cd /app/apps/api && node -e "
import fs from 'node:fs';
import path from 'node:path';
const srcDir = path.join(process.cwd(), 'seed-assets/certificates');
const destDir = path.join(process.cwd(), 'uploads/certificates');
try {
  if (!fs.existsSync(srcDir)) { console.log('[hp//os api] no seed-assets/certificates dir — skipping media sync'); process.exit(0); }
  fs.mkdirSync(destDir, {recursive:true});
  let copied = 0;
  for (const file of fs.readdirSync(srcDir)) {
    const safe = file.replace(/[^a-zA-Z0-9._ -]/g, '').replace(/\s+/g,'-');
    const src = path.join(srcDir, file);
    const dst = path.join(destDir, safe);
    if (!fs.existsSync(dst)) { fs.copyFileSync(src, dst); copied++; }
  }
  if (copied > 0) console.log('[hp//os api] restored ' + copied + ' certificate assets into uploads/certificates');
  else console.log('[hp//os api] media assets already present');
} catch(e) { console.error('[hp//os api] media sync failed:', e.message); }
")
fi

echo "[hp//os api] starting server…"
exec "$@"