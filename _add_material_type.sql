-- 加 enum 类型
DO $$ BEGIN
  CREATE TYPE "MaterialType" AS ENUM ('TEXTBOOK','HANDOUT','EXERCISE','EXAM','ANSWER','REFERENCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 加字段
ALTER TABLE "StudyMaterial" ADD COLUMN IF NOT "materialType" "MaterialType" NOT NULL DEFAULT 'HANDOUT';

-- 回填：标题含"课本"的标记为课本
UPDATE "StudyMaterial" SET "materialType"='TEXTBOOK' WHERE title LIKE '%课本%';

-- 验证
SELECT "materialType", count(*) FROM "StudyMaterial" GROUP BY 1 ORDER BY 1;
