import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c):
    _,o,e = cli.exec_command(c, timeout=90); return o.read().decode("utf-8","replace").strip()
print("=== 1) 神马 IP 是否来抓过 sitemap ===")
r = run("grep -E 'sitemap' /var/log/nginx/access.log | grep '140.205.85' | tail -10")
print(r if r else "  还没抓（刚提交，正常）")
print()
print("=== 2) 最近所有 sitemap 访问 ===")
print(run("grep 'sitemap' /var/log/nginx/access.log | awk '{print $1, $4, $7, $9}' | tail -12"))
print()
print("=== 3) sitemap 用 http 和 https 分别能不能取到（关键：神马走 http）===")
for u in ["http://muzhexuetang.xyz/sitemap.xml", "https://muzhexuetang.xyz/sitemap.xml",
          "http://muzhexuetang.xyz/robots.txt",  "https://muzhexuetang.xyz/robots.txt"]:
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}} %{{size_download}} %{{redirect_url}}' '{u}'")
    print(f"  {u:46s} {out}")
print()
print("=== 4) 神马爬虫视角抓 sitemap 的真实内容 ===")
ua = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36"
print(run(f"curl -s -A '{ua}' http://muzhexuetang.xyz/sitemap.xml"))
print()
print("=== 5) 顺带确认其他验证文件在 http 下是否也被 301 挡住 ===")
for f in ["baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]:
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}} %{{size_download}}' 'http://muzhexuetang.xyz/{f}'")
    print(f"  http  /{f:38s} {out}")
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}} %{{size_download}}' 'https://muzhexuetang.xyz/{f}'")
    print(f"  https /{f:38s} {out}")
cli.close()
