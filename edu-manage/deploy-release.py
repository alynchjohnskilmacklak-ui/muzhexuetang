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
import tarfile
import time

import paramiko

# Build/deploy logs may include symbols not representable in the Windows code page.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
RELEASE_DIR = os.path.join(ROOT, "release")
HOST = "101.200.191.201"
USER = "root"
PWD = os.environ.get("EDU_DEPLOY_SSH_PASSWORD")
COMPOSE_DIR = "/opt/edu-manage-docker/source"
BUILDER = os.environ.get("MZT_BUILDER", "mzt-release")
USE_BUILDX = True
NPM_REGISTRY = "https://registry.npmjs.org"
APP_IMAGE = "edu-manage-app"
MIGRATOR_IMAGE = "edu-manage-migrator"
APP_TARGET = "runner"
MIGRATOR_TARGET = "migrator"
RELEASE_TAG_PATTERN = re.compile(r"\d{8}(?:[-_.][A-Za-z0-9][A-Za-z0-9._-]*)?")
LOGIN_BUSINESS_POSTERS = (
    "seasonal-bootcamp/1.png",
    "one-to-one/1.png",
    "evening-study/1.png",
    "weekend-pioneer/1.png",
    "zhongkao-planning/1.png",
    "gaokao-consulting/1.png",
    "single-enrollment/1.png",
    "postgraduate-public-courses/1.png",
)


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


def upload_file(cli, local_path, remote_path, timeout=3600):
    """Prefer OpenSSH's streaming SCP when key auth is available; keep SFTP fallback."""
    scp = shutil.which("scp.exe") or shutil.which("scp")
    if scp and not PWD:
        command = [
            scp,
            "-O",
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=30",
            "-o", "ServerAliveInterval=30",
            "-o", "ServerAliveCountMax=5",
            local_path,
            "%s@%s:%s" % (USER, HOST, remote_path),
        ]
        result = subprocess.run(command, timeout=timeout)
        if result.returncode != 0:
            raise RuntimeError("SCP 上传失败: %s" % os.path.basename(local_path))
        return

    sftp = cli.open_sftp()
    try:
        sftp.put(local_path, remote_path)
    finally:
        sftp.close()


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


def sync_public_home(cli, tag):
    """Update the production shared homepage that bind-mounts over image public/home.html."""
    local_path = os.path.join(ROOT, "public", "home.html")
    if not os.path.isfile(local_path):
        raise RuntimeError("本地首页文件不存在: %s" % local_path)

    remote_dir = "/srv/edu-manage/shared/public"
    remote_target = remote_dir + "/home.html"
    mount_check = (
        "grep -Fq "
        + shlex.quote(remote_target + ":/app/public/home.html")
        + " "
        + shlex.quote(COMPOSE_DIR + "/compose.production.yaml")
    )
    checked_remote(cli, mount_check, "确认生产首页静态文件挂载")
    suffix = "%s-%s-%s" % (tag, time.strftime("%Y%m%d-%H%M%S"), os.getpid())
    remote_tmp = remote_target + ".upload-" + suffix
    remote_backup = remote_target + ".pre-" + suffix
    expected_digest = hashlib.sha256(Path(local_path).read_bytes()).hexdigest()

    sftp = cli.open_sftp()
    try:
        sftp.put(local_path, remote_tmp)
        remote_size = sftp.stat(remote_tmp).st_size
    finally:
        sftp.close()

    local_size = os.path.getsize(local_path)
    if remote_size != local_size:
        ssh_run(cli, "rm -f %s" % shlex.quote(remote_tmp), timeout=30)
        raise RuntimeError("线上首页上传大小不一致，本地=%s 线上=%s" % (local_size, remote_size))

    command = (
        "set -e; test -d {directory}; test -f {target}; "
        "cp -p {target} {backup}; "
        "chown --reference={target} {temporary}; "
        "chmod --reference={target} {temporary}; "
        "mv -f {temporary} {target}; "
        "sha256sum {target} | awk '{{print $1}}'"
    ).format(
        directory=shlex.quote(remote_dir),
        target=shlex.quote(remote_target),
        backup=shlex.quote(remote_backup),
        temporary=shlex.quote(remote_tmp),
    )
    actual_digest = checked_remote(cli, command, "原子更新生产首页静态文件", timeout=60)
    if actual_digest.lower() != expected_digest.lower():
        raise RuntimeError("生产首页 sha256 校验失败: %s" % actual_digest)
    log("  生产首页已同步并校验（%s bytes），旧文件备份：%s" % (local_size, remote_backup))


