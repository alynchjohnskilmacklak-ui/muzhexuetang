import paramiko
import os

# 本地头像文件
LOCAL_DIR = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/public/avatars"
files = ["student-male.png", "student-female.png"]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

# 先确保目录存在
stdin, stdout, stderr = ssh.exec_command("mkdir -p /var/www/static/avatars")
stdout.read()

# 上传文件
sftp = ssh.open_sftp()
for f in files:
    local_path = os.path.join(LOCAL_DIR, f)
    remote_path = f"/var/www/static/avatars/{f}"
    print(f"上传 {f}...")
    sftp.put(local_path, remote_path)
    print(f"  完成")

sftp.close()

# 验证
print("\n验证文件:")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/static/avatars/")
print(stdout.read().decode())

ssh.close()
