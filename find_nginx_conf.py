import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

# 看看 nginx 配置文件在哪
stdin, stdout, stderr = ssh.exec_command("ls /etc/nginx/sites-enabled/")
print("sites-enabled:")
print(stdout.read().decode())

ssh.close()