def sync_login_business_posters(cli, tag):
    """Sync login carousel posters into the persistent public/services mount."""
    remote_root = "/srv/edu-manage/shared/public/services"
    mount_check = (
        "grep -Fq "
        + shlex.quote(remote_root + ":/app/public/services")
        + " "
        + shlex.quote(COMPOSE_DIR + "/compose.production.yaml")
    )

    assets = []
    for relative_path in LOGIN_BUSINESS_POSTERS:
        local_path = os.path.join(ROOT, "public", "services", *relative_path.split("/"))
        if not os.path.isfile(local_path):
            raise RuntimeError("本地业务总览海报不存在: %s" % local_path)
        assets.append((relative_path, local_path, sha256_file(local_path)))

    checked_remote(cli, mount_check, "确认业务海报共享目录挂载")
    remote_dirs = sorted({remote_root + "/" + relative.rsplit("/", 1)[0] for relative, _, _ in assets})
    checked_remote(
        cli,
        "mkdir -p " + " ".join(shlex.quote(path) for path in remote_dirs),
        "准备业务海报共享目录",
        timeout=60,
    )

    suffix = "%s-%s-%s" % (tag, time.strftime("%Y%m%d-%H%M%S"), os.getpid())
    updated = 0
    unchanged = 0
    for relative_path, local_path, expected_digest in assets:
        remote_target = remote_root + "/" + relative_path
        code, remote_digest, _ = ssh_run(
            cli,
            "if test -f {target}; then sha256sum {target} | awk '{{print $1}}'; else exit 44; fi".format(
                target=shlex.quote(remote_target),
            ),
            timeout=30,
        )
        if code == 0 and remote_digest.strip().lower() == expected_digest.lower():
            unchanged += 1
            continue

        remote_tmp = remote_target + ".upload-" + suffix
        remote_backup = remote_target + ".pre-" + suffix
        local_size = os.path.getsize(local_path)
        try:
            sftp = cli.open_sftp()
            try:
                sftp.put(local_path, remote_tmp)
                remote_size = sftp.stat(remote_tmp).st_size
            finally:
                sftp.close()

            if remote_size != local_size:
                raise RuntimeError("线上业务海报上传大小不一致: %s（本地=%s，线上=%s）" % (
                    relative_path, local_size, remote_size,
                ))

            command = (
                "set -e; actual=$(sha256sum {temporary} | awk '{{print $1}}'); "
                "test \"$actual\" = {digest}; "
                "if test -f {target}; then cp -p {target} {backup}; "
                "chown --reference={target} {temporary}; chmod --reference={target} {temporary}; "
                "else chown 1000:1000 {temporary}; chmod 644 {temporary}; fi; "
                "mv -f {temporary} {target}; sha256sum {target} | awk '{{print $1}}'"
            ).format(
                temporary=shlex.quote(remote_tmp),
                digest=shlex.quote(expected_digest),
                target=shlex.quote(remote_target),
                backup=shlex.quote(remote_backup),
            )
            actual_digest = checked_remote(cli, command, "原子更新业务总览海报", timeout=60)
            if actual_digest.lower() != expected_digest.lower():
                restore = (
                    "if test -f {backup}; then mv -f {backup} {target}; "
                    "else rm -f {target}; fi"
                ).format(backup=shlex.quote(remote_backup), target=shlex.quote(remote_target))
                ssh_run(cli, restore, timeout=30)
                raise RuntimeError("线上业务海报 sha256 校验失败: %s" % relative_path)
            updated += 1
        except Exception:
            ssh_run(cli, "rm -f %s" % shlex.quote(remote_tmp), timeout=30)
            raise

    log("  业务总览海报已核对：更新 %s 张，校验相同跳过 %s 张" % (updated, unchanged))


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


def prune_old_backups(cli, image, img_type, keep_tag, timeout=300):
    """Keep the backup created for this release and remove older backup tags."""
    if not keep_tag:
        return
    code, out, _ = ssh_run(cli, "docker images %s --format '{{.Tag}}'" % image, timeout=timeout)
    if code != 0:
        return
    tags = sorted(
        t.strip()
        for t in out.splitlines()
        if t.strip().startswith("pre-") and t.strip().endswith("-backup-%s" % img_type)
    )
    for old in tags:
        if old == keep_tag:
            continue
        try:
            checked_remote(cli, "docker rmi %s:%s" % (image, old), "清理旧备份 %s" % old, timeout=timeout)
            log("  已清理旧备份 %s:%s" % (image, old))
        except RuntimeError:
            log("  清理旧备份 %s:%s 失败（仍被引用，留待下次部署）" % (image, old))


