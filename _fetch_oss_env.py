# -*- coding: utf-8 -*-
import paramiko, sys
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=15)
stdin, stdout, stderr = cli.exec_command("grep -E '^(STORAGE_DRIVER|UPLOAD_DIR|ALIYUN_OSS_)' /opt/edu-manage-docker/source/.env")
out = stdout.read().decode("utf-8", "replace")
err = stderr.read().decode("utf-8", "replace")
print("=== OSS env on server ===")
print(out)
if err.strip():
    print("STDERR:", err)
cli.close()
