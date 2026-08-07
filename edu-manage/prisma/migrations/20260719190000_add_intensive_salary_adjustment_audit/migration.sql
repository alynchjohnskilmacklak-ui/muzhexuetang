-- INTENSIVE salary adjustments are immutable delta transactions.
ALTER TABLE "TeacherSalaryTransaction"
    ADD COLUMN "adjustmentId" TEXT;

-- The original constraint prevented more than one adjustment transaction per lesson.
DROP INDEX "TeacherSalaryTransaction_lessonId_type_key";

-- Preserve concurrency protection for the immutable original lesson-pay transaction.
CREATE UNIQUE INDEX "TeacherSalaryTransaction_lesson_pay_key"
    ON "TeacherSalaryTransaction"("lessonId")
    WHERE "lessonId" IS NOT NULL AND "type" = 'LESSON_PAY';

CREATE UNIQUE INDEX "TeacherSalaryTransaction_adjustmentId_key"
    ON "TeacherSalaryTransaction"("adjustmentId");

CREATE INDEX "TeacherSalaryTransaction_lessonId_type_idx"
    ON "TeacherSalaryTransaction"("lessonId", "type");

ALTER TABLE "TeacherSalaryTransaction"
    ADD CONSTRAINT "TeacherSalaryTransaction_adjustmentId_fkey"
    FOREIGN KEY ("adjustmentId") REFERENCES "LessonSettlementAdjustment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
