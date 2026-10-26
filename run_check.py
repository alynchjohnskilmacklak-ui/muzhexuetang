import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

sftp = ssh.open_sftp()
sftp.put(r"D:\01muzhexuetang\muzhexuetang\coding\check_dup.sql", "/tmp/check.sql")

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/check.sql edu-manage-db-1:/tmp/check.sql && docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -f /tmp/check.sql 2>&1", timeout=30)
print(stdout.read().decode())

sftp.close()
ssh.close()
