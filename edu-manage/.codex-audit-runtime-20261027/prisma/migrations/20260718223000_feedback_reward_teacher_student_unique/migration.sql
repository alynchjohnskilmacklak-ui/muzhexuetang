-- Step 1: archive every pre-migration reward row before changing the source.
-- The JSON projection safely preserves subject fields when they already exist,
-- while remaining compatible with older tables that do not have them yet.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecordArchive" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT,
    "subjectLabel" TEXT,
    "courseKey" TEXT NOT NULL,
    "courseLabel" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFirstFeedback" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN,
    "invalidReason" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveReason" TEXT NOT NULL,

    CONSTRAINT "FeedbackRewardRecordArchive_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF to_regclass('"FeedbackRewardRecord"') IS NOT NULL THEN
        INSERT INTO "FeedbackRewardRecordArchive" (
            "id", "feedbackId", "studentId", "teacherId",
            "subjectKey", "subjectLabel", "courseKey", "courseLabel",
            "amount", "isFirstFeedback", "createdAt", "isActive",
            "invalidReason", "archiveReason"
        )
        SELECT
            r."id",
            r."feedbackId",
            r."studentId",
            r."teacherId",
            NULLIF(to_jsonb(r) ->> 'subjectKey', ''),
            NULLIF(to_jsonb(r) ->> 'subjectLabel', ''),
            r."courseKey",
            r."courseLabel",
            r."amount",
            r."isFirstFeedback",
            r."createdAt",
            COALESCE((to_jsonb(r) ->> 'isActive')::BOOLEAN, true),
            NULLIF(to_jsonb(r) ->> 'invalidReason', ''),
            'pre_subject_key_migration_full_snapshot'
        FROM "FeedbackRewardRecord" r
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END $$;

-- Retained for compatibility with the preflight safety gate introduced before
-- this migration was rewritten. It is not used to remove or hide any record.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecordAuditBackup" (
    "sourceRecordId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT,
    "subjectLabel" TEXT,
    "courseKey" TEXT NOT NULL,
    "courseLabel" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFirstFeedback" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveReason" TEXT NOT NULL,

    CONSTRAINT "FeedbackRewardRecordAuditBackup_pkey" PRIMARY KEY ("sourceRecordId")
);

-- Fresh databases may not have the ledger because its first rollout was a
-- reviewed manual migration plan. Create the active table without data loss.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecord" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseKey" TEXT NOT NULL,
    "courseLabel" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFirstFeedback" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackRewardRecord_pkey" PRIMARY KEY ("id")
);

-- Step 2: add nullable columns first. NOT NULL is enforced only after every
-- historical row receives a deterministic value.
ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "subjectKey" TEXT;
ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "subjectLabel" TEXT;
ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "invalidReason" TEXT;

-- Step 3: backfill from authoritative relations only.
-- Subject priority: ClassLesson.subject, Course.subject,
-- ClassGroupTeacher.subject, then UNKNOWN. courseLabel is never consulted.
WITH reward_context AS (
    SELECT
        r."id",
        CASE
            WHEN UPPER(COALESCE(l."division", g."division", c."division", t."division", '')) = 'SENIOR'
                THEN 'SENIOR'
            WHEN UPPER(COALESCE(l."division", g."division", c."division", t."division", '')) = 'JUNIOR'
                THEN 'JUNIOR'
            ELSE 'UNKNOWN'
        END AS division_key,
        COALESCE(
            NULLIF(BTRIM(l."subject"), ''),
            NULLIF(BTRIM(c."subject"), ''),
            NULLIF(BTRIM(assignment."subject"), ''),
            'UNKNOWN'
        ) AS subject_label
    FROM "FeedbackRewardRecord" r
    LEFT JOIN "ClassroomFeedback" f ON f."id" = r."feedbackId"
    LEFT JOIN "ClassLesson" l ON l."id" = f."classLessonId"
    LEFT JOIN "ClassGroup" g ON g."id" = COALESCE(l."groupId", f."feedbackGroupId")
    LEFT JOIN "Course" c ON c."id" = g."courseId"
    LEFT JOIN "Teacher" t ON t."id" = r."teacherId"
    LEFT JOIN LATERAL (
        SELECT cgt."subject"
        FROM "ClassGroupTeacher" cgt
        WHERE cgt."groupId" = g."id" AND cgt."teacherId" = r."teacherId"
        ORDER BY cgt."createdAt" ASC, cgt."id" ASC
        LIMIT 1
    ) assignment ON true
), normalized AS (
    SELECT
        "id",
        division_key,
        subject_label,
        CASE LOWER(REGEXP_REPLACE(subject_label, '[[:space:]]+', '', 'g'))
            WHEN '数学' THEN 'MATH'
            WHEN 'math' THEN 'MATH'
            WHEN 'mathematics' THEN 'MATH'
            WHEN '物理' THEN 'PHYSICS'
            WHEN 'physics' THEN 'PHYSICS'
            WHEN '英语' THEN 'ENGLISH'
            WHEN '英文' THEN 'ENGLISH'
            WHEN 'english' THEN 'ENGLISH'
            WHEN '语文' THEN 'CHINESE'
            WHEN 'chinese' THEN 'CHINESE'
            WHEN '化学' THEN 'CHEMISTRY'
            WHEN 'chemistry' THEN 'CHEMISTRY'
            WHEN '生物' THEN 'BIOLOGY'
            WHEN 'biology' THEN 'BIOLOGY'
            WHEN '地理' THEN 'GEOGRAPHY'
            WHEN 'geography' THEN 'GEOGRAPHY'
            WHEN '历史' THEN 'HISTORY'
            WHEN 'history' THEN 'HISTORY'
            WHEN '政治' THEN 'POLITICS'
            WHEN '道法' THEN 'POLITICS'
            WHEN '道德与法治' THEN 'POLITICS'
            WHEN 'politics' THEN 'POLITICS'
            WHEN '科学' THEN 'SCIENCE'
            WHEN 'science' THEN 'SCIENCE'
            WHEN 'unknown' THEN 'UNKNOWN'
            ELSE UPPER(REGEXP_REPLACE(BTRIM(subject_label), '[[:space:]/_-]+', '_', 'g'))
        END AS subject_token
    FROM reward_context
)
UPDATE "FeedbackRewardRecord" r
SET
    "subjectLabel" = normalized.subject_label,
    "subjectKey" = CASE
        WHEN normalized.subject_token = 'UNKNOWN' THEN 'UNKNOWN'
        ELSE normalized.division_key || '_' || normalized.subject_token
    END,
    "isActive" = COALESCE(r."isActive", true)
