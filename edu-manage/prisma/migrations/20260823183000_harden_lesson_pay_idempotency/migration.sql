ALTER TABLE "TeacherSalaryTransaction"
ADD COLUMN "lessonPayKey" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TeacherSalaryTransaction"
    WHERE "type" = 'LESSON_PAY' AND "lessonId" IS NOT NULL
    GROUP BY "lessonId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate LESSON_PAY rows exist. Reconcile them before applying lesson-pay idempotency.';
  END IF;
END $$;

UPDATE "TeacherSalaryTransaction"
SET "lessonPayKey" = "lessonId"
WHERE "type" = 'LESSON_PAY' AND "lessonId" IS NOT NULL;

CREATE UNIQUE INDEX "TeacherSalaryTransaction_lessonPayKey_key"
ON "TeacherSalaryTransaction"("lessonPayKey");
