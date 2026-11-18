# -*- coding: utf-8 -*-
import paramiko, time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('101.200.191.201', port=22, username='root', password='Ren031213', timeout=30)

def run(cmd):
    stdin, out, err = c.exec_command(cmd, timeout=120)
    o = out.read().decode('utf-8', 'ignore')
    e = err.read().decode('utf-8', 'ignore')
    rc = out.channel.recv_exit_status()
    return rc, o, e

status = 'unknown'
for i in range(20):
    rc, o, e = run("docker ps --filter name=edu-manage-app-1 --format '{{.Status}}'")
    s = o.strip()
    if 'healthy' in s or ('Up' in s and 'restarting' not in s and 'starting' not in s):
        status = s
        print('status:', s)
        break
    status = s
    time.sleep(6)
else:
    print('still starting:', status)

rc, o, e = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login")
print('http /login:', o.strip())
rc, o, e = run("curl -s -o /dev/null -w '%{http_code}' https://muzhexuetang.xyz/login")
print('https /login:', o.strip())
rc, o, e = run("docker logs edu-manage-app-1 --tail 30 2>&1 | tail -20")
print('logs tail:')
print(o[-2000:])
c.close()
