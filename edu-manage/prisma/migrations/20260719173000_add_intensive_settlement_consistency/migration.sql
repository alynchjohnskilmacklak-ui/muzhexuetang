-- INTENSIVE settlement state. Existing NORMAL lessons remain compatible.
CREATE TYPE "SettlementStatus" AS ENUM ('UNSETTLED', 'SETTLED', 'ADJUSTED');

ALTER TABLE "ClassLesson"
  ADD COLUMN "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'UNSETTLED';

-- Preserve the settled state of INTENSIVE lessons that were completed before
-- this migration. This update does not change minutes, attendance, hours, or pay.
UPDATE "ClassLesson" AS lesson
SET "settlementStatus" = 'SETTLED'
FROM "ClassGroup" AS class_group
WHERE lesson."groupId" = class_group."id"
  AND class_group."intensiveMode" = 'INTENSIVE'
  AND (
    lesson."attendanceSubmittedAt" IS NOT NULL
    OR lesson."hoursDeductedAt" IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM "TeacherSalaryTransaction" AS salary
      WHERE salary."lessonId" = lesson."id"
        AND salary."type" = 'LESSON_PAY'
    )
  );

CREATE TABLE "LessonSettlementAdjustment" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "oldMinutes" INTEGER NOT NULL,
  "newMinutes" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LessonSettlementAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LessonSettlementAdjustment_lessonId_createdAt_idx"
  ON "LessonSettlementAdjustment"("lessonId", "createdAt");

CREATE INDEX "LessonSettlementAdjustment_operatorId_createdAt_idx"
  ON "LessonSettlementAdjustment"("operatorId", "createdAt");

ALTER TABLE "LessonSettlementAdjustment"
  ADD CONSTRAINT "LessonSettlementAdjustment_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
