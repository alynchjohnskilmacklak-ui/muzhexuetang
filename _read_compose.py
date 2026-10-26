# -*- coding: utf-8 -*-
"""读取 compose 与 Dockerfile，判断最稳的静态文件部署路径"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)


def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


print("=" * 72)
print("compose.production.yaml")
print("=" * 72)
out, _ = run("cat /opt/edu-manage-docker/source/compose.production.yaml")
print(out)

print()
print("=" * 72)
print("Dockerfile.runtime")
print("=" * 72)
out, _ = run("cat /opt/edu-manage-docker/source/Dockerfile.runtime")
print(out)

print()
print("=" * 72)
print("Dockerfile（前 60 行）")
print("=" * 72)
out, _ = run("head -60 /opt/edu-manage-docker/source/Dockerfile")
print(out)

print()
print("=" * 72)
print("source 目录内容")
print("=" * 72)
out, _ = run("ls -la /opt/edu-manage-docker/source/ | head -30")
print(out)

cli.close()
