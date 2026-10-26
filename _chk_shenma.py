import paramiko
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=25)
def run(c):
    _,o,e = cli.exec_command(c, timeout=60); return o.read().decode("utf-8","replace").strip()
print("  服务器 source     : " + run("cat /opt/edu-manage-docker/source/public/shenma-site-verification.txt"))
print("  容器内 /app/public: " + run("docker exec edu-manage-app-1 cat /app/public/shenma-site-verification.txt"))
cli.close()
