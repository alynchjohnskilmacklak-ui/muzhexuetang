#!/usr/bin/env bash
# Sync Prisma schema to the active database set.
# In DUAL_DB=true mode this pushes to DATABASE_URL_JUNIOR and DATABASE_URL_SENIOR.
# In single database mode this pushes to DATABASE_URL, falling back to DATABASE_URL_JUNIOR.
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

read_env() {
  local key="$1"
  local value="${!key:-}"

  if [ -z "$value" ] && [ -f .env ]; then
    value="$(
      grep -E "^${key}=" .env 2>/dev/null \
        | tail -n 1 \
        | cut -d= -f2- \
        | sed "s/^\"//; s/\"$//; s/^'//; s/'$//" \
        || true
    )"
  fi

  printf '%s' "$value"
}

push_one() {
  local label="$1"
  local url="$2"

  if [ -z "$url" ]; then
    echo "[db-sync] ERROR: ${label} database URL is empty" >&2
    return 1
  fi

  echo "[db-sync] === ${label} ==="
  DATABASE_URL="$url" npx prisma db push --skip-generate
}

DUAL_DB_VALUE="$(read_env DUAL_DB)"
DATABASE_URL_JUNIOR_VALUE="$(read_env DATABASE_URL_JUNIOR)"
DATABASE_URL_SENIOR_VALUE="$(read_env DATABASE_URL_SENIOR)"
DATABASE_URL_VALUE="$(read_env DATABASE_URL)"

if [ "${DUAL_DB_VALUE:-false}" = "true" ]; then
  push_one "JUNIOR" "$DATABASE_URL_JUNIOR_VALUE"
  push_one "SENIOR" "$DATABASE_URL_SENIOR_VALUE"
  # Also push to DATABASE_URL — some pages use the default prisma client
  # which connects to DATABASE_URL. This ensures that DB is also schema-synced.
  if [ -n "${DATABASE_URL_VALUE:-}" ] && \
     [ "$DATABASE_URL_VALUE" != "$DATABASE_URL_JUNIOR_VALUE" ] && \
     [ "$DATABASE_URL_VALUE" != "$DATABASE_URL_SENIOR_VALUE" ]; then
    push_one "DEFAULT (DATABASE_URL)" "$DATABASE_URL_VALUE"
  fi
else
  push_one "DEFAULT" "${DATABASE_URL_VALUE:-$DATABASE_URL_JUNIOR_VALUE}"
fi

echo "[db-sync] done"
