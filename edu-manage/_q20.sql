SELECT e."studentId", s.name, s.status, e.status, e.subjects, e."groupId"
FROM "Enrollment" e JOIN "Student" s ON s.id = e."studentId"
WHERE e."groupId" IN ('test-group-english','test-group-english::%E8%8B%B1%E8%AF%AD')
ORDER BY e."studentId";
