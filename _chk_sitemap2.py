# -*- coding: utf-8 -*-
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c):
    _, o, e = cli.exec_command(c, timeout=90)
    return o.read().decode("utf-8", "replace").strip()

FMT = "'%{http_code} %{size_download} %{redirect_url}'"

print("=== 1) sitemap / robots 在 http 与 https 下的表现 ===")
for u in ["http://muzhexuetang.xyz/sitemap.xml",
          "https://muzhexuetang.xyz/sitemap.xml",
          "http://muzhexuetang.xyz/robots.txt",
          "https://muzhexuetang.xyz/robots.txt"]:
    out = run("curl -s -o /dev/null -w " + FMT + " '" + u + "'")
    print("  %-46s %s" % (u, out))

print()
print("=== 2) 神马爬虫 UA 走 http 抓 sitemap 的真实内容 ===")
ua = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36"
print(run("curl -s -A '" + ua + "' http://muzhexuetang.xyz/sitemap.xml"))

print()
print("=== 3) 其他验证文件在 http 下是否也被 301 挡住 ===")
for f in ["baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]:
    a = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz/" + f + "'")
    b = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz/" + f + "'")
    print("  /%-38s http=%s   https=%s" % (f, a, b))

print()
print("=== 4) 各搜索引擎爬虫今天的抓取情况（按 IP 归属粗看）===")
print(run("grep -E 'Baiduspider|bingbot|Sogou|360Spider|ShenmaSpider' /var/log/nginx/access.log | awk '{print $1, $4, $7, $9}' | tail -15"))

cli.close()
