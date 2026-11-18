SELECT g.id AS group_id, g.name AS group_name,
  (SELECT string_agg(s.name, ',') FROM "Student" s JOIN "ClassGroupStudent" cgs ON cgs."studentId" = s.id WHERE cgs."groupId" = g.id) AS students
FROM "ClassGroup" g
WHERE g.id IN ('test-group-math','test-group-chinese','test-group-english','test-group-physics','test-group-biology','test-group-chemistry')
ORDER BY g.id;
