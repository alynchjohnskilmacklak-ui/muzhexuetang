ALTER TABLE "ClassroomFeedback"
ADD COLUMN "isSingleSession" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "subjectSnapshot" TEXT,
ADD COLUMN "sessionDate" TIMESTAMP(3);

CREATE INDEX "ClassroomFeedback_singleSession_subject_date_idx"
ON "ClassroomFeedback"("isSingleSession", "subjectSnapshot", "sessionDate");
