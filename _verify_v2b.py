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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:1500]}\n  {err.strip()[:600]}")
    return code

run("""for u in / /login /parent/dashboard /teacher/dashboard /dashboard /teacher/salary /reports /parent/archive; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000$u)
  loc=$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 10 http://127.0.0.1:3000$u)
  echo "$u -> $code ${loc:-}"
done
echo '--- api auth gates (expect 401) ---'
for u in /api/teacher/trends /api/parent/hours-leaderboard /api/dashboard; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000$u)
  echo "$u -> $code"
done
echo '--- html meta shenma ---'
curl -s --max-time 10 https://muzhexuetang.xyz/ | grep -o 'shenma-site-verification' | head -1""", 120)

cli.close()
print("DONE")
