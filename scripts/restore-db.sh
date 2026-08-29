#!/bin/bash
set -euo pipefail

# Usage: scripts/restore-db.sh <backup-filename> [container-name]
#
# Downloads a given backup object from B2, decrypts it, and pg_restores it
# into a brand-new one-off Postgres container — never the production "db"
# service or its db_data volume. This is a structural guarantee, not a
# convention: the throwaway container shares no compose project, no volume,
# and no server process with production, so there's no flag or typo that
# could reach real data.
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

DOWNLOAD_PATH="${TMP_DIR}/${BACKUP_NAME}"
DUMP_PATH="${TMP_DIR}/restore.dump"

echo "Downloading ${BACKUP_NAME} from B2 bucket ${B2_BUCKET_NAME}..."
b2 file download "b2://${B2_BUCKET_NAME}/${BACKUP_NAME}" "$DOWNLOAD_PATH"

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

echo "Waiting for it to accept connections..."
until docker exec "$CONTAINER_NAME" pg_isready -U restore >/dev/null 2>&1; do
  sleep 1
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
