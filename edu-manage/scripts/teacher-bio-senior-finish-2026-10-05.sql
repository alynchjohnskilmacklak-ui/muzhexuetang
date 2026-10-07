\set ON_ERROR_STOP on
\connect muzhe_gaozhong
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Teacher" WHERE id = 'cmqgmp4a20004508l3ug1k1e9' AND name = '李元林' AND char_length(bio) = 367) THEN RAISE EXCEPTION '高中部教师身份或原简介长度校验失败'; END IF;
END $$;
UPDATE "Teacher" SET bio = bio || '对不同基础的学生，练习难度还会按其独立完成情况逐步调整。'
WHERE id = 'cmqgmp4a20004508l3ug1k1e9' AND name = '李元林';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Teacher" WHERE id = 'cmqgmp4a20004508l3ug1k1e9' AND char_length(bio) BETWEEN 385 AND 415) THEN RAISE EXCEPTION '高中部最终简介不在目标字数范围内'; END IF;
END $$;
SELECT name, char_length(bio) AS length FROM "Teacher" WHERE id = 'cmqgmp4a20004508l3ug1k1e9';
COMMIT;
