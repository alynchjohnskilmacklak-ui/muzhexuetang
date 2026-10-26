# -*- coding: utf-8 -*-
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)

def run(c, t=120):
    _, o, e = cli.exec_command(c, timeout=t)
    return o.read().decode("utf-8", "replace").strip()

print("=" * 74)
print("1) 443 端口 server 块里到底有哪些 location（按出现顺序）")
print("=" * 74)
out = run("grep -n 'listen\\|server_name\\|location' /etc/nginx/sites-available/edu-manage.conf")
print(out)

print()
print("=" * 74)
print("2) 是否还有别的 nginx 配置文件在起作用")
print("=" * 74)
print(run("ls -l /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null"))
print()
print("  nginx.conf 里的 include：")
print(run("grep -n 'include' /etc/nginx/nginx.conf"))

print()
print("=" * 74)
print("3) 直接看 443 server 块全文（定位 验证文件正则 和 sitemap 的相对顺序）")
print("=" * 74)
print(run("sed -n '/listen 443/,/^}/p' /etc/nginx/sites-available/edu-manage.conf"))

print()
print("=" * 74)
print("4) 静态文件实际内容（确认我写对了）")
print("=" * 74)
print("  /var/www/verify/sitemap.xml:")
print(run("cat /var/www/verify/sitemap.xml"))
print()
print("  HTTP 与 HTTPS 分别返回什么:")
for u in ["http://muzhexuetang.xyz/sitemap.xml", "https://muzhexuetang.xyz/sitemap.xml"]:
    print(f"  --- {u} ---")
    print(run("curl -s " + u + " | head -5"))

cli.close()
