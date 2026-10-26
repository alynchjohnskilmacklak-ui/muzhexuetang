SELECT id, status, "teacherId", array_to_string("studentIds", ',') as sids, "lessonContent" IS NOT NULL as hasLesson, "createdAt"
FROM "ClassroomFeedback"
ORDER BY "createdAt" DESC LIMIT 3;
