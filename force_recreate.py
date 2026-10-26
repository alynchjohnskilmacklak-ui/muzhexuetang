import paramiko
import time

total_start = time.time()
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

print("=== 1. 强制重建容器 ===")
t = time.time()
stdin, stdout, stderr = ssh.exec_command("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build --force-recreate app 2>&1", timeout=60)
print(stdout.read().decode())
print(f"耗时: {time.time()-t:.1f}s")

print("=== 2. 等待启动 ===")
time.sleep(15)

print("=== 3. 验证 ===")
stdin, stdout, stderr = ssh.exec_command("docker ps --format '{{.Names}} {{.Image}} {{.Status}}'", timeout=15)
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' https://muzhexuetang.xyz/login", timeout=15)
print("网站:", stdout.read().decode())

ssh.close()
print(f"总耗时: {time.time()-total_start:.1f}s")
