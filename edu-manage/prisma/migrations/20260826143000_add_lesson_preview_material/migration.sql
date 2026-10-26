ALTER TABLE "StudyMaterial"
ADD COLUMN "classLessonId" TEXT,
ADD COLUMN "isLessonPreview" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "StudyMaterial_classLessonId_key"
ON "StudyMaterial"("classLessonId");

CREATE INDEX "StudyMaterial_isLessonPreview_status_createdAt_idx"
ON "StudyMaterial"("isLessonPreview", "status", "createdAt");

ALTER TABLE "StudyMaterial"
ADD CONSTRAINT "StudyMaterial_classLessonId_fkey"
FOREIGN KEY ("classLessonId") REFERENCES "ClassLesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
