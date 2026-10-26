import paramiko
import os
import time

# 配置
LOCAL_IMAGE = "edu-manage-app:latest"
TAR_FILE = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/release/edu-manage-app-latest.tar"
SERVER = "101.200.191.201"
USER = "root"
PASSWORD = "Ren031213"

print("=== 1. 保存镜像 ===")
t0 = time.time()
os.system(f'docker save {LOCAL_IMAGE} -o "{TAR_FILE}"')
size_mb = os.path.getsize(TAR_FILE) / 1024 / 1024
print(f"  保存完成: {size_mb:.1f}MB, 耗时 {time.time()-t0:.1f}s")

print("\n=== 2. 上传到服务器 ===")
t1 = time.time()
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASSWORD)
sftp = ssh.open_sftp()
sftp.put(TAR_FILE, "/tmp/edu-manage-app-latest.tar")
sftp.close()
print(f"  上传完成, 耗时 {time.time()-t1:.1f}s")

print("\n=== 3. 加载镜像并重启容器 ===")
t2 = time.time()
cmds = [
    "cd /opt/edu-manage-docker/source",
    "docker load -i /tmp/edu-manage-app-latest.tar",
    "docker compose up -d --force-recreate",
    "sleep 10",
    "docker ps --filter name=edu-manage-app-1 --format '{{.Status}}'",
]
for cmd in cmds:
    print(f"  $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"    {out}")
    if err and "Warning" not in err:
        print(f"    ERR: {err}")

print(f"\n  部署完成, 耗时 {time.time()-t2:.1f}s")
print(f"\n=== 总耗时: {time.time()-t0:.1f}s ===")

ssh.close()
