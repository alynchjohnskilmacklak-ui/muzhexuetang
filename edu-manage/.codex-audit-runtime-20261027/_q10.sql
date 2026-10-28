SELECT g.id, g.name,
  (SELECT string_agg(DISTINCT e."studentId" || ':' || COALESCE(array_to_string(e.subjects, '/'), ''), ' , ') FROM "Enrollment" e WHERE e."groupId" = g.id AND e.status='ACTIVE') AS enrolls
FROM "ClassGroup" g
WHERE g.id LIKE 'test-group-%'
ORDER BY g.id;
