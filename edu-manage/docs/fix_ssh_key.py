# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

HOST = '101.200.191.201'; USER = 'root'; PWD = 'Ren031213'
pub = io.open(r'C:\Users\Administrator\.ssh\id_rsa.pub', encoding='utf-8').read().strip()

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PWD, timeout=30)

def run(cmd):
    _, out, err = cli.exec_command(cmd, timeout=60)
    return out.read().decode('utf-8', 'replace').strip(), err.read().decode('utf-8', 'replace').strip()

o, e = run("grep -cF '%s' /root/.ssh/authorized_keys" % pub)
cnt = o.strip()
print('grep 结果:', repr(o), 'err:', repr(e))
if cnt and cnt not in ('0', ''):
    print('公钥已存在，跳过')
else:
    run("echo '%s' >> /root/.ssh/authorized_keys" % pub)
    o, e = run("grep -cF '%s' /root/.ssh/authorized_keys" % pub)
    print('已追加，现有匹配行数:', o.strip())
    o, e = run('wc -l /root/.ssh/authorized_keys')
    print('authorized_keys 总行数:', o.strip())

cli.close()
import subprocess
r = subprocess.run(['ssh', '-i', r'C:\Users\Administrator\.ssh\id_rsa',
                    '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=yes',
                    '-o', 'ConnectTimeout=15', 'root@101.200.191.201', 'echo KEY-OK'],
                   capture_output=True, text=True, timeout=40)
print('新密钥免密测试:', r.stdout.strip() or r.stderr.strip(), ' exit:', r.returncode)
