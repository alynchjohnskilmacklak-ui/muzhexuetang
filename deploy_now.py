import paramiko
import time

start = time.time()
local_tar = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-app-20261007-2003.tar"
remote_tar = "/tmp/edu-manage-new.tar"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=60)

print("=== 1. 上传镜像 ===")
sftp = ssh.open_sftp()
t0 = time.time()
sftp.put(local_tar, remote_tar)
print(f"上传完成，耗时 {time.time()-t0:.1f}s")

print("=== 2. docker load ===")
t0 = time.time()
stdin, stdout, stderr = ssh.exec_command(f"docker load -i {remote_tar} 2>&1", timeout=300)
out = stdout.read().decode()
print(out[-300:])
print(f"load 完成，耗时 {time.time()-t0:.1f}s")

print("=== 3. 打 tag ===")
stdin, stdout, stderr = ssh.exec_command("docker tag edu-manage-app:20261007-2003 edu-manage-app:latest", timeout=15)
print("done")

print("=== 4. 重启容器 ===")
t0 = time.time()
stdin, stdout, stderr = ssh.exec_command("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app 2>&1", timeout=60)
print(stdout.read().decode()[-300:])
print(f"重启完成，耗时 {time.time()-t0:.1f}s")

time.sleep(10)

print("=== 5. 验证 ===")
stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'", timeout=15)
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' https://muzhexuetang.xyz/login", timeout=15)
print("网站:", stdout.read().decode())

sftp.close()
ssh.close()
print(f"总耗时: {time.time()-start:.1f}s")
print("部署完成!")
