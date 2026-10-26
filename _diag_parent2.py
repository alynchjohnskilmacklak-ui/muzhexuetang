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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:3000]}\n  {err.strip()[:800]}")
    return code

# server-side SSR 产物是否包含组件与空状态文案
run("""docker exec edu-manage-app-1 sh -c "
echo '=== server page.js (SSR) ==='
grep -c 'HoursLeaderboard' .next/server/app/parent/archive/page.js 2>/dev/null || echo '0 hits in server page.js'
grep -o '上课时长，谁在领先' .next/server/app/parent/archive/page.js 2>/dev/null | head -1
grep -o '本月暂无可对比的课时数据' .next/server/app/parent/archive/page.js 2>/dev/null | head -1
echo '=== client chunks ==='
grep -rl '上课时长，谁在领先' .next/static/chunks/app/parent/archive/ 2>/dev/null
echo '=== server chunks ==='
grep -rl 'HoursLeaderboard' .next/server/chunks/ 2>/dev/null | head -5
echo '=== build id ==='
cat .next/BUILD_ID
" 2>&1""", 120)

cli.close()
print("DONE")
