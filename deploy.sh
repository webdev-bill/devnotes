#!/bin/bash
set -euo pipefail

cd ~/devnotes

OLD_SHA=$(git rev-parse HEAD)
git pull origin main
NEW_SHA=$(git rev-parse HEAD)

echo "Deploying $OLD_SHA -> $NEW_SHA"

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
if git diff --name-only "$OLD_SHA" "$NEW_SHA" -- backend/database/migrations | grep -q .; then
  echo "Migration files changed — running migrate --force"
  ./scripts/prod-compose.sh exec -T backend php artisan migrate --force
else
  echo "No migration file changes — skipping migrate"
fi

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
health_check_attempts=6
health_check_delay=3
for attempt in $(seq 1 "$health_check_attempts"); do
  # `|| status="000"` (not `|| echo "000"` inside the substitution) —
  # curl still prints its own "000" via -w when there's no response at all
  # (e.g. connection refused), so piping a fallback echo into the same
  # command substitution would concatenate onto that instead of replacing
  # it. This overwrites the variable outright instead.
  status=$(curl -s -o /dev/null -w '%{http_code}' https://devnotes.billandrewsallao.com/api/tags) || status="000"
  if [ "$status" = "200" ]; then
    echo "Health check passed (attempt $attempt, HTTP $status)"
    break
  fi
  if [ "$attempt" -eq "$health_check_attempts" ]; then
    echo "Health check failed after $health_check_attempts attempts (last status: HTTP $status)"
    exit 1
  fi
  echo "Health check attempt $attempt failed (HTTP $status), retrying in ${health_check_delay}s..."
  sleep "$health_check_delay"
done

echo "Deploy succeeded: $NEW_SHA"
