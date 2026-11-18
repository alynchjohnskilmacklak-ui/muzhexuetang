# -*- coding: utf-8 -*-
"""检查服务器连通性与当前部署状态"""
import paramiko

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    cli.connect('101.200.191.201', username='root', password='Ren031213', timeout=20)
    stdin, stdout, stderr = cli.exec_command('docker ps --format "{{.Names}} | {{.Status}}" | head -5; echo ---; readlink -f /opt/edu-manage-docker/source; echo ---; docker images edu-manage-app --format "{{.Tag}} | {{.Size}}" | head -8')
    print(stdout.read().decode())
    cli.close()
    print('SSH OK')
except Exception as e:
    print('SSH FAIL:', e)