def prune_remote_release_images(cli, image, img_type, current_tag, backup_tag=None, timeout=300):
    """Keep latest/current plus one rollback image; leave BuildKit cache untouched."""
    if backup_tag:
        prune_old_backups(cli, image, img_type, backup_tag, timeout=timeout)
    code, out, _ = ssh_run(cli, "docker images %s --format '{{.Tag}}'" % image, timeout=timeout)
    if code == 0:
        keep = {"latest", current_tag}
        if backup_tag:
            keep.add(backup_tag)
        for old in sorted({line.strip() for line in out.splitlines()}):
            if old in keep or not RELEASE_TAG_PATTERN.fullmatch(old):
                continue
            try:
                checked_remote(cli, "docker rmi %s:%s" % (image, old), "清理旧发布镜像标签", timeout=timeout)
                log("  已清理旧发布标签 %s:%s" % (image, old))
            except RuntimeError:
                log("  旧发布标签 %s:%s 仍被容器引用，保留" % (image, old))
    else:
        log("  无法读取 %s 镜像标签，跳过旧发布标签清理" % image)
    try:
        checked_remote(cli, "docker image prune -f", "清理未引用的悬空镜像", timeout=timeout)
    except RuntimeError:
        log("  悬空镜像清理失败；应用已通过健康检查，保留现有镜像")


