# -*- coding: utf-8 -*-
import paramiko
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=15)
stdin, stdout, stderr = cli.exec_command("docker ps --filter name=edu-manage-app --format '{{.Names}} {{.Status}}' && curl -s -o /dev/null -w 'login:%{http_code}\\n' http://localhost:3000/login")
out = stdout.read().decode()
err = stderr.read().decode()
print("OUT:", out)
print("ERR:", err)
cli.close()
