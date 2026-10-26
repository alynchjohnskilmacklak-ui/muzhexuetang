import paramiko
import os

avatars_dir = "D:/01muzhexuetang/muzhexuetang/coding/edu-manage/public/avatars"
files = ["student-male.jpg", "student-female.jpg"]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', password='Ren031213')

sftp = ssh.open_sftp()
for f in files:
    local_path = os.path.join(avatars_dir, f)
    remote_path = f"/var/www/static/avatars/{f}"
    print(f"上传 {f}...")
    sftp.put(local_path, remote_path)
    print(f"  完成")

sftp.close()

# 验证
print("\n验证:")
stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/static/avatars/*.jpg")
print(stdout.read().decode())

ssh.close()
