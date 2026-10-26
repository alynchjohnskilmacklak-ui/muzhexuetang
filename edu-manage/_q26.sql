SELECT s.id, s.name, s."parentId", s."parentUserId", u.email
FROM "Student" s LEFT JOIN "User" u ON u.id = s."parentUserId"
WHERE s.id LIKE 'test-student-%' ORDER BY s.id;
