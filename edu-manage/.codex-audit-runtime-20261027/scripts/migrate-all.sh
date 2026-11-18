#!/usr/bin/env bash
# Run Prisma migrations for either single-db or dual-db production setups.
# Automatic recovery is limited to known StageSummary and exact empty
# TeacherMessage schemas; all other failed migrations stop for manual inspection.
# Any unrelated failed migration stops deployment for manual inspection.
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

KNOWN_STAGE_MIGRATION="20260619000000_add_stage_summary"
KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION="20261005120000_add_teacher_message"
KNOWN_FEEDBACK_IDENTITY_MIGRATION="20261010150000_feedback_identity_schedule_reliability"

run_prisma() {
  if [ -n "${PRISMA_CLI:-}" ]; then
    "$PRISMA_CLI" "$@"
  else
    npx --no-install prisma "$@"
  fi
}

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

empty_teacher_message_table_matches_migration() {
  local url="$1"
  local pg_url
  pg_url="$(printf '%s' "$url" | sed 's/[?].*$//')"
  command -v psql >/dev/null 2>&1 || return 1
  local result=""
  local sql
  sql="$(cat <<'SQL'
WITH expected(column_name, data_type, datetime_precision, is_nullable, column_default) AS (
  VALUES
    ('id', 'text', NULL::integer, 'NO', ''),
    ('teacherId', 'text', NULL::integer, 'NO', ''),
    ('type', 'text', NULL::integer, 'NO', ''),
    ('title', 'text', NULL::integer, 'NO', ''),
    ('content', 'text', NULL::integer, 'NO', ''),
    ('createdById', 'text', NULL::integer, 'NO', ''),
    ('readAt', 'timestamp without time zone', 3, 'YES', ''),
    ('createdAt', 'timestamp without time zone', 3, 'NO', 'CURRENT_TIMESTAMP')
), actual AS (
  SELECT column_name, data_type, datetime_precision, is_nullable,
         coalesce(column_default, '') AS column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'TeacherMessage'
)
SELECT (
  (SELECT count(*) FROM actual) = 8
  AND NOT EXISTS (
    SELECT 1 FROM expected e FULL JOIN actual a USING (column_name)
    WHERE e.column_name IS NULL OR a.column_name IS NULL
       OR e.data_type IS DISTINCT FROM a.data_type
       OR e.datetime_precision IS DISTINCT FROM a.datetime_precision
       OR e.is_nullable IS DISTINCT FROM a.is_nullable
       OR e.column_default IS DISTINCT FROM a.column_default
  )
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public."TeacherMessage"'::regclass) = 1
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."TeacherMessage"'::regclass
      AND conname = 'TeacherMessage_pkey'
      AND contype = 'p'
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
  )
  AND (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'TeacherMessage') = 2
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'TeacherMessage'
      AND indexname = 'TeacherMessage_pkey'
      AND indexdef = 'CREATE UNIQUE INDEX "TeacherMessage_pkey" ON public."TeacherMessage" USING btree (id)'
  )
  AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'TeacherMessage'
      AND indexname = 'TeacherMessage_teacherId_readAt_idx'
      AND indexdef = 'CREATE INDEX "TeacherMessage_teacherId_readAt_idx" ON public."TeacherMessage" USING btree ("teacherId", "readAt")'
  )
  AND (SELECT count(*) FROM public."TeacherMessage") = 0
)::text
SQL
)"
  result="$(psql "$pg_url" -Atqc "$sql" 2>/dev/null || true)"
  [ "$result" = "true" ]
}

migration_has_successful_apply() {
  local url="$1"
  local migration="$2"
  local pg_url="${url%%\?*}"
  command -v psql >/dev/null 2>&1 || return 1
  [[ "$migration" =~ ^[0-9]{14}_[a-z0-9_]+$ ]] || return 1
  local result=""
  result="$(psql "$pg_url" -Atqc \
    "SELECT EXISTS (SELECT 1 FROM \"_prisma_migrations\" WHERE migration_name = '$migration' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)" \
    2>/dev/null || true)"
  [ "$result" = "t" ]
}

