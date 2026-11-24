CREATE TABLE "ClassroomFeedbackHomeworkCheckin" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DONE',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomFeedbackHomeworkCheckin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassroomFeedbackHomeworkCheckin_feedbackId_studentId_parentUserId_key"
ON "ClassroomFeedbackHomeworkCheckin"("feedbackId", "studentId", "parentUserId");

CREATE INDEX "ClassroomFeedbackHomeworkCheckin_feedbackId_studentId_idx"
ON "ClassroomFeedbackHomeworkCheckin"("feedbackId", "studentId");

CREATE INDEX "ClassroomFeedbackHomeworkCheckin_parentUserId_submittedAt_idx"
ON "ClassroomFeedbackHomeworkCheckin"("parentUserId", "submittedAt");

ALTER TABLE "ClassroomFeedbackHomeworkCheckin"
ADD CONSTRAINT "ClassroomFeedbackHomeworkCheckin_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassroomFeedbackHomeworkCheckin"
ADD CONSTRAINT "ClassroomFeedbackHomeworkCheckin_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassroomFeedbackHomeworkCheckin"
ADD CONSTRAINT "ClassroomFeedbackHomeworkCheckin_parentUserId_fkey"
FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
