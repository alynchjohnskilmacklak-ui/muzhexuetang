#!/usr/bin/env bash
# Run Prisma migrations for either single-db or dual-db production setups.
# If the known StageSummary migration already created its table but was recorded
# as failed, mark it as applied and retry once.
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
  result="$(psql "$url" -Atqc "SELECT to_regclass('public.\"StageSummary\"') IS NOT NULL" 2>/dev/null || true)"
  [ "$result" = "t" ]
}

resolve_known_stage_failure() {
  local label="$1"
  local url="$2"

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

  if [ -z "$url" ]; then
    echo "[migrate] ERROR: $label DATABASE_URL is empty" >&2
    return 1
  fi

  echo "[migrate] === $label start ==="
  if DATABASE_URL="$url" npx prisma migrate deploy; then
    ensure_feedback_columns "$label" "$url"
    echo "[migrate] === $label done ==="
    return 0
  fi

  echo "[migrate] $label: migrate deploy failed; checking known StageSummary recovery"
  resolve_known_stage_failure "$label" "$url"
  DATABASE_URL="$url" npx prisma migrate deploy
  ensure_feedback_columns "$label" "$url"
  echo "[migrate] === $label done after recovery ==="
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
