# -*- coding: utf-8 -*-
"""部署搜狗验证文件：shared + source + nginx http 例外（一次到位）"""
import paramiko, hashlib, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
CONF = "/etc/nginx/sites-available/edu-manage.conf"
NAME = "sogousiteverification.txt"
STAMP = "20261003"
LOCAL = Path(r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public") / NAME

raw = LOCAL.read_bytes()
local_sha = hashlib.sha256(raw).hexdigest()
print(f"本地: {len(raw)} B  sha={local_sha[:16]}  {raw!r}")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

# ---------- 1. 上传到容器可读位置 ----------
print("\n" + "=" * 72); print("1) 上传到 shared 与 source"); print("=" * 72)
tmp = "/tmp/sogou.new"
sftp.put(str(LOCAL), tmp)
got, _ = run(f"sha256sum '{tmp}' | cut -c1-64")
if got != local_sha:
    print(f"  ✗ 上传校验失败 {got[:16]} != {local_sha[:16]}"); sftp.close(); cli.close(); sys.exit(1)
out, err = run(f"cp -f '{tmp}' '{SHARED}/{NAME}' && cp -f '{tmp}' '{SRC}/public/{NAME}' "
               f"&& chmod 644 '{SHARED}/{NAME}' '{SRC}/public/{NAME}' && rm -f '{tmp}' && stat -c %s '{SHARED}/{NAME}'")
print(f"  ✓ 已写入两处，{out} B {err}")

# ---------- 2. 复制到 nginx 可读位置 ----------
print("\n" + "=" * 72); print("2) 复制到 nginx 静态目录"); print("=" * 72)
out, err = run(f"mkdir -p /var/www/verify && cp -f '{SHARED}/{NAME}' /var/www/verify/{NAME} "
               f"&& chmod 644 /var/www/verify/{NAME} && ls -l /var/www/verify/")
print(out)

# ---------- 3. nginx 加 http 例外 ----------
print("\n" + "=" * 72); print("3) nginx 加 http 直出例外"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
if f"location = /{NAME}" in conf:
    print("  已存在，跳过")
else:
    anchor = """    location = /sitemap.xml {
        alias /var/www/verify/sitemap.xml;
        default_type application/xml;
        add_header Cache-Control "no-store" always;
    }
"""
    add = anchor + f"""
    location = /{NAME} {{
        alias /var/www/verify/{NAME};
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }}
"""
    if anchor not in conf:
        print("  ✗ 未找到插入锚点，中止"); sftp.close(); cli.close(); sys.exit(1)
    run(f"cp -p '{CONF}' '{CONF}.bak-sogou-{STAMP}'")
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{conf.replace(anchor, add, 1)}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已插入并备份为 .bak-sogou-{STAMP}  {out} {err}")

print("  --- 80 端口 server 块 ---")
out, _ = run("sed -n '20,60p' '" + CONF)
print(out)

# ---------- 4. nginx -t + reload ----------
print("\n" + "=" * 72); print("4) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 校验失败，回滚")
    run(f"cp -f '{CONF}.bak-sogou-{STAMP}' '{CONF}' && nginx -t 2>&1 && systemctl reload nginx")
    sftp.close(); cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

# ---------- 5. 校验 ----------
FMT = "'%{http_code} %{size_download}'"
print("\n" + "=" * 72); print("5) 校验：搜狗验证文件 http / https / 容器内"); print("=" * 72)
for label, cmd in [
    ("http  ", "curl -s -o /dev/null -w " + FMT + f" 'http://muzhexuetang.xyz/{NAME}'"),
    ("https ", "curl -s -o /dev/null -w " + FMT + f" 'https://muzhexuetang.xyz/{NAME}'"),
]:
    out, _ = run(cmd)
    print(f"  {label} {out}")
out, _ = run(f"curl -s http://muzhexuetang.xyz/{NAME}")
print(f"  http 内容 : {out!r}   期望 {raw.decode()!r}   {'✓' if out == raw.decode() else '✗'}")
out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"  https 内容: {out!r}   {'✓' if out == raw.decode() else '✗'}")
out, _ = run(f"docker exec edu-manage-app-1 cat /app/public/{NAME}")
print(f"  容器内    : {out!r}   {'✓' if out == raw.decode() else '✗'}")

# ---------- 6. 回归 ----------
print("\n" + "=" * 72); print("6) 回归：其他文件与页面未受影响"); print("=" * 72)
checks = [
    ("http  robots.txt",  "http://muzhexuetang.xyz/robots.txt"),
    ("http  sitemap.xml", "http://muzhexuetang.xyz/sitemap.xml"),
    ("http  shenma",      "http://muzhexuetang.xyz/shenma-site-verification.txt"),
    ("https /",           "https://muzhexuetang.xyz/"),
    ("https /about",      "https://muzhexuetang.xyz/about"),
    ("https /login",      "https://muzhexuetang.xyz/login"),
]
for label, u in checks:
    out, _ = run("curl -s -o /dev/null -w " + FMT + f" '{u}'")
    print(f"  {label:20s} {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out}  (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\n★★ 搜狗验证文件已就位 —— 回搜狗后台点「完成验证」")
