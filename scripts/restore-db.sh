#!/bin/bash
set -euo pipefail

# Usage: scripts/restore-db.sh <backup-filename> [container-name]
#
# Decrypts a given backup and pg_restores it into a brand-new one-off
# Postgres container — never the production "db" service or its db_data
# volume. This is a structural guarantee, not a convention: the throwaway
# container shares no compose project, no volume, and no server process
# with production, so there's no flag or typo that could reach real data.
#
# If <backup-filename> already exists as a local file in the repo root,
# it's used as-is and B2 is never contacted. This is the standard,
# documented restore-verification path: the production B2 application key
# is write-only by design (it can upload backups but can't read/list/delete
# them), so retrieving a backup for a real disaster-recovery restore means
# downloading it manually through an authenticated B2 console session and
# placing it here — never minting a read-capable key, even temporarily.
# Falling back to `b2 file download` below only exists for convenience in
# a dev/test setup where a broader-scoped key happens to be configured.
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup-filename> [container-name]" >&2
  exit 1
fi

BACKUP_NAME="$1"
CONTAINER_NAME="${2:-devnotes-restore-test}"

# Run from the repo root regardless of caller's working directory.
cd "$(dirname "$0")/.."

ENV_FILE=".env.production"

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

DUMP_PATH="${TMP_DIR}/restore.dump"

if [ -f "$BACKUP_NAME" ]; then
  echo "Found ${BACKUP_NAME} locally — using it, B2 not contacted."
  DOWNLOAD_PATH="$BACKUP_NAME"
else
  DOWNLOAD_PATH="${TMP_DIR}/${BACKUP_NAME}"
  echo "${BACKUP_NAME} not found locally — downloading from B2 bucket ${B2_BUCKET_NAME}..."
  b2 file download "b2://${B2_BUCKET_NAME}/${BACKUP_NAME}" "$DOWNLOAD_PATH"
fi

echo "Decrypting..."
gpg --batch --yes --pinentry-mode loopback --decrypt \
  --passphrase-fd 3 3< <(printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE") \
  -o "$DUMP_PATH" "$DOWNLOAD_PATH"

echo "Starting throwaway Postgres container: ${CONTAINER_NAME}..."
docker run -d --rm --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=restore \
  -e POSTGRES_PASSWORD=restore \
  -e POSTGRES_DB=restore \
  postgres:16 >/dev/null

# Not pg_isready: the official postgres image runs an internal *temporary*
# server during first-run init to execute setup (including the CREATE
# DATABASE for POSTGRES_DB), which accepts connections before that setup
# actually finishes, then shuts down and restarts as the real, long-running
# server. pg_isready succeeds against that temp server too, proving nothing
# about whether "restore" exists yet or which server generation is even up.
# Confirmed by watching `docker logs` on a real run here: the temp server
# reported ready at T+0ms, but CREATE DATABASE didn't run until T+690ms —
# and there's a second ~590ms gap right after where neither server is
# listening at all, during the temp-to-final handoff.
#
# Retrying CREATE DATABASE directly (instead of polling readiness and then
# creating once) survives both gaps: "already exists" means some server
# generation already created it and we're good; a connection failure means
# either gap, so it just retries until the final server is up.
echo "Waiting for Postgres to be ready and ensuring the restore database exists..."
DB_READY_ATTEMPTS=30
DB_READY_DELAY=1
for attempt in $(seq 1 "$DB_READY_ATTEMPTS"); do
  set +e
  create_db_output=$(docker exec "$CONTAINER_NAME" psql -U restore -d postgres -c "CREATE DATABASE restore;" 2>&1)
  create_db_status=$?
  set -e
  if [ "$create_db_status" -eq 0 ] || echo "$create_db_output" | grep -q "already exists"; then
    break
  fi
  if [ "$attempt" -eq "$DB_READY_ATTEMPTS" ]; then
    echo "ERROR: ${CONTAINER_NAME} never became ready / restore database could not be created" >&2
    echo "$create_db_output" >&2
    exit 1
  fi
  sleep "$DB_READY_DELAY"
done

docker cp "$DUMP_PATH" "${CONTAINER_NAME}:/tmp/restore.dump"

echo "Restoring..."
docker exec "$CONTAINER_NAME" \
  pg_restore -U restore -d restore --clean --if-exists /tmp/restore.dump || true
# `|| true`: pg_restore routinely exits non-zero on harmless notices (e.g.
# "does not exist, skipping" from --if-exists on a fresh database with
# nothing to drop yet) even when the restore itself succeeded. The row
# counts below are the actual correctness signal, not this exit code.

echo
echo "Row counts in restored database:"
docker exec "$CONTAINER_NAME" \
  psql -U restore -d restore -c \
  "select 'tags' as table_name, count(*) from tags
   union all select 'notes', count(*) from notes
   union all select 'note_tag', count(*) from note_tag
   union all select 'blog_posts', count(*) from blog_posts;"

echo
echo "Restored database is live for manual inspection:"
echo "  docker exec -it ${CONTAINER_NAME} psql -U restore -d restore"
echo "When done, tear it down with:"
echo "  docker stop ${CONTAINER_NAME}"
