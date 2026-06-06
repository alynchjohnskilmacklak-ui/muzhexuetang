ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'teacher';
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "badge" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "overallComment" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "parentReply" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "parentRepliedAt" TIMESTAMP(3);
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "adminRepliedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ClassroomFeedback_source_createdAt_idx" ON "ClassroomFeedback"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassroomFeedback_teacherId_source_status_idx" ON "ClassroomFeedback"("teacherId", "source", "status");
