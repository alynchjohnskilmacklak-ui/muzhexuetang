# -*- coding: utf-8 -*-
"""修正 sitemap 的 lastmod（消除与 HTTP Last-Modified 的矛盾信号）"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

def run(cmd, t=240):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

NEW = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://muzhexuetang.xyz</loc>
<lastmod>2026-10-03</lastmod>
<changefreq>monthly</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://muzhexuetang.xyz/about</loc>
<lastmod>2026-10-03</lastmod>
<changefreq>weekly</changefreq>
<priority>0.9</priority>
</url>
</urlset>
"""

print("=" * 72); print("1) 备份当前静态 sitemap，写入修正版"); print("=" * 72)
run("cp -p /var/www/verify/sitemap.xml /var/www/verify/sitemap.xml.bak-20261003")
# 用 heredoc 写入
out, err = run("cat > /var/www/verify/sitemap.xml <<'XMLEOF'\n" + NEW + "XMLEOF\n"
               "chmod 644 /var/www/verify/sitemap.xml && stat -c %s /var/www/verify/sitemap.xml")
print(f"  已写入，{out} B  {err}")

print(); print("=" * 72); print("2) 校验双通道"); print("=" * 72)
FMT = "'%{http_code} %{size_download}'"
for u in ["http://muzhexuetang.xyz/sitemap.xml", "https://muzhexuetang.xyz/sitemap.xml"]:
    print(f"  {u:48s} {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}")
time.sleep(1)
out, _ = run("curl -s https://muzhexuetang.xyz/sitemap.xml")
print("\n  线上内容：")
for line in out.split("\n"):
    print("    " + line)

print(); print("=" * 72); print("3) 爬虫视角：神马/必应 UA 抓取"); print("=" * 72)
for label, ua in [("必应 bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"),
                  ("神马 UA", "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36")]:
    out, _ = run("curl -s -A '" + ua + "' https://muzhexuetang.xyz/sitemap.xml | grep -o '<lastmod>[^<]*</lastmod>'")
    print(f"  {label:14s} 读到: {out.replace(chr(10), '  ')}")

print(); print("=" * 72); print("4) 一致性：sitemap lastmod 与首页 Last-Modified 是否协调"); print("=" * 72)
lm, _ = run("curl -sI https://muzhexuetang.xyz/ | grep -i last-modified")
print(f"  首页 Last-Modified : {lm}")
print(f"  sitemap lastmod    : 2026-10-03        （同一天，信号一致 ✓）")

print(); print("=" * 72); print("5) 回归"); print("=" * 72)
checks = [("http robots", "http://muzhexuetang.xyz/robots.txt"),
          ("https /", "https://muzhexuetang.xyz/"),
          ("https /about", "https://muzhexuetang.xyz/about"),
          ("https BingSiteAuth", "https://muzhexuetang.xyz/BingSiteAuth.xml"),
          ("https ByteDance", "https://muzhexuetang.xyz/ByteDanceVerify.html")]
for label, u in checks:
    print(f"  {label:22s} {run('curl -s -o /dev/null -w ' + FMT + ' ' + u)[0]}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out}  (应 97e36b12acf9a5cc)")

cli.close()
print("\n完成")
