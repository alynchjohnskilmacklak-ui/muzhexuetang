-- REVIEW ONLY. Do not execute automatically and do not use `prisma migrate dev`.
-- All columns are nullable and preserve every historical original URL.

ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "FileAsset" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

-- Production preflight:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'FileAsset'
-- ORDER BY ordinal_position;
