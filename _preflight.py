# -*- coding: utf-8 -*-
"""飞行前检查：确认线上真正在服务的文件路径与内容，不修改任何东西"""
import paramiko, hashlib

HOST = "101.200.191.201"
USER = "root"
PWD = "Ren031213"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=25, banner_timeout=25, auth_timeout=25)


def run(cmd, t=90):
    _, o, e = cli.exec_command(cmd, timeout=t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    return out.strip(), err.strip()


print("=" * 70)
print("1) 主机与运行方式")
print("=" * 70)
for label, cmd in [
    ("hostname", "hostname"),
    ("docker", "docker ps --format '{{.Names}} | {{.Image}} | {{.Status}}' 2>/dev/null | head -20"),
    ("pm2", "pm2 list 2>/dev/null | head -25"),
    ("监听端口", "ss -lntp 2>/dev/null | grep -E ':(80|443|3000)\\b' || netstat -lntp 2>/dev/null | grep -E ':(80|443|3000)\\b'"),
]:
    out, err = run(cmd)
    print(f"\n--- {label} ---")
    print(out if out else "(空)")
    if err:
        print("[stderr]", err[:300])

print()
print("=" * 70)
print("2) 找出所有 home.html / about.html 及其 SHA256")
print("=" * 70)
out, _ = run(
    "find /opt /srv /var/www -name 'home.html' -o -name 'about.html' 2>/dev/null "
    "| while read f; do printf '%s  %s  %s\\n' \"$(sha256sum \\\"$f\\\" | cut -c1-16)\" \"$(stat -c %s \\\"$f\\\")\" \"$f\"; done"
)
print(out if out else "(未找到)")

print()
print("=" * 70)
print("3) nginx 配置里 / 与 /about 的处理")
print("=" * 70)
out, _ = run("grep -rn 'location\\|proxy_pass\\|root \\|rewrite' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -v '^\\s*#' | head -60")
print(out if out else "(空)")

print()
print("=" * 70)
print("4) 线上实际返回的首页 /about 的 SHA256（与本地对比用）")
print("=" * 70)
for path in ["/", "/about"]:
    out, _ = run(f"curl -s https://muzhexuetang.xyz{path} | sha256sum | cut -c1-16")
    size, _ = run(f"curl -s https://muzhexuetang.xyz{path} | wc -c")
    title, _ = run(f"curl -s https://muzhexuetang.xyz{path} | grep -o '<title>[^<]*</title>' | head -1")
    print(f"  {path:8s} sha256={out}  size={size}  {title}")

print()
print("=" * 70)
print("5) 本地文件 SHA256（作为对照）")
print("=" * 70)
for name, p in [
    ("本地线上版 home.html ", r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html"),
    ("本地线上版 about.html", r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\about.html"),
    ("预览产物 home-after  ", r"D:\01muzhexuetang\muzhexuetang\coding\_preview\home-after.html"),
    ("预览产物 about-after ", r"D:\01muzhexuetang\muzhexuetang\coding\_preview\about-after.html"),
]:
    try:
        with open(p, "rb") as f:
            raw = f.read()
        print(f"  {name} sha256={hashlib.sha256(raw).hexdigest()[:16]}  size={len(raw)}")
    except Exception as ex:
        print(f"  {name} 读取失败 {ex}")

cli.close()
print("\n飞行前检查完成（未做任何修改）")
