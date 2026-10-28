ALTER TABLE "StudyMaterial"
ADD COLUMN IF NOT EXISTS "materialType" "MaterialType" NOT NULL DEFAULT 'HANDOUT';

ALTER TABLE "TeacherSalaryTransaction"
ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "settlementBatchId" TEXT;

CREATE INDEX IF NOT EXISTS "AchievementBadge_deletedAt_idx"
ON "AchievementBadge"("deletedAt");

CREATE INDEX IF NOT EXISTS "Fee_deletedAt_idx"
ON "Fee"("deletedAt");

CREATE INDEX IF NOT EXISTS "GradeRecord_deletedAt_idx"
ON "GradeRecord"("deletedAt");

CREATE INDEX IF NOT EXISTS "HourTransaction_deletedAt_idx"
ON "HourTransaction"("deletedAt");

CREATE INDEX IF NOT EXISTS "LearningGoal_deletedAt_idx"
ON "LearningGoal"("deletedAt");

CREATE INDEX IF NOT EXISTS "LeaveRequest_deletedAt_idx"
ON "LeaveRequest"("deletedAt");

CREATE INDEX IF NOT EXISTS "Notification_deletedAt_idx"
ON "Notification"("deletedAt");

CREATE INDEX IF NOT EXISTS "StageSummary_deletedAt_idx"
ON "StageSummary"("deletedAt");
