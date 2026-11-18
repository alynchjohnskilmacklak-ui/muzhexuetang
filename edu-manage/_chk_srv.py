# -*- coding: utf-8 -*-
import paramiko, time
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, timeout=60):
    i,o,e = cli.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8","replace"); err = e.read().decode("utf-8","replace")
    code = o.channel.recv_exit_status()
    return code, out, err
for cmd in ["docker ps --format '{{.Names}} | {{.Status}}' | head -8",
            "ls /opt/edu-manage-docker/source 2>/dev/null | head -8",
            "pm2 list 2>/dev/null | head -10",
            "ls /opt/edu-manage/releases 2>/dev/null | tail -5"]:
    c,out,err = run(cmd)
    print("CMD:", cmd, "->", out.strip()[:300] if out.strip() else err.strip()[:200])
cli.close()
