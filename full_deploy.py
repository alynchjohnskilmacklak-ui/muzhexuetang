import paramiko
import time
import os

local_tar = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-app-20261007-2003.tar"
remote_tar = "/tmp/edu-manage-new.tar"

print(f"本地镜像大小: {os.path.getsize(local_tar)/1024/1024:.1f}MB")

total_start = time.time()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

t = time.time()
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
print(f"1. SSH连接: {time.time()-t:.1f}s")

# 删掉旧的不完整的 tar
stdin, stdout, stderr = ssh.exec_command("rm -f /tmp/edu-manage-new.tar", timeout=10)
stdout.read()

print("2. 上传镜像...")
sftp = ssh.open_sftp()
t = time.time()
sftp.put(local_tar, remote_tar)
print(f"   上传完成: {time.time()-t:.1f}s")

print("3. docker load...")
t = time.time()
stdin, stdout, stderr = ssh.exec_command(f"docker load -i {remote_tar} 2>&1", timeout=300)
out = stdout.read().decode()
print(f"   {out[-200:]}")
print(f"   load完成: {time.time()-t:.1f}s")

print("4. 打 tag...")
t = time.time()
stdin, stdout, stderr = ssh.exec_command("docker tag edu-manage-app:20261007-2003 edu-manage-app:latest", timeout=15)
stdout.read()
print(f"   {time.time()-t:.1f}s")

print("5. 重启容器...")
t = time.time()
stdin, stdout, stderr = ssh.exec_command("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app 2>&1", timeout=60)
out = stdout.read().decode()
print(f"   {out[-300:]}")
print(f"   {time.time()-t:.1f}s")

print("6. 等待启动...")
time.sleep(15)

print("7. 验证容器...")
t = time.time()
stdin, stdout, stderr = ssh.exec_command("docker ps --format '{{.Names}} {{.Image}} {{.Status}}'", timeout=15)
print(f"   {stdout.read().decode()}")
print(f"   {time.time()-t:.1f}s")

print("8. 验证网站...")
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' https://muzhexuetang.xyz/login", timeout=15)
print(f"   {stdout.read().decode()}")

sftp.close()
ssh.close()
print(f"\n总耗时: {time.time()-total_start:.1f}s")
