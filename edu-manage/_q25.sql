SELECT id, status, array_to_string("studentIds", ',') as sids, "createdAt"
FROM "ClassroomFeedback"
WHERE "createdAt" > '2026-10-05 08:52:00'
ORDER BY "createdAt" DESC LIMIT 8;
