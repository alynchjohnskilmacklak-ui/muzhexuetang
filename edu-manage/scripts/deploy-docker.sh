#!/usr/bin/env bash
# =============================================================================
# deploy-docker.sh — edu-manage 生产 Docker 部署（docker load + 切换容器）
#
# 服务器只负责运行：本机构建镜像 -> 上传 tar.gz -> 本脚本 load 并切换。
# 数据库继续使用服务器系统 PostgreSQL（容器 host 网络直连 127.0.0.1:5432），
# 不迁移数据；上传目录挂载服务器 shared/public 子目录，不覆盖镜像内静态页。
#
# 用法:
#   bash /opt/edu-manage/scripts/deploy-docker.sh /tmp/edu-manage-app-YYYYMMDD-HHMM.tar.gz
#
# 流程: 校验 -> 备份数据库 -> docker load -> 停 PM2/旧容器 -> 起新容器
#       -> 健康检查 -> 失败自动回滚旧镜像
# =============================================================================
set -Eeuo pipefail

IMAGE_TAR="${1:?用法: bash deploy-docker.sh <镜像.tar.gz>}"
APP_NAME="edu-manage-app"
CONTAINER_NAME="edu-manage-app"
PORT="3000"
SHARED="/opt/edu-manage/shared"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="/var/log/edu-manage-docker-deploy.log"

log() { echo "[deploy-docker $(date '+%F %T')] $*" | tee -a "$LOG"; }
die() { log "ERROR: $*"; exit 1; }

[[ -f "$IMAGE_TAR" ]] || die "镜像包不存在: $IMAGE_TAR"
command -v docker >/dev/null || die "服务器未安装 docker，请先执行 scripts/bootstrap-docker-host.sh"

TS="$(date +%Y%m%d-%H%M%S)"
ROLLBACK_TAG="edu-manage-app:rollback-$TS"

# ---------- 1. 校验完整性 ----------
SHA_FILE="${IMAGE_TAR}.sha256"
if [[ -f "$SHA_FILE" ]]; then
  EXPECTED="$(awk '{print $1}' "$SHA_FILE" | tr 'A-F' 'a-f')"
  ACTUAL="$(sha256sum "$IMAGE_TAR" | awk '{print $1}')"
  [[ "$EXPECTED" == "$ACTUAL" ]] || die "SHA256 校验失败: 期望 $EXPECTED 实际 $ACTUAL"
  log "SHA256 校验通过: $EXPECTED"
fi

# ---------- 2. 部署前数据库备份（双库） ----------
if [[ -x "$SCRIPT_DIR/backup-db.sh" ]]; then
  log "开始数据库备份..."
  if bash "$SCRIPT_DIR/backup-db.sh" >>"$LOG" 2>&1; then
    log "数据库备份完成"
  else
    log "WARN: backup-db.sh 未完全成功（继续部署，日志见 $LOG）"
  fi
else
  log "WARN: 未找到 backup-db.sh，跳过数据库备份"
fi

# ---------- 3. 记录当前运行版本用于回滚 ----------
OLD_IMAGE_ID="$(docker images -q "$APP_NAME:latest" 2>/dev/null || true)"
if [[ -n "$OLD_IMAGE_ID" ]] && docker inspect "$APP_NAME:latest" >/dev/null 2>&1; then
  docker tag "$APP_NAME:latest" "$ROLLBACK_TAG"
  log "已保留旧镜像回滚标签: $ROLLBACK_TAG ($OLD_IMAGE_ID)"
fi

# ---------- 4. docker load 新镜像 ----------
log "docker load 新镜像..."
docker load -i "$IMAGE_TAR" | tee -a "$LOG"
docker images "$APP_NAME:latest" --format '{{.ID}} {{.Size}}' | head -1 | tee -a "$LOG"

# ---------- 5. 停止 PM2 与旧容器 ----------
if command -v pm2 >/dev/null 2>&1; then
  log "停止 PM2 进程 edu-manage..."
  pm2 stop edu-manage >/dev/null 2>&1 || true
fi
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  log "停止并移除旧容器 $CONTAINER_NAME..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

# ---------- 6. 启动新容器（host 网络直连宿主数据库） ----------
# 环境变量: 生产共享 .env（127.0.0.1 直连宿主 PostgreSQL 在 host 网络下有效）
ENV_FILE="$SHARED/.env"
[[ -f "$ENV_FILE" ]] || die "未找到生产配置 $ENV_FILE"

VOLUMES=(
  -v "$SHARED/public/uploads:/app/public/uploads"
  -v "$SHARED/public/services:/app/public/services"
  -v "$SHARED/public/marketing:/app/public/marketing"
  -v "$SHARED/public/business-assets:/app/public/business-assets"
  -v "$SHARED/public/volunteer/docs:/app/public/volunteer/docs"
  -v "/data/backups/edu-manage:/data/backups/edu-manage"
)
ENVS=(
  -e APP_ROOT=/app
  -e UPLOAD_DIR=/app/public/uploads
  -e BACKUP_DIR=/data/backups/edu-manage
  -e BACKUP_SCRIPT=/app/scripts/backup-now.sh
  -e NODE_ENV=production
  -e NODE_OPTIONS=--max-old-space-size=640
)

log "启动新容器（host 网络）..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network host \
  --env-file "$ENV_FILE" \
  "${ENVS[@]}" \
  "${VOLUMES[@]}" \
  "$APP_NAME:latest" >>"$LOG" 2>&1 || die "容器启动失败"

# ---------- 7. 健康检查（最多 90 秒） ----------
health_ok=0
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/login" >/dev/null 2>&1; then
    health_ok=1
    break
  fi
  sleep 3
done

if [[ "$health_ok" -eq 1 ]]; then
  log "健康检查通过: http://127.0.0.1:$PORT/login -> OK"
  if [[ -n "$OLD_IMAGE_ID" ]]; then
    docker rmi "$ROLLBACK_TAG" >/dev/null 2>&1 || true
    log "已清理回滚标签 $ROLLBACK_TAG"
  fi
  log "部署成功。当前容器: $(docker ps --filter name=$CONTAINER_NAME --format '{{.Image}} {{.Status}}')"
else
  log "健康检查失败，执行回滚..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  if [[ -n "$OLD_IMAGE_ID" ]]; then
    log "用回滚镜像 $ROLLBACK_TAG 重新启动..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --network host \
      --env-file "$ENV_FILE" \
      "${ENVS[@]}" \
      "${VOLUMES[@]}" \
      "$ROLLBACK_TAG" >>"$LOG" 2>&1 || true
    for i in $(seq 1 20); do
      curl -fsS "http://127.0.0.1:$PORT/login" >/dev/null 2>&1 && { log "回滚成功"; exit 1; }
      sleep 3
    done
    die "回滚后仍不健康，请人工介入（旧镜像: $ROLLBACK_TAG）"
  fi
  die "回滚失败：没有可用的旧镜像"
fi

# ---------- 8. 外部验证提示 ----------
log "请验证: curl -I https://muzhexuetang.xyz/login"
log "回滚方式: docker rm -f $CONTAINER_NAME && docker run -d --name $CONTAINER_NAME --restart unless-stopped --network host --env-file $ENV_FILE ${ENVS[*]} ${VOLUMES[*]} $ROLLBACK_TAG"
