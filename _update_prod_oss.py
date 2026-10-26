# -*- coding: utf-8 -*-
import paramiko
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=15)

# 1. backup .env
stdin, stdout, stderr = cli.exec_command("cp /opt/edu-manage-docker/source/.env /opt/edu-manage-docker/source/.env.bak.$(date +%Y%m%d%H%M)")
print("backup:", stdout.channel.recv_exit_status())

# 2. replace OSS access key id and secret
cmds = [
    "sed -i 's|^ALIYUN_OSS_ACCESS_KEY_ID=.*|ALIYUN_OSS_ACCESS_KEY_ID=LTAI5t7rAcTk7uAw6PrwPLW2|' /opt/edu-manage-docker/source/.env",
    "sed -i 's|^ALIYUN_OSS_ACCESS_KEY_SECRET=.*|ALIYUN_OSS_ACCESS_KEY_SECRET=qqV1euAfOFMqtpunooNSLyKTK0bSRl|' /opt/edu-manage-docker/source/.env",
]
for c in cmds:
    stdin, stdout, stderr = cli.exec_command(c)
    stdout.channel.recv_exit_status()

# 3. verify
stdin, stdout, stderr = cli.exec_command("grep ALIYUN_OSS_ACCESS_KEY /opt/edu-manage-docker/source/.env")
print("new values:")
print(stdout.read().decode())

# 4. restart app container
stdin, stdout, stderr = cli.exec_command("cd /opt/edu-manage-docker/source && docker compose up -d edu-manage-app 2>&1 || docker-compose up -d edu-manage-app 2>&1")
print("restart:", stdout.read().decode()[-500:], stderr.read().decode()[-300:])

import time; time.sleep(8)
# 5. health check
stdin, stdout, stderr = cli.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")
print("local login on server:", stdout.read().decode())

cli.close()
