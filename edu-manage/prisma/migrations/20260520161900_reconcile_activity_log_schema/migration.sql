-- Reconcile ActivityLog columns used by the following performance-index migration.
-- metadata is added by 20260519093000_add_teacher_portal_log.
ALTER TABLE "ActivityLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_userId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_teacherId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The performance-index migration also indexes the optional lesson teacher.
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE "ClassLesson" DROP CONSTRAINT IF EXISTS "ClassLesson_teacherId_fkey";
ALTER TABLE "ClassLesson" ADD CONSTRAINT "ClassLesson_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
