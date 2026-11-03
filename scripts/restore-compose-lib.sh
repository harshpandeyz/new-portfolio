#!/usr/bin/env bash

RESTORE_COMPOSE_ENV_FILE="${RESTORE_COMPOSE_ENV_FILE:-}"
if [[ -z "$RESTORE_COMPOSE_ENV_FILE" || ! -r "$RESTORE_COMPOSE_ENV_FILE" ]]; then
  echo "Set RESTORE_COMPOSE_ENV_FILE to a readable disposable restore .env file." >&2
  return 1 2>/dev/null || exit 1
fi
RESTORE_COMPOSE_PROJECT="${RESTORE_COMPOSE_PROJECT:-hp-os-restore}"
if [[ "$RESTORE_COMPOSE_PROJECT" != "hp-os-restore" ]]; then
  echo "RESTORE_COMPOSE_PROJECT must be hp-os-restore." >&2
  return 1 2>/dev/null || exit 1
fi
node "$ROOT_DIR/scripts/validate-restore-env.mjs" "$RESTORE_COMPOSE_ENV_FILE"

# Process environment variables otherwise override Compose --env-file values.
# These are the values that control the restore project's identity, volume,
# network, host database port, and database role credentials.
compose_restore() {
  env \
    -u COMPOSE_PROJECT_NAME \
    -u POSTGRES_HOST_PORT \
    -u POSTGRES_PASSWORD \
    -u POSTGRES_APP_PASSWORD \
    -u POSTGRES_MIGRATOR_PASSWORD \
    -u DATABASE_VOLUME_NAME \
    -u UPLOAD_VOLUME_NAME \
    -u APP_SUBNET \
    -u DB_IPV4 \
    -u API_IPV4 \
    -u WEB_IPV4 \
    docker compose --env-file "$RESTORE_COMPOSE_ENV_FILE" --project-name "$RESTORE_COMPOSE_PROJECT" "$@"
}