feedback_identity_retry_schema_matches_migration() {
  local url="$1"
  local pg_url="${url%%\?*}"
  command -v psql >/dev/null 2>&1 || return 1
  local result=""
  local sql
  sql="$(cat <<'SQL'
WITH expected_columns(table_name, column_name, data_type, datetime_precision, is_nullable, column_default, udt_name) AS (
  VALUES
    ('Student', 'identityId', 'text', NULL::integer, 'NO', '', 'text'),
    ('FeedbackParentReadReceipt', 'feedbackId', 'text', NULL::integer, 'NO', '', 'text'),
    ('FeedbackParentReadReceipt', 'parentUserId', 'text', NULL::integer, 'NO', '', 'text'),
    ('FeedbackParentReadReceipt', 'readAt', 'timestamp without time zone', 3, 'YES', '', 'timestamp'),
    ('FeedbackParentReadReceipt', 'createdAt', 'timestamp without time zone', 3, 'NO', 'CURRENT_TIMESTAMP', 'timestamp'),
    ('ClassroomFeedbackRequest', 'clientRequestId', 'text', NULL::integer, 'NO', '', 'text'),
    ('ClassroomFeedbackRequest', 'actorUserId', 'text', NULL::integer, 'NO', '', 'text'),
    ('ClassroomFeedbackRequest', 'payloadHash', 'text', NULL::integer, 'NO', '', 'text'),
    ('ClassroomFeedbackRequest', 'feedbackId', 'text', NULL::integer, 'YES', '', 'text'),
    ('ClassroomFeedbackRequest', 'createdAt', 'timestamp without time zone', 3, 'NO', 'CURRENT_TIMESTAMP', 'timestamp'),
    ('CourseChangeEvent', 'id', 'text', NULL::integer, 'NO', '', 'text'),
    ('CourseChangeEvent', 'eventType', 'text', NULL::integer, 'NO', '', 'text'),
    ('CourseChangeEvent', 'actorUserId', 'text', NULL::integer, 'NO', '', 'text'),
    ('CourseChangeEvent', 'groupId', 'text', NULL::integer, 'YES', '', 'text'),
    ('CourseChangeEvent', 'lessonIds', 'ARRAY', NULL::integer, 'NO', '', '_text'),
    ('CourseChangeEvent', 'studentIds', 'ARRAY', NULL::integer, 'NO', '', '_text'),
    ('CourseChangeEvent', 'title', 'text', NULL::integer, 'NO', '', 'text'),
    ('CourseChangeEvent', 'summary', 'text', NULL::integer, 'NO', '', 'text'),
    ('CourseChangeEvent', 'recipientCount', 'integer', NULL::integer, 'NO', '0', 'int4'),
    ('CourseChangeEvent', 'notificationCount', 'integer', NULL::integer, 'NO', '0', 'int4'),
    ('CourseChangeEvent', 'createdAt', 'timestamp without time zone', 3, 'NO', 'CURRENT_TIMESTAMP', 'timestamp')
), actual_columns AS (
  SELECT table_name, column_name, data_type, datetime_precision, is_nullable,
         coalesce(column_default, '') AS column_default, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('Student', 'FeedbackParentReadReceipt', 'ClassroomFeedbackRequest', 'CourseChangeEvent')
    AND (table_name <> 'Student' OR column_name = 'identityId')
), expected_indexes(table_name, index_name, indexdef) AS (
  VALUES
    ('Student', 'Student_identityId_idx', 'CREATE INDEX "Student_identityId_idx" ON public."Student" USING btree ("identityId")'),
    ('FeedbackParentReadReceipt', 'FeedbackParentReadReceipt_pkey', 'CREATE UNIQUE INDEX "FeedbackParentReadReceipt_pkey" ON public."FeedbackParentReadReceipt" USING btree ("feedbackId", "parentUserId")'),
    ('FeedbackParentReadReceipt', 'FeedbackParentReadReceipt_parentUserId_readAt_idx', 'CREATE INDEX "FeedbackParentReadReceipt_parentUserId_readAt_idx" ON public."FeedbackParentReadReceipt" USING btree ("parentUserId", "readAt")'),
    ('ClassroomFeedbackRequest', 'ClassroomFeedbackRequest_pkey', 'CREATE UNIQUE INDEX "ClassroomFeedbackRequest_pkey" ON public."ClassroomFeedbackRequest" USING btree ("clientRequestId")'),
    ('ClassroomFeedbackRequest', 'ClassroomFeedbackRequest_actorUserId_createdAt_idx', 'CREATE INDEX "ClassroomFeedbackRequest_actorUserId_createdAt_idx" ON public."ClassroomFeedbackRequest" USING btree ("actorUserId", "createdAt")'),
    ('ClassroomFeedbackRequest', 'ClassroomFeedbackRequest_feedbackId_idx', 'CREATE INDEX "ClassroomFeedbackRequest_feedbackId_idx" ON public."ClassroomFeedbackRequest" USING btree ("feedbackId")'),
    ('CourseChangeEvent', 'CourseChangeEvent_pkey', 'CREATE UNIQUE INDEX "CourseChangeEvent_pkey" ON public."CourseChangeEvent" USING btree (id)'),
    ('CourseChangeEvent', 'CourseChangeEvent_groupId_createdAt_idx', 'CREATE INDEX "CourseChangeEvent_groupId_createdAt_idx" ON public."CourseChangeEvent" USING btree ("groupId", "createdAt")'),
    ('CourseChangeEvent', 'CourseChangeEvent_actorUserId_createdAt_idx', 'CREATE INDEX "CourseChangeEvent_actorUserId_createdAt_idx" ON public."CourseChangeEvent" USING btree ("actorUserId", "createdAt")'),
    ('CourseChangeEvent', 'CourseChangeEvent_eventType_createdAt_idx', 'CREATE INDEX "CourseChangeEvent_eventType_createdAt_idx" ON public."CourseChangeEvent" USING btree ("eventType", "createdAt")')
), actual_indexes AS (
  SELECT schemaname, tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
), expected_primary_keys(table_name, constraint_name, definition) AS (
  VALUES
    ('FeedbackParentReadReceipt', 'FeedbackParentReadReceipt_pkey', 'PRIMARY KEY ("feedbackId", "parentUserId")'),
    ('ClassroomFeedbackRequest', 'ClassroomFeedbackRequest_pkey', 'PRIMARY KEY ("clientRequestId")'),
    ('CourseChangeEvent', 'CourseChangeEvent_pkey', 'PRIMARY KEY (id)')
), actual_primary_keys AS (
  SELECT c.relname AS table_name, x.conname AS constraint_name, pg_get_constraintdef(x.oid) AS definition
  FROM pg_constraint x
  JOIN pg_class c ON c.oid = x.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND x.contype = 'p'
), receipt_constraints AS (
  SELECT x.*
  FROM pg_constraint x
  WHERE x.conrelid = 'public."FeedbackParentReadReceipt"'::regclass
), fk_checks AS (
  SELECT
    NOT EXISTS (
      SELECT 1 FROM receipt_constraints c
      WHERE c.conname = 'FeedbackParentReadReceipt_feedbackId_fkey'
        AND (c.contype <> 'f'
          OR c.confrelid <> 'public."ClassroomFeedback"'::regclass
          OR c.confdeltype <> 'c' OR c.confupdtype <> 'c' OR NOT c.convalidated
          OR ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.ord) <> ARRAY['feedbackId']::text[]
          OR ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum ORDER BY k.ord) <> ARRAY['id']::text[])
    )
    AND NOT EXISTS (
      SELECT 1 FROM receipt_constraints c
      WHERE c.conname = 'FeedbackParentReadReceipt_parentUserId_fkey'
        AND (c.contype <> 'f'
          OR c.confrelid <> 'public."User"'::regclass
          OR c.confdeltype <> 'c' OR c.confupdtype <> 'c' OR NOT c.convalidated
          OR ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum ORDER BY k.ord) <> ARRAY['parentUserId']::text[]
          OR ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum ORDER BY k.ord) <> ARRAY['id']::text[])
    )
    AND NOT EXISTS (
      SELECT 1 FROM receipt_constraints c
      WHERE c.contype = 'f'
        AND c.conname NOT IN ('FeedbackParentReadReceipt_feedbackId_fkey', 'FeedbackParentReadReceipt_parentUserId_fkey')
    ) AS valid
)
SELECT (
  (SELECT count(*) FROM expected_columns) = 21
  AND (SELECT count(*) FROM actual_columns) = 21
  AND NOT EXISTS (
    SELECT 1 FROM expected_columns e FULL JOIN actual_columns a USING (table_name, column_name)
    WHERE e.column_name IS NULL OR a.column_name IS NULL
       OR e.data_type IS DISTINCT FROM a.data_type
       OR e.datetime_precision IS DISTINCT FROM a.datetime_precision
       OR e.is_nullable IS DISTINCT FROM a.is_nullable
       OR e.column_default IS DISTINCT FROM a.column_default
       OR e.udt_name IS DISTINCT FROM a.udt_name
  )
  AND (SELECT count(*) FROM actual_indexes WHERE table_name = 'FeedbackParentReadReceipt') = 2
  AND (SELECT count(*) FROM actual_indexes WHERE table_name = 'ClassroomFeedbackRequest') = 3
  AND (SELECT count(*) FROM actual_indexes WHERE table_name = 'CourseChangeEvent') = 4
  AND NOT EXISTS (
    SELECT 1 FROM expected_indexes e LEFT JOIN actual_indexes a
      ON a.table_name = e.table_name AND a.index_name = e.index_name
    WHERE a.index_name IS NULL OR a.indexdef IS DISTINCT FROM e.indexdef
  )
  AND (SELECT count(*) FROM actual_primary_keys WHERE table_name IN ('FeedbackParentReadReceipt', 'ClassroomFeedbackRequest', 'CourseChangeEvent')) = 3
  AND NOT EXISTS (
    SELECT 1 FROM expected_primary_keys e LEFT JOIN actual_primary_keys a
      USING (table_name, constraint_name)
    WHERE a.constraint_name IS NULL OR a.definition IS DISTINCT FROM e.definition
  )
  AND (SELECT count(*) FROM receipt_constraints) BETWEEN 1 AND 3
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public."ClassroomFeedbackRequest"'::regclass) = 1
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public."CourseChangeEvent"'::regclass) = 1
  AND (SELECT valid FROM fk_checks)
  AND NOT EXISTS (
    SELECT 1 FROM public."FeedbackParentReadReceipt" r
    LEFT JOIN public."ClassroomFeedback" f ON f."id" = r."feedbackId"
    WHERE f."id" IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public."FeedbackParentReadReceipt" r
    LEFT JOIN public."User" u ON u."id" = r."parentUserId"
    WHERE u."id" IS NULL
  )
)::text
SQL
)"
  result="$(psql "$pg_url" -Atqc "$sql" 2>/dev/null || true)"
  [ "$result" = "true" ]
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

