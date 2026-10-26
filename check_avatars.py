import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

# 检查容器里有没有默认头像图片
stdin, stdout, stderr = ssh.exec_command("docker exec edu-manage-app-1 ls -la /app/public/avatars/ 2>&1", timeout=15)
print("=== 容器里的头像 ===")
print(stdout.read().decode())

ssh.close()
