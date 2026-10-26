# -*- coding: utf-8 -*-
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

for label, cmd in [
    ("DEPLOY.md", "cat /opt/edu-manage-docker/source/DEPLOY.md"),
    ("AGENTS.md", "cat /opt/edu-manage-docker/source/AGENTS.md"),
    ("scripts 目录", "ls -la /opt/edu-manage-docker/source/scripts/"),
    ("source/public 内容", "ls -la /opt/edu-manage-docker/source/public/"),
]:
    print("=" * 72); print(label); print("=" * 72)
    out, err = run(cmd)
    print(out if out else err)
    print()
cli.close()
