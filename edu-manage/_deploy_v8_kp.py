# -*- coding: utf-8 -*-
"""部署 edu-manage-feedback-v8-kp：上传镜像 tar → load → tag latest → compose up → 健康检查"""
import paramiko
import os
import sys

HOST = "101.200.191.201"
USER = "root"
PASSWORD = "Ren031213"  # 历史部署脚本既有凭据（不打印日志）
LOCAL_TAR = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-feedback-v8-kp-20261004.tar"
REMOTE_TAR = "/tmp/edu-manage-feedback-v8-kp-20261004.tar"
TAG = "feedback-v8-kp-20261004"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASSWORD, timeout=25, banner_timeout=25, auth_timeout=25)

def run(cmd, timeout=1200):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    ok = code == 0
    print(f"[{'OK' if ok else 'FAIL'}] $ {cmd}\n    {out.strip()[:600]}\n    {err.strip()[:300]}")
    return ok

# 1) 上传
sftp = cli.open_sftp()
print("上传中:", LOCAL_TAR)
sftp.put(LOCAL_TAR, REMOTE_TAR)
sftp.close()
print("上传完成")

# 2) 服务器 load
if not run(f"docker load -i {REMOTE_TAR}"):
    sys.exit("load 失败")

# 3) 备份当前 latest
run("docker tag edu-manage-app:latest edu-manage-app:pre-v8-kp-backup-20261004", 60)

# 4) 切换 latest 到新镜像
if not run(f"docker tag edu-manage-app:{TAG} edu-manage-app:latest", 60):
    sys.exit("tag 失败")

# 5) 重建 app 容器
if not run("cd /opt/edu-manage-docker/source && docker compose -f compose.production.yaml up -d --no-build app", 300):
    sys.exit("compose up 失败")

# 6) 健康等待与检查
run("sleep 30 && docker ps --filter name=edu-manage-app-1 --format '{{.Status}} {{.Image}}'", 90)
run("curl -fsS http://127.0.0.1:3000/login -o /dev/null -w 'HTTP %{http_code}\n' || true", 60)
run("curl -fsS http://127.0.0.1:3000/teacher/feedback -o /dev/null -w 'HTTP %{http_code}\n' || true", 60)

cli.close()
print("DONE")
