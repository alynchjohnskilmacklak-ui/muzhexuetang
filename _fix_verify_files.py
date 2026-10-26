# -*- coding: utf-8 -*-
"""紧急修复：把已有验证文件也放进 /var/www/verify，恢复百度/Bing/字节"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

FILES = ["baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]

print("=" * 72); print("1) 从容器内取出这三个文件，放到 /var/www/verify"); print("=" * 72)
for f in FILES:
    out, err = run(f"docker exec edu-manage-app-1 cat /app/public/{f} > /var/www/verify/{f} "
                   f"&& chmod 644 /var/www/verify/{f} && stat -c '%s' /var/www/verify/{f}")
    print(f"  {f:38s} -> {out} B  {err}")

print(); print("=" * 72); print("2) 内容比对：/var/www/verify 与 容器内 是否一致"); print("=" * 72)
for f in FILES:
    a, _ = run(f"sha256sum /var/www/verify/{f} | cut -c1-16")
    b, _ = run(f"docker exec edu-manage-app-1 sha256sum /app/public/{f} | cut -c1-16")
    print(f"  {f:38s} 静态={a}  容器={b}  {'✓' if a == b else '✗'}")

print(); print("=" * 72); print("3) reload nginx"); print("=" * 72)
out, err = run("nginx -t 2>&1 && systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

FMT = "'%{http_code} %{size_download}'"
print(); print("=" * 72); print("4) 全部验证文件 http + https 复验"); print("=" * 72)
files = ["sogousiteverification.txt", "shenma-site-verification.txt",
         "baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]
allok = True
for f in files:
    a = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz/" + f + "'")[0]
    b = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz/" + f + "'")[0]
    ok = a.startswith("200") and b.startswith("200")
    allok = allok and ok
    print(f"  {'OK ' if ok else '!! '} {f:38s} http=[{a}]  https=[{b}]")
print(f"\n  结论: {'全部正常 ✅' if allok else '仍有问题 ❌'}")

print(); print("=" * 72); print("5) 内容抽查（确认没取到空文件）"); print("=" * 72)
for f in files:
    out, _ = run(f"curl -s https://muzhexuetang.xyz/{f}")
    print(f"  {f:38s} {out[:60]!r}")

print(); print("=" * 72); print("6) 回归"); print("=" * 72)
for label, u in [("http robots", "http://muzhexuetang.xyz/robots.txt"),
                 ("http sitemap", "http://muzhexuetang.xyz/sitemap.xml"),
                 ("http /", "http://muzhexuetang.xyz/"),
                 ("https /", "https://muzhexuetang.xyz/"),
                 ("https /about", "https://muzhexuetang.xyz/about"),
                 ("https /login", "https://muzhexuetang.xyz/login"),
                 ("https /dashboard", "https://muzhexuetang.xyz/dashboard")]:
    out, _ = run("curl -s -o /dev/null -w " + FMT + " '" + u + "'")
    print(f"  {label:20s} {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out}  (应 97e36b12acf9a5cc)")

cli.close()
