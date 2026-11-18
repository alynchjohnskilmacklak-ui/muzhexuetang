SELECT g.id, g.name, g."teacherId",
  (SELECT string_agg(DISTINCT e."studentId" || ':' || e.subjects, ' , ') FROM "ClassGroupEnrollment" e WHERE e."groupId" = g.id AND e.status='ACTIVE') AS enrolls
FROM "ClassGroup" g
WHERE g.id LIKE 'test-group-%'
ORDER BY g.id;
