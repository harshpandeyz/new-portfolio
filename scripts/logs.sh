#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TAIL="${TAIL:-100}"
ARGS=(--tail "$TAIL")
if [[ "${FOLLOW:-0}" == "1" ]]; then ARGS+=(--follow); fi
SERVICES=(db api web)
if [[ $# -gt 0 ]]; then SERVICES=("$@"); fi

exec docker compose logs "${ARGS[@]}" "${SERVICES[@]}"
