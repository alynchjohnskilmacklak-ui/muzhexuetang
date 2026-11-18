-- Restore division fields that the schema had before the historical migration
-- chain began using them. Keep new columns nullable until legacy rows are
-- backfilled from their most authoritative available relation.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "ClassGroup" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "hoursDeductedAt" TIMESTAMP(3);
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "attendanceSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "wxpusherUid" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
ALTER TABLE "MakeupRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS "hours" DOUBLE PRECISION;
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS "campus" TEXT;
ALTER TABLE "Fee" ADD COLUMN IF NOT EXISTS "operator" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "usageType" TEXT;
ALTER TABLE "PerformancePost" ADD COLUMN IF NOT EXISTS "isReadByParent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "homeworkDone" BOOLEAN;
ALTER TABLE "ClassroomFeedback" ADD COLUMN IF NOT EXISTS "inClassRating" INTEGER;
ALTER TABLE "MealMenu" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "MealTemplate" ADD COLUMN IF NOT EXISTS "division" TEXT;
ALTER TABLE "MealReport" ADD COLUMN IF NOT EXISTS "division" TEXT;

-- Preserve teacher/course scope when available; use the schema default only
-- when the historical source has no division value.
UPDATE "Teacher"
SET "division" = COALESCE(NULLIF(UPPER(BTRIM("division")), ''), 'JUNIOR');

-- Recover a student's scope from their main teacher before applying the
-- schema default. This also gives parent accounts a useful source below.
UPDATE "Student" AS student
SET "division" = COALESCE(
    NULLIF(UPPER(BTRIM(student."division")), ''),
    (SELECT NULLIF(UPPER(BTRIM(teacher."division")), '')
     FROM "Teacher" AS teacher
     WHERE teacher."id" = student."mainTeacherId"),
    'JUNIOR'
);

UPDATE "Course"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

UPDATE "MakeupRequest"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

UPDATE "Room"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;
UPDATE "Room"
SET "usageType" = 'GENERAL'
WHERE "usageType" IS NULL OR BTRIM("usageType") = '';

UPDATE "Course" AS course
SET "division" = COALESCE(
    NULLIF(UPPER(BTRIM(course."division")), ''),
    (SELECT NULLIF(UPPER(BTRIM(teacher."division")), '')
     FROM "Teacher" AS teacher
     WHERE teacher."id" = course."teacherId"),
    'JUNIOR'
);

UPDATE "ClassGroup" AS class_group
SET "division" = COALESCE(
    NULLIF(UPPER(BTRIM(class_group."division")), ''),
    (SELECT NULLIF(UPPER(BTRIM(course."division")), '')
     FROM "Course" AS course
     WHERE course."id" = class_group."courseId"),
    (SELECT NULLIF(UPPER(BTRIM(teacher."division")), '')
     FROM "Teacher" AS teacher
     WHERE teacher."id" = class_group."teacherId"),
    'JUNIOR'
);

UPDATE "ClassLesson" AS lesson
SET "division" = COALESCE(
    (SELECT NULLIF(UPPER(BTRIM(class_group."division")), '')
     FROM "ClassGroup" AS class_group
     WHERE class_group."id" = lesson."groupId"),
    (SELECT NULLIF(UPPER(BTRIM(course."division")), '')
     FROM "ClassGroup" AS class_group
     JOIN "Course" AS course ON course."id" = class_group."courseId"
     WHERE class_group."id" = lesson."groupId"),
    (SELECT NULLIF(UPPER(BTRIM(teacher."division")), '')
     FROM "Teacher" AS teacher
     WHERE teacher."id" = COALESCE(
         lesson."teacherId",
         (SELECT class_group."teacherId"
          FROM "ClassGroup" AS class_group
          WHERE class_group."id" = lesson."groupId")
     )),
    'JUNIOR'
)
WHERE lesson."division" IS NULL OR BTRIM(lesson."division") = '';
UPDATE "ClassLesson"
SET "division" = UPPER(BTRIM("division"));

