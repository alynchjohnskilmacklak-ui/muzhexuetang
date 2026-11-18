ALTER TABLE "ParentMessageReply"
ADD COLUMN IF NOT EXISTS "attachments" JSONB;
