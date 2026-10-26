-- 批量修复所有学生的 mainTeacherId 为其活跃班级里等级最高的老师
-- 等级优先级: ELITE > SENIOR > EXPERIENCED > NEW

UPDATE "Student" s
SET "mainTeacherId" = sub.best_teacher_id
FROM (
  SELECT DISTINCT ON (e."studentId")
    e."studentId",
    t.id AS best_teacher_id
  FROM "Enrollment" e
  JOIN "ClassGroupTeacher" cgt ON e."classGroupId" = cgt."classGroupId"
  JOIN "Teacher" t ON cgt."teacherId" = t.id
  WHERE e.status = 'ACTIVE'
  ORDER BY e."studentId",
    CASE t."tierLevel"
      WHEN 'ELITE' THEN 1
      WHEN 'SENIOR' THEN 2
      WHEN 'EXPERIENCED' THEN 3
      WHEN 'NEW' THEN 4
      ELSE 5
    END
) sub
WHERE s.id = sub."studentId";

-- 验证
SELECT s.name, t.name AS teacher_name, t."tierLevel"
FROM "Student" s
LEFT JOIN "Teacher" t ON s."mainTeacherId" = t.id
WHERE s.name IN ('马紫晨', '马子墨');
