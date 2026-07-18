-- FileAsset was introduced before it had a formal migration. Create the full
-- table for fresh environments, then add the variant columns idempotently for
-- existing production databases that already have the legacy table.
CREATE TABLE IF NOT EXISTS "FileAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "studentId" TEXT,
    "lessonId" TEXT,
    "feedbackId" TEXT,
    "postId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "uploadedById" TEXT,
    "uploadedByRole" TEXT,
    "tenant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

CREATE INDEX IF NOT EXISTS "FileAsset_studentId_idx" ON "FileAsset"("studentId");
CREATE INDEX IF NOT EXISTS "FileAsset_feedbackId_idx" ON "FileAsset"("feedbackId");
CREATE INDEX IF NOT EXISTS "FileAsset_postId_idx" ON "FileAsset"("postId");
CREATE INDEX IF NOT EXISTS "FileAsset_ownerType_ownerId_idx" ON "FileAsset"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "FileAsset_tenant_idx" ON "FileAsset"("tenant");
