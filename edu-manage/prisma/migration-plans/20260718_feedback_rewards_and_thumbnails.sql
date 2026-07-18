-- REVIEW-ONLY MIGRATION PLAN. Do not run automatically against production.
-- Backwards compatible: only creates one table and adds nullable columns.

CREATE TABLE "FeedbackRewardRecord" (
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

CREATE UNIQUE INDEX "FeedbackRewardRecord_teacherId_studentId_courseKey_key"
  ON "FeedbackRewardRecord"("teacherId", "studentId", "courseKey");
CREATE INDEX "FeedbackRewardRecord_feedbackId_idx" ON "FeedbackRewardRecord"("feedbackId");
CREATE INDEX "FeedbackRewardRecord_teacherId_createdAt_idx" ON "FeedbackRewardRecord"("teacherId", "createdAt");
CREATE INDEX "FeedbackRewardRecord_studentId_createdAt_idx" ON "FeedbackRewardRecord"("studentId", "createdAt");

ALTER TABLE "FileAsset" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN "width" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN "height" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN "fileSize" INTEGER;

-- Historical compatibility policy:
-- 1. Existing FileAsset rows remain valid; null thumbnailUrl falls back to url.
-- 2. Run the following eligibility-reservation backfill only after reviewing a
--    read-only count. amount=0 means these rows block accidental second rewards
--    but are excluded from new reward-count statistics.
-- 3. Legacy salary rows cannot be allocated exactly to students when one feedback
--    covered multiple students, so this backfill intentionally does not rewrite pay.

-- REVIEW QUERY:
-- SELECT COUNT(*) FROM "ClassroomFeedback"
-- WHERE "status" = 'PUBLISHED' AND "source" <> 'admin';

-- OPTIONAL BACKFILL (run in the same reviewed deployment transaction):
-- WITH feedback_students AS (
--   SELECT DISTINCT ON (f."teacherId", sid, COALESCE('course:' || c."id", 'type:' || COALESCE(f."feedbackCourseType", 'GROUP')))
--     md5(random()::text || clock_timestamp()::text || f."id" || sid) AS id,
--     f."id" AS "feedbackId",
--     sid AS "studentId",
--     f."teacherId",
--     COALESCE('course:' || c."id", 'type:' || COALESCE(f."feedbackCourseType", 'GROUP')) AS "courseKey",
--     COALESCE(c."name", c."subject", f."feedbackCourseType", '班课反馈') AS "courseLabel",
--     f."createdAt"
--   FROM "ClassroomFeedback" f
--   CROSS JOIN LATERAL unnest(f."studentIds") sid
--   LEFT JOIN "ClassLesson" l ON l."id" = f."classLessonId"
--   LEFT JOIN "ClassGroup" gl ON gl."id" = l."groupId"
--   LEFT JOIN "ClassGroup" gf ON gf."id" = f."feedbackGroupId"
--   LEFT JOIN "Course" c ON c."id" = COALESCE(gl."courseId", gf."courseId")
--   WHERE f."status" = 'PUBLISHED' AND f."source" <> 'admin'
--   ORDER BY f."teacherId", sid, COALESCE('course:' || c."id", 'type:' || COALESCE(f."feedbackCourseType", 'GROUP')), f."createdAt" ASC
-- )
-- INSERT INTO "FeedbackRewardRecord" ("id", "feedbackId", "studentId", "teacherId", "courseKey", "courseLabel", "amount", "isFirstFeedback", "createdAt")
-- SELECT id, "feedbackId", "studentId", "teacherId", "courseKey", "courseLabel", 0, true, "createdAt"
-- FROM feedback_students
-- ON CONFLICT ("teacherId", "studentId", "courseKey") DO NOTHING;
