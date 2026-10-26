# -*- coding: utf-8 -*-
"""查 nginx 访问日志：神马的验证服务器有没有真的来抓过？抓到什么？"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=" * 72)
print("1) nginx 日志文件在哪、有多大")
print("=" * 72)
out, _ = run("ls -lh /var/log/nginx/ 2>/dev/null | head -20")
print(out)

print()
print("=" * 72)
print("2) 所有对 shenma-site-verification.txt 的访问记录（全部日志）")
print("=" * 72)
out, _ = run("grep -h 'shenma-site-verification' /var/log/nginx/*.log /var/log/nginx/*.log.* 2>/dev/null | tail -40")
print(out if out else "  ⚠ 日志里完全没有这条记录 —— 说明神马从没来抓过！")

print()
print("=" * 72)
print("3) 日志里有没有神马/UC 的爬虫 UA")
print("=" * 72)
for ua in ["Shenma", "shenma", "YisouSpider", "UCBrowser", "sm.cn", "Spider"]:
    out, _ = run(f"grep -hc '{ua}' /var/log/nginx/access.log 2>/dev/null || echo 0")
    print(f"  {ua:14s} 命中 {out} 次")

print()
print("=" * 72)
print("4) 最近 30 条访问记录（看有没有异常爬虫）")
print("=" * 72)
out, _ = run("tail -30 /var/log/nginx/access.log 2>/dev/null")
print(out if out else "(空)")

print()
print("=" * 72)
print("5) 有没有针对验证文件的 4xx/5xx")
print("=" * 72)
out, _ = run("grep 'shenma' /var/log/nginx/access.log 2>/dev/null | awk '{print $9}' | sort | uniq -c")
print(out if out else "(无记录)")

print()
print("=" * 72)
print("6) 容器内 Next.js 日志里有没有验证相关请求")
print("=" * 72)
out, _ = run("docker logs edu-manage-app-1 --since 2h 2>&1 | grep -i 'shenma\\|verification' | tail -20")
print(out if out else "(无)")

cli.close()
