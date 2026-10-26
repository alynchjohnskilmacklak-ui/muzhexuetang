# -*- coding: utf-8 -*-
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)

def run(cmd, timeout=900):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:1500]}\n  {err.strip()[:800]}")
    return code

# 1) backup current latest (charts) so we can roll back
run("docker tag edu-manage-app:latest edu-manage-app:pre-migration-backup", 60)

# 2) switch latest to charts-v2
run("docker tag edu-manage-app:charts-v2 edu-manage-app:latest", 60)

# 3) recreate app container from the new image
run("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app", 300)

# 4) wait for healthy
run("sleep 30 && docker ps --filter name=edu-manage-app-1 --format '{{.Status}} {{.Image}}'", 60)

cli.close()
print("DONE")
