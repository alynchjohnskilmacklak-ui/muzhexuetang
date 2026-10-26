# -*- coding: utf-8 -*-
"""用镜像内的真实旧版重建备份，保证回滚点准确"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

SRC = "/opt/edu-manage-docker/source/public"

print("=== 部署前状态 ===")
out, _ = run(f"sha256sum {SRC}/home.html {SRC}/about.html | cut -c1-16,66-200")
print(out)

print("\n=== 从镜像重建权威回滚备份（.orig-20261003）===")
for name, expect in [("home.html", "54deeb292962be2f"), ("about.html", "1968d74824444874")]:
    out, err = run(
        f"docker exec edu-manage-app-1 cat /app/public/{name} > {SRC}/{name}.orig-20261003 "
        f"&& chmod 644 {SRC}/{name}.orig-20261003 && sha256sum {SRC}/{name}.orig-20261003 | cut -c1-16"
    )
    got = out.strip()
    ok = "✓" if got == expect else "✗"
    print(f"  {name}.orig-20261003  sha={got}  期望={expect}  {ok}  {err}")

print("\n=== 备份清单 ===")
out, _ = run(f"ls -l {SRC}/*.bak-* {SRC}/*.orig-* 2>/dev/null | awk '{{print $5, $9}}'")
print(out)

print("\n=== 确认当前线上仍为旧版（未生效）===")
out, _ = run("curl -s https://muzhexuetang.xyz/ | sha256sum | cut -c1-16")
print(f"  /      sha={out}  (旧版 54deeb292962be2f)")
out, _ = run("curl -s https://muzhexuetang.xyz/about | sha256sum | cut -c1-16")
print(f"  /about sha={out}  (旧版 1968d74824444874)")

print("\n=== shared 目录准备 ===")
out, err = run("mkdir -p /srv/edu-manage/shared/public && ls -ld /srv/edu-manage/shared/public")
print(out, err)

cli.close()
