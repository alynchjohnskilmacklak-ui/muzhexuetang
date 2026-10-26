# -*- coding: utf-8 -*-
"""出指南前的状态盘点：站点健康 + 各引擎爬虫今天到访汇总"""
import paramiko, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=150):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

LOG = "/var/log/nginx/access.log"
FMT = "'%{http_code} %{size_download}'"

print("=" * 76)
print("A. 站点关键文件健康（爬虫必读）")
print("=" * 76)
files = ["/", "/about", "/robots.txt", "/sitemap.xml",
         "/BingSiteAuth.xml", "/baidu_verify_codeva-LcCyyIUZRF.html",
         "/ByteDanceVerify.html", "/sogousiteverification.txt",
         "/shenma-site-verification.txt", "/680d89b9953946efb802698d25294cf6.txt"]
for f in files:
    a = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz" + f + "'")
    b = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz" + f + "'")
    flag = "OK " if a.startswith("200") else "!! "
    print(f"  {flag} https=[{a:10s}] http=[{b:10s}] {f}")

print()
print("=" * 76)
print("B. 今天各引擎爬虫到访汇总（按 IP 段归类）")
print("=" * 76)
engines = [
    ("百度 Baiduspider",   r"220\.181\.108\.|116\.179\.37\.|123\.125\."),
    ("必应 bingbot",       r"157\.55\.39\.|40\.77\.167\.|52\.167\.144\."),
    ("搜狗 Sogou",         r"49\.234\.|Sogou"),
    ("字节 Bytespider",    r"110\.249\.|111\.225\.|Bytespider"),
    ("神马 ShenmaSpider",  r"140\.205\.85\."),
    ("Yandex",             r"95\.108\.|213\.180\.|87\.250\."),
    ("Google",             r"66\.249\."),
]
for label, pat in engines:
    n = run(f"grep -cE '{pat}' {LOG} || echo 0")
    home = run(f"grep -E '{pat}' {LOG} | grep -cE '\"GET / HTTP' || echo 0")
    about = run(f"grep -E '{pat}' {LOG} | grep -c ' /about ' || echo 0")
    print(f"  {label:20s} 总访问 {n:>4}   首页 {home:>3}   /about {about:>3}")

print()
print("=" * 76)
print("C. 线下遗留项确认")
print("=" * 76)
print("  1) sitemap lastmod:", run("curl -s https://muzhexuetang.xyz/sitemap.xml | grep -o '<lastmod>[^<]*' | tr '\\n' ' '"))
print("  2) 首页 title   :", run("curl -s https://muzhexuetang.xyz/ | grep -o '<title>[^<]*</title>'"))
print("  3) 首页 sha     :", run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16"))
print("  4) /var/www/verify 文件清单:")
print(run("ls -l /var/www/verify/ | awk '{print \"     \", $5, $9}'"))
print("  5) IndexNow 脚本:", run("ls -l /opt/edu-manage-docker/source/scripts/indexnow-push.sh | awk '{print $1, $5, $9}'"))
print("  6) nginx 配置备份数:", run("ls /etc/nginx/sites-available/*.bak* | wc -l"))
print("  7) compose 备份数:", run("ls /opt/edu-manage-docker/source/compose.production.yaml.bak* 2>/dev/null | wc -l"))

print()
print("=" * 76)
print("D. 本地源码 vs 线上")
print("=" * 76)
print("  线上 home.html  sha:", run("docker exec edu-manage-app-1 sha256sum /app/public/home.html | cut -c1-16"))
print("  线上 about.html sha:", run("docker exec edu-manage-app-1 sha256sum /app/public/about.html | cut -c1-16"))
print("  容器状态:", run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'"))

cli.close()
