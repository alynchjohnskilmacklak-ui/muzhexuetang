import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)

# 找到胡思同的 teacher id，然后把所有初三学生的 mainTeacherId 改成他
print("=== 修复马紫晨的 mainTeacherId ===")
sql = """
UPDATE "Student" 
SET "mainTeacherId" = 'cmp8ecgtc000i2m5ehdt47ul4'
WHERE name = '马紫晨';
"""
stdin, stdout, stderr = ssh.exec_command(f"""
docker exec edu-manage-db-1 psql -U edu_admin -d muzhe_chuzhong -c "{sql}"
""", timeout=30)
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
print("修复完成!")
