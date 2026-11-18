\pset tuples_only on
\pset format unaligned
SELECT 'table_count|' || count(*)
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'migration_finished|' || count(*)
FROM "_prisma_migrations"
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
SELECT 'User|' || count(*) FROM "User";
SELECT 'Student|' || count(*) FROM "Student";
SELECT 'Teacher|' || count(*) FROM "Teacher";
SELECT 'Course|' || count(*) FROM "Course";
SELECT 'ClassGroup|' || count(*) FROM "ClassGroup";
SELECT 'ClassLesson|' || count(*) FROM "ClassLesson";
SELECT 'Enrollment|' || count(*) FROM "Enrollment";
SELECT 'Attendance|' || count(*) FROM "Attendance";
SELECT 'ClassroomFeedback|' || count(*) FROM "ClassroomFeedback";
