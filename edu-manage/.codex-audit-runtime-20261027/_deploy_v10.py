# -*- coding: utf-8 -*-
"""部署 v10 镜像到线上服务器（docker compose 流程）"""
import io, os, paramiko, time, sys

HOST = "101.200.191.201"
USER = "root"
PWD = "Ren031213"
LOCAL_TAR = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-feedback-v10-20261005.tar"
REMOTE_TAR = "/tmp/edu-manage-feedback-v10-20261005.tar"
SHA256 = "7A5A2873701B419F10D70F3E88B47727294AFD0A95C5DD11819CC1B780B958FD"
TAG = "feedback-v10-20261005"
BACKUP_TAG = "pre-v10-backup-20261005"
COMPOSE_DIR = "/opt/edu-manage-docker/source"

def run(cli, cmd, timeout=600):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err

def main():
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(" 连接服务器...", flush=True)
    cli.connect(HOST, username=USER, password=PWD, timeout=30)
    t0 = time.time()

    # 若远端已存在且 sha256 匹配则跳过上传
    code, out, err = run(cli, "sha256sum %s 2>/dev/null" % REMOTE_TAR)
    existing = out.strip().split() if out.strip() else []
    if existing and existing[0].lower() == SHA256.lower():
        print(" 远端 tar 已存在且校验匹配，跳过上传", flush=True)
    else:
        print(" 上传镜像 tar (273.7MB)...", flush=True)
        sftp = cli.open_sftp()
        sftp.put(LOCAL_TAR, REMOTE_TAR)
        sftp.close()
        print("  上传完成 %ds" % (time.time()-t0), flush=True)

    print(" 服务器校验 sha256...", flush=True)
    code, out, err = run(cli, "sha256sum %s" % REMOTE_TAR)
    actual = out.strip().split() if out.strip() else "?"
    print("  期望: %s" % SHA256, flush=True)
    print("  实际: %s" % actual, flush=True)
    if (actual == "?" and isinstance(actual, str)) or actual[0].lower() != SHA256.lower():
        print("!! SHA256 不匹配，中止", flush=True)
        sys.exit(1)
    print("  校验通过", flush=True)

    print(" docker load...", flush=True)
    code, out, err = run(cli, "docker load -i %s" % REMOTE_TAR, timeout=900)
    print("  load: %s" % (out.strip().splitlines()[-1] if out.strip() else err), flush=True)
    if code != 0:
        print("!! load 失败", flush=True); sys.exit(1)

    print(" 打备份 tag + 切 latest...", flush=True)
    # 备份当前 latest 到 pre-v10-backup
    run(cli, "docker inspect edu-manage-app:latest --format '{{.RepoTags}}' 2>/dev/null | head -1")
    run(cli, "docker tag edu-manage-app:latest edu-manage-app:%s 2>/dev/null || true" % BACKUP_TAG)
    run(cli, "docker tag edu-manage-app:%s edu-manage-app:latest" % TAG)
    print("  latest -> %s (旧版已备份为 %s)" % (TAG, BACKUP_TAG), flush=True)

    print(" compose 重建容器...", flush=True)
    code, out, err = run(cli, "cd %s && docker compose -f compose.production.yaml up -d --no-build app" % COMPOSE_DIR, timeout=300)
    print("  compose: %s" % (out.strip()[-200:] if out.strip() else err[-200:]), flush=True)
    if code != 0:
        print("!! compose 失败", flush=True); sys.exit(1)

    print(" 健康检查...", flush=True)
    time.sleep(15)
    code, out, err = run(cli, "docker ps --format '{{.Names}} | {{.Status}}' | grep edu-manage-app-1")
    print("  %s" % out.strip(), flush=True)
    code, out, err = run(cli, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")
    print("  /login HTTP: %s" % out.strip(), flush=True)
    code, out, err = run(cli, "docker inspect edu-manage-app-1 --format '{{.Config.Image}}'")
    print("  容器镜像: %s" % out.strip(), flush=True)

    print(" 清理远端 tar...", flush=True)
    run(cli, "rm -f %s" % REMOTE_TAR)
    print("DONE in %ds" % (time.time()-t0), flush=True)
    cli.close()

if __name__ == "__main__":
    main()
