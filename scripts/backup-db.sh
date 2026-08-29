#!/bin/bash
set -euo pipefail

# Run from the repo root regardless of cron's working directory.
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# Non-blocking: an overlapping run exits immediately with a clear log line
# instead of queuing behind a slow/stuck previous run.
LOCK_FILE="/tmp/devnotes-backup.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SKIPPED: a backup is already running" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_NAME="devnotes-${TIMESTAMP}.dump.gpg"
BACKUP_PATH="${TMP_DIR}/${BACKUP_NAME}"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) starting backup: ${BACKUP_NAME}"

# No -h/PGPASSWORD here on purpose: pg_dump run inside the container with no
# host flag connects over the local Unix socket, which the official
# postgres image trusts by default. Passing DB_PASSWORD via `exec -e`
# instead would put it in this host's own `ps aux` output for the duration
# of the command — the exact class of leak the gpg passphrase-fd approach
# below is also avoiding.
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
    pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" -Fc \
  | gpg --batch --yes --pinentry-mode loopback --symmetric --cipher-algo AES256 \
    --passphrase-fd 3 3< <(printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE") \
    -o "$BACKUP_PATH"; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FAILED: pg_dump/gpg pipeline for ${BACKUP_NAME}" >&2
  exit 1
fi

# The b2 CLI reads B2_APPLICATION_KEY_ID / B2_APPLICATION_KEY from the
# environment automatically (already exported above via `set -a`) — no
# separate "b2 account authorize" step needed.
if ! b2 file upload "$B2_BUCKET_NAME" "$BACKUP_PATH" "$BACKUP_NAME"; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FAILED: upload of ${BACKUP_NAME} to B2 bucket ${B2_BUCKET_NAME}" >&2
  exit 1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SUCCESS: ${BACKUP_NAME} uploaded to B2 bucket ${B2_BUCKET_NAME}"
