CREATE INDEX IF NOT EXISTS "Attendance_enrollmentId_idx" ON "Attendance"("enrollmentId");
CREATE INDEX IF NOT EXISTS "Attendance_studentId_lessonId_idx" ON "Attendance"("studentId", "lessonId");
CREATE INDEX IF NOT EXISTS "ClassLesson_status_lessonDate_idx" ON "ClassLesson"("status", "lessonDate");
CREATE INDEX IF NOT EXISTS "Enrollment_studentId_status_remainHours_idx" ON "Enrollment"("studentId", "status", "remainHours");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "ClassroomFeedback_teacherId_status_createdAt_idx" ON "ClassroomFeedback"("teacherId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PerformancePost_studentId_deletedAt_idx" ON "PerformancePost"("studentId", "deletedAt");
