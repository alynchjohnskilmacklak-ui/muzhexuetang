ALTER TABLE "MasteryRecord"
ADD COLUMN "termId" TEXT;

CREATE INDEX "MasteryRecord_termId_studentId_createdAt_idx"
ON "MasteryRecord"("termId", "studentId", "createdAt");

ALTER TABLE "MasteryRecord"
ADD CONSTRAINT "MasteryRecord_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
