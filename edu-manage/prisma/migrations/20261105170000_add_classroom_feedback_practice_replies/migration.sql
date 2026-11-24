CREATE TABLE "ClassroomFeedbackPracticeReply" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomFeedbackPracticeReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassroomFeedbackPracticeReply_feedbackId_studentId_createdAt_idx"
    ON "ClassroomFeedbackPracticeReply"("feedbackId", "studentId", "createdAt");

ALTER TABLE "ClassroomFeedbackPracticeReply"
    ADD CONSTRAINT "ClassroomFeedbackPracticeReply_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassroomFeedbackPracticeReply"
    ADD CONSTRAINT "ClassroomFeedbackPracticeReply_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassroomFeedbackPracticeReply"
    ADD CONSTRAINT "ClassroomFeedbackPracticeReply_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
