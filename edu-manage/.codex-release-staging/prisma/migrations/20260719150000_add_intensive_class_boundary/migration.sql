-- Add an explicit boundary for intensive classes. Existing groups remain NORMAL.
CREATE TYPE "ClassMode" AS ENUM ('NORMAL', 'INTENSIVE');
CREATE TYPE "IntensiveTeachingType" AS ENUM ('ONE_ON_ONE', 'ONE_ON_TWO', 'ONE_ON_THREE');

ALTER TABLE "ClassGroup"
  ADD COLUMN "intensiveMode" "ClassMode" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "teachingType" "IntensiveTeachingType";

ALTER TABLE "ClassLesson"
  ADD COLUMN "plannedMinutes" INTEGER,
  ADD COLUMN "actualMinutes" INTEGER;

CREATE TABLE "ClassLessonStudent" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClassLessonStudent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassLessonStudent_lessonId_studentId_key"
  ON "ClassLessonStudent"("lessonId", "studentId");
CREATE INDEX "ClassLessonStudent_studentId_idx"
  ON "ClassLessonStudent"("studentId");

ALTER TABLE "ClassLessonStudent"
  ADD CONSTRAINT "ClassLessonStudent_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassLessonStudent"
  ADD CONSTRAINT "ClassLessonStudent_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
