# -*- coding: utf-8 -*-
"""部署 material type + pdf compression 镜像"""
import paramiko, time, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
LOCAL_TAR = r"D:\01muzhexuetang\muzhexuetang\coding\_material-image.tar"
REMOTE_TAR = "/tmp/edu-manage-material.tar"
IMAGE = "edu-manage-app:20261007-material"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=600):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8","replace").strip(), e.read().decode("utf-8","replace").strip()

# 1. 上传
print("="*60); print("1/5 上传镜像 tar (590MB)..."); print("="*60)
import os
size = os.path.getsize(LOCAL_TAR)
print(f"  local size: {size/1024/1024:.0f} MB")
t0 = time.time()
last = [0]
def cb(done, total):
    pct = done*100//total
    if pct >= last[0]+10:
        last[0] = pct
        print(f"  {pct}%  {done/1024/1024:.0f}/{total/1024/1024:.0f}MB  {time.time()-t0:.0f}s")
sftp.put(LOCAL_TAR, REMOTE_TAR, callback=cb)
print(f"  上传完成，{time.time()-t0:.0f}s")

# 2. docker load
print(); print("="*60); print("2/5 docker load"); print("="*60)
out, err = run(f"docker load -i {REMOTE_TAR}", 300)
print(out or err)

# 3. 线上 DB 加 materialType 字段
print(); print("="*60); print("3/5 线上 DB migration"); print("="*60)
sql = """
DO $$ BEGIN
  CREATE TYPE "MaterialType" AS ENUM ('TEXTBOOK','HANDOUT','EXERCISE','EXAM','ANSWER','REFERENCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "StudyMaterial" ADD COLUMN IF NOT EXISTS "materialType" "MaterialType" NOT NULL DEFAULT 'HANDOUT';
UPDATE "StudyMaterial" SET "materialType"='TEXTBOOK' WHERE title LIKE '%课本%';
SELECT "materialType", count(*) FROM "StudyMaterial" GROUP BY 1;
"""
run(f'docker exec -i edu-manage-db-1 psql -U postgres -d edu_manage <<\'EOSQL\'\n{sql}\nEOSQL', 30)
out, _ = run(f'docker exec edu-manage-db-1 psql -U postgres -d edu_manage -c \'SELECT "materialType", count(*) FROM "StudyMaterial" GROUP BY 1;\'', 15)
print(out)

# 4. 改 compose tag 并重启
print(); print("="*60); print("4/5 更新 compose tag 并重启 app"); print("="*60)
COMPOSE = "/opt/edu-manage-docker/source/compose.production.yaml"
out, _ = run(f"grep -n 'image:.*edu-manage-app' {COMPOSE}")
print(f"  current: {out}")
run(f"cp {COMPOSE} {COMPOSE}.bak-material-$(date +%Y%m%d%H%M)")
run(f"sed -i 's|image: edu-manage-app:.*|image: {IMAGE}|' {COMPOSE}")
out, _ = run(f"grep -n 'image:.*edu-manage-app' {COMPOSE}")
print(f"  new: {out}")
out, err = run(f"cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-deps app 2>&1 | tail -10", 120)
print(out or err)

# 5. 等待 healthy
print(); print("="*60); print("5/5 等待健康"); print("="*60)
for i in range(24):
    time.sleep(5)
    st, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'")
    if st == "running/healthy":
        print(f"  healthy after {(i+1)*5}s ✓"); break
    if i%3==2: print(f"  ... {st}")
else:
    print(f"  ✗ 未 healthy: {st}")
    out, _ = run("docker logs edu-manage-app-1 --tail 30 2>&1")
    print(out)

# 验证 python+pymupdf
out, _ = run("docker exec edu-manage-app-1 python3 -c 'import pymupdf; print(pymupdf.__version__)' 2>&1")
print(f"  pymupdf: {out}")

# 清理
run(f"rm -f {REMOTE_TAR}")
sftp.close(); cli.close()
print("\n部署完成")
