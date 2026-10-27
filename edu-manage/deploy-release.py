# -*- coding: utf-8 -*-
"""牧哲学堂唯一发布脚本（Docker 预构建发布包流程）。

用法:
  python deploy-release.py                        # 构建 app(runner) 并部署
  python deploy-release.py --migrator             # 额外构建并部署 migrator（schema 变更时）
  python deploy-release.py --skip-build           # 跳过本地构建，复用 release/ 下已有 tar
  python deploy-release.py --dry-run              # 只打印将执行的命令，不实际执行

固定使用 buildx builder「mzt-release」；--load 将镜像放入本地 docker images 供 docker save。
生产服务器：101.200.191.201（/opt/edu-manage-docker/source，compose.production.yaml）。
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import shlex
import subprocess
import sys
import time

import paramiko

ROOT = os.path.dirname(os.path.abspath(__file__))
RELEASE_DIR = os.path.join(ROOT, "release")
HOST = "101.200.191.201"
USER = "root"
PWD = os.environ.get("EDU_DEPLOY_SSH_PASSWORD")
COMPOSE_DIR = "/opt/edu-manage-docker/source"
BUILDER = os.environ.get("MZT_BUILDER", "mzt-release")
NPM_REGISTRY = "https://registry.npmmirror.com"
APP_IMAGE = "edu-manage-app"
MIGRATOR_IMAGE = "edu-manage-migrator"
APP_TARGET = "runner"
MIGRATOR_TARGET = "migrator"


def log(msg):
    print(msg, flush=True)


def run_local(cmd, timeout=1800):
    log("  $ " + cmd)
    t0 = time.time()
    # Docker BuildKit output may contain UTF-8 bytes that cannot be decoded by
    # Windows' active code page. Keep deployment resilient to those log bytes.
    proc = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    elapsed = round(time.time() - t0, 1)
    if (proc.stdout or "").strip():
        log("    " + proc.stdout.strip()[-400:])
    if (proc.stderr or "").strip():
        log("    ERR " + proc.stderr.strip()[-400:])
    if proc.returncode != 0:
        raise RuntimeError("命令失败(%s): %s" % (elapsed, cmd[:120]))
    return elapsed


def ssh_run(cli, cmd, timeout=600):
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def schema_migration_fingerprint():
    schema_path = os.path.join(ROOT, "prisma", "schema.prisma")
    migrations_root = os.path.join(ROOT, "prisma", "migrations")
    migration_lines = []
    for path in sorted(
        (path for path in Path(migrations_root).rglob("*") if path.is_file()),
        key=lambda path: path.relative_to(migrations_root).as_posix(),
    ):
        relative = "./" + path.relative_to(migrations_root).as_posix()
        migration_lines.append("%s  %s\n" % (sha256_file(str(path)), relative))
    migration_digest = hashlib.sha256("".join(migration_lines).encode("utf-8")).hexdigest()
    return "schema=%s migrations=%s" % (sha256_file(schema_path), migration_digest)


def checked_remote(cli, cmd, label, timeout=600):
    code, out, err = ssh_run(cli, cmd, timeout=timeout)
    if code != 0:
        raise RuntimeError("%s失败: %s" % (label, (err or out)[-500:]))
    return out.strip()


def compose_command(args):
    return "cd %s && docker compose -f compose.production.yaml %s" % (shlex.quote(COMPOSE_DIR), args)


def wait_for_app(cli, expected_image_id, timeout=240, interval=5):
    """Only accept a healthy running container with the exact loaded image."""
    deadline = time.monotonic() + timeout
    last_status = "尚未启动"
    while time.monotonic() < deadline:
        code, cid, _ = ssh_run(cli, compose_command("ps -q app"), timeout=15)
        cid = cid.strip()
        if code == 0 and re.fullmatch(r"[0-9a-f]{12,64}", cid):
            code, out, _ = ssh_run(cli, "docker inspect %s" % cid, timeout=15)
            if code == 0:
                try:
                    container = json.loads(out)[0]
                    state = container.get("State", {})
                    last_status = "%s / %s" % (state.get("Status"), state.get("Health", {}).get("Status"))
                    if container.get("Image") != expected_image_id:
                        raise RuntimeError("容器实际镜像与本次发布不一致")
                    if state.get("Status") in ("exited", "dead"):
                        raise RuntimeError("容器启动失败: " + last_status)
                    if state.get("Running") and state.get("Health", {}).get("Status") == "healthy":
                        code, http, _ = ssh_run(cli, "curl --max-time 10 -s -o /dev/null -w '%{http_code}' http://localhost:3000/login", timeout=15)
                        if code == 0 and http.strip() == "200":
                            log("  app healthy，/login HTTP 200，实际镜像已核对")
                            return
                        last_status += " / HTTP " + http.strip()
                except (ValueError, KeyError, IndexError, TypeError):
                    last_status = "无法解析容器状态"
        time.sleep(interval)
    raise RuntimeError("健康检查超时: " + last_status)


def prune_old_backups(cli, image, img_type, timeout=300):
    """清理该镜像上除最新一个之外的全部 pre-* 备份，只保留最近一次回滚点，避免旧镜像在磁盘上堆积。"""
    code, out, _ = ssh_run(cli, "docker images %s --format '{{.Tag}}'" % image, timeout=timeout)
    if code != 0:
        return
    tags = sorted(
        t.strip()
        for t in out.splitlines()
        if t.strip().startswith("pre-") and t.strip().endswith("-backup-%s" % img_type)
    )
    for old in tags[:-1]:
        try:
            checked_remote(cli, "docker rmi %s:%s" % (image, old), "清理旧备份 %s" % old, timeout=timeout)
            log("  已清理旧备份 %s:%s" % (image, old))
        except RuntimeError:
            log("  清理旧备份 %s:%s 失败（仍被引用，留待下次部署）" % (image, old))


def ensure_builder(dry_run):
    if dry_run:
        return
    try:
        run_local("docker buildx inspect %s" % BUILDER)
    except RuntimeError:
        log("  builder %s 不存在，创建..." % BUILDER)
        run_local("docker buildx create --name %s --driver docker-container" % BUILDER)


def build_image(target, image, tag, dry_run, no_cache=False):
    cmd = (
        'docker buildx build --progress=plain --load --builder %s --target %s '
        '%s--build-arg NPM_REGISTRY=%s -t %s:%s .'
        % (BUILDER, target, '--no-cache ' if no_cache else '', NPM_REGISTRY, image, tag)
    )
    if dry_run:
        log("  [dry-run] " + cmd)
        return
    log(" 构建 %s:%s (target=%s)..." % (image, tag, target))
    secs = run_local(cmd, timeout=3600)
    log("  构建完成 %ss" % secs)
    return secs


def export_tar(image, tag, dry_run):
    tar = os.path.join(RELEASE_DIR, "%s-%s.tar" % (image, tag))
    os.makedirs(RELEASE_DIR, exist_ok=True)
    if dry_run:
        log("  [dry-run] docker save %s:%s -o %s" % (image, tag, tar))
        return tar, "0" * 64
    run_local('docker save %s:%s -o "%s"' % (image, tag, tar), timeout=1800)
    digest = sha256_file(tar)
    with open(tar + ".sha256", "w") as f:
        f.write(digest)
    log("  导出 %s（%.1fMB，sha256=%s…%s）" % (tar, os.path.getsize(tar) / 1048576, digest[:16], digest[-6:]))
    return tar, digest


def deploy_remote(tars, tag, dry_run, skip_upload=False):
    """上传两个 tar + sha256，校验，load，备份，切 latest，compose 重建，健康检查。"""
    log(" 连接服务器 %s..." % HOST)
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(
        HOST,
        username=USER,
        password=PWD,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
        look_for_keys=True,
        allow_agent=True,
    )
    t_all = time.time()
    steps = {}
    backups = {}
    app_replaced = False
    migration_attempted = False
    has_migrator = any(os.path.basename(path).startswith(MIGRATOR_IMAGE + "-") for path, _ in tars)
    try:
        for tar, digest in tars:
            remote = "/tmp/" + os.path.basename(tar)
            base = os.path.basename(tar)
            image = APP_IMAGE if base.startswith(APP_IMAGE + "-") else MIGRATOR_IMAGE if base.startswith(MIGRATOR_IMAGE + "-") else None
            if skip_upload:
                if not image:
                    raise RuntimeError("无法从发布包识别镜像: %s" % base)
                local = subprocess.run(
                    ["docker", "image", "inspect", "%s:%s" % (image, tag), "--format", "{{.Id}}"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=30,
                )
                if local.returncode != 0 or not local.stdout.strip():
                    raise RuntimeError("本地预加载镜像不存在: %s:%s" % (image, tag))
                remote_id = checked_remote(
                    cli,
                    "docker image inspect %s:%s --format '{{.Id}}'" % (image, tag),
                    "校验服务器预加载镜像",
                )
                if local.stdout.strip() != remote_id:
                    raise RuntimeError("本地与服务器镜像 ID 不匹配，拒绝跳过上传: %s:%s" % (image, tag))
                log(" %s:%s 本地/服务器镜像 ID 一致，跳过上传和 docker load" % (image, tag))
                steps["VERIFY_IMAGE_" + image.replace("edu-manage-", "")] = 0
                continue

            # 上传（远端已存在且 sha256 匹配则跳过）
            t0 = time.time()
            code, out, err = ssh_run(cli, "sha256sum %s 2>/dev/null" % remote)
            existing = out.strip().split() if out.strip() else []
            if existing and existing[0].lower() == digest.lower():
                log(" %s 已存在且校验匹配，跳过上传" % os.path.basename(tar))
            else:
                sftp = cli.open_sftp()
                sftp.put(tar, remote)
                sftp.close()
            steps["UPLOAD_" + os.path.basename(tar)[:16]] = round(time.time() - t0, 1)

            # sha256 校验
            t0 = time.time()
            code, out, err = ssh_run(cli, "sha256sum %s" % remote)
            actual = out.strip().split() if out.strip() else ["?"]
            if actual[0].lower() != digest.lower():
                raise RuntimeError("服务器 sha256 校验失败: %s" % os.path.basename(tar))
            steps["VERIFY_" + os.path.basename(tar)[:16]] = round(time.time() - t0, 1)

            # docker load
            t0 = time.time()
            code, out, err = ssh_run(cli, "docker load -i %s" % remote, timeout=900)
            if code != 0:
                raise RuntimeError("docker load 失败: %s" % os.path.basename(tar))
            steps["LOAD_" + os.path.basename(tar)[:16]] = round(time.time() - t0, 1)
            log("  load %s 完成" % os.path.basename(tar))
            checked_remote(
                cli,
                "rm -f " + remote,
                "清理已加载的远端发布 tar",
                timeout=30,
            )

        if skip_upload:
            # Image IDs were matched above, and the local release archives remain
            # available for recovery. Remove redundant remote copies before the
            # database backup so a retry can reclaim its temporary upload space.
            for tar_path, _ in tars:
                checked_remote(
                    cli,
                    "rm -f /tmp/" + os.path.basename(tar_path),
                    "清理已校验的远端发布 tar",
                    timeout=30,
                )

        if not has_migrator:
            local_fingerprint = schema_migration_fingerprint()
            command = (
                "cd /app && schema=$(sha256sum prisma/schema.prisma | awk '{print $1}') && "
                "migrations=$(cd prisma/migrations && find . -type f -print0 | sort -z | "
                "xargs -0 sha256sum | sha256sum | awk '{print $1}') && "
                "printf 'schema=%s migrations=%s\\n' \"$schema\" \"$migrations\""
            )
            remote_fingerprint = checked_remote(
                cli,
                "docker run --rm --entrypoint sh %s:latest -c %s"
                % (MIGRATOR_IMAGE, shlex.quote(command)),
                "核对 app-only 发布的 Prisma schema 与迁移版本",
                timeout=120,
            )
            if remote_fingerprint != local_fingerprint:
                raise RuntimeError(
                    "检测到本地 Prisma schema 或迁移目录与生产 migrator 不一致；拒绝 app-only 发布。"
                    "请使用 --migrator 先备份并迁移，再发布 app。"
                )
            log("  本地 schema/迁移与生产 migrator 一致，允许 app-only 发布")

        # 备份 + 切 latest（app + 可选 migrator）
        t0 = time.time()
        for tar_path, _ in tars:
            base = os.path.basename(tar_path)
            if base.startswith(APP_IMAGE):
                img = APP_IMAGE
            elif base.startswith(MIGRATOR_IMAGE):
                img = MIGRATOR_IMAGE
            else:
                continue
            prune_old_backups(cli, img, img.replace("edu-manage-", ""))
            backup = "pre-%s-backup-%s" % (tag, img.replace("edu-manage-", ""))
            code, existing_backup_id, _ = ssh_run(cli, "docker image inspect %s:%s --format '{{.Id}}'" % (img, backup))
            if code == 0 and existing_backup_id.strip():
                backups[img] = backup
                log("  保留已存在的旧版备份镜像 %s:%s" % (img, backup))
            else:
                code, old_id, _ = ssh_run(cli, "docker image inspect %s:latest --format '{{.Id}}'" % img)
                if code == 0 and old_id.strip():
                    checked_remote(cli, "docker tag %s:latest %s:%s" % (img, img, backup), "备份镜像")
                    backups[img] = backup
            checked_remote(cli, "docker tag %s:%s %s:latest" % (img, tag, img), "切换镜像标签")
            log("  %s:latest -> %s（旧版备份 %s）" % (img, tag, backup))
        steps["TAG"] = round(time.time() - t0, 1)

        expected_image_id = checked_remote(cli, "docker image inspect %s:%s --format '{{.Id}}'" % (APP_IMAGE, tag), "读取发布镜像")
        if has_migrator:
            t0 = time.time()
            checked_remote(cli, compose_command("up -d --wait --wait-timeout 120 db redis"), "等待数据库", timeout=180)
            # Use the existing production backup mechanism. Refuse migration if backup fails.
            checked_remote(cli, compose_command("exec -T app bash scripts/backup-db.sh"), "迁移前数据库备份", timeout=900)
            migration_attempted = True
            checked_remote(cli, compose_command("--profile tools run --rm --no-deps migrate"), "双库迁移", timeout=1800)
            steps["MIGRATE"] = round(time.time() - t0, 1)

        # compose 重建 app
        t0 = time.time()
        app_replaced = True
        checked_remote(cli, compose_command("up -d --no-build app"), "compose 重建", timeout=300)
        steps["COMPOSE"] = round(time.time() - t0, 1)

        # 健康检查
        t0 = time.time()
        wait_for_app(cli, expected_image_id)
        steps["HEALTH"] = round(time.time() - t0, 1)

        # 清理远端 tar
        for tar_path, _ in tars:
            ssh_run(cli, "rm -f /tmp/" + os.path.basename(tar_path))
    except Exception:
        log("  发布失败，保留远端已加载版本镜像、旧版镜像备份和本地 release 包。")
        if not migration_attempted:
            for img, backup in backups.items():
                checked_remote(cli, "docker tag %s:%s %s:latest" % (img, backup, img), "恢复旧镜像标签")
            if app_replaced and APP_IMAGE in backups:
                old_image_id = checked_remote(cli, "docker image inspect %s:latest --format '{{.Id}}'" % APP_IMAGE, "读取回滚镜像")
                checked_remote(cli, compose_command("up -d --no-build app"), "回滚 app", timeout=300)
                wait_for_app(cli, old_image_id)
                log("  已回滚旧版 app 并通过健康检查。")
        else:
            log("  已尝试数据库迁移，禁止自动降级代码/数据库；请检查双库迁移状态并使用备份人工恢复。")
        raise
    finally:
        steps["TOTAL"] = round(time.time() - t_all, 1)
        log("\n===== 部署耗时 =====")
        for k, v in steps.items():
            log("  %-40s %ss" % (k, v))
        cli.close()


def deploy_migrator_only(tars, tag, skip_upload=False):
    """发布并运行 migrator，不切换或重启 app 镜像。"""
    if not PWD:
        log("  未设置 EDU_DEPLOY_SSH_PASSWORD，脚本将尝试 SSH key/agent。")
    log(" 连接服务器 %s（仅更新 migrator）..." % HOST)
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(
        HOST,
        username=USER,
        password=PWD,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
        look_for_keys=True,
        allow_agent=True,
    )
    t_all = time.time()
    steps = {}
    backup = None
    migration_attempted = False
    try:
        for tar, digest in tars:
            base = os.path.basename(tar)
            if not base.startswith(MIGRATOR_IMAGE + "-"):
                raise RuntimeError("migrator-only 发布包中包含非 migrator 镜像: %s" % base)
            remote = "/tmp/" + base

            if skip_upload:
                local = subprocess.run(
                    ["docker", "image", "inspect", "%s:%s" % (MIGRATOR_IMAGE, tag), "--format", "{{.Id}}"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=30,
                )
                if local.returncode != 0 or not local.stdout.strip():
                    raise RuntimeError("本地预加载镜像不存在: %s:%s" % (MIGRATOR_IMAGE, tag))
                remote_id = checked_remote(
                    cli,
                    "docker image inspect %s:%s --format '{{.Id}}'" % (MIGRATOR_IMAGE, tag),
                    "校验服务器预加载镜像",
                )
                if local.stdout.strip() != remote_id:
                    raise RuntimeError("本地与服务器镜像 ID 不匹配，拒绝跳过上传: %s:%s" % (MIGRATOR_IMAGE, tag))
                log(" %s:%s 本地/服务器镜像 ID 一致，跳过上传和 docker load" % (MIGRATOR_IMAGE, tag))
            else:
                code, out, _ = ssh_run(cli, "sha256sum %s 2>/dev/null" % remote)
                existing = out.strip().split() if out.strip() else []
                if not existing or existing[0].lower() != digest.lower():
                    log(" 上传 %s（%.1f MB）..." % (base, os.path.getsize(tar) / (1024 * 1024)))
                    last_percent = [-5]

                    def report_transfer(transferred, total):
                        if total <= 0:
                            return
                        percent = int(transferred * 100 / total)
                        if percent >= 100 or percent >= last_percent[0] + 5:
                            log("  上传进度 %s%%" % min(percent, 100))
                            last_percent[0] = percent

                    sftp = cli.open_sftp()
                    sftp.put(tar, remote, callback=report_transfer)
                    sftp.close()
                else:
                    log(" %s 已存在且 sha256 匹配，跳过上传" % base)
                code, out, _ = ssh_run(cli, "sha256sum %s" % remote)
                actual = out.strip().split() if out.strip() else ["?"]
                if code != 0 or actual[0].lower() != digest.lower():
                    raise RuntimeError("服务器 sha256 校验失败: %s" % base)
                code, _, _ = ssh_run(cli, "docker load -i %s" % remote, timeout=900)
                if code != 0:
                    raise RuntimeError("docker load 失败: %s" % base)
                checked_remote(cli, "rm -f " + remote, "清理已加载的远端发布 tar", timeout=30)

        t0 = time.time()
        prune_old_backups(cli, MIGRATOR_IMAGE, "migrator")
        backup = "pre-%s-backup-migrator" % tag
        code, existing_backup_id, _ = ssh_run(
            cli, "docker image inspect %s:%s --format '{{.Id}}'" % (MIGRATOR_IMAGE, backup)
        )
        if code != 0 or not existing_backup_id.strip():
            code, old_id, _ = ssh_run(cli, "docker image inspect %s:latest --format '{{.Id}}'" % MIGRATOR_IMAGE)
            if code == 0 and old_id.strip():
                checked_remote(cli, "docker tag %s:latest %s:%s" % (MIGRATOR_IMAGE, MIGRATOR_IMAGE, backup), "备份 migrator 镜像")
            else:
                backup = None
        else:
            log("  保留已存在的旧版备份镜像 %s:%s" % (MIGRATOR_IMAGE, backup))
        checked_remote(cli, "docker tag %s:%s %s:latest" % (MIGRATOR_IMAGE, tag, MIGRATOR_IMAGE), "切换 migrator 镜像")
        steps["TAG"] = round(time.time() - t0, 1)

        t0 = time.time()
        checked_remote(cli, compose_command("up -d --wait --wait-timeout 120 db redis"), "等待数据库", timeout=180)
        checked_remote(cli, compose_command("exec -T app bash scripts/backup-db.sh"), "迁移前数据库备份", timeout=900)
        migration_attempted = True
        checked_remote(cli, compose_command("--profile tools run --rm --no-deps migrate"), "双库迁移与 schema 校验", timeout=1800)
        steps["MIGRATE_AND_VERIFY"] = round(time.time() - t0, 1)

        for tar, _ in tars:
            ssh_run(cli, "rm -f /tmp/" + os.path.basename(tar))
    except Exception:
        log("  migrator-only 发布失败；app 容器未重启，保留本地发布包和远端镜像供检查。")
        if not migration_attempted and backup:
            checked_remote(cli, "docker tag %s:%s %s:latest" % (MIGRATOR_IMAGE, backup, MIGRATOR_IMAGE), "恢复旧 migrator 标签")
        elif migration_attempted:
            log("  已尝试迁移，保留新 migrator 标签；请检查两库迁移状态与 schema 校验输出。")
        raise
    finally:
        steps["TOTAL"] = round(time.time() - t_all, 1)
        log("\n===== migrator 部署耗时 =====")
        for k, v in steps.items():
            log("  %-40s %ss" % (k, v))
        cli.close()


def main():
    ap = argparse.ArgumentParser(description="牧哲学堂唯一发布脚本（Docker 预构建发布包）")
    ap.add_argument("--tag", default=time.strftime("%Y%m%d-%H%M"))
    ap.add_argument("--migrator", action="store_true", help="同时构建并部署 migrator 镜像")
    ap.add_argument("--migrator-only", action="store_true", help="仅构建、部署并运行 migrator，不重建 app")
    ap.add_argument("--skip-build", action="store_true", help="复用 release/ 已有 tar，跳过本地构建")
    ap.add_argument("--skip-upload", action="store_true", help="仅在目标机已有同 tag 镜像时跳过上传/load；会先比较本地和服务器镜像 ID")
    ap.add_argument("--no-cache", action="store_true", help="强制全量重建（不推荐，默认走构建缓存）")
    ap.add_argument("--dry-run", action="store_true", help="只打印命令，不执行")
    args = ap.parse_args()
    if args.skip_upload and not args.skip_build:
        ap.error("--skip-upload 需要同时指定 --skip-build")
    if args.migrator_only and args.migrator:
        ap.error("--migrator-only 与 --migrator 不能同时指定")
    tag = args.tag
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}", tag):
        raise SystemExit("非法镜像 tag")

    log("=== 牧哲学堂发布 %s ===" % tag)
    if not args.skip_build:
        ensure_builder(args.dry_run)

    tars = []
    if args.migrator_only:
        if not args.skip_build:
            build_image(MIGRATOR_TARGET, MIGRATOR_IMAGE, tag, args.dry_run, no_cache=args.no_cache)
            tar, digest = export_tar(MIGRATOR_IMAGE, tag, args.dry_run)
            tars.append((tar, digest))
        else:
            tar = os.path.join(RELEASE_DIR, "%s-%s.tar" % (MIGRATOR_IMAGE, tag))
            if not os.path.exists(tar):
                raise SystemExit("--skip-build 但找不到 " + tar)
            digest = open(tar + ".sha256").read().strip()
            tars.append((tar, digest))
    elif not args.skip_build:
        secs = build_image(APP_TARGET, APP_IMAGE, tag, args.dry_run, no_cache=args.no_cache)
        if args.migrator:
            build_image(MIGRATOR_TARGET, MIGRATOR_IMAGE, tag, args.dry_run, no_cache=args.no_cache)
        tar, digest = export_tar(APP_IMAGE, tag, args.dry_run)
        tars.append((tar, digest))
        if args.migrator:
            tar2, digest2 = export_tar(MIGRATOR_IMAGE, tag, args.dry_run)
            tars.append((tar2, digest2))
    else:
        tar = os.path.join(RELEASE_DIR, "%s-%s.tar" % (APP_IMAGE, tag))
        if not os.path.exists(tar):
            raise SystemExit("--skip-build 但找不到 " + tar)
        digest = open(tar + ".sha256").read().strip()
        tars.append((tar, digest))
        if args.migrator:
            tar2 = os.path.join(RELEASE_DIR, "%s-%s.tar" % (MIGRATOR_IMAGE, tag))
            digest2 = open(tar2 + ".sha256").read().strip()
            tars.append((tar2, digest2))

    if args.dry_run:
        log("  [dry-run] 部署 tars: " + ", ".join(t for t, _ in tars))
        return
    if args.migrator_only:
        deploy_migrator_only(tars, tag, skip_upload=args.skip_upload)
    else:
        deploy_remote(tars, tag, args.dry_run, skip_upload=args.skip_upload)
    log("=== 发布完成 ===")


if __name__ == "__main__":
    main()
