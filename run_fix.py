import paramiko
import time

t0 = time.time()
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

# 上传 SQL 文件
sftp = ssh.open_sftp()
sftp.put(r"D:\01muzhexuetang\muzhexuetang\coding\fix_all_teachers.sql", "/tmp/fix.sql")
print(f"上传SQL: {time.time()-t0:.1f}s")

# docker cp 进容器并执行
print("=== 执行修复 ===")
t1 = time.time()
stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/fix.sql edu-manage-db-1:/tmp/fix.sql && docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -f /tmp/fix.sql 2>&1", timeout=60)
print(stdout.read().decode())
print(f"执行修复: {time.time()-t1:.1f}s")

sftp.close()
ssh.close()
print(f"总耗时: {time.time()-t0:.1f}s")
