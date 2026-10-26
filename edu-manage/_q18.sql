SELECT g.id, g.name, count(e.id) as enrollments,
       string_agg(DISTINCT array_to_string(e.subjects, ','), ';') as subjects
FROM "ClassGroup" g LEFT JOIN "Enrollment" e ON e."groupId" = g.id
WHERE g.id LIKE 'test-group-%'
GROUP BY g.id, g.name ORDER BY g.id;
