import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

cmds = [
    'docker inspect edu-manage-app-1 --format "{{.Config.Image}}"',
    'docker exec edu-manage-app-1 ls -la /app/public/avatars/ 2>&1 | head -20',
]

for cmd in cmds:
    print(f'=== {cmd} ===')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print('STDERR:', err)

ssh.close()
