import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

# 先看看有哪些表
print("=== 表列表 ===")
stdin, stdout, stderr = ssh.exec_command("""
docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "\\dt"
""", timeout=30)
print(stdout.read().decode()[:1000])

ssh.close()
