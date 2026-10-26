# -*- coding: utf-8 -*-
"""扩大修复：robots.txt / sitemap.xml 也允许 http 直出（爬虫必读文件不应 301）"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

CONF = "/etc/nginx/sites-available/edu-manage.conf"
STAMP = "20261003"

print("=" * 72); print("1) 备份"); print("=" * 72)
out, err = run(f"cp -p '{CONF}' '{CONF}.bak-crawler-{STAMP}' && ls -l '{CONF}.bak-crawler-{STAMP}' | awk '{{print $5,$9}}'")
print(f"  {out or err}")

print(); print("=" * 72); print("2) 把 sitemap.xml / robots.txt 也复制到静态目录"); print("=" * 72)
out, err = run("curl -s https://muzhexuetang.xyz/sitemap.xml -o /var/www/verify/sitemap.xml && "
               "curl -s https://muzhexuetang.xyz/robots.txt -o /var/www/verify/robots.txt && "
               "chmod 644 /var/www/verify/* && ls -l /var/www/verify/")
print(out)

print(); print("=" * 72); print("3) 改写 80 端口 server 块"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
old = """    # 站长平台验证文件：HTTP 直出，不 301 跳转
    # 原因：神马验证器用 http 访问且不跟随跳转，301 会导致验证失败
    location = /shenma-site-verification.txt {
        alias /var/www/verify/shenma-site-verification.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }
"""
new = """    # 爬虫必读文件 + 站长平台验证文件：HTTP 直出，不 301 跳转
    # 原因：神马验证器/爬虫用 http 访问且不跟随 301，会导致验证失败、sitemap 与 robots 读不到
    location = /shenma-site-verification.txt {
        alias /var/www/verify/shenma-site-verification.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }

    location = /robots.txt {
        alias /var/www/verify/robots.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }

    location = /sitemap.xml {
        alias /var/www/verify/sitemap.xml;
        default_type application/xml;
        add_header Cache-Control "no-store" always;
    }
"""
if "location = /robots.txt" in conf:
    print("  已存在，跳过")
elif old not in conf:
    print("  ✗ 未找到待替换片段，中止（配置未改动）")
    cli.close(); sys.exit(1)
else:
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{conf.replace(old, new, 1)}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已写入 {out} {err}")

print(); print("=" * 72); print("4) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 校验失败，回滚")
    run(f"cp -f '{CONF}.bak-crawler-{STAMP}' '{CONF}' && nginx -t 2>&1 && systemctl reload nginx")
    cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

FMT = "'%{http_code} %{size_download}'"
print(); print("=" * 72); print("5) http 直出验证"); print("=" * 72)
for f in ["robots.txt", "sitemap.xml", "shenma-site-verification.txt",
          "baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml"]:
    a = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz/" + f + "'")[0]
    b = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz/" + f + "'")[0]
    print(f"  /{f:38s} http=[{a}]   https=[{b}]")

print(); print("=" * 72); print("6) 神马 UA 走 http 的真实内容"); print("=" * 72)
ua = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36"
print("  --- robots.txt ---")
print(run("curl -s -A '" + ua + "' http://muzhexuetang.xyz/robots.txt")[0][:400])
print("  --- sitemap.xml ---")
print(run("curl -s -A '" + ua + "' http://muzhexuetang.xyz/sitemap.xml")[0])

print(); print("=" * 72); print("7) 回归：其他路径 http 仍应 301，https 全部正常"); print("=" * 72)
for u in ["http://muzhexuetang.xyz/", "http://muzhexuetang.xyz/about", "http://muzhexuetang.xyz/login"]:
    a = run("curl -s -o /dev/null -w " + FMT + " '" + u + "'")[0]
    print(f"  {u:44s} {a}  (应 301)")
for p in ["/", "/about", "/login"]:
    a = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz" + p + "'")[0]
    print(f"  https://muzhexuetang.xyz{p:24s} {a}  (应 200)")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out} (应 97e36b12acf9a5cc)")

cli.close()
print("\n完成")
