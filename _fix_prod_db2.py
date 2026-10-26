# -*- coding: utf-8 -*-
import paramiko, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20)
def run(cmd, t=30):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8","replace").strip(), e.read().decode("utf-8","replace").strip()

# 从 .env 拿 DATABASE_URL
out, _ = run("grep DATABASE_URL /opt/edu-manage-docker/source/.env | head -1")
print("env:", out)
m = re.search(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(\w+)', out)
if m:
    user, pwd, host, port, db = m.groups()
    print(f"user={user} db={db} host={host}")
    sql = '''DO $$ BEGIN
  CREATE TYPE "MaterialType" AS ENUM ('TEXTBOOK','HANDOUT','EXERCISE','EXAM','ANSWER','REFERENCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "StudyMaterial" ADD COLUMN IF NOT EXISTS "materialType" "MaterialType" NOT NULL DEFAULT 'HANDOUT';
UPDATE "StudyMaterial" SET "materialType"='TEXTBOOK' WHERE title LIKE '%课本%';
SELECT "materialType", count(*) FROM "StudyMaterial" GROUP BY 1;
'''
    sftp = cli.open_sftp()
    with sftp.open("/tmp/add_type.sql","w") as f: f.write(sql)
    sftp.close()
    out2, err2 = run(f"docker cp /tmp/add_type.sql edu-manage-db-1:/tmp/a.sql && docker exec edu-manage-db-1 psql -U {user} -d {db} -f /tmp/a.sql")
    print(out2 or err2)
cli.close()
