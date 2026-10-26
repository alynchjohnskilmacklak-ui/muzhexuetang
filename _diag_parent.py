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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:2500]}\n  {err.strip()[:800]}")
    return code

# 容器内确认新 API 与组件已进入构建产物
run("""docker exec edu-manage-app-1 sh -c "
echo '--- api route exists? ---'
ls -la server.js >/dev/null 2>&1 && echo 'server.js ok'
grep -rl 'hours-leaderboard' .next/server 2>/dev/null | head -3
echo '--- archive page contains leaderboard text? ---'
grep -rl '上课时长，谁在领先' .next/static 2>/dev/null | head -3
echo '--- api source presence ---'
grep -rl 'hoursLeaderboard' .next/server/chunks 2>/dev/null | head -3
" 2>&1""", 120)

# 最近容器日志（最近 1 小时，关注错误）
run("docker logs edu-manage-app-1 --since 2h --tail 60 2>&1 | grep -iE 'error|warn|exception|hours-leaderboard' | tail -25", 60)

cli.close()
print("DONE")
