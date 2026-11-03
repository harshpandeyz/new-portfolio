#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/restore-compose-lib.sh"
: "${RESTORE_DATABASE:?Set RESTORE_DATABASE to the database created by scripts/restore.sh.}"
: "${TARGET_DATABASE:?Set TARGET_DATABASE to a new hp_os_recovered_* database name.}"

if [[ ! "$RESTORE_DATABASE" =~ ^hp_os_restore_[a-z0-9_]{3,48}$ ]]; then
  echo "RESTORE_DATABASE must be an hp_os_restore_* identifier." >&2
  exit 2
fi
if [[ ! "$TARGET_DATABASE" =~ ^hp_os_recovered_[a-z0-9_]{3,48}$ ]]; then
  echo "TARGET_DATABASE must be a new hp_os_recovered_* identifier; hp_os is never a valid target." >&2
  exit 2
fi

node scripts/validate-production-env.mjs
SOURCE_EXISTS="$(compose_restore exec -T db psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -v source_database="$RESTORE_DATABASE" <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'source_database';
SQL
)"
if [[ "$SOURCE_EXISTS" != "1" ]]; then
  echo "The requested database does not exist in the isolated restore project; no production database was changed." >&2
  exit 1
fi

DB_EXISTS="$(docker compose exec -T db psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -v target_database="$TARGET_DATABASE" <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'target_database';
SQL
)"
if [[ "$DB_EXISTS" == "1" ]]; then
  echo "Target database already exists; no data was changed." >&2
  exit 1
fi

# Create a new staging database and stream a custom-format dump from the
# isolated restore project. Existing hp_os remains untouched.
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v target_database="$TARGET_DATABASE" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER hp_migrator', :'target_database') \gexec
SQL

set -o pipefail
compose_restore exec -T db pg_dump --username hp_migrator --dbname "$RESTORE_DATABASE" --format=custom \
  | docker compose exec -T db pg_restore --username hp_migrator --dbname "$TARGET_DATABASE" --no-owner --no-acl --exit-on-error

docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v target_database="$TARGET_DATABASE" <<'SQL'
SELECT format('GRANT CONNECT ON DATABASE %I TO hp_app', :'target_database') \gexec
SQL
docker compose exec -T db psql -U postgres -d "$TARGET_DATABASE" -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO hp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hp_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE ON TYPES TO hp_app;
SQL

CHECK_KEY="__restore_permission_check_$(date -u +%Y%m%d%H%M%S)_$RANDOM"
docker compose exec -T db psql -U hp_app -d "$TARGET_DATABASE" -v ON_ERROR_STOP=1 -v check_key="$CHECK_KEY" <<'SQL'
BEGIN;
INSERT INTO "SiteSetting" ("key", "value", "updatedAt") VALUES (:'check_key', 'ok', NOW());
UPDATE "SiteSetting" SET "value" = 'updated' WHERE "key" = :'check_key';
DELETE FROM "SiteSetting" WHERE "key" = :'check_key';
ROLLBACK;
SQL

PROFILE_COUNT="$(docker compose exec -T db psql -U hp_app -d "$TARGET_DATABASE" -AtX -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM "Profile"')"
echo "Database copied and CRUD permissions verified in new staging database '$TARGET_DATABASE' (profiles=$PROFILE_COUNT)."
echo "The live hp_os database is unchanged. Review the database and media before a controlled cutover."