resolve_known_migration_failure() {
  local label="$1"
  local url="$2"
  local failed="$3"

  case "$failed" in
    "$KNOWN_STAGE_MIGRATION")
      if ! stage_summary_table_exists "$url"; then
        echo "[migrate] $label: known migration recovery skipped; StageSummary table is not confirmed" >&2
        return 1
      fi
      echo "[migrate] $label: StageSummary table already exists; marking $KNOWN_STAGE_MIGRATION as applied"
      DATABASE_URL="$url" run_prisma migrate resolve --applied "$KNOWN_STAGE_MIGRATION"
      ;;
    "$KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION")
      if ! empty_teacher_message_table_matches_migration "$url"; then
        echo "[migrate] ERROR: $label TeacherMessage schema does not exactly match the known empty recovery state" >&2
        return 1
      fi
      if migration_has_successful_apply "$url" "$KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION"; then
        echo "[migrate] $label: prior TeacherMessage recovery is already recorded; preserving its historical failed attempt"
        return 0
      fi
      echo "[migrate] $label: exact empty TeacherMessage schema exists; marking $KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION as applied"
      DATABASE_URL="$url" run_prisma migrate resolve --applied "$KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION"
      ;;
    "$KNOWN_FEEDBACK_IDENTITY_MIGRATION")
      if ! feedback_identity_retry_schema_matches_migration "$url"; then
        echo "[migrate] ERROR: $label feedback identity schema/data is outside the exact safe retry state" >&2
        return 1
      fi
      echo "[migrate] $label: exact feedback identity retry state verified; marking the interrupted attempt rolled back for idempotent replay"
      DATABASE_URL="$url" run_prisma migrate resolve --rolled-back "$KNOWN_FEEDBACK_IDENTITY_MIGRATION"
      ;;
    *)
      echo "[migrate] ERROR: $label automatic recovery refused for: ${failed:-unknown migration}" >&2
      return 1
      ;;
  esac
}

