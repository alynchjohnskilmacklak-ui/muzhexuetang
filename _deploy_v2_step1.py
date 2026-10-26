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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:1200]}\n  {err.strip()[:800]}")
    return code

# 1) verify upload
run("ls -l /tmp/edu-manage-charts-v2-image.tar.gz && sha256sum /tmp/edu-manage-charts-v2-image.tar.gz", 60)

# 2) docker load
run("docker load < /tmp/edu-manage-charts-v2-image.tar.gz", 900)

# 3) identify loaded image id + backup current latest
run("docker images | grep edu-manage-app", 60)

cli.close()
print("DONE")
