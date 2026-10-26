import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

cmds = [
    # 看看容器里的 dashboard 代码有没有 StudentAvatar
    'docker exec edu-manage-app-1 grep -r "StudentAvatar" /app/.next/server/app/parent/dashboard/ 2>&1 | head -5',
    # 看看容器启动时间
    'docker ps --filter name=edu-manage-app-1 --format "{{.Status}}"',
]

for cmd in cmds:
    print(f'=== {cmd} ===')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print('STDERR:', err)

ssh.close()
