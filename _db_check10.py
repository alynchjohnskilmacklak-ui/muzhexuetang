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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:5000]}\n  {err.strip()[:1000]}")
    return code

run('''docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "\\d \\"Attendance\\""''', 60)

cli.close()
print("DONE")
