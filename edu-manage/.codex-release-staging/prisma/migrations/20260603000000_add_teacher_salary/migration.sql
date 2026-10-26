-- CreateTable
CREATE TABLE "TeacherSalaryConfig" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupRateJunior" DOUBLE PRECISION,
    "groupRateSenior" DOUBLE PRECISION,
    "oneOnOneRates" JSONB,
    "feedbackRateGroup" DOUBLE PRECISION,
    "feedbackRateOneOne" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "TeacherSalaryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSalaryTransaction" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "lessonId" TEXT,
    "feedbackId" TEXT,
    "description" TEXT,
    "lessonDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherSalaryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalaryConfig_teacherId_key" ON "TeacherSalaryConfig"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSalaryTransaction_teacherId_createdAt_idx" ON "TeacherSalaryTransaction"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherSalaryTransaction_lessonId_idx" ON "TeacherSalaryTransaction"("lessonId");

-- CreateIndex
CREATE INDEX "TeacherSalaryTransaction_feedbackId_idx" ON "TeacherSalaryTransaction"("feedbackId");

-- AddForeignKey
ALTER TABLE "TeacherSalaryConfig" ADD CONSTRAINT "TeacherSalaryConfig_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSalaryTransaction" ADD CONSTRAINT "TeacherSalaryTransaction_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
