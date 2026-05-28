CREATE UNIQUE INDEX IF NOT EXISTS "attendance_lesson_student_unique"
ON "Attendance"("lessonId", "studentId")
WHERE "lessonId" IS NOT NULL;
