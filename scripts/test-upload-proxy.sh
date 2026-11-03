#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${UPLOAD_TEST_ORIGIN:?Set UPLOAD_TEST_ORIGIN to the public HTTPS origin routed through Caddy and NGINX}"
: "${UPLOAD_TEST_EMAIL:?Set UPLOAD_TEST_EMAIL to the test administrator email}"
: "${UPLOAD_TEST_PASSWORD:?Set UPLOAD_TEST_PASSWORD to the test administrator password}"
if ! command -v curl >/dev/null || ! command -v jq >/dev/null || ! command -v python3 >/dev/null; then
  echo "curl, jq, and python3 are required for the upload proxy check." >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM
CURL_TLS=()
if [[ "${ALLOW_INSECURE_TLS:-0}" == "1" ]]; then CURL_TLS+=(--insecure); fi
CURL_RESOLVE=()
if [[ -n "${UPLOAD_TEST_RESOLVE:-}" ]]; then CURL_RESOLVE+=(--resolve "$UPLOAD_TEST_RESOLVE"); fi

python3 - "$WORK_DIR/login.json" <<'PY'
import json, os, sys
with open(sys.argv[1], "w", encoding="utf-8") as stream:
    json.dump({"email": os.environ["UPLOAD_TEST_EMAIL"], "password": os.environ["UPLOAD_TEST_PASSWORD"]}, stream)
PY
chmod 600 "$WORK_DIR/login.json"
LOGIN_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error -o "$WORK_DIR/login-response.json" -w '%{http_code}' \
  --dump-header "$WORK_DIR/login-headers.txt" \
  --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
  -H 'Content-Type: application/json' --data-binary "@$WORK_DIR/login.json" \
  "$UPLOAD_TEST_ORIGIN/api/auth/login")"

if [[ "$LOGIN_STATUS" == "202" && "$(jq -r '.requires2FA // false' "$WORK_DIR/login-response.json")" == "true" ]]; then
  : "${UPLOAD_TEST_TOTP:?This administrator has 2FA enabled; set the current UPLOAD_TEST_TOTP code}"
  python3 - "$WORK_DIR/login-2fa.json" "$WORK_DIR/login-response.json" <<'PY'
import json, os, sys
with open(sys.argv[2], encoding="utf-8") as stream: challenge = json.load(stream)["challenge"]
with open(sys.argv[1], "w", encoding="utf-8") as stream:
    json.dump({"challenge": challenge, "code": os.environ["UPLOAD_TEST_TOTP"]}, stream)
PY
  LOGIN_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error -o "$WORK_DIR/login-response.json" -w '%{http_code}' \
    --dump-header "$WORK_DIR/login-headers.txt" \
    --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
    -H 'Content-Type: application/json' --data-binary "@$WORK_DIR/login-2fa.json" \
    "$UPLOAD_TEST_ORIGIN/api/auth/login/2fa")"
fi
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Administrator login failed with HTTP $LOGIN_STATUS." >&2
  exit 1
fi

SESSION_COOKIE="$(grep -i '^set-cookie: hp_session=' "$WORK_DIR/login-headers.txt" | tr '[:upper:]' '[:lower:]' | tail -n 1 || true)"
CSRF_COOKIE="$(grep -i '^set-cookie: hp_csrf=' "$WORK_DIR/login-headers.txt" | tr '[:upper:]' '[:lower:]' | tail -n 1 || true)"
if [[ "$SESSION_COOKIE" != *"; secure"* || "$SESSION_COOKIE" != *"; httponly"* || "$SESSION_COOKIE" != *"; samesite=lax"* ]]; then
  echo "HTTPS login did not set a Secure, HttpOnly, SameSite=Lax session cookie." >&2
  exit 1
fi
if [[ "$CSRF_COOKIE" != *"; secure"* || "$CSRF_COOKIE" == *"; httponly"* || "$CSRF_COOKIE" != *"; samesite=lax"* ]]; then
  echo "HTTPS login did not set the expected readable Secure, SameSite=Lax CSRF cookie." >&2
  exit 1
fi
echo "HTTPS session and CSRF cookie flags are correct."

CSRF_TOKEN="$(jq -r '.csrfToken // empty' "$WORK_DIR/login-response.json")"
if [[ -z "$CSRF_TOKEN" ]]; then
  echo "The login response did not include a CSRF token." >&2
  exit 1
fi
BASELINE_FILES="$(docker compose exec -T api sh -c 'find /app/apps/api/uploads/media -maxdepth 1 -type f 2>/dev/null || true' | wc -l | tr -d ' ')"

python3 - "$WORK_DIR" <<'PY'
import base64, pathlib, sys
root = pathlib.Path(sys.argv[1])
png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
for size in (1024, 2 * 1024**2, 10 * 1024**2, 25 * 1024**2, 25 * 1024**2 + 1):
    with (root / f"upload-{size}.png").open("wb") as out:
        out.write(png)
        out.write(b"\0" * (size - len(png)))
