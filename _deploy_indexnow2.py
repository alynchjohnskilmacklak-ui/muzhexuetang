# -*- coding: utf-8 -*-
"""部署 IndexNow key 文件（修正版：80/443 各用独有锚点）"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

KEY = "680d89b9953946efb802698d25294cf6"
NAME = KEY + ".txt"
HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
CONF = "/etc/nginx/sites-available/edu-manage.conf"
STAMP = "20261003"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=" * 72); print("1) 确认 key 文件已在三处"); print("=" * 72)
out, _ = run(f"ls -l /srv/edu-manage/shared/public/{NAME} /opt/edu-manage-docker/source/public/{NAME} /var/www/verify/{NAME} 2>&1 | awk '{{print $5, $9}}'")
print(out)
out, _ = run(f"cat /var/www/verify/{NAME}")
print(f"  内容: {out!r}  {'✓' if out == KEY else '✗'}")

print(); print("=" * 72); print("2) 插入 nginx 直出块（用各端口独有锚点）"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
BLOCK = f"""    location = /{NAME} {{
        alias /var/www/verify/{NAME};
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }}

"""
if f"location = /{NAME}" in conf:
    print("  已存在，跳过")
else:
    # 80 端口独有锚点：situated 在 443 之前，且是 80 块最后一个 location = 块
    a80 = """    location = /sogousiteverification.txt {
        alias /var/www/verify/sogousiteverification.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }
"""
    # 443 端口独有锚点：about-images 的 proxy_hide_header 那行只出现在 443
    a443 = """    location ^~ /about-images/ {"""
    print(f"  80 锚点存在: {a80 in conf}")
    print(f"  443 锚点存在: {a443 in conf}")
    print(f"  443 锚点出现次数: {conf.count(a443)}（应为 1）")
    if a80 not in conf or conf.count(a443) != 1:
        print("  ✗ 锚点不唯一，中止"); cli.close(); sys.exit(1)
    new = conf.replace(a80, a80 + "\n" + BLOCK, 1)
    new = new.replace(a443, BLOCK + a443, 1)
    run(f"cp -p '{CONF}' '{CONF}.bak-indexnow2-{STAMP}'")
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{new}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已插入，备份 .bak-indexnow2-{STAMP}  {out} {err}")

print(); print("=" * 72); print("3) 确认落点正确（数一下每端口的 key 块）"); print("=" * 72)
out, _ = run(f"grep -n 'listen 80\\|listen 443\\|location = /{NAME}' '{CONF}'")
print(out)

print(); print("=" * 72); print("4) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 失败，回滚")
    run(f"cp -f '{CONF}.bak-indexnow2-{STAMP}' '{CONF}' && nginx -t 2>&1 && systemctl reload nginx")
    cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

print(); print("=" * 72); print("5) 校验 key 文件可访问性"); print("=" * 72)
FMT = "'%{http_code} %{size_download}'"
for u in [f"https://muzhexuetang.xyz/{NAME}", f"http://muzhexuetang.xyz/{NAME}",
          f"https://www.muzhexuetang.xyz/{NAME}"]:
    print(f"  {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}   {u}")
out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"\n  内容: {out!r}   一致: {'✓' if out == KEY else '✗'}")

print(); print("=" * 72); print("6) 回归"); print("=" * 72)
for label, u in [("https /", "https://muzhexuetang.xyz/"),
                 ("https /about", "https://muzhexuetang.xyz/about"),
                 ("https /login", "https://muzhexuetang.xyz/login"),
                 ("https sitemap", "https://muzhexuetang.xyz/sitemap.xml"),
                 ("https robots", "https://muzhexuetang.xyz/robots.txt")]:
    print(f"  {label:16s} {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out} (应 97e36b12acf9a5cc)")

cli.close()
print("\n★ 完成")
