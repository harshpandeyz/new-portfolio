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
  echo "[hp//os api] database already seeded — skipping"
fi

echo "[hp//os api] starting server…"
exec "$@"