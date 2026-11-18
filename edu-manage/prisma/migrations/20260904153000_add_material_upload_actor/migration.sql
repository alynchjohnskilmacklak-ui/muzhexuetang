ALTER TABLE "StudyMaterial"
ADD COLUMN "uploadedByRole" TEXT NOT NULL DEFAULT 'TEACHER',
ADD COLUMN "uploadedByAdminId" TEXT;

CREATE INDEX "StudyMaterial_uploadedByRole_createdAt_idx"
ON "StudyMaterial"("uploadedByRole", "createdAt");

CREATE INDEX "StudyMaterial_uploadedByAdminId_createdAt_idx"
ON "StudyMaterial"("uploadedByAdminId", "createdAt");

ALTER TABLE "StudyMaterial"
ADD CONSTRAINT "StudyMaterial_uploadedByAdminId_fkey"
FOREIGN KEY ("uploadedByAdminId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
