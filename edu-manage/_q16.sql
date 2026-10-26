INSERT INTO "Student" (id, name, grade, status, "createdAt", "updatedAt") VALUES
('test-student-4', '孙嘉森', '高一', 'ACTIVE', NOW(), NOW()),
('test-student-5', '王钊杨', '高一', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Enrollment" (id, "groupId", "studentId", subjects, status, "enrolledAt", "createdAt", "updatedAt") VALUES
('enr-s4-math', 'test-group-math', 'test-student-4', ARRAY['数学'], 'ACTIVE', NOW(), NOW(), NOW()),
('enr-s5-math', 'test-group-math', 'test-student-5', ARRAY['数学'], 'ACTIVE', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
SELECT s.id, s.name, s.grade FROM "Student" s WHERE s.id LIKE 'test-student-%' ORDER BY s.id;
