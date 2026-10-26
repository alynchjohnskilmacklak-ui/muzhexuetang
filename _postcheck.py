# -*- coding: utf-8 -*-
"""部署后回归检查：整站可用性 + 容器健康 + 未触及的页面保持原样"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=== 1) 容器状态 ===")
out, _ = run("docker ps --format '{{.Names}} | {{.Status}}'")
print(out)

print("\n=== 2) app 容器最近日志（找错误）===")
out, _ = run("docker logs edu-manage-app-1 --tail 40 2>&1 | grep -iE 'error|exception|fatal|unhandled' | tail -15")
print(out if out else "  未发现错误日志 ✓")

print("\n=== 3) 公网各路径可用性 ===")
paths = ["/", "/about", "/login", "/robots.txt", "/sitemap.xml",
         "/images/logo.jpg", "/about-images/01-1.png",
         "/manifest.json", "/favicon.ico",
         "/baidu_verify_codeva-LcCyyIUZRF.html", "/BingSiteAuth.xml", "/shenma-site-verification.txt"]
for p in paths:
    code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz{p}")
    size, _ = run(f"curl -s https://muzhexuetang.xyz{p} | wc -c")
    mark = "✓" if code == "200" else "✗"
    print(f"  {mark} {code}  {size:>8}  {p}")

print("\n=== 4) 后台登录页是否正常（重建容器后回归）===")
code, _ = run("curl -s -o /dev/null -w '%{http_code}' https://muzhexuetang.xyz/login")
title, _ = run("curl -s https://muzhexuetang.xyz/login | grep -o '<title>[^<]*</title>' | head -1")
print(f"  HTTP {code}  {title}")

print("\n=== 5) 健康检查端点 ===")
out, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Health.Status}} (failing streak: {{.State.Health.FailingStreak}})'")
print(f"  {out}")

print("\n=== 6) robots.txt 仍屏蔽后台（未被误改）===")
out, _ = run("curl -s https://muzhexuetang.xyz/robots.txt | grep -c 'Disallow'")
print(f"  Disallow 条目数 = {out}")

print("\n=== 7) 回滚资产就位确认 ===")
out, _ = run("ls -l /opt/edu-manage-docker/source/public/*.orig-20261003 /opt/edu-manage-docker/source/compose.production.yaml.bak-seo-20261003 2>/dev/null | awk '{print $5, $9}'")
print(out)
out, _ = run("sha256sum /opt/edu-manage-docker/source/public/home.html.orig-20261003 /opt/edu-manage-docker/source/public/about.html.orig-20261003 | cut -c1-16,66-200")
print("  回滚版本哈希："); print(out)
out, _ = run("docker exec edu-manage-app-1 sha256sum /app/public/home.html /app/public/about.html | cut -c1-16,66-200")
print("  当前线上版本："); print(out)

cli.close()
