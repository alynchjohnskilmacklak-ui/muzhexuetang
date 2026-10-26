# -*- coding: utf-8 -*-
"""部署 v12 镜像到线上服务器（docker compose 流程，每步计时）"""
import io, os, paramiko, time, sys

HOST = "101.200.191.201"
USER = "root"
PWD = "Ren031213"
LOCAL_TAR = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\release\edu-manage-feedback-v12-20261005.tar"
REMOTE_TAR = "/tmp/edu-manage-feedback-v12-20261005.tar"
SHA256 = "c4c432c9e3d173e7e94db67752689106c5d6c9d81f8505b26eac09ec928d7642"
TAG = "feedback-v12-20261005"
BACKUP_TAG = "pre-v12-backup-20261005"
COMPOSE_DIR = "/opt/edu-manage-docker/source"
STEPS = {}

def step(name, t0):
    STEPS[name] = round(time.time() - t0, 1)

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
    t_all = time.time()

    # 1. 上传（若远端已存在且 sha256 匹配则跳过）
    t0 = time.time()
    code, out, err = run(cli, "sha256sum %s 2>/dev/null" % REMOTE_TAR)
    existing = out.strip().split() if out.strip() else []
    if existing and existing[0].lower() == SHA256.lower():
        print(" 远端 tar 已存在且校验匹配，跳过上传", flush=True)
    else:
        size = os.path.getsize(LOCAL_TAR) / 1024 / 1024
        print(" 上传镜像 tar (%.1fMB)..." % size, flush=True)
        sftp = cli.open_sftp()
        sftp.put(LOCAL_TAR, REMOTE_TAR)
        sftp.close()
    step("UPLOAD", t0)
    print("  上传/检查完成 %ss" % STEPS["UPLOAD"], flush=True)

    # 2. 服务器 sha256 校验
    t0 = time.time()
    code, out, err = run(cli, "sha256sum %s" % REMOTE_TAR)
    actual = out.strip().split() if out.strip() else ["?"]
    step("VERIFY", t0)
    print("  期望: %s" % SHA256, flush=True)
    print("  实际: %s" % actual[0], flush=True)
    if actual[0].lower() != SHA256.lower():
        print("!! SHA256 不匹配，中止", flush=True)
        sys.exit(1)
    print("  校验通过 %ss" % STEPS["VERIFY"], flush=True)

    # 3. docker load
    t0 = time.time()
    print(" docker load...", flush=True)
    code, out, err = run(cli, "docker load -i %s" % REMOTE_TAR, timeout=900)
    step("LOAD", t0)
    if code != 0:
        print("!! load 失败", flush=True); sys.exit(1)
    print("  load 完成 %ss: %s" % (STEPS["LOAD"], (out.strip().splitlines()[-1] if out.strip() else err)), flush=True)

    # 4. 备份 tag + 切 latest
    t0 = time.time()
    run(cli, "docker tag edu-manage-app:latest edu-manage-app:%s 2>/dev/null || true" % BACKUP_TAG)
    run(cli, "docker tag edu-manage-app:%s edu-manage-app:latest" % TAG)
    step("TAG", t0)
    print("  latest -> %s (旧版备份为 %s) %ss" % (TAG, BACKUP_TAG, STEPS["TAG"]), flush=True)

    # 5. compose 重建
    t0 = time.time()
    print(" compose 重建容器...", flush=True)
    code, out, err = run(cli, "cd %s && docker compose -f compose.production.yaml up -d --no-build app" % COMPOSE_DIR, timeout=300)
    step("COMPOSE", t0)
    if code != 0:
        print("!! compose 失败: %s" % (out[-300:] if out else err[-300:]), flush=True); sys.exit(1)
    print("  compose 完成 %ss" % STEPS["COMPOSE"], flush=True)

    # 6. 健康检查
    t0 = time.time()
    print(" 健康检查...", flush=True)
    time.sleep(15)
    code, out, err = run(cli, "docker ps --format '{{.Names}} | {{.Status}}' | grep edu-manage-app-1")
    print("  %s" % out.strip(), flush=True)
    code, out, err = run(cli, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")
    print("  /login HTTP: %s" % out.strip(), flush=True)
    code, out, err = run(cli, "docker inspect edu-manage-app-1 --format '{{.Config.Image}}'")
    print("  容器镜像: %s" % out.strip(), flush=True)
    step("HEALTH", t0)
    print("  健康检查 %ss" % STEPS["HEALTH"], flush=True)

    # 7. 清理远端 tar
    run(cli, "rm -f %s" % REMOTE_TAR)
    print(" 清理远端 tar", flush=True)

    STEPS["TOTAL"] = round(time.time() - t_all, 1)
    print("\n===== 部署耗时统计 =====", flush=True)
    for k, v in STEPS.items():
        print("  %-10s %ss" % (k, v), flush=True)
    cli.close()

if __name__ == "__main__":
    main()
