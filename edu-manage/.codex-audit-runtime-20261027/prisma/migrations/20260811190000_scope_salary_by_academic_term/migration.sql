ALTER TABLE "TeacherSalaryTransaction" ADD COLUMN "termId" TEXT;

UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = groups."termId"
FROM "ClassLesson" AS lessons
JOIN "ClassGroup" AS groups ON groups."id" = lessons."groupId"
WHERE salary."lessonId" = lessons."id"
  AND salary."termId" IS NULL;

UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = groups."termId"
FROM "ClassroomFeedback" AS feedback
JOIN "ClassGroup" AS groups ON groups."id" = feedback."feedbackGroupId"
WHERE salary."feedbackId" = feedback."id"
  AND salary."termId" IS NULL;

CREATE INDEX "TeacherSalaryTransaction_termId_teacherId_createdAt_idx"
  ON "TeacherSalaryTransaction"("termId", "teacherId", "createdAt");

ALTER TABLE "TeacherSalaryTransaction"
  ADD CONSTRAINT "TeacherSalaryTransaction_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
