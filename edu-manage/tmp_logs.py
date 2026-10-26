# -*- coding: utf-8 -*-
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('101.200.191.201', port=22, username='root', password='Ren031213', timeout=30)

def run(cmd, t=90):
    _, out, err = c.exec_command(cmd, timeout=t)
    o = out.read().decode('utf-8', 'ignore')
    e = err.read().decode('utf-8', 'ignore')
    rc = _.channel.recv_exit_status()
    return rc, o, e

rc, o, e = run("docker logs edu-manage-app-1 --since 2026-10-03T15:40:00 --until 2026-10-03T15:53:00 2>&1 | grep -iE 'error|pattern|lesson-previews|exception' | head -40")
print('--- logs grep ---')
print(o or '(none)')
print('stderr:', e[-500:] if e else '')

rc, o, e = run("docker logs edu-manage-app-1 --since 2026-10-03T15:40:00 --until 2026-10-03T15:53:00 2>&1 | tail -80")
print('--- logs tail ---')
print(o[-3500:] or '(none)')
c.close()
