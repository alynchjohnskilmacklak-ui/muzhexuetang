ALTER TABLE "StudyHallHomeworkEntry"
  ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'HOMEWORK',
  ADD COLUMN "beforeImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "afterImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "lessonImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing photos were not categorized. Keep them visible as completion photos.
UPDATE "StudyHallHomeworkEntry"
SET "afterImageUrls" = "imageUrls"
WHERE cardinality("imageUrls") > 0;

ALTER TABLE "StudyHallHomeworkEntry"
  ADD CONSTRAINT "StudyHallHomeworkEntry_contentType_check"
  CHECK ("contentType" IN ('HOMEWORK', 'LESSON'));
