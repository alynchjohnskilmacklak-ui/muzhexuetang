ALTER TABLE "StudentMealAttendance"
  ADD COLUMN IF NOT EXISTS "eating" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "groupId" TEXT,
  ADD COLUMN IF NOT EXISTS "groupName" TEXT,
  ADD COLUMN IF NOT EXISTS "lessonId" TEXT,
  ADD COLUMN IF NOT EXISTS "teacherId" TEXT,
  ADD COLUMN IF NOT EXISTS "teacherName" TEXT;

UPDATE "StudentMealAttendance"
SET "source" = 'AUTO'
WHERE "notes" LIKE '%考勤同步上报%'
   OR "notes" LIKE '%首节课%上报%';

CREATE INDEX IF NOT EXISTS "StudentMealAttendance_teacherId_mealDate_idx"
  ON "StudentMealAttendance"("teacherId", "mealDate");

CREATE INDEX IF NOT EXISTS "StudentMealAttendance_groupId_mealDate_idx"
  ON "StudentMealAttendance"("groupId", "mealDate");
