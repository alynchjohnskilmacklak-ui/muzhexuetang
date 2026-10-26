# -*- coding: utf-8 -*-
"""查清 140.205.85.x 拿到的 301 到底跳去哪，以及为什么"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=" * 72)
print("1) 完整 nginx 配置（看 80 端口这台 server 怎么处理）")
print("=" * 72)
out, _ = run("cat -n /etc/nginx/sites-available/edu-manage.conf")
print(out)

print()
print("=" * 72)
print("2) 用 IP + 各种 Host 头复现 301（找出触发条件）")
print("=" * 72)
tests = [
    ("IP + Host=IP",        "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' -H 'Host: 101.200.191.201' http://101.200.191.201/shenma-site-verification.txt"),
    ("IP + Host=裸域",       "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' -H 'Host: muzhexuetang.xyz' http://101.200.191.201/shenma-site-verification.txt"),
    ("裸域 HTTP",            "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' http://muzhexuetang.xyz/shenma-site-verification.txt"),
    ("www HTTP",             "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' http://www.muzhexuetang.xyz/shenma-site-verification.txt"),
    ("裸域 HTTPS",           "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' https://muzhexuetang.xyz/shenma-site-verification.txt"),
    ("www HTTPS",            "curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' https://www.muzhexuetang.xyz/shenma-site-verification.txt"),
]
for label, cmd in tests:
    out, err = run(cmd)
    print(f"  {label:22s} {out or err}")

print()
print("=" * 72)
print("3) 模拟神马那个 UA（Chrome 27 / Win 6.2），看是否被特殊处理")
print("=" * 72)
ua = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36"
for target in ["http://101.200.191.201/shenma-site-verification.txt", "http://muzhexuetang.xyz/shenma-site-verification.txt"]:
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}} -> %{{redirect_url}}' -A '{ua}' '{target}'")
    print(f"  {target:60s} {out}")

print()
print("=" * 72)
print("4) 神马 IP 那两条 301 的完整原始日志")
print("=" * 72)
out, _ = run("grep '140.205.85' /var/log/nginx/access.log | tail -6")
print(out)

print()
print("=" * 72)
print("5) 未加 -L 时 301 的 Location 具体是什么")
print("=" * 72)
out, _ = run("curl -sI -H 'Host: 101.200.191.201' http://101.200.191.201/shenma-site-verification.txt | head -12")
print(out)

print()
print("=" * 72)
print("6) nginx error.log 最近有无 TLS/握手报错")
print("=" * 72)
out, _ = run("tail -25 /var/log/nginx/error.log")
print(out)

cli.close()
