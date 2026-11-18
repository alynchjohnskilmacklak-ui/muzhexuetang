SELECT id, name, grade FROM "Student" WHERE name IN ('牛博研','马子墨','孙嘉森') LIMIT 10;
SELECT '---feedback---';
SELECT COUNT(*) FROM "ClassroomFeedback";
SELECT '---groups---';
SELECT COUNT(*) FROM "ClassGroup";
SELECT '---lessons---';
SELECT COUNT(*) FROM "ClassLesson";
SELECT '---parent mazichen students---';
SELECT s.id, s.name FROM "Student" s JOIN "ParentStudentLink" l ON l."studentId" = s.id JOIN "ParentUser" p ON p.id = l."parentUserId" WHERE p.email = 'mazichen@st.com' LIMIT 10;