ensure_feedback_columns() {
  local label="$1"
  local url="$2"
  local pg_url="${url%%\?*}"

  if ! command -v psql >/dev/null 2>&1; then
    echo "[migrate] $label: psql not found; cannot verify feedback columns" >&2
    return 0
  fi

  echo "[migrate] $label: ensure ClassroomFeedback course context columns"
  psql "$pg_url" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackCourseType" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackGroupId" TEXT;
CREATE INDEX IF NOT EXISTS "ClassroomFeedback_feedbackGroupId_idx" ON "ClassroomFeedback"("feedbackGroupId");
SQL
}

verify_schema_sync() {
  local label="$1"
  local url="$2"
  local diff_status=0

  echo "[migrate] $label: verify live database matches Prisma schema"
  DATABASE_URL="$url" run_prisma migrate diff \
    --from-schema-datasource "$PROJECT_DIR/prisma/schema.prisma" \
    --to-schema-datamodel "$PROJECT_DIR/prisma/schema.prisma" \
    --exit-code >/dev/null 2>&1 || diff_status=$?

  if [ "$diff_status" -eq 0 ]; then
    echo "[migrate] $label: Prisma schema is in sync"
    return 0
  fi

  if [ "$diff_status" -eq 2 ]; then
    echo "[migrate] ERROR: $label database still differs from prisma/schema.prisma; refusing app rollout. Add or repair a migration first." >&2
  else
    echo "[migrate] ERROR: unable to verify $label database schema (Prisma diff exit $diff_status); refusing app rollout." >&2
  fi
  return 1
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
    while IFS= read -r failed_migration; do
      [ -n "$failed_migration" ] || continue
      resolve_known_migration_failure "$label" "$url" "$failed_migration" || return 1
    done <<EOF
$failed
EOF
  elif [ "$failed_status" -ne 0 ]; then
    echo "[migrate] $label: psql preflight unavailable; automatic recovery disabled" >&2
  fi

  DATABASE_URL="$url" run_prisma migrate deploy
  ensure_feedback_columns "$label" "$url"
  verify_schema_sync "$label" "$url"
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

if [ "${SKIP_PRISMA_GENERATE:-0}" = "1" ]; then
  echo "[migrate] skip Prisma Client generation (prebuilt runtime already contains it)"
else
  echo "[migrate] generate Prisma Client"
  run_prisma generate
fi
echo "[migrate] all done"
