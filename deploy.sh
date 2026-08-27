#!/bin/bash
set -euo pipefail

cd ~/devnotes

OLD_SHA=$(git rev-parse HEAD)
git pull origin main
NEW_SHA=$(git rev-parse HEAD)

echo "Deploying $OLD_SHA -> $NEW_SHA"

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Path corrected to where migrations actually live in this repo
# (backend/database/migrations) — the original database/migrations would
# never match anything here, silently skipping the migrate step every time.
if git diff --name-only "$OLD_SHA" "$NEW_SHA" -- backend/database/migrations | grep -q .; then
  echo "Migration files changed — running migrate --force"
  docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force
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
curl -f -s -o /dev/null https://devnotes.billandrewsallao.com/api/tags
echo "Deploy succeeded: $NEW_SHA"
