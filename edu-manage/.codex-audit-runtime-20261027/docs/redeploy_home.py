# -*- coding: utf-8 -*-
import io, sys, time, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

HOST = '101.200.191.201'; USER = 'root'; PWD = 'Ren031213'
LOCAL = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
REMOTE_TMP = '/tmp/home.html'

local_bin = io.open(LOCAL, 'rb').read()
local_md5 = hashlib.md5(local_bin).hexdigest()
print('本地完整 MD5:', local_md5, ' 字节:', len(local_bin))

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30)

def run(cmd):
    _, out, err = cli.exec_command(cmd, timeout=120)
    return out.read().decode('utf-8', 'replace').strip(), err.read().decode('utf-8', 'replace').strip()

# 先确保 /tmp 里有最新文件（可能已被上一步覆盖），再 docker cp
sftp = cli.open_sftp()
try:
    sftp.put(LOCAL, REMOTE_TMP)
    print('重新上传 OK')
finally:
    sftp.close()

for attempt in (1, 2, 3):
    o, e = run('docker cp /tmp/home.html edu-manage-app-1:/app/public/home.html && echo CP-OK')
    if 'CP-OK' in o:
        print('docker cp 成功 (尝试', attempt, ')')
        break
    print('docker cp 失败(尝试', attempt, '):', e or o)
    time.sleep(3)

o, e = run('docker exec edu-manage-app-1 md5sum /app/public/home.html')
cont = o.split()[0] if o else ''
print('容器内 MD5:', cont, ' 匹配:', cont == local_md5)

o, e = run('curl -s -o /dev/null -w "%{http_code}" https://muzhexuetang.xyz/')
print('线上 HTTP:', o)

cli.close()
