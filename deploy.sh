#!/bin/bash
set -euo pipefail

cd ~/devnotes

# Last commit this script fully deployed: built, migrated and health-checked.
# Kept outside the repo so `git pull` never touches it, and written only after
# the health check passes. OLD_SHA can't do this job: `git pull` advances it
# even when the rest of the deploy then fails, so a failed code deploy
# followed by a docs-only commit would skip the rebuild (and the migrations)
# and leave the failed change unbuilt.
STATE_FILE="$HOME/.devnotes-last-deployed-sha"

OLD_SHA=$(git rev-parse HEAD)
git pull origin main
NEW_SHA=$(git rev-parse HEAD)

# Missing, unreadable, malformed, or not an ancestor of what's being deployed
# (e.g. after a history rewrite) all mean "unknown": do a full rebuild and run
# migrations unconditionally (`migrate --force` is a no-op if none are pending).
LAST_OK=""
if [ -r "$STATE_FILE" ]; then
  candidate=$(head -n 1 "$STATE_FILE" 2>/dev/null || true)
  if [[ "$candidate" =~ ^[0-9a-f]{40}$ ]] && git merge-base --is-ancestor "$candidate" "$NEW_SHA" 2>/dev/null; then
    LAST_OK="$candidate"
  fi
fi

echo "Deploying $OLD_SHA -> $NEW_SHA (last successful deploy: ${LAST_OK:-unknown})"

health_check() {
  echo "Health check..."
  # /api/up isn't a real route (Laravel's health check is registered at the
  # bare path /up, outside the /api prefix, so /api/up 404s) and even bare /up
  # wouldn't reach the backend anyway — Traefik only routes PathPrefix(/api)
  # to it, so /up would hit the frontend's catch-all instead. /api/tags is a
  # real, lightweight, already-public endpoint that actually exercises the
  # backend and its DB connection.
  #
  # Retried rather than a single blind curl: `docker compose up -d --build`
  # only waits for backend/frontend/traefik to be *started*, not *ready* —
  # none of them have a healthcheck defined, so Compose has no way to know the
  # difference. PHP-FPM/nginx startup and Traefik's own Docker-provider
  # discovery of the recreated container both take a moment, so the first
  # attempt(s) right after `up` can legitimately 404/502 before things settle.
  local health_check_attempts=6
  local health_check_delay=3
  local attempt status
  for attempt in $(seq 1 "$health_check_attempts"); do
    # `|| status="000"` (not `|| echo "000"` inside the substitution) —
    # curl still prints its own "000" via -w when there's no response at all
    # (e.g. connection refused), so piping a fallback echo into the same
    # command substitution would concatenate onto that instead of replacing
    # it. This overwrites the variable outright instead.
    status=$(curl -s -o /dev/null -w '%{http_code}' https://devnotes.billandrewsallao.com/api/tags) || status="000"
    if [ "$status" = "200" ]; then
      echo "Health check passed (attempt $attempt, HTTP $status)"
      return 0
    fi
    if [ "$attempt" -eq "$health_check_attempts" ]; then
      echo "Health check failed after $health_check_attempts attempts (last status: HTTP $status)"
      exit 1
    fi
    echo "Health check attempt $attempt failed (HTTP $status), retrying in ${health_check_delay}s..."
    sleep "$health_check_delay"
  done
}

# Written via a temp file + mv so a crash mid-write can't leave a truncated
# SHA behind (which would only mean "unknown" anyway, but this keeps it clean).
record_success() {
  printf '%s\n' "$NEW_SHA" > "$STATE_FILE.tmp"
  mv "$STATE_FILE.tmp" "$STATE_FILE"
  echo "Deploy succeeded: $NEW_SHA${1:-}"
}

# Docs-only since the last successful deploy (every changed path is Markdown
# or under docs/ or blog/, none of which either build or the running app
# reads): skip the rebuild and container recreate entirely. An EMPTY diff
# still rebuilds, because an empty commit is how baked meta tags get
# refreshed: its new SHA is a new CACHEBUST, so the frontend build re-fetches
# SiteSettings. A same-SHA workflow_dispatch redeploy also lands here and does
# a full but cached deploy: CACHEBUST is unchanged, so it does NOT re-fetch
# them.
# The non-docs list is captured, not tested with `| grep -q`: under pipefail
# an early-exiting `grep -q` can SIGPIPE the writer, which makes the
# pipeline "fail" and would flip the result.
if [ -n "$LAST_OK" ]; then
  changed=$(git diff --name-only "$LAST_OK" "$NEW_SHA")
  non_docs=$(printf '%s\n' "$changed" | grep -v -E '^(docs|blog)/|\.md$' || true)
  if [ -n "$changed" ] && [ -z "$non_docs" ]; then
    echo "Docs-only changes since last successful deploy — skipping rebuild."
    health_check
    record_success " (no rebuild needed)"
    exit 0
  fi
fi

# Forces the frontend build's site-settings bake (see Dockerfile.prod,
# scripts/inject-meta.mjs) to actually re-fetch on every deploy, even one
# triggered by an empty commit specifically to refresh stale baked-in meta
# tags after a /my/settings-only change — otherwise Docker's layer cache
# would silently reuse the previous build's fetch since nothing in the
# frontend build context itself changed.
export CACHEBUST="$NEW_SHA"

./scripts/prod-compose.sh up -d --build

# Idempotent — `storage:link` errors if the link already exists, so this
# only actually runs artisan the first time it's ever missing (a fresh
# server, or a volume that somehow got wiped). Must happen before anything
# could hit /storage/*, so it runs right after `up -d --build`, before the
# migration check below.
echo "Ensuring storage symlink exists..."
if ./scripts/prod-compose.sh exec -T backend test -L public/storage; then
  echo "storage:link already present — skipping"
else
  ./scripts/prod-compose.sh exec -T backend php artisan storage:link
fi

# Path corrected to where migrations actually live in this repo
# (backend/database/migrations) — the original database/migrations would
# never match anything here, silently skipping the migrate step every time.
# Diffed against LAST_OK, not OLD_SHA, for the same failed-deploy reason as
# the docs-only check; captured rather than piped to `grep -q`, same reason.
if [ -z "$LAST_OK" ]; then
  echo "Last successful deploy unknown — running migrate --force"
  ./scripts/prod-compose.sh exec -T backend php artisan migrate --force
else
  changed_migrations=$(git diff --name-only "$LAST_OK" "$NEW_SHA" -- backend/database/migrations)
  if [ -n "$changed_migrations" ]; then
    echo "Migration files changed — running migrate --force"
    ./scripts/prod-compose.sh exec -T backend php artisan migrate --force
  else
    echo "No migration file changes — skipping migrate"
  fi
fi

health_check
record_success