def prune_local_release_images(image, current_tag=None):
    """Retain the active local image and BuildKit cache; remove stale release tags."""
    try:
        if current_tag:
            tagged = subprocess.run(
                ["docker", "image", "tag", "%s:%s" % (image, current_tag), "%s:latest" % image],
                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
            )
            if tagged.returncode != 0:
                log("  本地 %s:%s 不存在，跳过 latest 对齐和镜像清理" % (image, current_tag))
                return

        listed = subprocess.run(
            ["docker", "image", "ls", image, "--format", "{{.Tag}}"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
        )
        if listed.returncode != 0:
            log("  无法读取本地 %s 镜像标签，跳过清理" % image)
            return

        tags = {line.strip() for line in listed.stdout.splitlines() if line.strip()}
        keep = {"latest"}
        if current_tag:
            keep.add(current_tag)
        elif "latest" not in tags:
            version_tags = sorted(tag for tag in tags if RELEASE_TAG_PATTERN.fullmatch(tag))
            if version_tags:
                keep.add(version_tags[-1])

        for old in sorted(tags):
            if old in keep or not RELEASE_TAG_PATTERN.fullmatch(old):
                continue
            removed = subprocess.run(
                ["docker", "image", "rm", "%s:%s" % (image, old)],
                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
            )
            if removed.returncode == 0:
                log("  已清理本地旧发布标签 %s:%s" % (image, old))
            else:
                log("  本地旧发布标签 %s:%s 仍被容器引用，保留" % (image, old))

        pruned = subprocess.run(
            ["docker", "image", "prune", "-f"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120,
        )
        if pruned.returncode == 0 and pruned.stdout.strip():
            log("  本地悬空镜像清理完成：" + pruned.stdout.strip()[-240:])
        elif pruned.returncode != 0:
            log("  本地悬空镜像清理失败；BuildKit 构建缓存未清理")
    except (OSError, subprocess.TimeoutExpired) as error:
        log("  本地镜像清理未完成（%s）；不影响已部署版本" % error)


def prune_local_release_archives(image, keep_tag=None):
    """Keep one reusable release archive per image type after a successful deploy."""
    release_dir = Path(RELEASE_DIR)
    candidates = []
    for archive in release_dir.glob("%s-*.tar" % image):
        tag = archive.name[len(image) + 1:-4]
        if RELEASE_TAG_PATTERN.fullmatch(tag):
            candidates.append((tag, archive))
    if not candidates:
        return
    if keep_tag is None:
        keep_tag = max(tag for tag, _ in candidates)
    for tag, archive in candidates:
        if tag == keep_tag:
            continue
        try:
            archive.unlink(missing_ok=True)
            Path(str(archive) + ".sha256").unlink(missing_ok=True)
            log("  已清理本地旧发布包 %s" % archive.name)
        except OSError as error:
            log("  本地旧发布包 %s 清理失败（%s）" % (archive.name, error))


def ensure_builder(dry_run):
    global USE_BUILDX
    if dry_run:
        return
    try:
        run_local("docker buildx version")
        USE_BUILDX = True
        return
    except RuntimeError:
        USE_BUILDX = False
        log("  ⚠ docker buildx 插件不可用，回退 Docker Desktop 内建构建（docker build）")
        return


def build_image(target, image, tag, dry_run, no_cache=False):
    if USE_BUILDX:
        cmd = (
            'docker buildx build --progress=plain --load --builder %s --target %s '
            '%s--build-arg NPM_REGISTRY=%s -t %s:%s .'
            % (BUILDER, target, '--no-cache ' if no_cache else '', NPM_REGISTRY, image, tag)
        )
    else:
        # Docker Desktop 内建构建（legacy builder）：不支持 --progress/--load，默认产出本地镜像
        cmd = (
            'docker build --target %s '
            '%s--build-arg NPM_REGISTRY=%s -t %s:%s .'
            % (target, '--no-cache ' if no_cache else '', NPM_REGISTRY, image, tag)
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


def export_migration_bundle(tag, dry_run):
    """Package only Prisma schema/migrations for the existing remote migrator image."""
    archive = os.path.join(RELEASE_DIR, "edu-manage-migrations-%s.tar.gz" % tag)
    if dry_run:
        log("  [dry-run] package prisma/schema.prisma, prisma/migrations, scripts/migrate-all.sh -> %s" % archive)
        return archive, "0" * 64

    os.makedirs(RELEASE_DIR, exist_ok=True)
    with tarfile.open(archive, "w:gz", compresslevel=6) as bundle:
        bundle.add(os.path.join(ROOT, "prisma", "schema.prisma"), arcname="prisma/schema.prisma")
        bundle.add(os.path.join(ROOT, "prisma", "migrations"), arcname="prisma/migrations")
        bundle.add(os.path.join(ROOT, "scripts", "migrate-all.sh"), arcname="scripts/migrate-all.sh")
    digest = sha256_file(archive)
    Path(archive + ".sha256").write_text(digest + "\n", encoding="ascii")
    log("  迁移文件包 %.1fKB（sha256=%s…%s）" % (os.path.getsize(archive) / 1024, digest[:16], digest[-6:]))
    return archive, digest


def local_image_id(image, tag):
    """返回本地镜像 ID（不含 sha256: 前缀），不存在返回 None。"""
    code, out, _ = run_local_capture(
        "docker image inspect %s:%s --format '{{.Id}}'" % (image, tag),
        timeout=30,
    )
    if code != 0 or not out.strip():
        return None
    return out.strip().replace("sha256:", "")


def run_local_capture(cmd, timeout=120):
    import subprocess as _sp
    p = _sp.run(
        cmd.split() if not isinstance(cmd, list) else cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    return p.returncode, p.stdout, p.stderr


def deploy_remote(tars, tag, dry_run, skip_upload=False, migration_bundle=None):
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
        try:
            checked_remote(cli, "docker image prune -f", "发布前清理未引用的悬空镜像", timeout=300)
        except RuntimeError:
            log("  发布前悬空镜像清理失败，继续由镜像加载检查磁盘空间")

        if migration_bundle:
            bundle_path, bundle_digest = migration_bundle
            bundle_name = os.path.basename(bundle_path)
            remote_bundle = "/tmp/" + bundle_name
            bundle_dir = "/tmp/edu-manage-migrations-" + tag

            code, out, _ = ssh_run(cli, "sha256sum %s 2>/dev/null" % shlex.quote(remote_bundle))
            existing = out.strip().split() if out.strip() else []
            if not existing or existing[0].lower() != bundle_digest.lower():
                log(" 上传迁移文件包（%.1f KB）..." % (os.path.getsize(bundle_path) / 1024))
                upload_file(cli, bundle_path, remote_bundle, timeout=300)
            code, out, _ = ssh_run(cli, "sha256sum %s" % shlex.quote(remote_bundle))
            actual = out.strip().split() if out.strip() else [""]
            if code != 0 or actual[0].lower() != bundle_digest.lower():
                raise RuntimeError("服务器迁移文件包 sha256 校验失败")

            extract = "mkdir -p {directory} && tar -xzf {archive} -C {directory} && test -f {schema} && test -f {script}".format(
                directory=shlex.quote(bundle_dir),
                archive=shlex.quote(remote_bundle),
                schema=shlex.quote(bundle_dir + "/prisma/schema.prisma"),
                script=shlex.quote(bundle_dir + "/scripts/migrate-all.sh"),
            )
            checked_remote(cli, extract, "解包并校验 Prisma 迁移文件", timeout=60)

            t0 = time.time()
            checked_remote(cli, compose_command("up -d --wait --wait-timeout 120 db redis"), "等待数据库", timeout=180)
            checked_remote(cli, compose_command("exec -T app bash scripts/backup-db.sh"), "迁移前数据库备份", timeout=900)
            mounted_migrate = (
                "--profile tools run --rm --no-deps "
                "-v {prisma}:/app/prisma:ro -v {script}:/app/scripts/migrate-all.sh:ro migrate"
            ).format(
                prisma=shlex.quote(bundle_dir + "/prisma"),
                script=shlex.quote(bundle_dir + "/scripts/migrate-all.sh"),
            )
            migration_attempted = True
            checked_remote(cli, compose_command(mounted_migrate), "双库迁移与 schema 校验", timeout=1800)
            steps["MIGRATE_AND_VERIFY"] = round(time.time() - t0, 1)
            checked_remote(
                cli,
                "rm -rf %s && rm -f %s" % (shlex.quote(bundle_dir), shlex.quote(remote_bundle)),
                "清理临时迁移文件包",
                timeout=30,
            )

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
                log(" 上传 %s（%.1f MB）..." % (os.path.basename(tar), os.path.getsize(tar) / 1048576))
                upload_file(cli, tar, remote)
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

        if not has_migrator and not migration_bundle:
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
        elif migration_bundle:
            log("  已由现有 migrator 挂载本次 schema/迁移并完成双库一致性校验")

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

        sync_public_home(cli, tag)
        sync_login_business_posters(cli, tag)

        # compose 重建 app
        t0 = time.time()
        app_replaced = True
        checked_remote(cli, compose_command("up -d --no-build app"), "compose 重建", timeout=300)
        steps["COMPOSE"] = round(time.time() - t0, 1)

        # 健康检查
        t0 = time.time()
        wait_for_app(cli, expected_image_id)
        steps["HEALTH"] = round(time.time() - t0, 1)

        for tar_path, _ in tars:
            base = os.path.basename(tar_path)
            if base.startswith(APP_IMAGE + "-"):
                image = APP_IMAGE
                img_type = "app"
            elif base.startswith(MIGRATOR_IMAGE + "-"):
                image = MIGRATOR_IMAGE
                img_type = "migrator"
            else:
                continue
            prune_remote_release_images(
                cli,
                image,
                img_type,
                tag,
                backup_tag=backups.get(image),
            )

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
        try:
            checked_remote(cli, "docker image prune -f", "发布前清理未引用的悬空镜像", timeout=300)
        except RuntimeError:
            log("  发布前悬空镜像清理失败，继续由镜像加载检查磁盘空间")

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

        prune_remote_release_images(
            cli,
            MIGRATOR_IMAGE,
            "migrator",
            tag,
            backup_tag=backup,
        )

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
    ap.add_argument("--migration-bundle", action="store_true", help="复用服务器 migrator，只上传 schema/迁移文件包并校验双库后发布 app")
    ap.add_argument("--skip-build", action="store_true", help="复用 release/ 已有 tar，跳过本地构建")
    ap.add_argument("--skip-upload", action="store_true", help="仅在目标机已有同 tag 镜像时跳过上传/load；会先比较本地和服务器镜像 ID")
    ap.add_argument("--no-cache", action="store_true", help="强制全量重建（不推荐，默认走构建缓存）")
    ap.add_argument("--auto", action="store_true", help="自动复用：本地镜像已存在且服务器同 tag 镜像 ID 一致时跳过构建/导出/上传，仅做标签切换、迁移与重启；任一不一致则自动全量构建发布")
    ap.add_argument("--dry-run", action="store_true", help="只打印命令，不执行")
    args = ap.parse_args()

    if args.auto:
        images = [APP_IMAGE] + ([MIGRATOR_IMAGE] if (args.migrator or args.migrator_only) else [])
        local_ids = {i: local_image_id(i, args.tag) for i in images}
        missing = [i for i in images if not local_ids[i]]
        if missing:
            log("  [auto] 本地缺镜像 %s，将执行构建" % ", ".join(missing))
            args.skip_build = False
        else:
            log("  [auto] 本地镜像已存在（%s），跳过构建" % ", ".join(images))
            args.skip_build = True
            if args.dry_run:
                log("  [auto][dry-run] 跳过服务器镜像探测，将走上传路径")
            else:
                try:
                    probe = paramiko.SSHClient()
                    probe.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    probe.connect(HOST, username=USER, password=PWD, timeout=20, banner_timeout=20, auth_timeout=20,
                                  look_for_keys=True, allow_agent=True)
                    remote_diffs = []
                    for i in images:
                        code, rid, _ = ssh_run(
                            probe, "docker image inspect %s:%s --format '{{.Id}}'" % (i, args.tag), timeout=20
                        )
                        rid = rid.strip().replace("sha256:", "") if code == 0 else ""
                        if not rid:
                            remote_diffs.append(i)
                            continue
                        if rid != local_ids[i]:
                            remote_diffs.append(i)
                    probe.close()
                    if not remote_diffs:
                        args.skip_upload = True
                        log("  [auto] 服务器同 tag 镜像 ID 全部一致，跳过上传/load")
                    else:
                        log("  [auto] 服务器镜像与本地不一致（%s），将执行上传" % ", ".join(remote_diffs))
                except Exception as e:
                    log("  [auto] 服务器镜像探测失败（%s），将执行上传" % e)

    if args.skip_upload and not args.skip_build:
        ap.error("--skip-upload 需要同时指定 --skip-build")
    if args.migrator_only and args.migrator:
        ap.error("--migrator-only 与 --migrator 不能同时指定")
    if args.migration_bundle and (args.migrator or args.migrator_only):
        ap.error("--migration-bundle 与 --migrator/--migrator-only 不能同时指定")
    tag = args.tag
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}", tag):
        raise SystemExit("非法镜像 tag")

    log("=== 牧哲学堂发布 %s ===" % tag)
    if not args.skip_build:
        ensure_builder(args.dry_run)

    tars = []
    migration_bundle = None
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
            if args.auto and local_image_id(APP_IMAGE, tag):
                log("  [auto] 发布 tar 缺失但本地镜像存在，重新导出 %s" % os.path.basename(tar))
                tar, digest = export_tar(APP_IMAGE, tag, args.dry_run)
                tars.append((tar, digest))
            else:
                raise SystemExit("--skip-build 但找不到 " + tar)
        else:
            digest = open(tar + ".sha256").read().strip()
            tars.append((tar, digest))
        if args.migrator:
            tar2 = os.path.join(RELEASE_DIR, "%s-%s.tar" % (MIGRATOR_IMAGE, tag))
            if not os.path.exists(tar2):
                if args.auto and local_image_id(MIGRATOR_IMAGE, tag):
                    log("  [auto] 发布 tar 缺失但本地镜像存在，重新导出 %s" % os.path.basename(tar2))
                    tar2, digest2 = export_tar(MIGRATOR_IMAGE, tag, args.dry_run)
                    tars.append((tar2, digest2))
                else:
                    raise SystemExit("--skip-build 但找不到 " + tar2)
            else:
                digest2 = open(tar2 + ".sha256").read().strip()
                tars.append((tar2, digest2))

    if args.migration_bundle:
        migration_bundle = export_migration_bundle(tag, args.dry_run)

    if args.dry_run:
        log("  [dry-run] 部署 tars: " + ", ".join(t for t, _ in tars))
        if migration_bundle:
            log("  [dry-run] 使用迁移文件包: " + migration_bundle[0])
        return
    if args.migrator_only:
        deploy_migrator_only(tars, tag, skip_upload=args.skip_upload)
        prune_local_release_images(MIGRATOR_IMAGE, tag)
        prune_local_release_archives(MIGRATOR_IMAGE, tag)
    else:
        deploy_remote(tars, tag, args.dry_run, skip_upload=args.skip_upload, migration_bundle=migration_bundle)
        prune_local_release_images(APP_IMAGE, tag)
        prune_local_release_images(MIGRATOR_IMAGE, tag if args.migrator else None)
        prune_local_release_archives(APP_IMAGE, tag)
        prune_local_release_archives(MIGRATOR_IMAGE, tag if args.migrator else None)
    log("=== 发布完成 ===")


if __name__ == "__main__":
    main()
