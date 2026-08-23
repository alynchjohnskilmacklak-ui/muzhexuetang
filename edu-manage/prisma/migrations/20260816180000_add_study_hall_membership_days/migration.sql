ALTER TABLE "StudyHallClass"
  ADD COLUMN "gradeScope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "StudyHallClassStudent"
  ADD COLUMN "purchasedDays" INTEGER,
  ADD COLUMN "adjustedDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudyHallClassStudent"
  ADD CONSTRAINT "StudyHallClassStudent_purchased_days_check"
    CHECK ("purchasedDays" IS NULL OR "purchasedDays" > 0),
  ADD CONSTRAINT "StudyHallClassStudent_effective_days_check"
    CHECK ("purchasedDays" IS NULL OR "purchasedDays" + "adjustedDays" >= 0);

CREATE INDEX "StudyHallClassStudent_classId_status_purchasedDays_idx"
  ON "StudyHallClassStudent"("classId", "status", "purchasedDays");

ALTER TABLE "StudyHallSession"
  ADD COLUMN "teacherId" TEXT,
  ADD COLUMN "subject" TEXT;

ALTER TABLE "StudyHallSession"
  ADD CONSTRAINT "StudyHallSession_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StudyHallSession_teacherId_active_idx"
  ON "StudyHallSession"("teacherId", "active");

ALTER TABLE "StudyHallHomeworkEntry"
  ADD COLUMN "attendanceStatus" TEXT NOT NULL DEFAULT 'UNRECORDED';

UPDATE "StudyHallHomeworkEntry"
SET "attendanceStatus" = 'PRESENT'
WHERE "checkedIn" = TRUE;

CREATE TABLE "StudyHallClosure" (
  "id" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "classId" TEXT,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyHallClosure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyHallClosure_date_range_check" CHECK ("startDate" <= "endDate"),
  CONSTRAINT "StudyHallClosure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyHallClosure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudyHallClass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyHallClosure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StudyHallClosure_termId_startDate_endDate_idx"
  ON "StudyHallClosure"("termId", "startDate", "endDate");

CREATE INDEX "StudyHallClosure_classId_startDate_endDate_idx"
  ON "StudyHallClosure"("classId", "startDate", "endDate");
