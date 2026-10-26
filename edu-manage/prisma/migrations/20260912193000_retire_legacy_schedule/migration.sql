-- Retire the legacy Schedule/ScheduleStudent subsystem after both production
-- division databases were audited. Abort instead of deleting if any environment
-- still contains legacy rows or foreign-key references.
DO $$
DECLARE
  legacy_count BIGINT := 0;
  dependency_count BIGINT := 0;
  current_count BIGINT := 0;
BEGIN
  IF to_regclass('public."Schedule"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "Schedule"' INTO legacy_count;
  END IF;

  IF to_regclass('public."ScheduleStudent"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "ScheduleStudent"' INTO current_count;
    dependency_count := dependency_count + current_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Attendance' AND column_name = 'scheduleId'
  ) THEN
    EXECUTE 'SELECT count(*) FROM "Attendance" WHERE "scheduleId" IS NOT NULL' INTO current_count;
    dependency_count := dependency_count + current_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LeaveRequest' AND column_name = 'scheduleId'
  ) THEN
    EXECUTE 'SELECT count(*) FROM "LeaveRequest" WHERE "scheduleId" IS NOT NULL' INTO current_count;
    dependency_count := dependency_count + current_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'HourTransaction' AND column_name = 'scheduleId'
  ) THEN
    EXECUTE 'SELECT count(*) FROM "HourTransaction" WHERE "scheduleId" IS NOT NULL' INTO current_count;
    dependency_count := dependency_count + current_count;
  END IF;

  IF legacy_count > 0 OR dependency_count > 0 THEN
    RAISE EXCEPTION
      'Refusing to retire legacy schedules: Schedule rows=%, dependent rows=%',
      legacy_count,
      dependency_count;
  END IF;
END $$;

ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_scheduleId_fkey";
DROP INDEX IF EXISTS "Attendance_scheduleId_studentId_key";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "scheduleId";

ALTER TABLE "LeaveRequest" DROP CONSTRAINT IF EXISTS "LeaveRequest_scheduleId_fkey";
ALTER TABLE "LeaveRequest" DROP COLUMN IF EXISTS "scheduleId";
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
CREATE INDEX IF NOT EXISTS "LeaveRequest_lessonId_idx" ON "LeaveRequest"("lessonId");
ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HourTransaction" DROP COLUMN IF EXISTS "scheduleId";

DROP TABLE IF EXISTS "ScheduleStudent";
DROP TABLE IF EXISTS "Schedule";
