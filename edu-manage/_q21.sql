UPDATE "Student" SET grade='初三' WHERE id IN ('test-student-1','test-student-2','test-student-3');
SELECT id, grade FROM "Student" WHERE id LIKE 'test-student-%' ORDER BY id;
