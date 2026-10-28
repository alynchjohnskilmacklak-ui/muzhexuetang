#!/usr/bin/env bash
# Deploy a locally prebuilt Linux release without installing or building on the
# production server. Releases are immutable; environment, uploads and
# server-managed assets live under shared/ and survive every deployment.
#
# Usage:
#   cd /opt/edu-manage
#   bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-YYYYMMDD-HHMM.tar.gz
set -Eeuo pipefail

APP_NAME="${APP_NAME:-edu-manage}"
PORT="${PORT:-3000}"
CANDIDATE_PORT="${CANDIDATE_PORT:-3100}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
TAR_FILE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="${DEPLOY_ROOT:-$(dirname "$SCRIPT_DIR")}"
RELEASES_DIR="$ROOT_DIR/releases"
SHARED_DIR="$ROOT_DIR/shared"
SHARED_PUBLIC="$SHARED_DIR/public"
SHARED_ENV="$SHARED_DIR/.env"
CURRENT_LINK="$ROOT_DIR/current"
CANDIDATE_PID=""

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

cleanup_candidate() {
  if [ -n "$CANDIDATE_PID" ]; then
    kill "$CANDIDATE_PID" 2>/dev/null || true
    wait "$CANDIDATE_PID" 2>/dev/null || true
    CANDIDATE_PID=""
  fi
}
trap cleanup_candidate EXIT

read_env() {
  local key="$1"
  local line=""
  [ -f "$SHARED_ENV" ] || return 0
  line="$(grep -E "^${key}=" "$SHARED_ENV" | tail -1 || true)"
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "服务器缺少命令: $1"
}

