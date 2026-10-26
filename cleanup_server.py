import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=60)

print("=== 1. 清理前磁盘 ===")
stdin, stdout, stderr = ssh.exec_command("df -h /", timeout=15)
print(stdout.read().decode())

print("=== 2. 删除失败的 build 容器 ===")
stdin, stdout, stderr = ssh.exec_command("docker rm -f dazzling_tu 2>/dev/null; echo done", timeout=15)
print(stdout.read().decode())

print("=== 3. 删除悬空镜像 ===")
stdin, stdout, stderr = ssh.exec_command("docker image prune -f 2>&1", timeout=60)
print(stdout.read().decode())

print("=== 4. 删除构建缓存 ===")
stdin, stdout, stderr = ssh.exec_command("docker builder prune -af 2>&1", timeout=60)
print(stdout.read().decode()[-500:])

print("=== 5. 清理 /tmp 下的旧 tar 包 ===")
stdin, stdout, stderr = ssh.exec_command("rm -f /tmp/edu-manage-*.tar /tmp/src.tar.gz /tmp/build.log; echo done", timeout=15)
print(stdout.read().decode())

print("=== 6. 清理后磁盘 ===")
stdin, stdout, stderr = ssh.exec_command("df -h /", timeout=15)
print(stdout.read().decode())

print("=== 7. 当前容器 ===")
stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'", timeout=15)
print(stdout.read().decode())

ssh.close()
print("清理完成!")
