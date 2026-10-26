# -*- coding: utf-8 -*-
import paramiko

def probe(host):
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        cli.connect(host, username="root", password="Ren031213!", timeout=15, banner_timeout=15, auth_timeout=15)
    except Exception as e:
        print(f"[{host}] SSH失败: {e}")
        return
    def run(cmd, timeout=30):
        _, o, e = cli.exec_command(cmd, timeout=timeout, get_pty=True)
        return o.read().decode("utf-8", "replace"), e.read().decode("utf-8", "replace")
    out, err = run("echo HOST=$(hostname); echo CWD_LINK=$(readlink -f /opt/edu-manage/current 2>/dev/null); echo RELEASES=$(ls /opt/edu-manage/releases 2>/dev/null | sort -V | tail -3 | tr '\n' ' '); echo SMFILE_PATH=$(ls -l /opt/edu-manage/current/public/shenma-site-verification.txt 2>/dev/null); echo SMFILE_CONTENT=$(cat /opt/edu-manage/current/public/shenma-site-verification.txt 2>/dev/null); pm2 status edu-manage 2>/dev/null | grep -E 'edu-manage|online|stopped' | head -3")
    print(f"[{host}] {out[-1600:]}")
    if err.strip(): print(f"[{host}] STDERR: {err[-400:]}")
    cli.close()

probe("121.43.155.202")
probe("101.200.191.201")
