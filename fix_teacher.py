import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

# 直接执行修复 SQL，表名用双引号
print("=== 修复马紫晨的 mainTeacherId ===")
sql = """
UPDATE "Student" 
SET "mainTeacherId" = 'cmp8ecgtc000i2m5ehdt47ul4'
WHERE name = '马紫晨';
"""
cmd = f"""docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c '{sql}'"""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())

# 验证
print("=== 验证 ===")
sql2 = """
SELECT name, "mainTeacherId" FROM "Student" WHERE name = '马紫晨';
"""
cmd2 = f"""docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c '{sql2}'"""
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=30)
print("OUT:", stdout.read().decode())

ssh.close()
