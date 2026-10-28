-- Teacher portal message: teacherId nullable + FK (keep message when teacher hard-deleted)
ALTER TABLE "TeacherMessage" ALTER COLUMN "teacherId" DROP NOT NULL;

-- Idempotent guard: null out any dangling teacherId before adding FK
UPDATE "TeacherMessage" SET "teacherId" = NULL
WHERE "teacherId" IS NOT NULL
  AND "teacherId" NOT IN (SELECT "id" FROM "Teacher");

ALTER TABLE "TeacherMessage"
  ADD CONSTRAINT "TeacherMessage_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;