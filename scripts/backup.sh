#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/etc/hp-os-backup.env}"
if [[ -r "$BACKUP_ENV_FILE" ]]; then
  # This operator-owned file contains only the public age recipient and OCI
  # bucket metadata. root:docker mode 0640 lets the restricted service read it.
  set -a
  # shellcheck disable=SC1090
  source "$BACKUP_ENV_FILE"
  set +a
fi

: "${AGE_RECIPIENT:?Set AGE_RECIPIENT to the offline age public recipient}"
if ! command -v age >/dev/null 2>&1; then
  echo "age is required to encrypt backups; install it before continuing." >&2
  exit 1
fi
if [[ -z "${OCI_BUCKET:-}" && "${ALLOW_LOCAL_ONLY_BACKUP:-0}" != "1" ]]; then
  echo "OCI_BUCKET is required for an off-VM copy. Set ALLOW_LOCAL_ONLY_BACKUP=1 only for local verification." >&2
  exit 1
fi
if [[ -n "${OCI_BUCKET:-}" ]]; then
  if [[ -z "${OCI_NAMESPACE:-}" ]] || ! command -v oci >/dev/null 2>&1; then
    echo "Set OCI_NAMESPACE and install the OCI CLI for Object Storage uploads." >&2
    exit 1
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hp-os}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
WORK_DIR="$(mktemp -d)"
API_WAS_RUNNING=0
PARTIAL_ARCHIVE=""

restore_api() {
  if [[ -n "$PARTIAL_ARCHIVE" ]]; then rm -f "$PARTIAL_ARCHIVE"; fi
  if [[ "$API_WAS_RUNNING" == "1" ]]; then
    docker compose up -d --wait api >/dev/null
    API_WAS_RUNNING=0
  fi
  rm -rf "$WORK_DIR"
}
trap restore_api EXIT INT TERM

if [[ -n "$(docker compose ps --status running -q api 2>/dev/null || true)" ]]; then
  API_WAS_RUNNING=1
  # Quiesce writes so the database dump and media archive describe one point
  # in time. Schedule this short interruption during a quiet window.
  docker compose stop api >/dev/null
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="portfolio-${STAMP}.tar.gz.age"
ARCHIVE="$BACKUP_DIR/$NAME"
PARTIAL_ARCHIVE="$ARCHIVE.partial"

docker compose exec -T db pg_dump --username postgres --dbname hp_os --format=custom > "$WORK_DIR/database.dump"
docker compose run --rm --no-deps api tar -C /app/apps/api/uploads -czf - . > "$WORK_DIR/uploads.tar.gz"
(
  cd "$WORK_DIR"
  sha256sum database.dump uploads.tar.gz > SHA256SUMS
  tar -czf - database.dump uploads.tar.gz SHA256SUMS | age --recipient "$AGE_RECIPIENT" --output "$PARTIAL_ARCHIVE"
)
mv "$PARTIAL_ARCHIVE" "$ARCHIVE"
PARTIAL_ARCHIVE=""
chmod 600 "$ARCHIVE"
restore_api

if [[ -n "${OCI_BUCKET:-}" ]]; then
  oci os object put \
    --auth instance_principal \
    --namespace "$OCI_NAMESPACE" \
    --bucket-name "$OCI_BUCKET" \
    --name "$NAME" \
    --file "$ARCHIVE"
fi

# Local encrypted copies are kept for 30 days. Object Storage has its own
# bucket lifecycle policy, documented in docs/DEPLOYMENT.md.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'portfolio-*.tar.gz.age' -mtime +30 -delete
echo "Created encrypted database + media backup: $ARCHIVE"
