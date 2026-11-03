#!/usr/bin/env bash
set -Eeuo pipefail

RESTORE_MEDIA_DIR="${1:-}"
TARGET_VOLUME="${2:-}"
if [[ -z "$RESTORE_MEDIA_DIR" || ! -d "$RESTORE_MEDIA_DIR" || -z "$TARGET_VOLUME" ]]; then
  echo "Usage: scripts/restore-media-volume.sh <verified-media-directory> <new-volume-name>" >&2
  exit 2
fi
if [[ ! "$TARGET_VOLUME" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]]; then
  echo "Volume name contains unsupported characters." >&2
  exit 2
fi

RESTORE_MEDIA_DIR="$(cd "$RESTORE_MEDIA_DIR" && pwd)"
if ! docker volume inspect "$TARGET_VOLUME" >/dev/null 2>&1; then
  docker volume create "$TARGET_VOLUME" >/dev/null
fi

docker run --rm \
  --platform linux/arm64 \
  --user 0:0 \
  --volume "$TARGET_VOLUME:/target" \
  --volume "$RESTORE_MEDIA_DIR:/restore:ro" \
  --entrypoint sh \
  node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df \
  -eu -c 'test -z "$(find /target -mindepth 1 -maxdepth 1 -print -quit)" || { echo "Target volume is not empty; refusing to overwrite it." >&2; exit 1; }; cp -a /restore/. /target/; chown -R 9200:9200 /target'

echo "Verified media copied into new volume '$TARGET_VOLUME'. The existing uploads volume was not modified."
