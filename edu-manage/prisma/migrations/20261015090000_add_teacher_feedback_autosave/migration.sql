CREATE TABLE "TeacherFeedbackDraft" (
    "teacherId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherFeedbackDraft_pkey" PRIMARY KEY ("teacherId"),
    CONSTRAINT "TeacherFeedbackDraft_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
