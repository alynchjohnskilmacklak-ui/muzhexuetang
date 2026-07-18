-- Create the reward ledger for fresh databases. Existing installations may
-- already have this table from the reviewed manual rollout plan.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecord" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT,
    "subjectLabel" TEXT,
    "courseKey" TEXT NOT NULL,
    "courseLabel" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFirstFeedback" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackRewardRecord_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "subjectKey" TEXT;
ALTER TABLE "FeedbackRewardRecord" ADD COLUMN IF NOT EXISTS "subjectLabel" TEXT;

-- Resolve a stable, division-aware subject identity for historical rows.
-- Priority matches application code: ClassLesson.subject, Course.subject,
-- teacher assignment subject, then the retained course label.
WITH reward_context AS (
    SELECT
        r."id",
        CASE
            WHEN UPPER(COALESCE(l."division", g."division", c."division", t."division", 'JUNIOR')) = 'SENIOR'
                THEN 'SENIOR'
            ELSE 'JUNIOR'
        END AS division_key,
        COALESCE(
            NULLIF(BTRIM(l."subject"), ''),
            NULLIF(BTRIM(c."subject"), ''),
            NULLIF(BTRIM(assignment."subject"), ''),
            NULLIF(BTRIM(r."courseLabel"), ''),
            '未分类'
        ) AS subject_label
    FROM "FeedbackRewardRecord" r
    LEFT JOIN "ClassroomFeedback" f ON f."id" = r."feedbackId"
    LEFT JOIN "ClassLesson" l ON l."id" = f."classLessonId"
    LEFT JOIN "ClassGroup" g ON g."id" = COALESCE(l."groupId", f."feedbackGroupId")
    LEFT JOIN "Course" c ON c."id" = COALESCE(
        g."courseId",
        CASE WHEN r."courseKey" LIKE 'course:%' THEN SUBSTRING(r."courseKey" FROM 8) END
    )
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
            WHEN '未分类' THEN 'UNCLASSIFIED'
            ELSE UPPER(REGEXP_REPLACE(BTRIM(subject_label), '[[:space:]/_-]+', '_', 'g'))
        END AS subject_token
    FROM reward_context
)
UPDATE "FeedbackRewardRecord" r
SET
    "subjectLabel" = normalized.subject_label,
    "subjectKey" = normalized.division_key || '_' || normalized.subject_token
FROM normalized
WHERE normalized."id" = r."id";

ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "subjectKey" SET NOT NULL;
ALTER TABLE "FeedbackRewardRecord" ALTER COLUMN "subjectLabel" SET NOT NULL;

-- Duplicate active ledger rows must leave the unique set, but no historical
-- reward is physically lost. Copy every duplicate row to an audit table first.
CREATE TABLE IF NOT EXISTS "FeedbackRewardRecordAuditBackup" (
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
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveReason" TEXT NOT NULL,

    CONSTRAINT "FeedbackRewardRecordAuditBackup_pkey" PRIMARY KEY ("sourceRecordId")
);

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

-- Abort rather than remove an active duplicate if its audit copy is missing.
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

-- Move audited duplicates out of the active ledger. Their complete original
-- values remain in FeedbackRewardRecordAuditBackup and can be restored.
WITH ranked AS (
    SELECT
        r."id",
        ROW_NUMBER() OVER (
            PARTITION BY r."teacherId", r."studentId", r."subjectKey"
            ORDER BY r."createdAt" ASC, r."id" ASC
        ) AS row_number
    FROM "FeedbackRewardRecord" r
)
DELETE FROM "FeedbackRewardRecord" r
USING ranked, "FeedbackRewardRecordAuditBackup" backup
WHERE r."id" = ranked."id"
  AND backup."sourceRecordId" = ranked."id"
  AND ranked.row_number > 1;

DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_key";
DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_courseKey_key";

CREATE UNIQUE INDEX IF NOT EXISTS "FeedbackRewardRecord_teacherId_studentId_subjectKey_key"
    ON "FeedbackRewardRecord"("teacherId", "studentId", "subjectKey");
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_feedbackId_idx"
    ON "FeedbackRewardRecord"("feedbackId");
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_teacherId_createdAt_idx"
    ON "FeedbackRewardRecord"("teacherId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedbackRewardRecord_studentId_createdAt_idx"
    ON "FeedbackRewardRecord"("studentId", "createdAt");
