CREATE TABLE "VocabProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LEARNING',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastResult" TEXT,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "unit" TEXT,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrongIds" TEXT[],
    "answers" JSONB,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VocabProgress_studentId_status_idx"
ON "VocabProgress"("studentId", "status");

CREATE UNIQUE INDEX "VocabProgress_studentId_wordId_key"
ON "VocabProgress"("studentId", "wordId");

CREATE INDEX "VocabSession_studentId_finishedAt_idx"
ON "VocabSession"("studentId", "finishedAt" DESC);

ALTER INDEX "ClassroomFeedbackHomeworkCheckin_feedbackId_studentId_parentUse"
RENAME TO "ClassroomFeedbackHomeworkCheckin_feedbackId_studentId_paren_key";

ALTER INDEX "ClassroomFeedbackPracticeReply_feedbackId_studentId_createdAt_i"
RENAME TO "ClassroomFeedbackPracticeReply_feedbackId_studentId_created_idx";
