import paramiko
import time

t0 = time.time()
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

print("=== 1. 打 tag ===")
stdin, stdout, stderr = ssh.exec_command("docker tag edu-manage-app:20261007-2003 edu-manage-app:latest", timeout=15)
print(stdout.read().decode())
print(f"耗时: {time.time()-t0:.1f}s")

print("=== 2. 重启容器 ===")
t1 = time.time()
stdin, stdout, stderr = ssh.exec_command("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app 2>&1", timeout=60)
print(stdout.read().decode())
print("STDERR:", stderr.read().decode()[-300:])
print(f"耗时: {time.time()-t1:.1f}s")

time.sleep(10)

print("=== 3. 验证 ===")
t2 = time.time()
stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'", timeout=15)
print(stdout.read().decode())
print(f"耗时: {time.time()-t2:.1f}s")

stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w 'HTTP %{http_code}' https://muzhexuetang.xyz/login", timeout=15)
print("网站:", stdout.read().decode())

ssh.close()
print(f"\n总耗时: {time.time()-t0:.1f}s")
