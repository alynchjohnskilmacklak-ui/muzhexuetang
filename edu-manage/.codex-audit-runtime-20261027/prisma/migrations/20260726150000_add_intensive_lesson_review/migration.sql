-- INTENSIVE teacher attendance now requires an auditable administrator review
-- before student hours and teacher salary are settled.
CREATE TYPE "IntensiveReviewStatus" AS ENUM (
  'NOT_REQUIRED',
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "ClassLesson"
ADD COLUMN "intensiveReviewStatus" "IntensiveReviewStatus"
NOT NULL DEFAULT 'NOT_REQUIRED';

CREATE TABLE "IntensiveLessonReview" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "teacherId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "actualMinutes" INTEGER NOT NULL,
  "attendanceSnapshot" JSONB NOT NULL,
  "teacherNote" TEXT,
  "status" "IntensiveReviewStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntensiveLessonReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntensiveLessonReview_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IntensiveLessonReview_lessonId_revision_key"
ON "IntensiveLessonReview"("lessonId", "revision");

CREATE INDEX "IntensiveLessonReview_status_submittedAt_idx"
ON "IntensiveLessonReview"("status", "submittedAt");

CREATE INDEX "IntensiveLessonReview_teacherId_status_submittedAt_idx"
ON "IntensiveLessonReview"("teacherId", "status", "submittedAt");

CREATE INDEX "IntensiveLessonReview_reviewedById_reviewedAt_idx"
ON "IntensiveLessonReview"("reviewedById", "reviewedAt");

-- Preserve existing settled production lessons as approved legacy records.
-- No synthetic review rows are created because their submitter cannot be
-- determined safely.
UPDATE "ClassLesson" lesson
SET "intensiveReviewStatus" = CASE
  WHEN lesson."settlementStatus" IN ('SETTLED', 'ADJUSTED')
    THEN 'APPROVED'::"IntensiveReviewStatus"
  ELSE 'DRAFT'::"IntensiveReviewStatus"
END
FROM "ClassGroup" class_group
WHERE class_group."id" = lesson."groupId"
  AND class_group."intensiveMode" = 'INTENSIVE';
