# -*- coding: utf-8 -*-
"""排查：容器到底挂载/服务哪个目录"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)


def run(cmd, t=90):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


print("=== 1) app 容器的挂载 (Mounts) ===")
out, _ = run("docker inspect edu-manage-app-1 --format '{{range .Mounts}}{{.Type}} | {{.Source}} -> {{.Destination}} | RW={{.RW}}{{\"\\n\"}}{{end}}'")
print(out)

print("\n=== 2) app 容器的启动命令 / 工作目录 ===")
out, _ = run("docker inspect edu-manage-app-1 --format 'Cmd={{.Config.Cmd}}  Entrypoint={{.Config.Entrypoint}}  WorkDir={{.Config.WorkingDir}}'")
print(out)

print("\n=== 3) 容器内 /app/public/home.html 的 sha256 ===")
out, err = run("docker exec edu-manage-app-1 sh -c \"sha256sum /app/public/home.html /app/public/about.html 2>&1\"")
print(out if out else err)

print("\n=== 4) 容器内找 home.html ===")
out, err = run("docker exec edu-manage-app-1 sh -c \"find / -name 'home.html' -not -path '*/node_modules/*' 2>/dev/null | head -20\"")
print(out if out else err)

print("\n=== 5) 宿主机上 source/public 现在的 sha256 ===")
out, _ = run("sha256sum /opt/edu-manage-docker/source/public/home.html /opt/edu-manage-docker/source/public/about.html")
print(out)

print("\n=== 6) docker-compose 里 app 的定义 ===")
out, _ = run("grep -n -A25 'app:' /opt/edu-manage-docker/docker-compose.yml 2>/dev/null | head -45")
print(out if out else "(未找到 docker-compose.yml)")

print("\n=== 7) nginx 站点配置文件清单 ===")
out, _ = run("ls -l /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null")
print(out)

print("\n=== 8) nginx 配置中的 server_name muzhexuetang ===")
out, _ = run("grep -rln 'muzhexuetang' /etc/nginx/ 2>/dev/null")
print(out)

cli.close()
