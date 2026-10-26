import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

cmds = [
    "cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --force-recreate",
    "sleep 15",
    "docker ps --filter name=edu-manage-app-1 --format '{{.Status}}'",
    "docker inspect edu-manage-app-1 --format '{{.Image}}'",
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
