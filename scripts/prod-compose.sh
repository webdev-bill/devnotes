#!/bin/bash
set -euo pipefail

# Wrapper so a manual "docker compose -f docker-compose.prod.yml ..." command
# can never forget --env-file .env.production. That file's backend service
# environment: block is an explicit per-var allowlist substituted from
# ${VARS} at "up" time — a forgotten --env-file silently blanks every one of
# them (APP_KEY, DB_PASSWORD, B2_*, ...) instead of erroring, which caused a
# real production login outage during the 2026-09-01 upload-limit debugging
# session (see docs/server-setup-runbook.md). deploy.sh already used this
# flag correctly; this wrapper is what closes the gap for any *manual*
# docker compose command run directly on the server instead.
#
# Usage: scripts/prod-compose.sh <any docker compose args>
#   e.g. scripts/prod-compose.sh up -d --force-recreate backend
#        scripts/prod-compose.sh logs -f backend
#        scripts/prod-compose.sh exec backend php artisan tinker

cd "$(dirname "$0")/.."
exec docker compose -f docker-compose.prod.yml --env-file .env.production "$@"
