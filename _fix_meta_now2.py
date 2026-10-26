# -*- coding: utf-8 -*-
"""把首页 meta 更新为神马当前显示的验证码，并立即部署"""
import paramiko, hashlib, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

NEW_CODE = "3f17ed1785b9a82fd4176b64ecffb169_1791014088"   # 来自用户最新截图
HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
STAMP = "20261003"
p = Path(r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html")

txt = p.read_text(encoding="utf-8")
m = re.search(r'<meta name="shenma-site-verification" content="([^"]+)"', txt)
old_code = m.group(1) if m else None
print(f"本地当前 meta: {old_code}")
if old_code == NEW_CODE:
    print("  已是最新，无需替换")
else:
    txt = txt.replace(f'content="{old_code}"', f'content="{NEW_CODE}"', 1)
    p.write_text(txt, encoding="utf-8", newline="")
    Path(r"D:\01muzhexuetang\muzhexuetang\coding\_preview\home-after.html").write_text(txt, encoding="utf-8", newline="")
    print(f"  已替换为 : {NEW_CODE}")

raw = p.read_bytes()
local_sha = hashlib.sha256(raw).hexdigest()[:16]
print(f"  本地 {len(raw)} B  sha={local_sha}")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("\n=== 部署 ===")
tmp = f"/tmp/home.html.meta-{STAMP}"
sftp.put(str(p), tmp)
got, _ = run(f"sha256sum '{tmp}' | cut -c1-16")
if got != local_sha:
    print(f"  ✗ 上传校验失败 {got} != {local_sha}，中止")
    sftp.close(); cli.close(); sys.exit(1)
run(f"cp -p '{SHARED}/home.html' '{SHARED}/home.html.bak3-{STAMP}' 2>/dev/null")
run(f"cp -p '{SRC}/public/home.html' '{SRC}/public/home.html.bak3-{STAMP}' 2>/dev/null")
out, err = run(f"cat '{tmp}' > '{SHARED}/home.html' && cat '{tmp}' > '{SRC}/public/home.html' && rm -f '{tmp}' && stat -c %s '{SHARED}/home.html'")
print(f"  已写入 shared + source，{out} B {err}")

print("\n=== 即时校验（home.html 已挂载，无需重建容器）===")
out, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<meta[^>]*shenma[^>]*>' | head -1")
print(f"  线上 meta : {out}")
print(f"  是否最新  : {'✓' if NEW_CODE in out else '✗'}")
out, _ = run("docker exec edu-manage-app-1 grep -o 'content=\"3f17ed[^\"]*\"' /app/public/home.html | head -1")
print(f"  容器内    : {out}")
code, _ = run("curl -s -o /dev/null -w '%{http_code}' https://muzhexuetang.xyz/")
size, _ = run("curl -s https://muzhexuetang.xyz/ | wc -c")
title, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<title>[^<]*</title>'")
print(f"  首页 HTTP {code}  {size} B  {title}")
out, _ = run("curl -s https://muzhexuetang.xyz/shenma-site-verification.txt")
print(f"  .txt 仍在 : {out}")

sftp.close(); cli.close()
print("\n★★ 现在立刻回神马后台点「验证」——不要刷新页面！")
