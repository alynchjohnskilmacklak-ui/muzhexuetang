# -*- coding: utf-8 -*-
"""探测新服务器状态"""
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("==> SSH 连接 101.200.191.201 ...")
try:
    cli.connect("101.200.191.201", username="root", password="Ren031213!", timeout=25, banner_timeout=25, auth_timeout=25)
except Exception as e:
    print("SSH 失败:", e)
    raise SystemExit

def run(cmd, timeout=60):
    _, o, e = cli.exec_command(cmd, timeout=timeout, get_pty=True)
    return o.read().decode("utf-8", "replace"), e.read().decode("utf-8", "replace")

out, _ = run("ls -d /opt/edu-manage 2>/dev/null && ls /opt/edu-manage/releases/ 2>/dev/null | tail -5; echo '---'; pm2 list 2>/dev/null | head -8; echo '---'; ls /opt/edu-manage/releases/$(ls /opt/edu-manage/releases | sort -V | tail -1)/public/ 2>/dev/null | head -20")
print(out[-2500:])
cli.close()