-- User has one division field. Prefer an explicitly linked teacher; for
-- parents, use a linked student's division when available, then the default.
UPDATE "User" AS user_account
SET "division" = COALESCE(
    NULLIF(UPPER(BTRIM(user_account."division")), ''),
    (SELECT NULLIF(UPPER(BTRIM(teacher."division")), '')
     FROM "Teacher" AS teacher
     WHERE teacher."id" = user_account."teacherId"),
    (SELECT MIN(NULLIF(UPPER(BTRIM(student."division")), ''))
     FROM "Student" AS student
     WHERE COALESCE(student."parentId", student."parentUserId") = user_account."id"),
    'JUNIOR'
);
UPDATE "MealMenu"
SET "division" = COALESCE(NULLIF(UPPER(BTRIM("division")), ''), 'JUNIOR');
UPDATE "MealTemplate"
SET "division" = COALESCE(NULLIF(UPPER(BTRIM("division")), ''), 'JUNIOR');
UPDATE "MealReport"
SET "division" = COALESCE(NULLIF(UPPER(BTRIM("division")), ''), 'JUNIOR');
UPDATE "Fee" AS fee
SET "division" = COALESCE(
    (SELECT NULLIF(UPPER(BTRIM(course."division")), '')
     FROM "Course" AS course
     WHERE course."id" = fee."courseId"),
    (SELECT NULLIF(UPPER(BTRIM(student."division")), '')
     FROM "Student" AS student
     WHERE student."id" = fee."studentId"),
    'JUNIOR'
)
WHERE fee."division" IS NULL OR BTRIM(fee."division") = '';
UPDATE "Fee"
SET "division" = UPPER(BTRIM("division"));

ALTER TABLE "User" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "User" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "Student" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "Teacher" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "Teacher" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "Course" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "ClassGroup" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "ClassGroup" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "ClassLesson" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "ClassLesson" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "Fee" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "Fee" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "MealMenu" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "MealMenu" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "MealTemplate" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "MealTemplate" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "MealReport" ALTER COLUMN "division" SET DEFAULT 'JUNIOR';
ALTER TABLE "MealReport" ALTER COLUMN "division" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "MakeupRequest" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Room" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Room" ALTER COLUMN "usageType" SET DEFAULT 'GENERAL';
ALTER TABLE "Room" ALTER COLUMN "usageType" SET NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_teacherId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "User_teacherId_key" ON "User"("teacherId");

CREATE INDEX IF NOT EXISTS "User_division_status_idx" ON "User"("division", "status");
CREATE INDEX IF NOT EXISTS "Student_division_status_idx" ON "Student"("division", "status");
CREATE INDEX IF NOT EXISTS "Teacher_division_idx" ON "Teacher"("division");
CREATE INDEX IF NOT EXISTS "Teacher_division_status_idx" ON "Teacher"("division", "status");
CREATE INDEX IF NOT EXISTS "Course_division_idx" ON "Course"("division");
CREATE INDEX IF NOT EXISTS "Course_division_isActive_idx" ON "Course"("division", "isActive");
CREATE INDEX IF NOT EXISTS "ClassGroup_division_status_idx" ON "ClassGroup"("division", "status");
CREATE INDEX IF NOT EXISTS "ClassLesson_division_lessonDate_idx" ON "ClassLesson"("division", "lessonDate");
CREATE INDEX IF NOT EXISTS "Fee_division_idx" ON "Fee"("division");
CREATE INDEX IF NOT EXISTS "Fee_campus_idx" ON "Fee"("campus");
CREATE INDEX IF NOT EXISTS "MakeupRequest_studentId_status_idx" ON "MakeupRequest"("studentId", "status");
CREATE INDEX IF NOT EXISTS "MakeupRequest_targetLessonId_idx" ON "MakeupRequest"("targetLessonId");
CREATE INDEX IF NOT EXISTS "Room_status_idx" ON "Room"("status");
CREATE INDEX IF NOT EXISTS "Room_usageType_status_idx" ON "Room"("usageType", "status");

-- This inert sentinel satisfies the unguarded historical DROP INDEX in
-- 20260719190000 on fresh databases. Its predicate indexes no rows.
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSalaryTransaction_lessonId_type_key"
    ON "TeacherSalaryTransaction"("lessonId", "type")
    WHERE false;