FROM normalized
WHERE normalized."id" = r."id";

ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "subjectKey" SET NOT NULL;
ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "subjectLabel" SET NOT NULL;
ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "isActive" SET DEFAULT true;
ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "isActive" SET NOT NULL;

-- Step 4: audit unresolved rows without failing or guessing their subject.
DO $$
DECLARE
    unknown_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO unknown_count
    FROM "FeedbackRewardRecord"
    WHERE "subjectKey" = 'UNKNOWN';

    RAISE NOTICE 'FeedbackRewardRecord UNKNOWN subjectKey count: %', unknown_count;
END $$;

-- Preserve the post-backfill form of every duplicate as a second audit layer.
WITH ranked AS (
    SELECT
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r."teacherId", r."studentId", r."subjectKey"
            ORDER BY r."createdAt" ASC, r."id" ASC
        ) AS row_number
    FROM "FeedbackRewardRecord" r
)
INSERT INTO "FeedbackRewardRecordAuditBackup" (
    "sourceRecordId", "feedbackId", "studentId", "teacherId",
    "subjectKey", "subjectLabel", "courseKey", "courseLabel",
    "amount", "isFirstFeedback", "createdAt", "archiveReason"
)
SELECT
    "id", "feedbackId", "studentId", "teacherId",
    "subjectKey", "subjectLabel", "courseKey", "courseLabel",
    "amount", "isFirstFeedback", "createdAt",
    'DUPLICATE_TEACHER_STUDENT_SUBJECT_KEY'
FROM ranked
WHERE row_number > 1
ON CONFLICT ("sourceRecordId") DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        WITH ranked AS (
            SELECT
                r."id",
                ROW_NUMBER() OVER (
                    PARTITION BY r."teacherId", r."studentId", r."subjectKey"
                    ORDER BY r."createdAt" ASC, r."id" ASC
                ) AS row_number
            FROM "FeedbackRewardRecord" r
        )
        SELECT 1
        FROM ranked
        LEFT JOIN "FeedbackRewardRecordAuditBackup" backup
            ON backup."sourceRecordId" = ranked."id"
        WHERE ranked.row_number > 1 AND backup."sourceRecordId" IS NULL
    ) THEN
        RAISE EXCEPTION 'FeedbackRewardRecord duplicate audit backup is incomplete';
    END IF;
END $$;

-- Step 5: keep every duplicate in the original table and mark only the later
-- rows inactive. No reward record is deleted or overwritten beyond audit state.
WITH ranked AS (
    SELECT
        r."id",
        ROW_NUMBER() OVER (
            PARTITION BY r."teacherId", r."studentId", r."subjectKey"
            ORDER BY r."createdAt" ASC, r."id" ASC
        ) AS row_number
    FROM "FeedbackRewardRecord" r
)
UPDATE "FeedbackRewardRecord" r
SET
    "isActive" = false,
    "invalidReason" = 'duplicate_subject_reward_migration'
FROM ranked
WHERE r."id" = ranked."id"
  AND ranked.row_number > 1;

-- Step 6: remove obsolete uniqueness definitions. These are indexes only;
-- neither the reward table nor any reward row is dropped.
DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_key";
DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_courseKey_key";
DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_subjectKey_key";

-- Step 7: concurrency safety applies only to active reward rows. Historical
-- inactive duplicates remain queryable in FeedbackRewardRecord and the archive.
CREATE UNIQUE INDEX "FeedbackRewardRecord_teacherId_studentId_subjectKey_key"
    ON "FeedbackRewardRecord"("teacherId", "studentId", "subjectKey")
    WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_feedbackId_idx"
    ON "FeedbackRewardRecord"("feedbackId");
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_teacherId_createdAt_idx"
    ON "FeedbackRewardRecord"("teacherId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_studentId_createdAt_idx"
    ON "FeedbackRewardRecord"("studentId", "createdAt");
