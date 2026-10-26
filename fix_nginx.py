import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

cmds = [
    "rm /etc/nginx/sites-enabled/edu-manage.conf.bak-avatars",
    "nginx -t",
    "systemctl reload nginx",
    "curl -s -o /dev/null -w '%{http_code}' https://muzhexuetang.xyz/avatars/student-male.png -k",
]

for cmd in cmds:
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"  {out}")
    if err:
        print(f"  ERR: {err}")
    print()

ssh.close()
