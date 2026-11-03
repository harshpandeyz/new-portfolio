#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source "$ROOT_DIR/scripts/restore-compose-lib.sh"

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: AGE_IDENTITY=/secure/path/age.key scripts/restore.sh backup.tar.gz.age" >&2
  exit 2
fi
: "${AGE_IDENTITY:?Set AGE_IDENTITY to the offline age private identity file}"
if ! command -v age >/dev/null 2>&1; then
  echo "age is required to decrypt backups; install it before continuing." >&2
  exit 1
fi
if [[ ! -r "$AGE_IDENTITY" ]]; then
  echo "AGE_IDENTITY is not readable." >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESTORE_DATABASE="${RESTORE_DATABASE:-hp_os_restore_${STAMP//[^0-9]/}}"
RESTORE_MEDIA_DIR="${RESTORE_MEDIA_DIR:-$ROOT_DIR/restore-media-$STAMP}"
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM

if [[ ! "$RESTORE_DATABASE" =~ ^[a-z][a-z0-9_]{2,62}$ ]]; then
  echo "RESTORE_DATABASE must be a new PostgreSQL identifier using lowercase letters, digits, and underscores." >&2
  exit 1
fi
if [[ -e "$RESTORE_MEDIA_DIR" ]]; then
  echo "RESTORE_MEDIA_DIR already exists; choose a new empty destination." >&2
  exit 1
fi

age --decrypt --identity "$AGE_IDENTITY" --output "$WORK_DIR/backup.tar.gz" "$ARCHIVE"

# Reject absolute and parent-traversal paths before extracting the authenticated
# backup bundle. The media archive is checked again before it is unpacked.
while IFS= read -r entry; do
  case "$entry" in
    /*|..|../*|*/../*|*/..) echo "Unsafe path in backup bundle." >&2; exit 1 ;;
  esac
done < <(tar -tzf "$WORK_DIR/backup.tar.gz")
mkdir "$WORK_DIR/bundle"
tar --no-same-owner --no-same-permissions -xzf "$WORK_DIR/backup.tar.gz" -C "$WORK_DIR/bundle"
(
  cd "$WORK_DIR/bundle"
  sha256sum --check SHA256SUMS
)

while IFS= read -r entry; do
  case "$entry" in
    /*|..|../*|*/../*|*/..) echo "Unsafe path in media archive." >&2; exit 1 ;;
  esac
done < <(tar -tzf "$WORK_DIR/bundle/uploads.tar.gz")

compose_restore up -d --wait db
DB_EXISTS="$(compose_restore exec -T db psql -U postgres -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = '$RESTORE_DATABASE'")"
if [[ "$DB_EXISTS" == "1" ]]; then
  echo "Restore database already exists; no data was changed." >&2
  exit 1
fi
compose_restore exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$RESTORE_DATABASE\" OWNER hp_migrator"
compose_restore exec -T db pg_restore \
  --username hp_migrator \
  --dbname "$RESTORE_DATABASE" \
  --no-owner \
  --no-acl \
  --exit-on-error < "$WORK_DIR/bundle/database.dump"

compose_restore exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v restore_database="$RESTORE_DATABASE" <<'SQL'
SELECT format('GRANT CONNECT ON DATABASE %I TO hp_app', :'restore_database') \gexec
SQL
compose_restore exec -T db psql -U postgres -d "$RESTORE_DATABASE" -v ON_ERROR_STOP=1 <<'SQL'
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

compose_restore exec -T db psql -U hp_app -d "$RESTORE_DATABASE" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
VALUES ('__restore_permission_check__', 'ok', NOW());
UPDATE "SiteSetting" SET "value" = 'updated' WHERE "key" = '__restore_permission_check__';
DELETE FROM "SiteSetting" WHERE "key" = '__restore_permission_check__';
ROLLBACK;
SELECT 'profiles=' || count(*) FROM "Profile";
SQL

mkdir -m 700 "$RESTORE_MEDIA_DIR"
tar --no-same-owner --no-same-permissions -xzf "$WORK_DIR/bundle/uploads.tar.gz" -C "$RESTORE_MEDIA_DIR"
MEDIA_FILE_COUNT="$(find "$RESTORE_MEDIA_DIR" -type f | wc -l | tr -d ' ')"
echo "Restored backup into separate database '$RESTORE_DATABASE' and media directory '$RESTORE_MEDIA_DIR'."
echo "Media files verified: $MEDIA_FILE_COUNT. Nothing was written to the live database or uploads volume."
