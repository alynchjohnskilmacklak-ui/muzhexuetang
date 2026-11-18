# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.191.201', username='root', key_filename=r'C:\Users\Administrator\.ssh\id_rsa', timeout=25)

def run(cmd, label):
    print('='*10, label, '='*10)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=90)
    out = stdout.read().decode('utf-8', 'replace').strip()
    err = stderr.read().decode('utf-8', 'replace').strip()
    if out: print(out)
    if err: print('[stderr]', err[:300])
    if not out and not err: print('(无输出)')

run("docker inspect edu-manage-app:latest --format 'Created: {{.Created}}; Id: {{.Id}}'", '镜像时间')
run("docker run --rm --entrypoint sh edu-manage-app:latest -c \"grep -rl '文件格式暂不支持在线预览' /app/.next | head -2\"", 'PDF友好错误(修复1)')
run("docker run --rm --entrypoint sh edu-manage-app:latest -c \"grep -rl 'topRank' /app/.next | head -2\"", '课时榜排名(修复3)')
run("docker run --rm --entrypoint sh edu-manage-app:latest -c \"grep -rl 'overviewTrendSeries' /app/.next | head -2\"", '趋势折线(修复2)')
run("curl -s -o /dev/null -w '首页 HTTP %{http_code}, %{size_download}B, %{time_total}s' https://muzhexuetang.xyz/", '线上首页')
run("curl -s http://127.0.0.1:3000/api/health | head -c 300", '容器健康接口')
run("docker compose -f /opt/edu-manage-docker/source/compose.production.yaml ps --format '{{.Name}} {{.Status}}'", '容器状态')

ssh.close()
print('DONE')
