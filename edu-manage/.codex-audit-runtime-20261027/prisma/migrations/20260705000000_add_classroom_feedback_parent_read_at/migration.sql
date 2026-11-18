ALTER TABLE "ClassroomFeedback" ADD COLUMN "parentReadAt" TIMESTAMP(3);

CREATE INDEX "ClassroomFeedback_status_parentReadAt_idx" ON "ClassroomFeedback"("status", "parentReadAt");