health_check() {
  local url="$1"
  local attempts="${2:-20}"
  local i
  for i in $(seq 1 "$attempts"); do
    if curl -fsS --max-time 5 -o /dev/null "$url"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

safe_release_path() {
  case "$1" in
    "$RELEASES_DIR"/*) return 0 ;;
    *) die "拒绝操作 releases 目录以外的路径: $1" ;;
  esac
}

[ -n "$TAR_FILE" ] || die "用法: bash scripts/deploy-prebuilt-tar.sh /path/to/edu-manage-runtime-xxx.tar.gz"
[ -f "$TAR_FILE" ] || die "找不到安装包: $TAR_FILE"
[ "$ROOT_DIR" != "/" ] || die "DEPLOY_ROOT 不能是根目录"

for cmd in tar gzip sha256sum node pm2 curl openssl pg_dump psql awk sed grep df du install find sort readlink; do
  require_command "$cmd"
done

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[ "$NODE_MAJOR" -ge 22 ] || die "需要 Node.js 22 或更高版本，当前: $(node -v)"

mkdir -p "$RELEASES_DIR" "$SHARED_PUBLIC" "$ROOT_DIR/scripts"

log "校验压缩包完整性"
tar -tzf "$TAR_FILE" >/dev/null || die "压缩包损坏或不是 tar.gz"
if tar -tzf "$TAR_FILE" | awk '
  /^\// { bad=1 }
  /(^|\/)\.\.($|\/)/ { bad=1 }
  END { exit bad ? 0 : 1 }
'; then
  die "压缩包包含不安全路径"
fi

SHA_FILE="${TAR_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  EXPECTED_SHA="$(awk 'NR==1 {print tolower($1)}' "$SHA_FILE")"
  ACTUAL_SHA="$(sha256sum "$TAR_FILE" | awk '{print tolower($1)}')"
  [ "$EXPECTED_SHA" = "$ACTUAL_SHA" ] || die "SHA256 校验失败"
  log "SHA256 校验通过: $ACTUAL_SHA"
else
  log "WARN: 未找到 ${SHA_FILE}，仅执行 tar 完整性检查"
fi

PACKAGE_KB="$(du -k "$TAR_FILE" | awk '{print $1}')"
AVAILABLE_KB="$(df -Pk "$ROOT_DIR" | awk 'NR==2 {print $4}')"
REQUIRED_KB=$((PACKAGE_KB * 5 + 1048576))
[ "$AVAILABLE_KB" -ge "$REQUIRED_KB" ] || die "磁盘空间不足：至少需要约 $((REQUIRED_KB / 1024)) MB"

if [ ! -f "$SHARED_ENV" ]; then
  if [ -f "$ROOT_DIR/.env" ]; then
    cp -a "$ROOT_DIR/.env" "$SHARED_ENV"
  elif [ -L "$CURRENT_LINK" ] && [ -f "$CURRENT_LINK/.env" ]; then
    cp -aL "$CURRENT_LINK/.env" "$SHARED_ENV"
  else
    die "缺少生产环境配置。请先创建 $SHARED_ENV"
  fi
  chmod 600 "$SHARED_ENV"
  log "已初始化共享 .env"
fi

AUTH_SECRET_VALUE="$(read_env AUTH_SECRET)"
AUTH_URL_VALUE="$(read_env NEXTAUTH_URL)"
[ -n "$AUTH_URL_VALUE" ] || AUTH_URL_VALUE="$(read_env AUTH_URL)"
DUAL_DB_VALUE="$(read_env DUAL_DB)"
[ "${#AUTH_SECRET_VALUE}" -ge 32 ] || die "AUTH_SECRET 未配置或长度不足 32 位"
[ -n "$AUTH_URL_VALUE" ] || die "NEXTAUTH_URL/AUTH_URL 未配置"
case "$AUTH_URL_VALUE" in
  https://*) ;;
  *) die "NEXTAUTH_URL 必须使用公网 HTTPS 地址" ;;
esac
JUNIOR_DB_URL="$(read_env DATABASE_URL_JUNIOR)"
SENIOR_DB_URL="$(read_env DATABASE_URL_SENIOR)"
[ -n "$JUNIOR_DB_URL" ] || die "DATABASE_URL_JUNIOR 未配置（应用生产安全检查要求）"
[ -n "$SENIOR_DB_URL" ] || die "DATABASE_URL_SENIOR 未配置（应用生产安全检查要求）"
if [ "$DUAL_DB_VALUE" = "true" ]; then
  :
else
  PRIMARY_DB_URL="$(read_env DATABASE_URL)"
  [ -n "$PRIMARY_DB_URL" ] || die "DATABASE_URL 未配置"
fi

check_database_tools() {
  local label="$1"
  local url="${2%%\?*}"
  local server_num=""
  local server_major=""
  local dump_major=""
  server_num="$(psql "$url" -Atqc 'SHOW server_version_num' 2>/dev/null)" || die "无法连接 $label 数据库执行部署预检"
  server_major=$((server_num / 10000))
  dump_major="$(pg_dump --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')"
  [ "$dump_major" -ge "$server_major" ] || die "pg_dump 主版本 $dump_major 低于 $label 数据库版本 $server_major，请先升级 postgresql-client"
}

if [ "$DUAL_DB_VALUE" = "true" ]; then
  check_database_tools "JUNIOR" "$JUNIOR_DB_URL"
  check_database_tools "SENIOR" "$SENIOR_DB_URL"
else
  check_database_tools "DATABASE_URL" "$PRIMARY_DB_URL"
fi

PACKAGE_NAME="$(basename "$TAR_FILE")"
RELEASE_ID="$(printf '%s' "$PACKAGE_NAME" | sed -E 's/^edu-manage-runtime-//; s/\.tar\.gz$//; s/\.tgz$//; s/[^A-Za-z0-9._-]/-/g')"
[ -n "$RELEASE_ID" ] || RELEASE_ID="$(date '+%Y%m%d-%H%M%S')"
STAGING_DIR="$RELEASES_DIR/.staging-${RELEASE_ID}-$$"
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"
if [ -e "$NEW_RELEASE" ]; then
  NEW_RELEASE="$RELEASES_DIR/${RELEASE_ID}-$(date '+%H%M%S')"
fi
safe_release_path "$STAGING_DIR"
safe_release_path "$NEW_RELEASE"
mkdir -p "$STAGING_DIR"

log "解压到新版本暂存目录: $STAGING_DIR"
tar -xzf "$TAR_FILE" -C "$STAGING_DIR"
for required in server.js release-manifest.json scripts/backup-db.sh scripts/migrate-all.sh scripts/deploy-prebuilt-tar.sh .deploy-tools/node_modules/.bin/prisma; do
  [ -e "$STAGING_DIR/$required" ] || die "安装包缺少: $required"
done
[ -d "$STAGING_DIR/.next/static" ] || die "安装包缺少 .next/static"
mv "$STAGING_DIR" "$NEW_RELEASE"
log "新版本目录: $NEW_RELEASE"

OLD_RELEASE=""
if [ -L "$CURRENT_LINK" ]; then
  OLD_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"
fi

seed_shared_dir() {
  local relative="$1"
  local destination="$SHARED_PUBLIC/$relative"
  local candidate=""
  if [ -d "$destination" ]; then
    return 0
  fi
  mkdir -p "$destination"
  if [ -n "$OLD_RELEASE" ] && [ -d "$OLD_RELEASE/public/$relative" ]; then
    cp -a "$OLD_RELEASE/public/$relative/." "$destination/"
    log "已迁移共享资源: public/$relative"
    return 0
  fi
  for candidate in "$ROOT_DIR/public/$relative" "$NEW_RELEASE/public/$relative"; do
    if [ -d "$candidate" ]; then
      cp -a "$candidate/." "$destination/"
      log "已迁移共享资源: public/$relative"
      return 0
    fi
  done
}

# These directories are production data, not release artifacts.
for persistent in uploads services marketing business-assets volunteer/docs; do
  seed_shared_dir "$persistent"
done

link_shared_dir() {
  local relative="$1"
  local destination="$NEW_RELEASE/public/$relative"
  rm -rf "$destination"
  mkdir -p "$(dirname "$destination")"
  ln -s "$SHARED_PUBLIC/$relative" "$destination"
}

mkdir -p "$NEW_RELEASE/public"
for persistent in uploads services marketing business-assets volunteer/docs; do
  link_shared_dir "$persistent"
done
ln -sfn "$SHARED_ENV" "$NEW_RELEASE/.env"

UPLOAD_DIR_VALUE="$(read_env UPLOAD_DIR)"
if [ -n "$UPLOAD_DIR_VALUE" ] && [ ! -d "$UPLOAD_DIR_VALUE" ]; then
  die "UPLOAD_DIR 指向的目录不存在: $UPLOAD_DIR_VALUE"
fi

log "部署前备份数据库"
BACKUP_DIR_VALUE="$(read_env BACKUP_DIR)"
BACKUP_KEEP_DAYS_VALUE="$(read_env BACKUP_KEEP_DAYS)"
OSSUTIL_BUCKET_VALUE="$(read_env OSSUTIL_BUCKET)"
RSYNC_REMOTE_VALUE="$(read_env RSYNC_REMOTE)"
(
  cd "$NEW_RELEASE"
  BACKUP_DIR="${BACKUP_DIR_VALUE:-/data/backups/edu-manage}" \
    BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS_VALUE:-14}" \
    OSSUTIL_BUCKET="$OSSUTIL_BUCKET_VALUE" \
    RSYNC_REMOTE="$RSYNC_REMOTE_VALUE" \
    bash scripts/backup-db.sh
)

log "执行 Prisma 迁移"
(
  cd "$NEW_RELEASE"
  PRISMA_CLI="$NEW_RELEASE/.deploy-tools/node_modules/.bin/prisma" \
    SKIP_PRISMA_GENERATE=1 \
    bash scripts/migrate-all.sh
)

log "使用临时端口 $CANDIDATE_PORT 启动候选版本"
CANDIDATE_LOG="$NEW_RELEASE/candidate.log"
(
  cd "$NEW_RELEASE"
  PORT="$CANDIDATE_PORT" HOSTNAME=127.0.0.1 \
    node --env-file="$SHARED_ENV" server.js >"$CANDIDATE_LOG" 2>&1
) &
CANDIDATE_PID="$!"
if ! health_check "http://127.0.0.1:${CANDIDATE_PORT}/login" 30; then
  tail -50 "$CANDIDATE_LOG" >&2 || true
  die "候选版本健康检查失败；旧版本未停止"
fi
cleanup_candidate
log "候选版本健康检查通过"

# Preserve the legacy process table so the first versioned deployment can
# recover even when there is no previous current symlink yet.
pm2 save --force >/dev/null 2>&1 || true

NEXT_LINK="$ROOT_DIR/.current-next-$$"
ln -s "$NEW_RELEASE" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"

log "切换正式进程到 $NEW_RELEASE"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
if ! PORT="$PORT" HOSTNAME=0.0.0.0 pm2 start node --name "$APP_NAME" --cwd "$NEW_RELEASE" -- --env-file="$SHARED_ENV" server.js; then
  START_FAILED=1
else
  START_FAILED=0
fi

if [ "$START_FAILED" -ne 0 ] || ! health_check "http://127.0.0.1:${PORT}/login" 30; then
  log "ERROR: 新版本正式健康检查失败，开始恢复旧版本"
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  if [ -n "$OLD_RELEASE" ] && [ -f "$OLD_RELEASE/server.js" ]; then
    ln -sfn "$OLD_RELEASE" "$CURRENT_LINK"
    PORT="$PORT" HOSTNAME=0.0.0.0 pm2 start node --name "$APP_NAME" --cwd "$OLD_RELEASE" -- --env-file="$SHARED_ENV" server.js
  else
    rm -f "$CURRENT_LINK"
    pm2 resurrect
  fi
  pm2 save --force >/dev/null 2>&1 || true
  die "部署失败，程序已尝试恢复旧版本；数据库迁移不会自动回退"
fi

pm2 save --force >/dev/null
install -m 755 "$NEW_RELEASE/scripts/deploy-prebuilt-tar.sh" "$ROOT_DIR/scripts/deploy-prebuilt-tar.sh"
install -m 755 "$NEW_RELEASE/scripts/backup-db.sh" "$ROOT_DIR/scripts/backup-db.sh"

log "清理过旧版本（保留最近 $KEEP_RELEASES 个）"
mapfile -t RELEASE_DIRS < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.staging-*' -printf '%T@ %p\n' | sort -rn | awk '{print $2}')
if [ "${#RELEASE_DIRS[@]}" -gt "$KEEP_RELEASES" ]; then
  for old_dir in "${RELEASE_DIRS[@]:$KEEP_RELEASES}"; do
    [ "$old_dir" = "$NEW_RELEASE" ] && continue
    [ -n "$OLD_RELEASE" ] && [ "$old_dir" = "$OLD_RELEASE" ] && continue
    safe_release_path "$old_dir"
    rm -rf "$old_dir"
  done
fi

log "部署完成"
log "当前版本: $(readlink -f "$CURRENT_LINK")"
log "健康检查: http://127.0.0.1:${PORT}/login"
pm2 status "$APP_NAME"
