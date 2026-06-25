-- predeploy-salary-dedup.sql
-- 在添加 TeacherSalaryTransaction 的 @@unique([lessonId, type]) 和 @@unique([feedbackId, type]) 约束之前，
-- 先在两个库（muzhe_chuzhong 和 muzhe_gaozhong）各执行此脚本去除历史重复行。
-- 保留最早一条（最小 createdAt），删除后续重复。
--
-- 执行方式（两个库各跑一次）：
--   psql "$DATABASE_URL_JUNIOR" -f scripts/predeploy-salary-dedup.sql
--   psql "$DATABASE_URL_SENIOR" -f scripts/predeploy-salary-dedup.sql

BEGIN;

-- 1. 去重：同一 (lessonId, type) 重复行（保留最早 createdAt 那条）
DELETE FROM "TeacherSalaryTransaction"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "lessonId", type
             ORDER BY "createdAt" ASC
           ) AS rn
    FROM "TeacherSalaryTransaction"
    WHERE "lessonId" IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- 2. 去重：同一 (feedbackId, type) 重复行（保留最早 createdAt 那条）
DELETE FROM "TeacherSalaryTransaction"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "feedbackId", type
             ORDER BY "createdAt" ASC
           ) AS rn
    FROM "TeacherSalaryTransaction"
    WHERE "feedbackId" IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- 验证：执行后应返回 0 行
SELECT
  "lessonId", type, COUNT(*) AS cnt
FROM "TeacherSalaryTransaction"
WHERE "lessonId" IS NOT NULL
GROUP BY "lessonId", type
HAVING COUNT(*) > 1;

SELECT
  "feedbackId", type, COUNT(*) AS cnt
FROM "TeacherSalaryTransaction"
WHERE "feedbackId" IS NOT NULL
GROUP BY "feedbackId", type
HAVING COUNT(*) > 1;

COMMIT;
