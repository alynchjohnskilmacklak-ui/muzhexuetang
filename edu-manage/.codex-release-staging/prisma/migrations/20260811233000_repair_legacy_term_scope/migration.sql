-- Historical business rows predate AcademicTerm. The original term migration
-- created nullable scope columns but did not connect existing groups, feedback
-- or salary transactions. Keep every row and only fill missing ownership.

ALTER TABLE "ClassroomFeedback" ADD COLUMN "termId" TEXT;

-- Assign an old class group to the term whose date range overlaps the group.
-- If ranges overlap more than once, prefer an active term and then the nearest
-- start date. Existing explicit assignments are never overwritten.
UPDATE "ClassGroup" AS groups
SET "termId" = (
  SELECT terms."id"
  FROM "AcademicTerm" AS terms
  WHERE terms."division" = groups."division"
    AND groups."startDate"::date <= terms."endDate"
    AND COALESCE(groups."endDate", groups."startDate")::date >= terms."startDate"
  ORDER BY
    CASE terms."status" WHEN 'ACTIVE' THEN 0 WHEN 'ARCHIVED' THEN 1 ELSE 2 END,
    ABS(groups."startDate"::date - terms."startDate")
  LIMIT 1
)
WHERE groups."termId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "AcademicTerm" AS terms
    WHERE terms."division" = groups."division"
      AND groups."startDate"::date <= terms."endDate"
      AND COALESCE(groups."endDate", groups."startDate")::date >= terms."startDate"
  );

-- Prefer the concrete lesson/group relationship for feedback ownership.
UPDATE "ClassroomFeedback" AS feedback
SET "termId" = groups."termId"
FROM "ClassLesson" AS lessons
JOIN "ClassGroup" AS groups ON groups."id" = lessons."groupId"
WHERE feedback."termId" IS NULL
  AND feedback."classLessonId" = lessons."id"
  AND groups."termId" IS NOT NULL;

UPDATE "ClassroomFeedback" AS feedback
SET "termId" = groups."termId"
FROM "ClassGroup" AS groups
WHERE feedback."termId" IS NULL
  AND feedback."feedbackGroupId" = groups."id"
  AND groups."termId" IS NOT NULL;

-- Legacy feedback sometimes has neither lesson nor group. Match it only when
-- its date is inside a term and at least one selected student belongs to that
-- term, which avoids moving unrelated feedback into a new empty batch.
UPDATE "ClassroomFeedback" AS feedback
SET "termId" = (
  SELECT terms."id"
  FROM "AcademicTerm" AS terms
  JOIN "Teacher" AS teachers
    ON teachers."id" = feedback."teacherId"
   AND teachers."division" = terms."division"
  WHERE feedback."createdAt"::date BETWEEN terms."startDate" AND terms."endDate"
    AND EXISTS (
      SELECT 1
      FROM "StudentTermMembership" AS memberships
      WHERE memberships."termId" = terms."id"
        AND memberships."studentId" = ANY(feedback."studentIds")
    )
  ORDER BY
    CASE terms."status" WHEN 'ACTIVE' THEN 0 WHEN 'ARCHIVED' THEN 1 ELSE 2 END,
    terms."startDate" DESC
  LIMIT 1
)
WHERE feedback."termId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "AcademicTerm" AS terms
    JOIN "Teacher" AS teachers
      ON teachers."id" = feedback."teacherId"
     AND teachers."division" = terms."division"
    WHERE feedback."createdAt"::date BETWEEN terms."startDate" AND terms."endDate"
      AND EXISTS (
        SELECT 1
        FROM "StudentTermMembership" AS memberships
        WHERE memberships."termId" = terms."id"
          AND memberships."studentId" = ANY(feedback."studentIds")
      )
  );

-- Re-run salary ownership after groups and feedback have been repaired.
UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = groups."termId"
FROM "ClassLesson" AS lessons
JOIN "ClassGroup" AS groups ON groups."id" = lessons."groupId"
WHERE salary."termId" IS NULL
  AND salary."lessonId" = lessons."id"
  AND groups."termId" IS NOT NULL;

UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = feedback."termId"
FROM "ClassroomFeedback" AS feedback
WHERE salary."termId" IS NULL
  AND salary."feedbackId" = feedback."id"
  AND feedback."termId" IS NOT NULL;

-- Manual adjustments and other legacy salary rows have no lesson/feedback.
-- Date and teacher division provide the safest available historical scope.
UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = (
  SELECT terms."id"
  FROM "AcademicTerm" AS terms
  JOIN "Teacher" AS teachers
    ON teachers."id" = salary."teacherId"
   AND teachers."division" = terms."division"
  WHERE COALESCE(salary."lessonDate", salary."createdAt")::date
        BETWEEN terms."startDate" AND terms."endDate"
  ORDER BY
    CASE terms."status" WHEN 'ACTIVE' THEN 0 WHEN 'ARCHIVED' THEN 1 ELSE 2 END,
    terms."startDate" DESC
  LIMIT 1
)
WHERE salary."termId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "AcademicTerm" AS terms
    JOIN "Teacher" AS teachers
      ON teachers."id" = salary."teacherId"
     AND teachers."division" = terms."division"
    WHERE COALESCE(salary."lessonDate", salary."createdAt")::date
          BETWEEN terms."startDate" AND terms."endDate"
  );

CREATE INDEX "ClassroomFeedback_termId_status_createdAt_idx"
  ON "ClassroomFeedback"("termId", "status", "createdAt");

ALTER TABLE "ClassroomFeedback"
  ADD CONSTRAINT "ClassroomFeedback_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
