import paramiko
import os

avatars_dir = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/public/avatars"

# 要上传的文件
files = [
    "teacher-male.jpg",
    "teacher-female.jpg",
]
for i in range(1, 14):
    files.append(f"f/avatar-f-{i:02d}.jpg")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

sftp = ssh.open_sftp()
for f in files:
    local_path = os.path.join(avatars_dir, f)
    remote_path = f"/var/www/static/avatars/{f}"
    print(f"上传 {f}...")
    sftp.put(local_path, remote_path)

sftp.close()

print("\n上传完成！")
ssh.close()
