import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

cmds = [
    # 看看容器里的 dashboard 代码里有没有 StudentAvatar
    'docker exec edu-manage-app-1 grep -r "student-male" /app/.next/ 2>&1 | head -5',
    # 看看容器启动时间
    'docker ps --filter name=edu-manage-app-1 --format "{{.Status}}"',
    # 看看镜像创建时间
    'docker inspect edu-manage-app-1 --format "{{.Image}}"',
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
