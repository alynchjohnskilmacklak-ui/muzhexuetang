-- Link the existing ParentMessage system to classroom feedback without removing legacy fields.
ALTER TABLE "ParentMessage"
    ADD COLUMN "feedbackId" TEXT;

CREATE UNIQUE INDEX "ParentMessage_feedbackId_parentId_key"
    ON "ParentMessage"("feedbackId", "parentId");

CREATE INDEX "ParentMessage_feedbackId_idx"
    ON "ParentMessage"("feedbackId");

ALTER TABLE "ParentMessage"
    ADD CONSTRAINT "ParentMessage_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "ClassroomFeedback"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill only feedback rows that resolve to exactly one parent user.
WITH "ParentCandidates" AS (
    SELECT
        feedback."id" AS "feedbackId",
        feedback."teacherId",
        feedback."parentReply",
        feedback."parentRepliedAt",
        feedback."updatedAt",
        student."id" AS "studentId",
        COALESCE(student."parentId", student."parentUserId") AS "parentId",
        COALESCE(lesson."subject", course."subject") AS "subject"
    FROM "ClassroomFeedback" feedback
    JOIN "Student" student
      ON student."id" = ANY(feedback."studentIds")
    JOIN "User" parent_user
      ON parent_user."id" = COALESCE(student."parentId", student."parentUserId")
     AND parent_user."role" = 'parent'
    LEFT JOIN "ClassLesson" lesson ON lesson."id" = feedback."classLessonId"
    LEFT JOIN "ClassGroup" class_group ON class_group."id" = lesson."groupId"
    LEFT JOIN "Course" course ON course."id" = class_group."courseId"
    WHERE NULLIF(BTRIM(feedback."parentReply"), '') IS NOT NULL
      AND (
          SELECT COUNT(DISTINCT COALESCE(linked_student."parentId", linked_student."parentUserId"))
          FROM "Student" linked_student
          WHERE linked_student."id" = ANY(feedback."studentIds")
      ) = 1
),
"UnambiguousFeedback" AS (
    SELECT
        "feedbackId",
        MIN("teacherId") AS "teacherId",
        MIN("parentReply") AS "parentReply",
        MIN("parentRepliedAt") AS "parentRepliedAt",
        MIN("updatedAt") AS "updatedAt",
        MIN("studentId") AS "studentId",
        MIN("parentId") AS "parentId",
        MIN("subject") AS "subject"
    FROM "ParentCandidates"
    GROUP BY "feedbackId"
    HAVING COUNT(DISTINCT "parentId") = 1
)
INSERT INTO "ParentMessage" (
    "id", "parentId", "studentId", "teacherId", "feedbackId",
    "subject", "title", "status", "createdAt", "updatedAt"
)
SELECT
    'legacy-feedback-message-' || MD5(item."feedbackId" || ':' || item."parentId"),
    item."parentId",
    item."studentId",
    item."teacherId",
    item."feedbackId",
    item."subject",
    '课堂反馈留言',
    'OPEN',
    COALESCE(item."parentRepliedAt", item."updatedAt", CURRENT_TIMESTAMP),
    COALESCE(item."parentRepliedAt", item."updatedAt", CURRENT_TIMESTAMP)
FROM "UnambiguousFeedback" item
ON CONFLICT ("feedbackId", "parentId") DO NOTHING;

WITH "ParentCandidates" AS (
    SELECT
        feedback."id" AS "feedbackId",
        feedback."parentReply",
        feedback."parentRepliedAt",
        feedback."updatedAt",
        COALESCE(student."parentId", student."parentUserId") AS "parentId",
        parent_user."name" AS "parentName"
    FROM "ClassroomFeedback" feedback
    JOIN "Student" student
      ON student."id" = ANY(feedback."studentIds")
    JOIN "User" parent_user
      ON parent_user."id" = COALESCE(student."parentId", student."parentUserId")
     AND parent_user."role" = 'parent'
    WHERE NULLIF(BTRIM(feedback."parentReply"), '') IS NOT NULL
      AND (
          SELECT COUNT(DISTINCT COALESCE(linked_student."parentId", linked_student."parentUserId"))
          FROM "Student" linked_student
          WHERE linked_student."id" = ANY(feedback."studentIds")
      ) = 1
),
"UnambiguousFeedback" AS (
    SELECT
        "feedbackId",
        MIN("parentReply") AS "parentReply",
        MIN("parentRepliedAt") AS "parentRepliedAt",
        MIN("updatedAt") AS "updatedAt",
        MIN("parentId") AS "parentId",
        MIN("parentName") AS "parentName"
    FROM "ParentCandidates"
    GROUP BY "feedbackId"
    HAVING COUNT(DISTINCT "parentId") = 1
)
INSERT INTO "ParentMessageReply" (
    "id", "messageId", "authorId", "authorName", "role", "content",
    "isReadByParent", "isReadByTeacher", "createdAt"
)
SELECT
    'legacy-feedback-reply-' || MD5(item."feedbackId" || ':' || item."parentId"),
    message."id",
    item."parentId",
    COALESCE(item."parentName", '家长'),
    'parent',
    item."parentReply",
    TRUE,
    FALSE,
    COALESCE(item."parentRepliedAt", item."updatedAt", CURRENT_TIMESTAMP)
FROM "UnambiguousFeedback" item
JOIN "ParentMessage" message
  ON message."feedbackId" = item."feedbackId"
 AND message."parentId" = item."parentId"
ON CONFLICT ("id") DO NOTHING;

DO $$
DECLARE
    ambiguous_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ambiguous_count
    FROM (
        SELECT feedback."id"
        FROM "ClassroomFeedback" feedback
        JOIN "Student" student ON student."id" = ANY(feedback."studentIds")
        WHERE NULLIF(BTRIM(feedback."parentReply"), '') IS NOT NULL
        GROUP BY feedback."id"
        HAVING COUNT(DISTINCT COALESCE(student."parentId", student."parentUserId")) <> 1
    ) ambiguous;
    RAISE NOTICE 'ClassroomFeedback legacy parent replies left unchanged because parent ownership is ambiguous: %', ambiguous_count;
END $$;
