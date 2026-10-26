# -*- coding: utf-8 -*-
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20, banner_timeout=20, auth_timeout=20)

def run(cmd, timeout=60):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:3000]}\n  {err.strip()[:800]}")
    return code

# 删除所有裸 ":80" listen 行
run("sed -i '/listen :80;/d' /etc/nginx/sites-available/edu-manage.conf && grep -n 'listen' /etc/nginx/sites-available/edu-manage.conf", 30)

run("nginx -t", 30)
run("systemctl reload nginx && echo RELOADED_OK", 30)

cli.close()
print("DONE")
