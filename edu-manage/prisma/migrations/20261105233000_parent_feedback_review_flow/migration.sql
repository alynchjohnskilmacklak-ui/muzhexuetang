ALTER TABLE "ParentClassroomFeedbackEvaluation"
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "ParentClassroomFeedbackEvaluation_reviewStatus_createdAt_idx"
ON "ParentClassroomFeedbackEvaluation"("reviewStatus", "createdAt");

CREATE INDEX "ParentClassroomFeedbackEvaluation_reviewedById_idx"
ON "ParentClassroomFeedbackEvaluation"("reviewedById");

ALTER TABLE "ParentClassroomFeedbackEvaluation"
ADD CONSTRAINT "ParentClassroomFeedbackEvaluation_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
