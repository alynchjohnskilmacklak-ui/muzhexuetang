ALTER TABLE "TeacherSalaryTransaction"
ADD COLUMN "manualAdjustmentRequestKey" TEXT;

CREATE UNIQUE INDEX "TeacherSalaryTransaction_manualAdjustmentRequestKey_key"
ON "TeacherSalaryTransaction"("manualAdjustmentRequestKey");
