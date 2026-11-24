ALTER TABLE "Notification"
ADD COLUMN "qywxExternalUserId" TEXT,
ADD COLUMN "qywxSenderUserId" TEXT,
ADD COLUMN "qywxProcessingAt" TIMESTAMP(3);

CREATE INDEX "Notification_qywxExternalUserId_createdAt_idx"
ON "Notification"("qywxExternalUserId", "createdAt");

CREATE INDEX "Notification_pushStatus_qywxProcessingAt_idx"
ON "Notification"("pushStatus", "qywxProcessingAt");
