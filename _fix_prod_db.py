# -*- coding: utf-8 -*-
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20)

sql = """DO $$ BEGIN
  CREATE TYPE "MaterialType" AS ENUM ('TEXTBOOK','HANDOUT','EXERCISE','EXAM','ANSWER','REFERENCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "StudyMaterial" ADD COLUMN IF NOT EXISTS "materialType" "MaterialType" NOT NULL DEFAULT 'HANDOUT';
UPDATE "StudyMaterial" SET "materialType"='TEXTBOOK' WHERE title LIKE '%课本%';
SELECT "materialType", count(*) FROM "StudyMaterial" GROUP BY 1;
"""

# 写文件到服务器再执行
sftp = cli.open_sftp()
with sftp.open("/tmp/add_type.sql", "w") as f:
    f.write(sql)
sftp.close()

def run(cmd, t=30):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8","replace").strip(), e.read().decode("utf-8","replace").strip()

out, err = run("docker cp /tmp/add_type.sql edu-manage-db-1:/tmp/add_type.sql && docker exec edu-manage-db-1 psql -U postgres -d edu_manage -f /tmp/add_type.sql")
print(out or err)
cli.close()
