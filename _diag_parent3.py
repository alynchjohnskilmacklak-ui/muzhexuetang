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

# 1) 是否有多个 app 容器 / 旧容器还在跑
run("docker ps -a --format '{{.Names}} {{.Status}} {{.Image}}' | grep -iE 'app|nginx'", 60)

# 2) nginx 配置（是否套 CDN、缓存）
run("nginx -T 2>/dev/null | grep -iE 'proxy_cache|Cache-Control|expires' | head -10 || echo '(no cache directives found)'", 60)

# 3) 线上响应头（是否经 CDN：server/via/x-cache 等）
run("""echo '=== https://muzhexuetang.xyz/ headers ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/ | head -20
echo
echo '=== https://muzhexuetang.xyz/parent/archive headers ==='
curl -s -I --max-time 15 https://muzhexuetang.xyz/parent/archive | head -20
echo
echo '=== direct 127.0.0.1:3000 /parent/archive headers ==='
curl -s -I --max-time 10 http://127.0.0.1:3000/parent/archive | head -12""", 120)

cli.close()
print("DONE")
