# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', key_filename=r'C:\Users\Administrator\.ssh\id_rsa', timeout=25)

def run(cmd, label):
    print('==', label, '==')
    _, o, e = ssh.exec_command(cmd, timeout=90)
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    print(out if out else '(未命中)')
    if err:
        print('[err]', err[:200])

checks = [
    ('上课时长，谁在领先', '课时榜-标题'),
    ('仅展示本月有课时的同学', '课时榜-过滤说明'),
    ('本月课时（小时）', '课时榜-表头'),
    ('与同班同学对比', '课时榜-副标题'),
]
for q, label in checks:
    cmd = "docker run --rm --entrypoint sh edu-manage-app:latest -c \"grep -rl '%s' /app/.next | head -2\"" % q
    run(cmd, label)

ssh.close()
print('DONE')
