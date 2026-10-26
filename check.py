import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

print("=== 正在运行的容器 ===")
stdin, stdout, stderr = ssh.exec_command("docker ps", timeout=15)
print(stdout.read().decode())

print("=== 所有镜像 ===")
stdin, stdout, stderr = ssh.exec_command("docker images | head -10", timeout=15)
print(stdout.read().decode())

print("=== /tmp 下的 tar ===")
stdin, stdout, stderr = ssh.exec_command("ls -lh /tmp/*.tar 2>/dev/null", timeout=15)
print(stdout.read().decode())

ssh.close()
