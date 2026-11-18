CREATE TABLE "ClassroomFeedback" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classLessonId" TEXT,
  "targetType" TEXT NOT NULL DEFAULT 'CLASS',
  "studentIds" TEXT[],
  "knowledgePoints" TEXT[],
  "summary" TEXT,
  "homework" JSONB,
  "imageUrls" TEXT[],
  "imageTypes" JSONB,
  "studentRatings" JSONB,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notifySent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassroomFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassroomFeedback_teacherId_createdAt_idx" ON "ClassroomFeedback"("teacherId", "createdAt");
CREATE INDEX "ClassroomFeedback_classLessonId_idx" ON "ClassroomFeedback"("classLessonId");
CREATE INDEX "ClassroomFeedback_status_idx" ON "ClassroomFeedback"("status");

ALTER TABLE "ClassroomFeedback" ADD CONSTRAINT "ClassroomFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomFeedback" ADD CONSTRAINT "ClassroomFeedback_classLessonId_fkey" FOREIGN KEY ("classLessonId") REFERENCES "ClassLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
