import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c): 
    _,o,e = cli.exec_command(c, timeout=60); return o.read().decode("utf-8","replace").strip()
print("--- /srv/edu-manage/shared/public/ ---")
print(run("ls -la /srv/edu-manage/shared/public/ | head -20"))
print("--- source/public 里的验证类文件 ---")
print(run("ls -la /opt/edu-manage-docker/source/public/ | grep -iE 'verify|auth|\\.txt|\\.xml' "))
print("--- 容器内 /app/public 验证文件 ---")
print(run("docker exec edu-manage-app-1 ls -la /app/public/ | grep -iE 'verify|auth|ByteDance' "))
cli.close()
