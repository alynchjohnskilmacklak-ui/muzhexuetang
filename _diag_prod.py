# -*- coding: utf-8 -*-
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=20)
def run(cmd, t=30):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8","replace").strip(), e.read().decode("utf-8","replace").strip()

out, _ = run("docker logs edu-manage-app-1 --tail 40 2>&1 | grep -A5 -i 'error\\|prisma\\|materialType'")
print(out)
print("---")
out2, _ = run("docker exec edu-manage-db-1 psql -U postgres -d edu_manage -c '\\d \"StudyMaterial\"' | grep -i material")
print(out2)
cli.close()
