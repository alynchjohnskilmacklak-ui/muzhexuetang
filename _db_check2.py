# -*- coding: utf-8 -*-
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)

def run(cmd, timeout=120):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:4000]}\n  {err.strip()[:1000]}")
    return code

# 看 compose 与 env 的数据库配置
run("cat /opt/edu-manage-docker/source/compose.production.yaml | head -60", 30)
run("cat /opt/edu-manage-docker/source/.env | grep -iE 'DATABASE|POSTGRES|DB_' | sed 's/=.*/=***/' ", 30)

cli.close()
print("DONE")
