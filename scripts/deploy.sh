#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hp-os}"

: "${RELEASE_TAG:?Set RELEASE_TAG to a unique version tag before deployment}"
if [[ ! "$RELEASE_TAG" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$ ]]; then
  echo "RELEASE_TAG must use letters, numbers, dot, underscore, or dash (max 64 characters)." >&2
  exit 2
fi

node scripts/validate-production-env.mjs
FIRST_DEPLOY="${FIRST_DEPLOY:-0}"
if [[ "$FIRST_DEPLOY" != "0" && "$FIRST_DEPLOY" != "1" ]]; then
  echo "FIRST_DEPLOY must be 0 or 1." >&2
  exit 2
fi

export API_IMAGE="hp-os-api:$RELEASE_TAG"
export WEB_IMAGE="hp-os-web:$RELEASE_TAG"
if docker image inspect "$API_IMAGE" >/dev/null 2>&1 || docker image inspect "$WEB_IMAGE" >/dev/null 2>&1; then
  echo "A versioned image tag already exists; choose a new RELEASE_TAG so the previous image remains available." >&2
  exit 1
fi

PREVIOUS_API_IMAGE=""
PREVIOUS_WEB_IMAGE=""
if [[ -n "$(docker compose ps --status running -q api 2>/dev/null || true)" ]]; then
  PREVIOUS_API_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$(docker compose ps --status running -q api | head -n 1)")"
fi
if [[ -n "$(docker compose ps --status running -q web 2>/dev/null || true)" ]]; then
  PREVIOUS_WEB_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$(docker compose ps --status running -q web | head -n 1)")"
fi

if [[ "$FIRST_DEPLOY" == "1" ]]; then
  docker compose up -d --wait db
else
  if [[ -z "$PREVIOUS_API_IMAGE" ]]; then
    echo "No running API was found. Use FIRST_DEPLOY=1 only for a confirmed new deployment." >&2
    exit 1
  fi
  "$ROOT_DIR/scripts/backup.sh"
fi

docker compose build --pull api web
docker compose --profile ops run --rm --no-deps migrate

if [[ "$FIRST_DEPLOY" == "1" ]]; then
  EXISTING_CONTENT="$(docker compose exec -T db psql -U hp_app -d hp_os -Atqc 'SELECT (SELECT count(*) FROM "Profile") + (SELECT count(*) FROM "Project") + (SELECT count(*) FROM "Certificate") + (SELECT count(*) FROM "Skill") + (SELECT count(*) FROM "Education") + (SELECT count(*) FROM "TimelineItem") + (SELECT count(*) FROM "ContactMessage") + (SELECT count(*) FROM "MediaAsset")')"
  if [[ "$EXISTING_CONTENT" == "0" ]]; then
    docker compose run --rm --no-deps api node /app/node_modules/.bin/tsx /app/apps/api/prisma/seed.ts
  else
    echo "Existing content was detected; initial seed was skipped to preserve it."
  fi

  BOOTSTRAP_ADMIN_EMAIL="${BOOTSTRAP_ADMIN_EMAIL:-}"
  if [[ -z "$BOOTSTRAP_ADMIN_EMAIL" ]]; then
    read -r -p "Administrator email for first-time provisioning: " BOOTSTRAP_ADMIN_EMAIL
  fi
  if [[ ! "$BOOTSTRAP_ADMIN_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
    echo "A valid administrator email is required for a first deployment." >&2
    exit 1
  fi
  docker compose run --rm --no-deps -it api node --import tsx /app/scripts/admin-create.ts --email "$BOOTSTRAP_ADMIN_EMAIL"
fi

docker compose up -d --wait api web
"$ROOT_DIR/scripts/smoke-test.sh"
node scripts/set-release-images.mjs "$RELEASE_TAG"

echo "Release $RELEASE_TAG is healthy. Previous image tags are retained for application rollback."
if [[ -n "$PREVIOUS_API_IMAGE" && -n "$PREVIOUS_WEB_IMAGE" ]]; then
  echo "Previous images: API=$PREVIOUS_API_IMAGE WEB=$PREVIOUS_WEB_IMAGE"
  echo "Schema rollback is not automatic; use the documented rollback compatibility procedure."
fi
