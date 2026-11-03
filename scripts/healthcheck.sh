#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for service in db api web; do
  status="$(docker compose ps --format '{{.Service}} {{.Health}} {{.State}}' "$service" | tail -n 1)"
  if [[ -z "$status" || "$status" != *"healthy"* ]]; then
    echo "Service health check failed: $service" >&2
    docker compose ps "$service" >&2
    exit 1
  fi
done

docker compose exec -T db pg_isready -U postgres -d hp_os >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${API_HOST_PORT:-4000}/api/health" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${API_HOST_PORT:-4000}/api/ready" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${WEB_HOST_PORT:-5173}/" >/dev/null
echo "PostgreSQL, API liveness/readiness, and web NGINX are healthy."