with (root / "nginx-over-limit.bin").open("wb") as out:
    out.write(b"x" * (26 * 1024**2 + 1024))
PY

upload_image() {
  local file="$1" expected="$2" response="$WORK_DIR/upload-response.json"
  local status
  status="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error --max-time 180 -o "$response" -w '%{http_code}' \
    --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -F "file=@$file;type=image/png" "$UPLOAD_TEST_ORIGIN/api/media")"
  if [[ "$status" != "$expected" ]]; then
    echo "Upload $(basename "$file") returned HTTP $status; expected $expected." >&2
    jq -c '{error, message}' "$response" >&2 2>/dev/null || true
    exit 1
  fi
  if [[ "$expected" == "201" ]]; then
    local asset_id
    asset_id="$(jq -r '.asset.id' "$response")"
    local delete_status
    delete_status="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error -o /dev/null -w '%{http_code}' \
      --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
      -X DELETE -H "X-CSRF-Token: $CSRF_TOKEN" "$UPLOAD_TEST_ORIGIN/api/media/$asset_id")"
    [[ "$delete_status" == "200" ]] || { echo "Could not remove upload test asset." >&2; exit 1; }
  fi
  echo "Upload $(basename "$file"): HTTP $status"
}

upload_image "$WORK_DIR/upload-1024.png" 201
upload_image "$WORK_DIR/upload-2097152.png" 201
upload_image "$WORK_DIR/upload-10485760.png" 201
upload_image "$WORK_DIR/upload-26214400.png" 201
upload_image "$WORK_DIR/upload-26214401.png" 413

# Keep one temporary asset while both app containers restart to verify the
# upload volume and public static-media path survive container restarts.
PERSIST_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error --max-time 180 -o "$WORK_DIR/persist-response.json" -w '%{http_code}' \
  --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@$WORK_DIR/upload-1024.png;type=image/png" "$UPLOAD_TEST_ORIGIN/api/media")"
if [[ "$PERSIST_STATUS" != "201" ]]; then
  echo "Persistence probe upload returned HTTP $PERSIST_STATUS; expected 201." >&2
  exit 1
fi
PERSIST_ASSET_ID="$(jq -r '.asset.id // empty' "$WORK_DIR/persist-response.json")"
PERSIST_ASSET_URL="$(jq -r '.asset.url // empty' "$WORK_DIR/persist-response.json")"
if [[ -z "$PERSIST_ASSET_ID" || -z "$PERSIST_ASSET_URL" || "$PERSIST_ASSET_URL" != /static/* ]]; then
  echo "Persistence probe did not return a valid media asset." >&2
  exit 1
fi
docker compose restart api web >/dev/null
docker compose up -d --wait api web >/dev/null
MEDIA_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error -o /dev/null -w '%{http_code}' \
  "$UPLOAD_TEST_ORIGIN$PERSIST_ASSET_URL")"
if [[ "$MEDIA_STATUS" != "200" ]]; then
  echo "Uploaded media did not survive API/web restart (HTTP $MEDIA_STATUS)." >&2
  exit 1
fi
DELETE_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error -o /dev/null -w '%{http_code}' \
  --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
  -X DELETE -H "X-CSRF-Token: $CSRF_TOKEN" "$UPLOAD_TEST_ORIGIN/api/media/$PERSIST_ASSET_ID")"
if [[ "$DELETE_STATUS" != "200" ]]; then
  echo "Could not remove persistence probe asset after restart." >&2
  exit 1
fi
echo "Uploaded media remained available after API/web restarts."

# A multipart POST with a body beyond NGINX's 26 MiB request ceiling must be
# rejected by the proxy before Fastify can parse or write the upload.
NGINX_STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error --max-time 60 -o "$WORK_DIR/nginx-response.json" -w '%{http_code}' \
  --cookie-jar "$WORK_DIR/cookies.txt" --cookie "$WORK_DIR/cookies.txt" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@$WORK_DIR/nginx-over-limit.bin;type=application/octet-stream" \
  "$UPLOAD_TEST_ORIGIN/api/media")"
if [[ "$NGINX_STATUS" != "413" ]] || ! jq -e '.message | contains("proxy limit")' "$WORK_DIR/nginx-response.json" >/dev/null; then
  echo "NGINX did not return its expected 413 response (HTTP $NGINX_STATUS)." >&2
  exit 1
fi
echo "NGINX request ceiling: HTTP 413 with proxy-limit response"

LEFTOVER_FILES="$(docker compose exec -T api sh -c 'find /app/apps/api/uploads/media -maxdepth 1 -type f 2>/dev/null || true' | wc -l | tr -d ' ')"
if [[ "$LEFTOVER_FILES" != "$BASELINE_FILES" ]]; then
  echo "Upload test changed the media file count from $BASELINE_FILES to $LEFTOVER_FILES." >&2
  exit 1
fi
echo "Rejected uploads left no files behind; the media file count remains $BASELINE_FILES."
