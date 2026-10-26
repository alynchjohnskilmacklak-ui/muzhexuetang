# -*- coding: utf-8 -*-
"""找出这个容器的部署方式：compose 文件、镜像构建方式、现有 shared 目录结构"""
import paramiko, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect("101.200.191.201", username="root", password="Ren031213", timeout=30)


def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    return o.read().decode("utf-8", "replace").strip(), e.read().decode("utf-8", "replace").strip()


print("=== 1) 找 compose 文件 ===")
out, _ = run("find / -maxdepth 5 \\( -name 'docker-compose*.y*ml' -o -name 'compose*.y*ml' \\) -not -path '/proc/*' -not -path '*/node_modules/*' 2>/dev/null | head -20")
print(out)

print("\n=== 2) 容器来自哪个 compose 项目 ===")
out, _ = run("docker inspect edu-manage-app-1 --format '{{index .Config.Labels \"com.docker.compose.project\"}} | {{index .Config.Labels \"com.docker.compose.project.working_dir\"}} | {{index .Config.Labels \"com.docker.compose.project.config_files\"}} | service={{index .Config.Labels \"com.docker.compose.service\"}}'")
print(out)

print("\n=== 3) 当前镜像 ===")
out, _ = run("docker images | grep -i edu-manage | head -10")
print(out)

print("\n=== 4) /opt/edu-manage-docker 目录结构（两层） ===")
out, _ = run("ls -la /opt/edu-manage-docker/ ; echo '---'; find /opt/edu-manage-docker -maxdepth 2 -name '*.sh' -o -maxdepth 2 -name '*.yml' -o -maxdepth 2 -name '*.yaml' -o -maxdepth 2 -name 'Dockerfile*' 2>/dev/null | head -30")
print(out)

print("\n=== 5) /srv/edu-manage 结构 ===")
out, _ = run("ls -la /srv/edu-manage/ 2>/dev/null; echo '--- shared/public:'; ls -la /srv/edu-manage/shared/public/ 2>/dev/null | head -25")
print(out)

print("\n=== 6) nginx 配置里 / 与 /about 到底指哪（含最近备份的差异） ===")
out, _ = run("grep -n 'location\\|proxy_pass\\|root\\|try_files\\|alias' /etc/nginx/sites-available/edu-manage.conf | head -50")
print(out)

print("\n=== 7) 今天新增的 nginx 备份差异（谁改的） ===")
out, _ = run("diff /etc/nginx/sites-available/edu-manage.conf.bak-perf-20261003 /etc/nginx/sites-available/edu-manage.conf 2>/dev/null | head -40")
print(out if out else "(无差异)")

print("\n=== 8) 最近修改过的部署脚本 ===")
out, _ = run("find /opt /srv /root -maxdepth 3 -name '*.sh' -newermt '2026-10-01' 2>/dev/null | head -20")
print(out if out else "(无)")

print("\n=== 9) docker-entrypoint.sh 内容 ===")
out, _ = run("docker exec edu-manage-app-1 sh -c 'cat /app/docker-entrypoint.sh 2>/dev/null || cat docker-entrypoint.sh 2>/dev/null' | head -40")
print(out if out else "(未找到)")

cli.close()
