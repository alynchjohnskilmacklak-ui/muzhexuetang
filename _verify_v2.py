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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:1800]}\n  {err.strip()[:600]}")
    return code

# 容器内执行验证（绕过 nginx，直连 127.0.0.1:3000）
run("""docker exec edu-manage-app-1 sh -c "
echo '--- build id ---'
cat .next/BUILD_ID
echo
echo '--- http / ---'
wget -q -O - --timeout=10 http://127.0.0.1:3000/ -S 2>&1 | head -3
echo '--- http /login ---'
wget -q -O - --timeout=10 http://127.0.0.1:3000/login -S 2>&1 | head -3
echo '--- /parent/dashboard (expect 307) ---'
wget -q -O /dev/null --timeout=10 --server-response http://127.0.0.1:3000/parent/dashboard 2>&1 | grep -E 'HTTP/|Location' | head -4
echo '--- /teacher/salary (expect 307) ---'
wget -q -O /dev/null --timeout=10 --server-response http://127.0.0.1:3000/teacher/salary 2>&1 | grep -E 'HTTP/|Location' | head -4
echo '--- /reports (expect 307) ---'
wget -q -O /dev/null --timeout=10 --server-response http://127.0.0.1:3000/reports 2>&1 | grep -E 'HTTP/|Location' | head -4
echo '--- /api/teacher/trends (expect 401) ---'
wget -q -O - --timeout=10 --server-response http://127.0.0.1:3000/api/teacher/trends 2>&1 | head -6
echo '--- /api/parent/hours-leaderboard (expect 401) ---'
wget -q -O - --timeout=10 --server-response http://127.0.0.1:3000/api/parent/hours-leaderboard 2>&1 | head -6
" 2>&1""", 120)

# nginx 外网
run("curl -s -o /dev/null -w 'public / -> %{http_code}\\n' http://127.0.0.1:3000/ --interface 127.0.0.1", 60)
run("curl -s -o /dev/null -w 'https://muzhexuetang.xyz / -> %{http_code}\\n' https://muzhexuetang.xyz/ --max-time 15", 60)

cli.close()
print("DONE")
