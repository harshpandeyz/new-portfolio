#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WEB_BASE_URL="${WEB_BASE_URL:-http://127.0.0.1:${WEB_HOST_PORT:-5173}}"
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:${API_HOST_PORT:-4000}}"

"$ROOT_DIR/scripts/healthcheck.sh"

for route in / /projects /recruiter /files/HARSH-RESUME.pdf; do
  curl --fail --silent --show-error --output /dev/null "$WEB_BASE_URL$route"
  echo "OK $route"
done

PROJECT_ROUTES="$(curl --fail --silent --show-error "$API_BASE_URL/api/projects" | node -e '
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { data += chunk; });
process.stdin.on("end", () => {
  const projects = JSON.parse(data).projects ?? [];
  for (const project of projects) console.log(encodeURIComponent(project.slug));
});
')"
while IFS= read -r slug; do
  [[ -n "$slug" ]] || continue
  curl --fail --silent --show-error --output /dev/null "$WEB_BASE_URL/projects/$slug"
  echo "OK /projects/$slug"
done <<< "$PROJECT_ROUTES"

curl --fail --silent --show-error --output /dev/null "$API_BASE_URL/api/profile"
curl --fail --silent --show-error --output /dev/null "$API_BASE_URL/api/projects"
curl --fail --silent --show-error --output /dev/null "$API_BASE_URL/api/chat/suggestions"
echo "Public API smoke checks passed."
