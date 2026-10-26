# -*- coding: utf-8 -*-
"""修复：让 80 端口直接返回神马验证文件（不 301 跳转）"""
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

print("=" * 72); print("1) 备份 nginx 配置"); print("=" * 72)
out, err = run(f"cp -p '{CONF}' '{CONF}.bak-shenma-http-{STAMP}' && ls -l '{CONF}.bak-shenma-http-{STAMP}' | awk '{{print $5, $9}}'")
print(f"  {out or err}")

print(); print("=" * 72); print("2) 备份神马验证文件到 nginx 可读位置"); print("=" * 72)
# 文件在容器挂载目录里，nginx 在宿主机上，需放到宿主机路径
out, err = run("mkdir -p /var/www/verify && cp -f /srv/edu-manage/shared/public/shenma-site-verification.txt /var/www/verify/shenma-site-verification.txt "
               "&& chmod 644 /var/www/verify/shenma-site-verification.txt && ls -l /var/www/verify/ | tail -2")
print(f"  {out} {err}")
out, _ = run("cat /var/www/verify/shenma-site-verification.txt")
print(f"  内容: {out}")

print(); print("=" * 72); print("3) 在 80 端口 server 里插入例外 location"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
marker = "shenma-site-verification"
if marker in conf:
    print("  已存在例外规则，跳过")
else:
    old_block = """server {
    listen 80;
    server_name muzhexuetang.xyz www.muzhexuetang.xyz;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}"""
    new_block = """server {
    listen 80;
    server_name muzhexuetang.xyz www.muzhexuetang.xyz;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 站长平台验证文件：HTTP 直出，不 301 跳转
    # 原因：神马验证器用 http 访问且不跟随跳转，301 会导致验证失败
    location = /shenma-site-verification.txt {
        alias /var/www/verify/shenma-site-verification.txt;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}"""
    if old_block not in conf:
        print("  ✗ 未找到待替换的 server 块，中止（配置未改动）")
        cli.close(); sys.exit(1)
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{conf.replace(old_block, new_block, 1)}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已写入 {out} {err}")

print(); print("=" * 72); print("4) 语法校验 + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 语法校验未通过，回滚")
    run(f"cp -f '{CONF}.bak-shenma-http-{STAMP}' '{CONF}' && nginx -t 2>&1")
    cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

print(); print("=" * 72); print("5) 验证 301 是否消除"); print("=" * 72)
tests = [
    ("http://muzhexuetang.xyz/shenma-site-verification.txt", "裸域 http —— 关键！"),
    ("http://www.muzhexuetang.xyz/shenma-site-verification.txt", "www http"),
    ("https://muzhexuetang.xyz/shenma-site-verification.txt", "裸域 https"),
    ("http://muzhexuetang.xyz/", "http 首页（应仍 301）"),
    ("http://muzhexuetang.xyz/about", "http about（应仍 301）"),
]
for url, label in tests:
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}|%{{redirect_url}}|%{{size_download}}' '{url}'")
    parts = out.split("|")
    code = parts[0]; loc = parts[1] if len(parts) > 1 else ""; size = parts[2] if len(parts) > 2 else ""
    print(f"  {label:26s} {code}  size={size}  {loc}")

print(); print("=" * 72); print("6) 模拟神马那个 UA 用 http 抓（决定性测试）"); print("=" * 72)
ua = "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36"
out, _ = run(f"curl -s -A '{ua}' http://muzhexuetang.xyz/shenma-site-verification.txt")
print(f"  UA=神马那个  http  ->  [{out}]")
out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' -A '{ua}' http://muzhexuetang.xyz/shenma-site-verification.txt")
print(f"  状态码: {out}")
out, _ = run("curl -s http://muzhexuetang.xyz/shenma-site-verification.txt | sha256sum | cut -c1-16")
print(f"  sha   : {out}  (应 e076a26aec41e454)")

print(); print("=" * 72); print("7) 回归：https 一切正常"); print("=" * 72)
for p in ["/", "/about", "/login", "/shenma-site-verification.txt"]:
    out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}} %{{size_download}}' https://muzhexuetang.xyz{p}")
    print(f"  https://muzhexuetang.xyz{p:30s} {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out} (应 97e36b12acf9a5cc)")

cli.close()
print("\n★★ 修复完成 —— 现在去神马点「验证」")
