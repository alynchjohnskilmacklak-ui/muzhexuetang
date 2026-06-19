-- CreateTable
CREATE TABLE "StageSummary" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "suggestions" TEXT,
    "dataSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "notifySent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageSummary_studentId_status_periodEnd_idx" ON "StageSummary"("studentId", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "StageSummary_teacherId_createdAt_idx" ON "StageSummary"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "StageSummary" ADD CONSTRAINT "StageSummary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageSummary" ADD CONSTRAINT "StageSummary_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
