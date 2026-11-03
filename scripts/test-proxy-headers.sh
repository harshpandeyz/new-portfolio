#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${PROXY_TEST_ORIGIN:?Set PROXY_TEST_ORIGIN to the public HTTPS origin served by Caddy.}"
command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required." >&2; exit 1; }

CURL_TLS=()
if [[ "${ALLOW_INSECURE_TLS:-0}" == "1" ]]; then CURL_TLS+=(--insecure); fi
CURL_RESOLVE=()
if [[ -n "${PROXY_TEST_RESOLVE:-}" ]]; then CURL_RESOLVE+=(--resolve "$PROXY_TEST_RESOLVE"); fi
WORK_DIR="$(mktemp -d)"
MESSAGE_IDS=()
cleanup() {
  for message_id in "${MESSAGE_IDS[@]}"; do
    docker compose exec -T db psql -U postgres -d hp_os -v ON_ERROR_STOP=1 -v message_id="$message_id" >/dev/null <<'SQL' || true
DELETE FROM "ContactMessage" WHERE id = :'message_id';
SQL
  done
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT INT TERM

FAKE_IPS=(198.51.100.77 203.0.113.55)
EXPECTED_EDGE_IP=""
for index in "${!FAKE_IPS[@]}"; do
FAKE_IP="${FAKE_IPS[$index]}"
PROXY_TEST_EMAIL="proxy-check-$(date -u +%Y%m%d%H%M%S)-$RANDOM-$index@example.invalid"
export PROXY_TEST_EMAIL
python3 - "$WORK_DIR/contact.json" <<'PY'
import json, os, sys
with open(sys.argv[1], "w", encoding="utf-8") as stream:
    json.dump({
        "name": "Proxy forwarding verification",
        "email": os.environ["PROXY_TEST_EMAIL"],
        "subject": "Automated proxy header check",
        "message": "Disposable deployment smoke check. Please ignore.",
    }, stream)
PY
chmod 600 "$WORK_DIR/contact.json"

STATUS="$(curl "${CURL_TLS[@]}" "${CURL_RESOLVE[@]}" --silent --show-error --max-time 30 -o "$WORK_DIR/contact-response.json" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -H "X-Forwarded-For: $FAKE_IP" \
  -H "X-Real-IP: $FAKE_IP" \
  -H 'X-Forwarded-Proto: http' \
  --data-binary "@$WORK_DIR/contact.json" "$PROXY_TEST_ORIGIN/api/contact")"
if [[ "$STATUS" != "201" ]]; then
  echo "Contact proxy check $index returned HTTP $STATUS; expected 201." >&2
  exit 1
fi
MESSAGE_ID="$(jq -r '.id // empty' "$WORK_DIR/contact-response.json")"
if [[ -z "$MESSAGE_ID" ]]; then
  echo "Contact proxy check did not return a message ID." >&2
  exit 1
fi
MESSAGE_IDS+=("$MESSAGE_ID")

STORED_IP="$(docker compose exec -T db psql -U postgres -d hp_os -AtX -v ON_ERROR_STOP=1 -v message_id="$MESSAGE_ID" <<'SQL'
SELECT COALESCE(ip, '') FROM "ContactMessage" WHERE id = :'message_id';
SQL
)"
if [[ -z "$STORED_IP" || "$STORED_IP" == "$FAKE_IP" ]]; then
  echo "Fastify stored an empty or spoofed client IP." >&2
  exit 1
fi
if [[ -z "$EXPECTED_EDGE_IP" ]]; then
  EXPECTED_EDGE_IP="$STORED_IP"
elif [[ "$STORED_IP" != "$EXPECTED_EDGE_IP" ]]; then
  echo "Different spoofed headers changed the stored client IP for the same caller." >&2
  exit 1
fi
done

# The generated test message is removed by the exit trap. Never print or log
# the actual client IP collected during this check.
echo "Caddy overwrote two different spoofed forwarding addresses; Fastify stored the edge-derived client IP for both."
