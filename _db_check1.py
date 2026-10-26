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

# 找到马紫晨并查本月考勤
run("""docker exec edu-manage-db-1 psql -U postgres -d edu_manage -c "
SELECT id, name, 'current_month_hours' FROM student WHERE name LIKE '%马紫晨%' OR name LIKE '%紫晨%';
" 2>&1 | head -20""", 60)

cli.close()
print("DONE")
