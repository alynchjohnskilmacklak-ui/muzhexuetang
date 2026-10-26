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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:4000]}\n  {err.strip()[:800]}")
    return code

run("""echo '=== nginx conf files ==='
ls -la /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null
echo
echo '=== full nginx -T ==='
nginx -T 2>/dev/null | sed -n '1,220p'""", 60)

cli.close()
print("DONE")
