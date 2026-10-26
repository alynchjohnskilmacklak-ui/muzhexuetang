# -*- coding: utf-8 -*-
"""部署 IndexNow key 文件（必应验证用）"""
import paramiko, hashlib, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

KEY = "680d89b9953946efb802698d25294cf6"
NAME = KEY + ".txt"
HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
CONF = "/etc/nginx/sites-available/edu-manage.conf"
STAMP = "20261003"

# IndexNow 规范：文件内容就是 key 本身，不能有换行
content = KEY
raw = content.encode("utf-8")
print("=" * 72); print("0) 本地生成 key 文件"); print("=" * 72)
print(f"  文件名: {NAME}")
print(f"  内容  : {content!r}")
print(f"  字节数: {len(raw)}（IndexNow 要求无换行结尾）")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print(); print("=" * 72); print("1) 上传到 shared / source / nginx 静态目录"); print("=" * 72)
tmp = "/tmp/indexnow.key"
with sftp.open(tmp, "wb") as f:
    f.write(raw)
out, _ = run(f"cat '{tmp}' > '{SHARED}/{NAME}' && cat '{tmp}' > '{SRC}/public/{NAME}' && cp -f '{tmp}' /var/www/verify/{NAME} "
             f"&& chmod 644 '{SHARED}/{NAME}' '{SRC}/public/{NAME}' /var/www/verify/{NAME} && rm -f '{tmp}' && echo OK")
print(f"  三处写入: {out}")

print(); print("=" * 72); print("2) nginx 加 http + https 直出"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
if f"location = /{NAME}" in conf:
    print("  已存在，跳过")
else:
    # 80 端口：加在 sitemap 块之后
    a80 = """    location = /sitemap.xml {
        alias /var/www/verify/sitemap.xml;
        default_type application/xml;
        add_header Cache-Control "no-store" always;
    }
"""
    add80 = a80 + f"""
    location = /{NAME} {{
        alias /var/www/verify/{NAME};
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }}
"""
    # 443 端口：同样
    a443 = """    location = /robots.txt {
        alias /var/www/verify/robots.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }
"""
    add443 = a443 + f"""
    location = /{NAME} {{
        alias /var/www/verify/{NAME};
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }}
"""
    new = conf.replace(a80, add80, 1).replace(a443, add443, 1)
    if new == conf:
        print("  ✗ 替换未生效，中止"); sftp.close(); cli.close(); sys.exit(1)
    run(f"cp -p '{CONF}' '{CONF}.bak-indexnow-{STAMP}'")
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{new}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已插入 http+https，备份 .bak-indexnow-{STAMP}  {out} {err}")

print(); print("=" * 72); print("3) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 失败，回滚")
    run(f"cp -f '{CONF}.bak-indexnow-{STAMP}' '{CONF}' && nginx -t && systemctl reload nginx")
    sftp.close(); cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

print(); print("=" * 72); print("4) 校验：key 文件可访问性（IndexNow 会来核对）"); print("=" * 72)
FMT = "'%{http_code} %{size_download}'"
for u in [f"https://muzhexuetang.xyz/{NAME}", f"http://muzhexuetang.xyz/{NAME}",
          f"https://www.muzhexuetang.xyz/{NAME}"]:
    print(f"  {u}")
    print(f"      {(run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0])}")
out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"\n  返回内容 : {out!r}")
print(f"  期望内容 : {content!r}")
print(f"  一致     : {'✓' if out == content else '✗'}")

print(); print("=" * 72); print("5) 回归"); print("=" * 72)
for label, u in [("https /", "https://muzhexuetang.xyz/"),
                 ("https /about", "https://muzhexuetang.xyz/about"),
                 ("https sitemap", "https://muzhexuetang.xyz/sitemap.xml"),
                 ("https robots", "https://muzhexuetang.xyz/robots.txt"),
                 ("https Bing", "https://muzhexuetang.xyz/BingSiteAuth.xml")]:
    print(f"  {label:16s} {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out} (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\n★ key 文件已就位 —— 下一步：调用 IndexNow API 提交 URL")
