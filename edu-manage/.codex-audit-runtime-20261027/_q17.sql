INSERT INTO "Enrollment" (id, "groupId", "studentId", subjects, status, "enrolledAt") VALUES
('enr-s4-math', 'test-group-math', 'test-student-4', ARRAY['数学'], 'ACTIVE', NOW()),
('enr-s5-math', 'test-group-math', 'test-student-5', ARRAY['数学'], 'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;
SELECT e."studentId", s.name, e.subjects, e.status FROM "Enrollment" e JOIN "Student" s ON s.id=e."studentId" WHERE e."groupId"='test-group-math' AND e.status='ACTIVE' ORDER BY e."studentId";
