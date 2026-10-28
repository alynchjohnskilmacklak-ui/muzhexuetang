-- Give every current student record a stable identity key. Historical records
-- start as separate identities; uncertain cross-term matches are not merged.
-- Some production databases already received this column through an earlier
-- schema sync. Keep existing identity keys and let the migration finish safely.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "identityId" TEXT;
UPDATE "Student" SET "identityId" = 'student:' || "id" WHERE "identityId" IS NULL;
ALTER TABLE "Student" ALTER COLUMN "identityId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Student_identityId_idx" ON "Student"("identityId");

-- A parent-specific receipt avoids one parent's read state leaking to another.
CREATE TABLE IF NOT EXISTS "FeedbackParentReadReceipt" (
    "feedbackId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackParentReadReceipt_pkey" PRIMARY KEY ("feedbackId", "parentUserId"),
    CONSTRAINT "FeedbackParentReadReceipt_feedbackId_fkey"
      FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedbackParentReadReceipt_parentUserId_fkey"
      FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CREATE TABLE IF NOT EXISTS does not add constraints to an already-synced
-- table. Add only the expected foreign keys when they are not present.
DO $feedback_parent_read_receipt_constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."FeedbackParentReadReceipt"'::regclass
      AND conname = 'FeedbackParentReadReceipt_feedbackId_fkey'
  ) THEN
    ALTER TABLE "FeedbackParentReadReceipt"
      ADD CONSTRAINT "FeedbackParentReadReceipt_feedbackId_fkey"
      FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."FeedbackParentReadReceipt"'::regclass
      AND conname = 'FeedbackParentReadReceipt_parentUserId_fkey'
  ) THEN
    ALTER TABLE "FeedbackParentReadReceipt"
      ADD CONSTRAINT "FeedbackParentReadReceipt_parentUserId_fkey"
      FOREIGN KEY ("parentUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$feedback_parent_read_receipt_constraints$;

CREATE INDEX IF NOT EXISTS "FeedbackParentReadReceipt_parentUserId_readAt_idx"
  ON "FeedbackParentReadReceipt"("parentUserId", "readAt");

-- Preserve existing notification-derived read state before the API switches to
-- explicit receipts. Any unread notification keeps that parent's receipt unread.
INSERT INTO "FeedbackParentReadReceipt" ("feedbackId", "parentUserId", "readAt", "createdAt")
SELECT n."relatedId", n."userId",
       CASE WHEN BOOL_AND(n."read") THEN MAX(COALESCE(n."readAt", n."createdAt")) ELSE NULL END,
       MIN(n."createdAt")
FROM "Notification" n
JOIN "User" u ON u."id" = n."userId"
JOIN "ClassroomFeedback" f ON f."id" = n."relatedId"
WHERE n."relatedType" = 'CLASSROOM_FEEDBACK'
  AND n."relatedId" IS NOT NULL
  AND LOWER(u."role") = 'parent'
GROUP BY n."relatedId", n."userId"
ON CONFLICT ("feedbackId", "parentUserId") DO NOTHING;

-- Durable idempotency claims are committed in the same transaction as feedback
-- creation and all of its side effects.
CREATE TABLE IF NOT EXISTS "ClassroomFeedbackRequest" (
    "clientRequestId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "feedbackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomFeedbackRequest_pkey" PRIMARY KEY ("clientRequestId")
);
CREATE INDEX IF NOT EXISTS "ClassroomFeedbackRequest_actorUserId_createdAt_idx"
  ON "ClassroomFeedbackRequest"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassroomFeedbackRequest_feedbackId_idx"
  ON "ClassroomFeedbackRequest"("feedbackId");

-- A normalized event record anchors schedule mutations, parent notifications,
-- and the audit trail to the same change.
CREATE TABLE IF NOT EXISTS "CourseChangeEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "groupId" TEXT,
    "lessonIds" TEXT[] NOT NULL,
    "studentIds" TEXT[] NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "notificationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseChangeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CourseChangeEvent_groupId_createdAt_idx" ON "CourseChangeEvent"("groupId", "createdAt");
CREATE INDEX IF NOT EXISTS "CourseChangeEvent_actorUserId_createdAt_idx" ON "CourseChangeEvent"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "CourseChangeEvent_eventType_createdAt_idx" ON "CourseChangeEvent"("eventType", "createdAt");
