#!/usr/bin/env bash
# Run Prisma migrations for either single-db or dual-db production setups.
# The only automatic recovery supported here is the known StageSummary case.
# Any unrelated failed migration stops deployment for manual inspection.
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

KNOWN_STAGE_MIGRATION="20260619000000_add_stage_summary"

load_env() {
  local key="$1"
  local val="${!key:-}"
  local line=""

  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    line="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 || true)"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
  fi

  printf '%s' "$val"
}

stage_summary_table_exists() {
  local url="$1"
  command -v psql >/dev/null 2>&1 || return 1
  local result=""
  local pg_url="${url%%\?*}"
  result="$(psql "$pg_url" -Atqc "SELECT to_regclass('public.\"StageSummary\"') IS NOT NULL" 2>/dev/null || true)"
  [ "$result" = "t" ]
}

database_name() {
  local url="$1"
  local pg_url="${url%%\?*}"
  command -v psql >/dev/null 2>&1 || return 1
  psql "$pg_url" -Atqc 'SELECT current_database()' 2>/dev/null
}

failed_migrations() {
  local url="$1"
  local pg_url="${url%%\?*}"
  command -v psql >/dev/null 2>&1 || return 2
  psql "$pg_url" -Atqc \
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at, migration_name' \
    2>/dev/null
}

resolve_known_stage_failure() {
  local label="$1"
  local url="$2"
  local failed="$3"

  if [ "$failed" != "$KNOWN_STAGE_MIGRATION" ]; then
    echo "[migrate] ERROR: $label automatic recovery refused for: ${failed:-unknown migration}" >&2
    return 1
  fi

  if ! stage_summary_table_exists "$url"; then
    echo "[migrate] $label: known migration recovery skipped; StageSummary table is not confirmed" >&2
    return 1
  fi

  echo "[migrate] $label: StageSummary table already exists; marking $KNOWN_STAGE_MIGRATION as applied"
  DATABASE_URL="$url" npx prisma migrate resolve --applied "$KNOWN_STAGE_MIGRATION"
}

ensure_feedback_columns() {
  local label="$1"
  local url="$2"

  if ! command -v psql >/dev/null 2>&1; then
    echo "[migrate] $label: psql not found; cannot verify feedback columns" >&2
    return 0
  fi

  echo "[migrate] $label: ensure ClassroomFeedback course context columns"
  psql "$url" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackCourseType" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackGroupId" TEXT;
CREATE INDEX IF NOT EXISTS "ClassroomFeedback_feedbackGroupId_idx" ON "ClassroomFeedback"("feedbackGroupId");
SQL
}
deploy_one() {
  local label="$1"
  local url="$2"
  local db_name=""
  local failed=""
  local failed_status=0

  if [ -z "$url" ]; then
    echo "[migrate] ERROR: $label DATABASE_URL is empty" >&2
    return 1
  fi

  echo "[migrate] === $label start ==="
  db_name="$(database_name "$url" || true)"
  echo "[migrate] $label database: ${db_name:-unavailable}"

  failed="$(failed_migrations "$url")" || failed_status=$?
  if [ "$failed_status" -eq 0 ] && [ -n "$failed" ]; then
    echo "[migrate] $label unfinished migration(s):" >&2
    printf '%s\n' "$failed" >&2
    resolve_known_stage_failure "$label" "$url" "$failed"
  elif [ "$failed_status" -ne 0 ]; then
    echo "[migrate] $label: psql preflight unavailable; automatic recovery disabled" >&2
  fi

  DATABASE_URL="$url" npx prisma migrate deploy
  ensure_feedback_columns "$label" "$url"
  echo "[migrate] === $label done ==="
}

DUAL_DB_VAL="$(load_env DUAL_DB)"
JUNIOR_URL="$(load_env DATABASE_URL_JUNIOR)"
SENIOR_URL="$(load_env DATABASE_URL_SENIOR)"
LEGACY_URL="$(load_env DATABASE_URL)"

if [ "$DUAL_DB_VAL" = "true" ]; then
  deploy_one "JUNIOR" "$JUNIOR_URL"
  deploy_one "SENIOR" "$SENIOR_URL"
else
  deploy_one "DATABASE_URL" "$LEGACY_URL"
fi

echo "[migrate] generate Prisma Client"
npx prisma generate
echo "[migrate] all done"
