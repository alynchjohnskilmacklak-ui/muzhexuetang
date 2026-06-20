ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackCourseType" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "feedbackGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "ClassroomFeedback_feedbackGroupId_idx" ON "ClassroomFeedback"("feedbackGroupId");
