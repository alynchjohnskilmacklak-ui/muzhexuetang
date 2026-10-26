# -*- coding: utf-8 -*-
import io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

HOST = '101.200.191.201'
USER = 'root'
PWD = 'Ren031213'
LOCAL = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
REMOTE_TMP = '/tmp/home.html'
PUB = r'C:\Users\Administrator\.ssh\id_rsa.pub'

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30)
print('已连接', HOST)

# 1. 上传
sftp = cli.open_sftp()
sftp.put(LOCAL, REMOTE_TMP)
st = sftp.stat(REMOTE_TMP)
sftp.close()
print('已上传 /tmp/home.html, 大小:', st.st_size)

# 2. 替换容器内文件 + 重启
def run(cmd):
    _, out, err = cli.exec_command(cmd, timeout=120)
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    return o, e

o, e = run('docker cp /tmp/home.html edu-manage-app-1:/app/public/home.html')
print('docker cp:', o or e or 'OK')
o, e = run('docker restart edu-manage-app-1')
print('restart:', o or e or 'OK')

# 3. 等待启动
time.sleep(14)

# 4. 验证 HTTP
o, e = run('curl -s -o /dev/null -w "%{http_code}" https://muzhexuetang.xyz/')
print('线上 HTTP:', o, e or '')

# 5. 容器内文件 MD5 校验
o, e = run('docker exec edu-manage-app-1 md5sum /app/public/home.html 2>/dev/null || docker exec edu-manage-app-1 sha1sum /app/public/home.html')
print('容器内文件:', o or e)

# 6. 补公钥到 authorized_keys（修复连接，以后可用密钥免密）
try:
    pub = io.open(PUB, encoding='utf-8').read().strip()
    o, e = run('grep -cF "%s" /root/.ssh/authorized_keys 2>/dev/null || true' % pub.split()[0])
    cnt = o.strip() or '0'
    if cnt == '0':
        run('echo "%s" >> /root/.ssh/authorized_keys' % pub)
        print('已添加新公钥到 authorized_keys')
    else:
        print('公钥已存在，跳过')
except Exception as ex:
    print('公钥处理跳过:', ex)

cli.close()
print('完成')
