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

q1 = '只统计本月有课时的同学'
q2 = '排名序号'
q3 = '迷你折线'
q4 = '学习趋势'
q5 = '脱敏姓名：同姓同学也能一眼区分'

for q, label in [(q1, '课时榜-过滤0课时'), (q2, '课时榜-排名序号'), (q5, '课时榜-脱敏说明'), (q3, '趋势-折线图'), (q4, '趋势-标题')]:
    cmd = "docker run --rm --entrypoint sh edu-manage-app:latest -c \"grep -rl '%s' /app/.next | head -2\"" % q
    run(cmd, label)

ssh.close()
print('DONE')
