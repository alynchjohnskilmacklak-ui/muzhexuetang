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
    print(f"$ {cmd}\n  exit={code}\n  {out.strip()[:2500]}\n  {err.strip()[:800]}")
    return code

# 1) DNS AAAA 记录（决定是否需要 IPv6 监听）
run("getent ahosts muzhexuetang.xyz | head -5; echo '---'; nslookup -type=AAAA muzhexuetang.xyz 2>&1 | tail -5", 30)

# 2) 验证线上缓存头
run("""echo '=== / ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/ | grep -iE 'HTTP/|cache-control|content-type'
echo '=== /parent/archive ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/parent/archive | grep -iE 'HTTP/|cache-control|location'
echo '=== /_next/static probe (expect upstream immutable) ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/_next/static/chunks/webpack-00000000000000000000000000000000.js 2>/dev/null | grep -iE 'HTTP/|cache-control' | head -3 || true
echo '=== /api/teacher/trends ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/api/teacher/trends | grep -iE 'HTTP/|cache-control'""", 60)

# 3) nginx 监听状态
run("ss -tlnp | grep -E ':80|:443' | head -8", 30)

cli.close()
print("DONE")
