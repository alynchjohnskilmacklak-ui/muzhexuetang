# -*- coding: utf-8 -*-
"""部署修正后的 home.html（CRLF 保持、只改 meta 一行）"""
import paramiko, hashlib, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
p = Path(r"D:\01muzhexuetang\muzhexuetang\coding\_preview\home-after.html")

raw = p.read_bytes()
local_sha = hashlib.sha256(raw).hexdigest()[:16]
crlf = raw.decode("utf-8").count("\r\n")
print(f"本地: {len(raw)} B  sha={local_sha}  CRLF={crlf}")
assert len(raw) == 67044 and crlf == 1432, "本地文件不符合预期，中止"
assert b"\r\n" in raw

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("\n=== 上传（二进制，不做任何换行转换）===")
tmp = "/tmp/home.html.final"
sftp.put(str(p), tmp)
got, _ = run(f"sha256sum '{tmp}' | cut -c1-16")
if got != local_sha:
    print(f"  ✗ 校验失败 {got} != {local_sha}"); sftp.close(); cli.close(); sys.exit(1)
print(f"  ✓ 上传校验通过 {got}")
out, _ = run(f"stat -c %s '{tmp}'")
print(f"  服务器临时文件 {out} B")

# 用二进制方式复制，避免任何文本转换
out, err = run(f"cp -f '{tmp}' '{SHARED}/home.html' && cp -f '{tmp}' '{SRC}/public/home.html' && rm -f '{tmp}' && echo OK")
print(f"  已覆盖 shared + source: {out} {err}")

print("\n=== 校验 ===")
out, _ = run(f"sha256sum '{SHARED}/home.html' | cut -c1-16")
print(f"  shared 文件 sha : {out}  {'✓' if out == local_sha else '✗'}")
out, _ = run(f"sha256sum '{SRC}/public/home.html' | cut -c1-16")
print(f"  source 文件 sha : {out}  {'✓' if out == local_sha else '✗'}")
out, _ = run("docker exec edu-manage-app-1 sha256sum /app/public/home.html | cut -c1-16")
print(f"  容器内   sha    : {out}  {'✓' if out == local_sha else '✗'}")
out, _ = run("docker exec edu-manage-app-1 sh -c \"grep -c $'\\r' /app/public/home.html\"")
print(f"  容器内 CRLF 行数: {out}  (应 1432)")

print()
out, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<meta[^>]*shenma[^>]*>' | head -1")
print(f"  线上 meta : {out}")
code, _ = run("curl -s -o /dev/null -w '%{http_code}' https://muzhexuetang.xyz/")
size, _ = run("curl -s https://muzhexuetang.xyz/ | wc -c")
sha, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
title, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<title>[^<]*</title>'")
print(f"  首页 HTTP {code}  {size} B  sha={sha}")
print(f"       {title}")
out, _ = run("curl -s https://muzhexuetang.xyz/shenma-site-verification.txt")
print(f"  .txt     : {out}")

sftp.close(); cli.close()
print("\n★★ 现在立刻回神马点「验证」——不要刷新页面！")
