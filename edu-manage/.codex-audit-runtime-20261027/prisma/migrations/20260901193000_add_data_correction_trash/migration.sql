-- Recoverable deletion metadata for the data-correction system.
ALTER TABLE "Student" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Course" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "ClassGroup" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "ClassLesson" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Schedule" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "ExamPaper" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "StudyMaterial" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "StudyHallClass" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "PerformancePost" ADD COLUMN "deletedById" TEXT, ADD COLUMN "deletionBatchId" TEXT;

ALTER TABLE "HourTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "GradeRecord" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Fee" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "ClassroomFeedback" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "AchievementBadge" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "LearningGoal" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "StageSummary" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;
ALTER TABLE "TeacherSalaryTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletionBatchId" TEXT;

ALTER TABLE "DeletedRecord" ADD COLUMN "deletionBatchId" TEXT, ADD COLUMN "termId" TEXT, ADD COLUMN "impact" JSONB, ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "DeletedRecord_deletionBatchId_key" ON "DeletedRecord"("deletionBatchId");
CREATE INDEX "DeletedRecord_expiresAt_idx" ON "DeletedRecord"("expiresAt");
CREATE INDEX "Student_deletedAt_idx" ON "Student"("deletedAt");
CREATE INDEX "Student_deletionBatchId_idx" ON "Student"("deletionBatchId");
CREATE INDEX "Course_deletedAt_idx" ON "Course"("deletedAt");
CREATE INDEX "ClassGroup_deletedAt_idx" ON "ClassGroup"("deletedAt");
CREATE INDEX "ClassGroup_deletionBatchId_idx" ON "ClassGroup"("deletionBatchId");
CREATE INDEX "ClassLesson_deletedAt_idx" ON "ClassLesson"("deletedAt");
CREATE INDEX "ClassLesson_deletionBatchId_idx" ON "ClassLesson"("deletionBatchId");
CREATE INDEX "Enrollment_deletedAt_idx" ON "Enrollment"("deletedAt");
CREATE INDEX "Enrollment_deletionBatchId_idx" ON "Enrollment"("deletionBatchId");
CREATE INDEX "Schedule_deletedAt_idx" ON "Schedule"("deletedAt");
CREATE INDEX "Schedule_deletionBatchId_idx" ON "Schedule"("deletionBatchId");
CREATE INDEX "ExamPaper_deletedAt_idx" ON "ExamPaper"("deletedAt");
CREATE INDEX "ExamPaper_deletionBatchId_idx" ON "ExamPaper"("deletionBatchId");
CREATE INDEX "StudyMaterial_deletedAt_idx" ON "StudyMaterial"("deletedAt");
CREATE INDEX "StudyHallClass_deletedAt_idx" ON "StudyHallClass"("deletedAt");
CREATE INDEX "FileAsset_deletedAt_idx" ON "FileAsset"("deletedAt");
CREATE INDEX "PerformancePost_deletionBatchId_idx" ON "PerformancePost"("deletionBatchId");
CREATE INDEX "Attendance_deletedAt_idx" ON "Attendance"("deletedAt");
CREATE INDEX "ClassroomFeedback_deletedAt_idx" ON "ClassroomFeedback"("deletedAt");
CREATE INDEX "TeacherSalaryTransaction_deletedAt_idx" ON "TeacherSalaryTransaction"("deletedAt");
