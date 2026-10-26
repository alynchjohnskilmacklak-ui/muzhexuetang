import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

stdin, stdout, stderr = ssh.exec_command("grep image /opt/edu-manage-docker/source/compose.production.yaml", timeout=15)
print(stdout.read().decode())

ssh.close()
