import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

# 把 /avatars/ 的缓存改成 no-cache
stdin, stdout, stderr = ssh.exec_command("sed -i 's/max-age=3600/no-store, no-cache, must-revalidate/g' /etc/nginx/sites-enabled/edu-manage.conf")
stdout.read()

# reload nginx
stdin, stdout, stderr = ssh.exec_command("nginx -t && systemctl reload nginx")
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
