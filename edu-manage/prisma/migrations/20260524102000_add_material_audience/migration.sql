CREATE TYPE "MaterialAudience" AS ENUM ('STUDENT', 'TEACHER', 'BOTH');
CREATE TYPE "MaterialSource" AS ENUM ('ADMIN', 'TEACHER');
CREATE TYPE "MaterialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DELETED');

ALTER TABLE "StudyMaterial"
  ADD COLUMN "audience" "MaterialAudience" NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN "source" "MaterialSource" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "status" "MaterialStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "teacherId" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudyMaterial"
  ADD CONSTRAINT "StudyMaterial_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StudyMaterial_audience_status_grade_subject_idx" ON "StudyMaterial"("audience", "status", "grade", "subject");
CREATE INDEX "StudyMaterial_teacherId_status_createdAt_idx" ON "StudyMaterial"("teacherId", "status", "createdAt");
CREATE INDEX "StudyMaterial_uploadedBy_createdAt_idx" ON "StudyMaterial"("uploadedBy", "createdAt");
