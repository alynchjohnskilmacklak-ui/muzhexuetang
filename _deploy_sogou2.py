# -*- coding: utf-8 -*-
"""在 443 端口也直出验证文件（用正则一次覆盖全部平台），并重建容器让新文件进得去"""
import paramiko, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
CONF = "/etc/nginx/sites-available/edu-manage.conf"
COMPOSE = f"{SRC}/compose.production.yaml"
STAMP = "20261003"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

# ==== 1. 443 加正则直出块 ====
print("=" * 72); print("1) 443 端口加验证文件直出（正则，覆盖所有平台）"); print("=" * 72)
conf, _ = run(f"cat '{CONF}'")
BLOCK = """
    # 站长平台验证文件：http/https 均直出，避免走 Next 路由
    # 原因1：新文件不在容器挂载列表里，Next 找不到会 307 跳 /login
    # 原因2：正则一次覆盖所有平台，以后新增平台无需再改 nginx
    location ~ ^/(?:sogousiteverification\\.txt|shenma-site-verification\\.txt|baidu_verify_[A-Za-z0-9_-]+\\.html|BingSiteAuth\\.xml|ByteDanceVerify\\.html|google[a-z0-9]+\\.html|so_verify_[A-Za-z0-9_-]+\\.html|360-site-verification\\.txt|toutiao-site-verification\\.txt|bytedance-site-verification\\.txt)$ {
        root /var/www/verify;
        default_type text/plain;
        add_header Cache-Control "no-store" always;
    }
"""
if "站长平台验证文件：http/https 均直出" in conf:
    print("  已存在，跳过")
else:
    # 插到 443 server 的 location / 之前
    anchor443 = """    # 页面 HTML / API：禁止缓存，避免微信内核缓存旧版页面
    location / {"""
    if anchor443 not in conf:
        print("  ✗ 未找到 443 的锚点，中止"); sftp.close(); cli.close(); sys.exit(1)
    run(f"cp -p '{CONF}' '{CONF}.bak-verify443-{STAMP}'")
    run(f"cat > '{CONF}.new' <<'NGINXEOF'\n{conf.replace(anchor443, BLOCK + anchor443, 1)}\nNGINXEOF")
    out, err = run(f"mv '{CONF}.new' '{CONF}' && echo OK")
    print(f"  已插入，备份 .bak-verify443-{STAMP}  {out} {err}")

# 同时确保文件已在 /var/www/verify（之前已复制）
out, _ = run("ls -l /var/www/verify/")
print("  /var/www/verify 内容："); print(out)

# ==== 2. compose 加 sogou 挂载（防止容器内 404）====
print(); print("=" * 72); print("2) compose 加 sogou 挂载"); print("=" * 72)
conf2, _ = run(f"cat '{COMPOSE}'")
line = f"      - {SHARED}/sogousiteverification.txt:/app/public/sogousiteverification.txt\n"
if "/app/public/sogousiteverification.txt" in conf2:
    print("  已存在，跳过")
else:
    anchor = f"      - {SHARED}/shenma-site-verification.txt:/app/public/shenma-site-verification.txt\n"
    if anchor not in conf2:
        anchor = f"      - {SHARED}/about.html:/app/public/about.html\n"
    if anchor not in conf2:
        print("  ✗ 未找到锚点，跳过（nginx 已能直出，不影响验证）")
    else:
        run(f"cp -p '{COMPOSE}' '{COMPOSE}.bak-sogou-{STAMP}'")
        with sftp.open(COMPOSE, "w") as f:
            f.write(conf2.replace(anchor, anchor + line, 1))
        print(f"  已插入挂载，备份 .bak-sogou-{STAMP}")

# ==== 3. nginx -t + reload ====
print(); print("=" * 72); print("3) nginx -t + reload"); print("=" * 72)
out, err = run("nginx -t 2>&1")
print(f"  {out or err}")
if "successful" not in (out + err):
    print("  ✗ 校验失败，回滚 nginx")
    run(f"cp -f '{CONF}.bak-verify443-{STAMP}' '{CONF}' && nginx -t 2>&1 && systemctl reload nginx")
    sftp.close(); cli.close(); sys.exit(1)
out, err = run("systemctl reload nginx && echo RELOADED")
print(f"  {out or err}")
time.sleep(2)

# ==== 4. 重建容器 ====
print(); print("=" * 72); print("4) 重建 app 容器（让 sogou 文件进容器）"); print("=" * 72)
out, err = run(f"cd '{SRC}' && docker compose -f compose.production.yaml up -d --no-deps app 2>&1 | tail -5")
print(out or err)
for i in range(24):
    time.sleep(5)
    st, _ = run("docker inspect edu-manage-app-1 --format '{{.State.Status}}/{{.State.Health.Status}}'")
    if st == "running/healthy":
        print(f"  容器 {st} ✓（{(i + 1) * 5}s）"); break
else:
    print(f"  ! 当前 {st}")

# ==== 5. 校验 ====
FMT = "'%{http_code} %{size_download}'"
print(); print("=" * 72); print("5) 校验：所有验证文件 http + https"); print("=" * 72)
files = ["sogousiteverification.txt", "shenma-site-verification.txt",
         "baidu_verify_codeva-LcCyyIUZRF.html", "BingSiteAuth.xml", "ByteDanceVerify.html"]
allok = True
for f in files:
    a = run("curl -s -o /dev/null -w " + FMT + " 'http://muzhexuetang.xyz/" + f + "'")[0]
    b = run("curl -s -o /dev/null -w " + FMT + " 'https://muzhexuetang.xyz/" + f + "'")[0]
    ok = a.startswith("200") and b.startswith("200")
    allok = allok and ok
    print(f"  {'OK ' if ok else '!! '} {f:38s} http=[{a}]  https=[{b}]")

print()
out, _ = run("curl -s http://muzhexuetang.xyz/sogousiteverification.txt")
print(f"  搜狗 http  内容: {out!r}")
out, _ = run("curl -s https://muzhexuetang.xyz/sogousiteverification.txt")
print(f"  搜狗 https 内容: {out!r}")
print(f"  期望              'IR7MJtFx5d'")
out, _ = run("docker exec edu-manage-app-1 cat /app/public/sogousiteverification.txt 2>/dev/null")
print(f"  容器内          : {out!r}")

print(); print("=" * 72); print("6) 回归"); print("=" * 72)
for label, u in [("http robots", "http://muzhexuetang.xyz/robots.txt"),
                 ("http sitemap", "http://muzhexuetang.xyz/sitemap.xml"),
                 ("https /", "https://muzhexuetang.xyz/"),
                 ("https /about", "https://muzhexuetang.xyz/about"),
                 ("https /login", "https://muzhexuetang.xyz/login")]:
    out, _ = run("curl -s -o /dev/null -w " + FMT + " '" + u + "'")
    print(f"  {label:16s} {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha: {out}  (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\n★★ 完成 —— 回搜狗点「完成验证」")
