-- Align legacy PostgreSQL objects with the current Prisma schema without
-- deleting rows. The preflight checks fail before any DDL if unique keys
-- required by the schema are already violated.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Attendance"
        WHERE "lessonId" IS NOT NULL
        GROUP BY "lessonId", "studentId"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot create Attendance(lessonId, studentId) unique index: duplicate non-null lesson/student pairs exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "TeacherSalaryTransaction"
        WHERE "feedbackId" IS NOT NULL
        GROUP BY "feedbackId", "type"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot create TeacherSalaryTransaction(feedbackId, type) unique index: duplicate non-null feedback/type pairs exist';
    END IF;
END $$;

-- These optional Prisma relations must be nullable so ON DELETE SET NULL is
-- valid and rows can survive removal of the referenced lesson/enrollment.
ALTER TABLE "Attendance" ALTER COLUMN "lessonId" DROP NOT NULL;
ALTER TABLE "Attendance" ALTER COLUMN "enrollmentId" DROP NOT NULL;

-- Match Prisma's referential actions while preserving the existing IDs/data.
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_lessonId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_enrollmentId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "Enrollment_studentId_fkey";
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "Enrollment_groupId_fkey";
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "ClassGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MakeupRequest" DROP CONSTRAINT IF EXISTS "MakeupRequest_attendanceId_fkey";
ALTER TABLE "MakeupRequest" ADD CONSTRAINT "MakeupRequest_attendanceId_fkey"
    FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- The old partial unique index and this standard unique index have equivalent
-- behavior for nullable lessonId in PostgreSQL. Create the schema-named index
-- first, then remove the legacy partial index to avoid a uniqueness gap.
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_lessonId_studentId_key"
    ON "Attendance"("lessonId", "studentId");
DROP INDEX IF EXISTS "attendance_lesson_student_unique";

ALTER TABLE "StudyHallClassStudent"
    ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "TeacherSalaryTransaction_teacherId_lessonDate_idx"
    ON "TeacherSalaryTransaction"("teacherId", "lessonDate");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSalaryTransaction_feedbackId_type_key"
    ON "TeacherSalaryTransaction"("feedbackId", "type");
