CREATE INDEX IF NOT EXISTS "Student_status_createdAt_idx" ON "Student"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Student_grade_idx" ON "Student"("grade");
CREATE INDEX IF NOT EXISTS "Student_parentId_idx" ON "Student"("parentId");
CREATE INDEX IF NOT EXISTS "Student_mainTeacherId_idx" ON "Student"("mainTeacherId");

CREATE INDEX IF NOT EXISTS "Teacher_status_createdAt_idx" ON "Teacher"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Course_isActive_idx" ON "Course"("isActive");
CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course"("teacherId");

CREATE INDEX IF NOT EXISTS "ClassGroup_status_teacherId_idx" ON "ClassGroup"("status", "teacherId");
CREATE INDEX IF NOT EXISTS "ClassGroup_courseId_status_idx" ON "ClassGroup"("courseId", "status");
CREATE INDEX IF NOT EXISTS "ClassGroup_roomId_idx" ON "ClassGroup"("roomId");

CREATE INDEX IF NOT EXISTS "ClassLesson_lessonDate_status_idx" ON "ClassLesson"("lessonDate", "status");
CREATE INDEX IF NOT EXISTS "ClassLesson_teacherId_lessonDate_idx" ON "ClassLesson"("teacherId", "lessonDate");
CREATE INDEX IF NOT EXISTS "ClassLesson_groupId_lessonDate_idx" ON "ClassLesson"("groupId", "lessonDate");

CREATE INDEX IF NOT EXISTS "Enrollment_status_remainHours_idx" ON "Enrollment"("status", "remainHours");
CREATE INDEX IF NOT EXISTS "Enrollment_groupId_status_idx" ON "Enrollment"("groupId", "status");
CREATE INDEX IF NOT EXISTS "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");

CREATE INDEX IF NOT EXISTS "Attendance_lessonId_status_idx" ON "Attendance"("lessonId", "status");
CREATE INDEX IF NOT EXISTS "Attendance_studentId_createdAt_idx" ON "Attendance"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Attendance_createdAt_idx" ON "Attendance"("createdAt");

CREATE INDEX IF NOT EXISTS "MakeupRequest_status_createdAt_idx" ON "MakeupRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MakeupRequest_studentId_idx" ON "MakeupRequest"("studentId");

CREATE INDEX IF NOT EXISTS "Schedule_startTime_status_idx" ON "Schedule"("startTime", "status");
CREATE INDEX IF NOT EXISTS "Schedule_teacherId_startTime_idx" ON "Schedule"("teacherId", "startTime");
CREATE INDEX IF NOT EXISTS "Schedule_roomId_startTime_idx" ON "Schedule"("roomId", "startTime");

CREATE INDEX IF NOT EXISTS "Fee_status_paidAt_idx" ON "Fee"("status", "paidAt");
CREATE INDEX IF NOT EXISTS "Fee_studentId_createdAt_idx" ON "Fee"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Fee_createdAt_idx" ON "Fee"("createdAt");

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_teacherId_createdAt_idx" ON "ActivityLog"("teacherId", "createdAt");

CREATE INDEX IF NOT EXISTS "ExamPaper_status_paperDate_idx" ON "ExamPaper"("status", "paperDate");
CREATE INDEX IF NOT EXISTS "ExamPaper_studentId_status_paperDate_idx" ON "ExamPaper"("studentId", "status", "paperDate");
CREATE INDEX IF NOT EXISTS "ExamPaper_teacherId_status_paperDate_idx" ON "ExamPaper"("teacherId", "status", "paperDate");
