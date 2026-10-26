import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

# 先备份
stdin, stdout, stderr = ssh.exec_command("cp /etc/nginx/sites-enabled/edu-manage.conf /etc/nginx/sites-enabled/edu-manage.conf.bak2")
stdout.read()

# 直接在 /location / 前面加上 /avatars/ 的配置
# 先看看现在的配置
stdin, stdout, stderr = ssh.exec_command("grep -n 'location /' /etc/nginx/sites-enabled/edu-manage.conf")
print("当前 location / 的位置:")
print(stdout.read().decode())

ssh.close()
