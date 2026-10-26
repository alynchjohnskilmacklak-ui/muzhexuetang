-- 查看所有马紫晨的记录
SELECT id, name, grade, "mainTeacherId", "createdAt"
FROM "Student"
WHERE name = '马紫晨'
ORDER BY "createdAt";
