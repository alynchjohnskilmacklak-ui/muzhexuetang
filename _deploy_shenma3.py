# -*- coding: utf-8 -*-
import paramiko, hashlib, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

HOST, USER, PWD = "101.200.191.201", "root", "Ren031213"
SRC = "/opt/edu-manage-docker/source"
SHARED = "/srv/edu-manage/shared/public"
NAME = "shenma-site-verification.txt"
p = Path(r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\shenma-site-verification.txt")

raw = p.read_bytes()
local_sha = hashlib.sha256(raw).hexdigest()
print(f"本地: {len(raw)} B  sha={local_sha[:16]}  bytes={raw!r}")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30, banner_timeout=30, auth_timeout=30)
sftp = cli.open_sftp()

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

# 备份服务器两处
run(f"cp -p '{SHARED}/{NAME}' '{SHARED}/{NAME}.bak4-20261003' 2>/dev/null")
run(f"cp -p '{SRC}/public/{NAME}' '{SRC}/public/{NAME}.bak4-20261003' 2>/dev/null")

tmp = "/tmp/shenma.new"
sftp.put(str(p), tmp)
got, _ = run(f"sha256sum '{tmp}' | cut -c1-64")
if got != local_sha:
    print(f"  X 上传校验失败 {got[:16]} != {local_sha[:16]}"); sftp.close(); cli.close(); sys.exit(1)
print(f"  上传校验通过 {got[:16]}")

out, err = run(f"cp -f '{tmp}' '{SHARED}/{NAME}' && cp -f '{tmp}' '{SRC}/public/{NAME}' && chmod 644 '{SHARED}/{NAME}' '{SRC}/public/{NAME}' && rm -f '{tmp}' && stat -c %s '{SHARED}/{NAME}'")
print(f"  已覆盖两处，{out} B {err}")

print()
for label, cmd in [
    ("shared ", f"sha256sum '{SHARED}/{NAME}' | cut -c1-16"),
    ("source ", f"sha256sum '{SRC}/public/{NAME}' | cut -c1-16"),
    ("容器内 ", f"docker exec edu-manage-app-1 sha256sum /app/public/{NAME} | cut -c1-16"),
    ("公网   ", f"curl -s https://muzhexuetang.xyz/{NAME} | sha256sum | cut -c1-16"),
]:
    out, _ = run(cmd)
    print(f"  {label}: {out}  {'OK' if out == local_sha[:16] else 'MISMATCH'}")

out, _ = run(f"curl -s https://muzhexuetang.xyz/{NAME}")
print(f"\n  公网内容: {out!r}")
print(f"  期望内容: {raw.decode('utf-8')!r}")
print(f"  一致: {'✓' if out == raw.decode('utf-8') else '✗'}")
code, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' https://muzhexuetang.xyz/{NAME}")
print(f"  HTTP {code}")

# 首页未受影响
out, _ = run("curl -s https://muzhexuetang.xyz/ | grep -o '<meta[^>]*shenma[^>]*>'")
print(f"\n  首页 meta: {out}")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  首页 sha : {out} (应 97e36b12acf9a5cc)")

sftp.close(); cli.close()
print("\n★★ 现在去神马点「验证」")
