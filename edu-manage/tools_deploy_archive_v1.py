# -*- coding: utf-8 -*-
"""部署 edu-manage-app:archive-v1 到生产服务器"""
import io, os, sys, time

HOST = '101.200.191.201'
USER = 'root'
PWD = 'Ren031213'
LOCAL = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-archive-v1-image.tar.gz'
REMOTE = '/tmp/edu-manage-archive-v1-image.tar.gz'

import paramiko

def ssh():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=22, username=USER, password=PWD, timeout=30)
    return c

def run(c, cmd, timeout=600):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'ignore')
    err = stderr.read().decode('utf-8', 'ignore')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

print('== [1/4] connect & upload ==')
c = ssh()
sftp = c.open_sftp()
size = os.path.getsize(LOCAL)
t0 = time.time()
sftp.put(LOCAL, REMOTE)
print(f'uploaded {size/1e6:.1f}MB in {time.time()-t0:.0f}s')
sftp.close()

print('== [2/4] docker load ==')
rc, out, err = run(c, f"gunzip -c {REMOTE} | docker load", timeout=1200)
print('load rc', rc, out.strip()[-500:] if out else '', err[-500:] if err else '')

print('== [3/4] tag backup & switch latest ==')
cmds = [
    "docker tag edu-manage-app:latest edu-manage-app:pre-archive-v1-backup || true",
    "docker tag edu-manage-app:archive-v1 edu-manage-app:latest",
    "cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app",
]
for cmd in cmds:
    rc, out, err = run(c, cmd, timeout=600)
    print(f'$ {cmd}\n  rc={rc} {out.strip()[-400:] if out else ""} {err.strip()[-400:] if err else ""}')

print('== [4/4] health check ==')
for i in range(30):
    rc, out, err = run(c, "docker ps --filter name=edu-manage-app-1 --format '{{.Status}}'", timeout=60)
    status = out.strip()
    if 'Up' in status and 'restarting' not in status:
        break
    time.sleep(5)
print('container status:', status)

rc, out, err = run(c, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login", timeout=60)
print('app http /login:', out.strip())

rc, out, err = run(c, "curl -s http://127.0.0.1:3000/api/parent/profile?studentId=cmtmx2rnv0002dddb4ienhctt -H 'Cookie: __=__' -o /dev/null -w '%{http_code}'", timeout=60)
print('api probe:', out.strip()[:60])

c.close()
print('DEPLOY DONE')
