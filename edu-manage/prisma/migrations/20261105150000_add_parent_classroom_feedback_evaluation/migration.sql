CREATE TABLE "ParentClassroomFeedbackEvaluation" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "satisfied" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentClassroomFeedbackEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentClassroomFeedbackEvaluation_feedbackId_parentUserId_key"
ON "ParentClassroomFeedbackEvaluation"("feedbackId", "parentUserId");

CREATE INDEX "ParentClassroomFeedbackEvaluation_feedbackId_createdAt_idx"
ON "ParentClassroomFeedbackEvaluation"("feedbackId", "createdAt");

CREATE INDEX "ParentClassroomFeedbackEvaluation_satisfied_createdAt_idx"
ON "ParentClassroomFeedbackEvaluation"("satisfied", "createdAt");

ALTER TABLE "ParentClassroomFeedbackEvaluation"
ADD CONSTRAINT "ParentClassroomFeedbackEvaluation_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentClassroomFeedbackEvaluation"
ADD CONSTRAINT "ParentClassroomFeedbackEvaluation_parentUserId_fkey"
FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
