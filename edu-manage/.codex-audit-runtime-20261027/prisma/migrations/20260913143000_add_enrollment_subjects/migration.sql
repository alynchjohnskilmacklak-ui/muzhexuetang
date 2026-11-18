ALTER TABLE "Enrollment"
ADD COLUMN "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve the subject choices that were previously stored only in lesson rosters.
UPDATE "Enrollment" AS enrollment
SET "subjects" = snapshot.subjects
FROM (
  SELECT
    lesson_student."studentId",
    lesson."groupId",
    ARRAY_AGG(DISTINCT lesson."subject")
      FILTER (WHERE lesson."subject" IS NOT NULL AND BTRIM(lesson."subject") <> '') AS subjects
  FROM "ClassLessonStudent" AS lesson_student
  INNER JOIN "ClassLesson" AS lesson ON lesson.id = lesson_student."lessonId"
  WHERE lesson."lessonDate" >= CURRENT_DATE
    AND lesson."status" IN ('SCHEDULED', 'IN_PROGRESS')
  GROUP BY lesson_student."studentId", lesson."groupId"
) AS snapshot
WHERE enrollment."studentId" = snapshot."studentId"
  AND enrollment."groupId" = snapshot."groupId"
  AND COALESCE(ARRAY_LENGTH(snapshot.subjects, 1), 0) > 0;
