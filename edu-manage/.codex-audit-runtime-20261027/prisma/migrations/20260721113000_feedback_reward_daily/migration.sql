-- Daily feedback reward rollout.
-- Financial rows are preserved. This migration only adds the China-local
-- reward date and corrects reward subject metadata from authoritative teaching
-- assignments before changing the active uniqueness boundary.

-- 1. Full pre-change archive. No source row is deleted.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecordDailyRuleArchive" (
    "sourceRecordId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "courseKey" TEXT NOT NULL,
    "courseLabel" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFirstFeedback" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "invalidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveReason" TEXT NOT NULL,

    CONSTRAINT "FeedbackRewardRecordDailyRuleArchive_pkey"
      PRIMARY KEY ("sourceRecordId")
);

INSERT INTO "FeedbackRewardRecordDailyRuleArchive" (
    "sourceRecordId", "feedbackId", "studentId", "teacherId",
    "subjectKey", "subjectLabel", "courseKey", "courseLabel",
    "amount", "isFirstFeedback", "isActive", "invalidReason",
    "createdAt", "archiveReason"
)
SELECT
    r."id", r."feedbackId", r."studentId", r."teacherId",
    r."subjectKey", r."subjectLabel", r."courseKey", r."courseLabel",
    r."amount", r."isFirstFeedback", r."isActive", r."invalidReason",
    r."createdAt", 'pre_daily_feedback_reward_snapshot'
FROM "FeedbackRewardRecord" r
ON CONFLICT ("sourceRecordId") DO NOTHING;

-- 2. Add the date as nullable before deterministic backfill.
ALTER TABLE "FeedbackRewardRecord"
  ADD COLUMN IF NOT EXISTS "rewardDate" DATE;

-- 3. Reward date is the feedback publication/creation day in China time.
-- Prisma timestamps are stored as UTC values in TIMESTAMP(3).
UPDATE "FeedbackRewardRecord" r
SET "rewardDate" = COALESCE(
    (
      (f."createdAt" AT TIME ZONE 'UTC')
      AT TIME ZONE 'Asia/Shanghai'
    )::DATE,
    (
      (r."createdAt" AT TIME ZONE 'UTC')
      AT TIME ZONE 'Asia/Shanghai'
    )::DATE
)
FROM "ClassroomFeedback" f
WHERE f."id" = r."feedbackId"
  AND r."rewardDate" IS NULL;

UPDATE "FeedbackRewardRecord" r
SET "rewardDate" = (
    (r."createdAt" AT TIME ZONE 'UTC')
    AT TIME ZONE 'Asia/Shanghai'
)::DATE
WHERE r."rewardDate" IS NULL;

-- 4. Correct legacy composite course subjects from authoritative context.
-- Priority: ClassLesson.subject, current teacher's ClassGroupTeacher.subject,
-- then Course.subject only when the value represents one subject.
WITH reward_context AS (
    SELECT
        r."id",
        CASE
          WHEN NULLIF(BTRIM(l."subject"), '') IS NOT NULL
            AND l."subject" !~ '[、,，/|]'
            THEN BTRIM(l."subject")
          WHEN NULLIF(BTRIM(assignment."subject"), '') IS NOT NULL
            AND assignment."subject" !~ '[、,，/|]'
            THEN BTRIM(assignment."subject")
          WHEN NULLIF(BTRIM(c."subject"), '') IS NOT NULL
            AND c."subject" !~ '[、,，/|]'
            THEN BTRIM(c."subject")
          ELSE NULL
        END AS subject_label,
        CASE
          WHEN UPPER(COALESCE(l."division", g."division", c."division", t."division", '')) = 'SENIOR'
            THEN 'SENIOR'
          ELSE 'JUNIOR'
        END AS division_key
    FROM "FeedbackRewardRecord" r
    LEFT JOIN "ClassroomFeedback" f ON f."id" = r."feedbackId"
    LEFT JOIN "ClassLesson" l ON l."id" = f."classLessonId"
    LEFT JOIN "ClassGroup" g ON g."id" = COALESCE(l."groupId", f."feedbackGroupId")
    LEFT JOIN "Course" c ON c."id" = g."courseId"
    LEFT JOIN "Teacher" t ON t."id" = r."teacherId"
    LEFT JOIN LATERAL (
        SELECT cgt."subject"
        FROM "ClassGroupTeacher" cgt
        WHERE cgt."groupId" = g."id"
          AND cgt."teacherId" = r."teacherId"
        ORDER BY cgt."createdAt" ASC, cgt."id" ASC
        LIMIT 1
    ) assignment ON true
), normalized AS (
    SELECT
        "id",
        subject_label,
        division_key,
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
          ELSE UPPER(REGEXP_REPLACE(BTRIM(subject_label), '[[:space:]/_-]+', '_', 'g'))
        END AS subject_token
    FROM reward_context
    WHERE subject_label IS NOT NULL
)
UPDATE "FeedbackRewardRecord" r
SET
    "subjectLabel" = normalized.subject_label,
    "subjectKey" = normalized.division_key || '_' || normalized.subject_token
FROM normalized
WHERE normalized."id" = r."id";

ALTER TABLE "FeedbackRewardRecord"
  ALTER COLUMN "rewardDate" SET NOT NULL;

-- 5. Preserve later same-day duplicates but make only the first active.
WITH ranked AS (
    SELECT
        r."id",
        ROW_NUMBER() OVER (
            PARTITION BY r."teacherId", r."studentId", r."subjectKey", r."rewardDate"
            ORDER BY r."createdAt" ASC, r."id" ASC
        ) AS row_number
    FROM "FeedbackRewardRecord" r
    WHERE r."isActive" = true
)
UPDATE "FeedbackRewardRecord" r
SET
    "isActive" = false,
    "invalidReason" = 'duplicate_daily_subject_reward_migration'
FROM ranked
WHERE r."id" = ranked."id"
  AND ranked.row_number > 1;

DO $$
DECLARE
    inactive_duplicate_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO inactive_duplicate_count
    FROM "FeedbackRewardRecord"
    WHERE "invalidReason" = 'duplicate_daily_subject_reward_migration';

    RAISE NOTICE 'FeedbackRewardRecord daily duplicate inactive count: %', inactive_duplicate_count;
END $$;

-- 6. Replace lifetime uniqueness with China-local daily uniqueness.
DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_subjectKey_key";

CREATE UNIQUE INDEX "FeedbackRewardRecord_teacher_student_subject_date_key"
    ON "FeedbackRewardRecord"(
      "teacherId", "studentId", "subjectKey", "rewardDate"
    )
    WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_teacherId_rewardDate_idx"
    ON "FeedbackRewardRecord"("teacherId", "rewardDate");
