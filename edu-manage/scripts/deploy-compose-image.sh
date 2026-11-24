#!/usr/bin/env bash
# Compose-safe production image deployment.
# Keep the current image only after success. The previous image exists under a
# temporary tag only while the candidate is being health-checked.
set -Eeuo pipefail

IMAGE_TAR="${1:-}"
NEW_IMAGE="${2:-}"
APP_IMAGE="edu-manage-app:latest"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/edu-manage-docker/source/compose.production.yaml}"
COMPOSE_DIR="$(dirname "$COMPOSE_FILE")"
ROLLBACK_TAG="edu-manage-app:deploy-rollback-$(date '+%Y%m%d%H%M%S')"

log() { printf '[deploy] %s\n' "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

[[ -f "$IMAGE_TAR" ]] || die "镜像包不存在: $IMAGE_TAR"
case "$IMAGE_TAR" in
  /tmp/edu-manage-app-*.tar|/tmp/edu-manage-app-*.tar.gz) ;;
  *) die "只允许部署 /tmp 下的 edu-manage-app-*.tar 或 .tar.gz 文件" ;;
esac
[[ -f "$COMPOSE_FILE" ]] || die "Compose 文件不存在: $COMPOSE_FILE"
[[ "$NEW_IMAGE" =~ ^edu-manage-app:[A-Za-z0-9_.-]+$ ]] || die "新镜像必须使用 edu-manage-app:<版本标签> 格式"
[[ "$NEW_IMAGE" != "$APP_IMAGE" ]] || die "新镜像标签不能是 latest"

SHA_FILE="${IMAGE_TAR}.sha256"
[[ -f "$SHA_FILE" ]] || die "缺少 SHA256 文件: $SHA_FILE"
EXPECTED_SHA="$(awk 'NR==1 {print tolower($1)}' "$SHA_FILE")"
ACTUAL_SHA="$(sha256sum "$IMAGE_TAR" | awk '{print tolower($1)}')"
[[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]] || die "镜像 SHA256 校验失败"
if [[ "$IMAGE_TAR" == *.tar.gz ]]; then
  command -v gzip >/dev/null 2>&1 || die "服务器缺少 gzip，无法读取压缩镜像包"
fi

AVAILABLE_KB="$(df -Pk "$COMPOSE_DIR" | awk 'NR==2 {print $4}')"
[[ "$AVAILABLE_KB" =~ ^[0-9]+$ ]] || die "无法确认服务器磁盘空间"
(( AVAILABLE_KB >= 1048576 )) || die "服务器可用空间不足 1 GB，拒绝加载镜像"

CURRENT_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q app | head -n 1)"
[[ -n "$CURRENT_CONTAINER" ]] || die "当前 app 容器不存在，拒绝自动切换"
CURRENT_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$CURRENT_CONTAINER")"
[[ "$CURRENT_HEALTH" == healthy ]] || die "当前 app 状态不是 healthy（$CURRENT_HEALTH），拒绝部署"
OLD_IMAGE_ID="$(docker image inspect "$APP_IMAGE" --format '{{.Id}}' 2>/dev/null)" || die "当前 latest 镜像不存在"
RUNNING_IMAGE_ID="$(docker inspect --format '{{.Image}}' "$CURRENT_CONTAINER")"
[[ "$OLD_IMAGE_ID" == "$RUNNING_IMAGE_ID" ]] || die "Compose 容器与 latest 镜像不一致，拒绝部署"

wait_for_healthy() {
  local attempt container status
  for attempt in $(seq 1 40); do
    container="$(docker compose -f "$COMPOSE_FILE" ps -q app | head -n 1)"
    if [[ -n "$container" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
      [[ "$status" == healthy ]] && return 0
      [[ "$status" == unhealthy || "$status" == exited ]] && return 1
    fi
    sleep 3
  done
  return 1
}

remove_old_app_images() {
  local ref
  while IFS= read -r ref; do
    [[ -n "$ref" && "$ref" != "$APP_IMAGE" ]] || continue
    if docker image rm "$ref" >/dev/null; then
      log "已清理旧应用镜像标签: $ref"
    else
      log "WARN: 未能清理旧镜像标签（可能仍被其他容器引用）: $ref"
    fi
  done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' | awk '$0 ~ /^edu-manage-app:/ && $0 != "edu-manage-app:latest"')
}

rollback() {
  log "候选版本未通过健康检查，恢复旧版本"
  docker tag "$ROLLBACK_TAG" "$APP_IMAGE" || return 1
  docker compose -f "$COMPOSE_FILE" up -d --no-build app || return 1
  if wait_for_healthy; then
    remove_old_app_images
    log "旧版本已恢复并 healthy"
    return 0
  fi
  log "ERROR: 自动回滚后仍不健康。保留临时回滚镜像: $ROLLBACK_TAG"
  return 1
}

log "校验通过；临时保存当前镜像用于部署失败回退"
docker tag "$APP_IMAGE" "$ROLLBACK_TAG"

log "加载热修复镜像"
LOAD_FAILED=0
if [[ "$IMAGE_TAR" == *.tar.gz ]]; then
  gzip -dc "$IMAGE_TAR" | docker load || LOAD_FAILED=$?
else
  docker load -i "$IMAGE_TAR" || LOAD_FAILED=$?
fi
if [[ "$LOAD_FAILED" -ne 0 ]]; then
  docker image rm "$ROLLBACK_TAG" >/dev/null 2>&1 || true
  die "docker load 失败，线上服务未切换"
fi
if ! docker image inspect "$NEW_IMAGE" >/dev/null 2>&1; then
  docker tag "$ROLLBACK_TAG" "$APP_IMAGE"
  docker compose -f "$COMPOSE_FILE" up -d --no-build app >/dev/null
  docker image rm "$ROLLBACK_TAG" >/dev/null 2>&1 || true
  die "安装包中缺少指定的新镜像标签: $NEW_IMAGE"
fi

docker tag "$NEW_IMAGE" "$APP_IMAGE"
log "切换 Compose app 服务"
if ! docker compose -f "$COMPOSE_FILE" up -d --no-build app; then
  rollback || true
  die "Compose 切换失败"
fi

if ! wait_for_healthy; then
  rollback || true
  die "新版本健康检查失败"
fi

log "新版本 healthy；只保留 latest 一个应用镜像"
remove_old_app_images
rm -f -- "$IMAGE_TAR" "$SHA_FILE"
docker image ls --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}' | awk '$1 ~ /^edu-manage-app:/ {print}'
df -h "$COMPOSE_DIR" | tail -n 1
log "部署成功；数据库与数据库备份未修改"
