# -*- coding: utf-8 -*-
"""443 端口补上 sitemap.xml / robots.txt 直出，消除 http/https 内容不一致"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
CONF = "/etc/nginx/sites-available/edu-manage.conf"
STAMP = "20261003"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

conf, _ = run(f"cat '{CONF}'")

# 锚点：443 里已有的验证文件正则块（我们已经确认它在 443 内）
ANCHOR = """    # 站长平台验证文件：http/https 均直出，避免走 Next 路由"""
ADD = """    # 爬虫必读文件：与 80 端口一致，直接读静态副本
    # 原因：Next 动态生成的 sitemap lastmod 是旧的（2026-09-06），
    #       与首页 HTTP Last-Modified（今天）矛盾，会让爬虫不重抓
    location = /sitemap.xml {
        alias /var/www/verify/sitemap.xml;
        default_type application/xml;
        add_header Cache-Control "no-store" always;
    }

    location = /robots.txt {
        alias /var/www/verify/robots.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }

"""

print("=" * 72); print("1) 检查是否已加过"); print("=" * 72)
# 只检查 443 段（正则块之后）
if "location = /sitemap.xml" in conf.split(ANCHOR)[-1]:
    print("  443 已存在，跳过")
else:
    if ANCHOR not in conf:
        print("  ✗ 未找到锚点，中止"); sftp.close(); cli.close(); sys.exit(1)
    # 在锚点前插入（锚点是 443 独有的注释，80 端口用的是另一条注释）
    cnt = conf.count(ANCHOR)
    print(f"  锚点出现 {cnt} 次（应为 1，即只在 443 里）")
    run(f"cp -p '{CONF}' '{CONF}.bak-443files-{STAMP}'")
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{conf.replace(ANCHOR, ADD + ANCHOR, 1)}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已插入，备份 .bak-443files-{STAMP}  {out} {err}")

print(); print("=" * 72); print("2) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 失败，回滚")
    run(f"cp -f '{CONF}.bak-443files-{STAMP}' '{CONF}' && nginx -t 2>&1 && systemctl reload nginx")
    sftp.close(); cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

print(); print("=" * 72); print("3) 关键校验：http 与 https 内容是否一致"); print("=" * 72)
for f in ["sitemap.xml", "robots.txt"]:
    a, _ = run(f"curl -s http://muzhexuetang.xyz/{f} | sha256sum | cut -c1-16")
    b, _ = run(f"curl -s https://muzhexuetang.xyz/{f} | sha256sum | cut -c1-16")
    print(f"  {f:14s} http={a}  https={b}  {'✓ 一致' if a == b else '✗ 不一致'}")

print(); print("=" * 72); print("4) https 的 sitemap 内容（爬虫实际读到的）"); print("=" * 72)
print(run("curl -s https://muzhexuetang.xyz/sitemap.xml")[0])

print("=" * 72); print("5) lastmod 与首页 Last-Modified 是否协调"); print("=" * 72)
lm, _ = run("curl -sI https://muzhexuetang.xyz/ | grep -i last-modified")
out, _ = run("curl -s https://muzhexuetang.xyz/sitemap.xml | grep -o '<lastmod>[^<]*' | head -1")
print(f"  首页 Last-Modified : {lm}")
print(f"  sitemap lastmod    : {out}")

print(); print("=" * 72); print("6) 回归"); print("=" * 72)
FMT = "'%{http_code} %{size_download}'"
for label, u in [("http /", "http://muzhexuetang.xyz/"),
                 ("https /", "https://muzhexuetang.xyz/"),
                 ("https /about", "https://muzhexuetang.xyz/about"),
                 ("https /login", "https://muzhexuetang.xyz/login"),
                 ("https Bing", "https://muzhexuetang.xyz/BingSiteAuth.xml"),
                 ("https 搜狗", "https://muzhexuetang.xyz/sogousiteverification.txt"),
                 ("https 神马", "https://muzhexuetang.xyz/shenma-site-verification.txt"),
                 ("https 百度", "https://muzhexuetang.xyz/baidu_verify_codeva-LcCyyIUZRF.html"),
                 ("https 字节", "https://muzhexuetang.xyz/ByteDanceVerify.html")]:
    print(f"  {label:16s} {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out}  (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\n完成")
