#!/usr/bin/env bash
# ============================================================================
# edu-manage 预构建包部署（服务器端：免安装、免构建）
#
# 用法:
#   cd /opt/edu-manage
#   bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-20260827-1530.tar.gz
#
# 流程:
#   1. 备份 .env
#   2. 备份数据库（pg_dump，复用 scripts/backup-db.sh）
#   3. 备份上传文件（public/uploads 与独立 UPLOAD_DIR）
#   4. 解压预构建程序（Linux x64 standalone，含 node_modules）
#   5. 恢复 .env 与上传文件
#   6. Prisma 数据库迁移（双库由 migrate-all.sh 处理）
#   7. 重启 PM2（node --env-file=.env server.js）
#   8. 健康检查
#
# 不再执行: npm install / npm run build / npx prisma generate（产物已内置）
# ============================================================================
set -eu

TAR_FILE="${1:-}"
if [ -z "$TAR_FILE" ] || [ ! -f "$TAR_FILE" ]; then
  echo "[deploy] ERROR: 用法: bash scripts/deploy-prebuilt-tar.sh /path/to/edu-manage-runtime-xxx.tar.gz" >&2
  exit 1
fi

APP_NAME="${APP_NAME:-edu-manage}"
PORT="${PORT:-3000}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_BACKUP="/tmp/edu-manage.env.bak"
UPLOAD_BACKUP="/tmp/edu-manage-uploads-backup"

cd "$PROJECT_DIR"

echo "[deploy] ============ 预构建包部署开始 ($(date '+%F %T')) ============"
echo "[deploy] 项目目录: $PROJECT_DIR"
echo "[deploy] 安装包:   $TAR_FILE ($(du -h "$TAR_FILE" | awk '{print $1}'))"

# ---------- 1. 备份 .env ----------
if [ -f .env ]; then
  cp .env "$ENV_BACKUP"
  echo "[deploy] 已备份 .env → $ENV_BACKUP"
else
  echo "[deploy] WARN: 未找到 .env，跳过备份（首次部署请先确认 .env 已放置）"
fi

# ---------- 2. 备份数据库（复用 backup-db.sh；首次部署从包内提取执行） ----------
run_db_backup() {
  local script="$1"
  if [ -f "$script" ]; then
    bash "$script" || { echo "[deploy] ERROR: 数据库备份失败，中止部署" >&2; exit 1; }
  else
    echo "[deploy] WARN: 找不到 $script，跳过数据库备份"
  fi
}

if [ -f scripts/backup-db.sh ]; then
  run_db_backup scripts/backup-db.sh
else
  TMP_X="$(mktemp -d)"
  case "$TAR_FILE" in
    *.tar.gz|*.tgz) tar -xzf "$TAR_FILE" -C "$TMP_X" scripts/backup-db.sh 2>/dev/null || true ;;
    *)              tar -xf "$TAR_FILE" -C "$TMP_X" scripts/backup-db.sh 2>/dev/null || true ;;
  esac
  if [ -f "$TMP_X/scripts/backup-db.sh" ]; then
    echo "[deploy] 首次部署：从安装包提取 backup-db.sh 执行数据库备份"
    run_db_backup "$TMP_X/scripts/backup-db.sh"
  else
    echo "[deploy] WARN: 安装包内也没有 backup-db.sh，跳过数据库备份（请手动确认）"
  fi
  rm -rf "$TMP_X"
fi

# ---------- 3. 备份上传文件 ----------
rm -rf "$UPLOAD_BACKUP"
mkdir -p "$UPLOAD_BACKUP"
if [ -d public/uploads ]; then
  cp -a public/uploads "$UPLOAD_BACKUP/"
  echo "[deploy] 已备份 public/uploads"
fi
UPLOAD_DIR_VAL="$(grep -E '^UPLOAD_DIR=' .env 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
if [ -n "$UPLOAD_DIR_VAL" ] && [ -d "$UPLOAD_DIR_VAL" ] && [ "$UPLOAD_DIR_VAL" != "$PROJECT_DIR/public/uploads" ]; then
  cp -a "$UPLOAD_DIR_VAL" "$UPLOAD_BACKUP/extra-uploads"
  echo "[deploy] 已备份 UPLOAD_DIR: $UPLOAD_DIR_VAL"
fi

# ---------- 4. 停止旧进程 ----------
echo "[deploy] 停止 PM2 进程 $APP_NAME"
pm2 stop "$APP_NAME" 2>/dev/null || pm2 delete "$APP_NAME" 2>/dev/null || true

# ---------- 5. 清理旧运行产物（保留 .env 与 uploads） ----------
echo "[deploy] 清理旧运行产物（node_modules / .next / server.js / prisma / public / scripts / package.json）"
rm -rf node_modules .next server.js prisma public scripts package.json

# ---------- 6. 解压预构建包 ----------
echo "[deploy] 解压预构建包"
case "$TAR_FILE" in
  *.tar.gz|*.tgz) tar -xzf "$TAR_FILE" -C "$PROJECT_DIR" ;;
  *)              tar -xf "$TAR_FILE" -C "$PROJECT_DIR" ;;
esac

# ---------- 7. 恢复 .env 与上传文件 ----------
if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" .env
  echo "[deploy] 已恢复 .env"
fi
if [ -d "$UPLOAD_BACKUP/uploads" ]; then
  mkdir -p public
  cp -a "$UPLOAD_BACKUP/uploads" public/
  echo "[deploy] 已恢复 public/uploads"
fi
if [ -d "$UPLOAD_BACKUP/extra-uploads" ] && [ -n "$UPLOAD_DIR_VAL" ]; then
  mkdir -p "$(dirname "$UPLOAD_DIR_VAL")"
  cp -a "$UPLOAD_BACKUP/extra-uploads" "$UPLOAD_DIR_VAL"
  echo "[deploy] 已恢复 UPLOAD_DIR: $UPLOAD_DIR_VAL"
fi

# ---------- 8. Prisma 数据库迁移（双库自动处理，CLI 已内置在包内） ----------
if [ -f scripts/migrate-all.sh ]; then
  echo "[deploy] 执行 Prisma 迁移（migrate-all）"
  bash scripts/migrate-all.sh
else
  echo "[deploy] WARN: 包内缺少 scripts/migrate-all.sh，跳过迁移（请确认 schema 未变更）"
fi

# ---------- 9. 重启 PM2（standalone 模式，node --env-file=.env server.js） ----------
if [ ! -f server.js ]; then
  echo "[deploy] ERROR: 解压后缺少 server.js，预构建包不完整，请重新构建" >&2
  exit 1
fi
echo "[deploy] 启动 PM2（standalone: node --env-file=.env server.js）"
PORT="$PORT" pm2 start node --name "$APP_NAME" --cwd "$PROJECT_DIR" -- --env-file=.env server.js
pm2 save

# ---------- 10. 健康检查 ----------
echo "[deploy] 健康检查 http://127.0.0.1:$PORT/login"
OK=0
for i in $(seq 1 10); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/login"; then
    OK=1
    break
  fi
  sleep 2
done

if [ "$OK" -ne 1 ]; then
  echo "[deploy] ERROR: 健康检查失败，最近日志如下：" >&2
  pm2 logs "$APP_NAME" --lines 30 --nostream || true
  exit 1
fi

echo "[deploy] 健康检查通过 ✓"
pm2 status "$APP_NAME"
echo "[deploy] ============ 部署完成 ($(date '+%F %T')) ============"
