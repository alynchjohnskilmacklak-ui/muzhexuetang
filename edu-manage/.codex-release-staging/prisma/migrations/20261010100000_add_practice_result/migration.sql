CREATE TABLE IF NOT EXISTS "PracticeResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "wrongIds" TEXT[] NOT NULL,
    "answers" JSONB,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PracticeResult_studentId_setId_key"
    ON "PracticeResult"("studentId", "setId");

CREATE INDEX IF NOT EXISTS "PracticeResult_studentId_idx"
    ON "PracticeResult"("studentId");
