# -*- coding: utf-8 -*-
import paramiko, io, sys, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)
def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()

print("=== 1) 容器内 /app/public 是否为挂载点（查 mountinfo）===")
out, _ = run("docker exec edu-manage-app-1 sh -c \"grep -E ' /app/public' /proc/self/mountinfo || echo '(不是挂载点，来自镜像)'; echo '---'; grep -cE ' /app/public/' /proc/self/mountinfo\"")
print(out)

print("\n=== 2) compose 配置解析后的实际 volumes（权威）===")
out, _ = run("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml config 2>/dev/null | sed -n '/^  app:/,/^  [a-z]/p' | grep -A20 'volumes:' | head -25")
print(out if out else "(解析失败，稍后换方式)")

print("\n=== 3) 现有两个 .bak 的来源核对（哪份等于旧的线上版本）===")
for f in ["home.html.bak-20261002", "home.html.bak-20261003", "about.html.bak-20261003"]:
    out, _ = run(f"sha256sum /opt/edu-manage-docker/source/public/{f} | cut -c1-16")
    size, _ = run(f"stat -c %s /opt/edu-manage-docker/source/public/{f}")
    print(f"  {f:28s} sha={out}  size={size}")
print("  参照：线上旧 home=54deeb292962be2f(66295)  about=1968d74824444874(58940)")

print("\n=== 4) 镜像里 public 的 home.html（容器当前真正在服务的）===")
out, _ = run("docker exec edu-manage-app-1 sha256sum /app/public/home.html /app/public/about.html")
print(out)

print("\n=== 5) 该镜像 edu-manage-app:latest 的创建时间与 ID ===")
out, _ = run("docker inspect edu-manage-app:latest --format 'ID={{.Id}}  Created={{.Created}}  Size={{.Size}}'")
print(out)
out, _ = run("docker inspect edu-manage-app-1 --format 'Image={{.Image}}  StartedAt={{.State.StartedAt}}'")
print(out)

print("\n=== 6) docker compose 版本与可用性 ===")
out, _ = run("docker compose version 2>&1 | head -2")
print(out)

print("\n=== 7) /srv/edu-manage/shared/public 写入权限（node 用户 uid）===")
out, _ = run("stat -c '%U:%G %a %n' /srv/edu-manage/shared/public /srv/edu-manage/shared/public/marketing; docker exec edu-manage-app-1 id")
print(out)

cli.close()
