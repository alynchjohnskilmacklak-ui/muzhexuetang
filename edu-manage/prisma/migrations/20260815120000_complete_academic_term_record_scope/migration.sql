-- Complete operational-batch ownership for the remaining parent-visible
-- learning records. Historical rows are backfilled only when ownership is
-- unambiguous. Ambiguous rows intentionally stay NULL for administrator audit.

ALTER TABLE "PerformancePost" ADD COLUMN "termId" TEXT;
ALTER TABLE "ExamPaper" ADD COLUMN "termId" TEXT;
ALTER TABLE "GradeRecord" ADD COLUMN "termId" TEXT;

ALTER TABLE "PerformancePost"
  ADD CONSTRAINT "PerformancePost_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExamPaper"
  ADD CONSTRAINT "ExamPaper_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GradeRecord"
  ADD CONSTRAINT "GradeRecord_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- A linked lesson or assessment group is authoritative.
UPDATE "PerformancePost" AS post
SET "termId" = groups."termId"
FROM "ClassLesson" AS lesson
JOIN "ClassGroup" AS groups ON groups."id" = lesson."groupId"
WHERE post."termId" IS NULL
  AND post."classLessonId" = lesson."id"
  AND groups."termId" IS NOT NULL;

UPDATE "ExamPaper" AS paper
SET "termId" = groups."termId"
FROM "ClassLesson" AS lesson
JOIN "ClassGroup" AS groups ON groups."id" = lesson."groupId"
WHERE paper."termId" IS NULL
  AND paper."classLessonId" = lesson."id"
  AND groups."termId" IS NOT NULL;

UPDATE "GradeRecord" AS grade
SET "termId" = groups."termId"
FROM "Assessment" AS assessment
JOIN "ClassGroup" AS groups ON groups."id" = assessment."groupId"
WHERE grade."termId" IS NULL
  AND grade."assessmentId" = assessment."id"
  AND groups."termId" IS NOT NULL;

-- Without a direct class relation, only use a membership/date match when
-- exactly one operational batch can own the row.
UPDATE "PerformancePost" AS post
SET "termId" = candidate."termId"
FROM (
  SELECT post2."id", MIN(membership."termId") AS "termId"
  FROM "PerformancePost" AS post2
  JOIN "StudentTermMembership" AS membership
    ON membership."studentId" = post2."studentId"
  JOIN "AcademicTerm" AS term ON term."id" = membership."termId"
  WHERE post2."termId" IS NULL
    AND post2."createdAt"::date BETWEEN term."startDate" AND term."endDate"
  GROUP BY post2."id"
  HAVING COUNT(DISTINCT membership."termId") = 1
) AS candidate
WHERE post."id" = candidate."id";

UPDATE "ExamPaper" AS paper
SET "termId" = candidate."termId"
FROM (
  SELECT paper2."id", MIN(membership."termId") AS "termId"
  FROM "ExamPaper" AS paper2
  JOIN "StudentTermMembership" AS membership
    ON membership."studentId" = paper2."studentId"
  JOIN "AcademicTerm" AS term ON term."id" = membership."termId"
  WHERE paper2."termId" IS NULL
    AND paper2."paperDate"::date BETWEEN term."startDate" AND term."endDate"
  GROUP BY paper2."id"
  HAVING COUNT(DISTINCT membership."termId") = 1
) AS candidate
WHERE paper."id" = candidate."id";

CREATE INDEX "GradeRecord_termId_createdAt_idx"
  ON "GradeRecord"("termId", "createdAt");
CREATE INDEX "PerformancePost_termId_createdAt_idx"
  ON "PerformancePost"("termId", "createdAt");
CREATE INDEX "ExamPaper_termId_status_paperDate_idx"
  ON "ExamPaper"("termId", "status", "paperDate");
