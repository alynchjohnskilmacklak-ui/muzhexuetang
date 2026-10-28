# -*- coding: utf-8 -*-
import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect('101.200.191.201', username='root', password='Ren031213', timeout=30)
cmds = [
    'curl -s -o /dev/null -w "HTTP:%{http_code}" http://localhost:3000/login',
    'docker ps --format "{{.Names}} {{.Status}}" | grep app',
]
for cmd in cmds:
    _, out, _ = cli.exec_command(cmd, timeout=60)
    print(out.read().decode().strip())
cli.close()
