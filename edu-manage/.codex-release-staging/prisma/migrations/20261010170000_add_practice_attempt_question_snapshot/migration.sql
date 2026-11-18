ALTER TABLE "PracticeAttempt"
ADD COLUMN IF NOT EXISTS "questionSnapshot" JSONB;
