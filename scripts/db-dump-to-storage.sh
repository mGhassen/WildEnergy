#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?}"
: "${SUPABASE_SERVICE_ROLE_KEY:?}"
: "${SUPABASE_DB_PASSWORD:?}"
: "${DB_HOST:?}"
: "${DB_USER:?}"
: "${DB_NAME:?}"

BUCKET="${BUCKET:-wildenergy-dumps}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PREFIX="${PREFIX:-dumps}"

AUTH_HEADER="Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
API_KEY_HEADER="apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
FILE="remote_full_${TIMESTAMP}.sql"
OBJECT_PATH="${PREFIX}/${FILE}"

ENCODED_PASSWORD="$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["SUPABASE_DB_PASSWORD"], safe=""))')"
DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"

echo "Ensuring bucket '${BUCKET}' exists..."
STATUS="$(curl -sS -o /tmp/bucket-create.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/storage/v1/bucket" \
  -H "${AUTH_HEADER}" \
  -H "${API_KEY_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${BUCKET}\",\"name\":\"${BUCKET}\",\"public\":false}")"

if [[ "${STATUS}" != "200" && "${STATUS}" != "201" ]]; then
  if ! grep -qiE 'already exists|duplicate|resource already' /tmp/bucket-create.json; then
    echo "Failed to create bucket (HTTP ${STATUS}):"
    cat /tmp/bucket-create.json
    exit 1
  fi
fi

echo "Dumping database..."
pg_dump "${DATABASE_URL}" --no-owner --no-acl -f "${FILE}"
ls -lh "${FILE}"

echo "Uploading to storage://${BUCKET}/${OBJECT_PATH}..."
STATUS="$(curl -sS -o /tmp/upload.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJECT_PATH}" \
  -H "${AUTH_HEADER}" \
  -H "${API_KEY_HEADER}" \
  -H "Content-Type: application/sql" \
  -H "x-upsert: true" \
  --data-binary @"${FILE}")"

if [[ "${STATUS}" != "200" && "${STATUS}" != "201" ]]; then
  echo "Upload failed (HTTP ${STATUS}):"
  cat /tmp/upload.json
  exit 1
fi

echo "Uploaded OK."

echo "Pruning dumps older than ${RETENTION_DAYS} days..."
CUTOFF="$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)"
export CUTOFF BUCKET PREFIX SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY

curl -sS -X POST "${SUPABASE_URL}/storage/v1/object/list/${BUCKET}" \
  -H "${AUTH_HEADER}" \
  -H "${API_KEY_HEADER}" \
  -H "Content-Type: application/json" \
  -d "{\"prefix\":\"${PREFIX}/\",\"limit\":1000,\"offset\":0}" \
  > /tmp/dump-list.json

python3 - <<'PY'
import json
import os
import urllib.request

cutoff = os.environ["CUTOFF"]
url = os.environ["SUPABASE_URL"].rstrip("/")
bucket = os.environ["BUCKET"]
prefix = os.environ["PREFIX"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

with open("/tmp/dump-list.json") as f:
    items = json.load(f)

if not isinstance(items, list):
    raise SystemExit(f"Unexpected list response: {items}")

to_delete = []
for item in items:
    name = item.get("name") or ""
    created = item.get("created_at") or ""
    if not name.endswith(".sql"):
        continue
    if not created or created >= cutoff:
        continue
    path = name if name.startswith(f"{prefix}/") else f"{prefix}/{name}"
    to_delete.append(path)

to_delete = sorted(set(to_delete))
print(f"Cutoff: {cutoff}")
print(f"Deleting {len(to_delete)} object(s)")

if not to_delete:
    raise SystemExit(0)

body = json.dumps(to_delete).encode()
req = urllib.request.Request(
    f"{url}/storage/v1/object/{bucket}",
    data=body,
    method="DELETE",
    headers={
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    },
)
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode())
PY

echo "Done: ${OBJECT_PATH}"
