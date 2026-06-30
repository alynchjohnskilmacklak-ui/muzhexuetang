#!/usr/bin/env bash
# Deploy edu-manage from a tar/tar.gz package on the server.
# Usage: bash scripts/deploy-from-tar.sh /tmp/edu-manage-xxx.tar
set -eu

APP_NAME="${APP_NAME:-edu-manage}"
TAR_FILE="${1:-/tmp/edu-manage.tar}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_LOG="${PROJECT_DIR}/build.log"
UPLOAD_BACKUP_DIR="/tmp/edu-manage-uploads-backup"
PORT="${PORT:-3000}"

cd "$PROJECT_DIR"

if [ ! -f "$TAR_FILE" ]; then
  echo "[deploy] ERROR: package not found: $TAR_FILE" >&2
  exit 1
fi

echo "[deploy] project: $PROJECT_DIR"
echo "[deploy] package: $TAR_FILE"

echo "[deploy] backup .env"
cp .env /tmp/edu-manage.env.bak 2>/dev/null || true

echo "[deploy] backup public/uploads"
rm -rf "$UPLOAD_BACKUP_DIR"
mkdir -p "$UPLOAD_BACKUP_DIR"
cp -r public/uploads "$UPLOAD_BACKUP_DIR/" 2>/dev/null || true

echo "[deploy] stop current PM2 process"
pm2 delete "$APP_NAME" 2>/dev/null || true

echo "[deploy] clean old source and build artifacts"
rm -rf .next src prisma public scripts AGENTS.md DESIGN.md next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs package.json package-lock.json

echo "[deploy] extract package"
case "$TAR_FILE" in
  *.tar.gz|*.tgz) tar -xzf "$TAR_FILE" -C "$PROJECT_DIR" ;;
  *) tar -xf "$TAR_FILE" -C "$PROJECT_DIR" ;;
esac

echo "[deploy] restore .env"
cp /tmp/edu-manage.env.bak .env 2>/dev/null || true

echo "[deploy] restore public/uploads"
mkdir -p public
cp -r "$UPLOAD_BACKUP_DIR/uploads" public/ 2>/dev/null || true

echo "[deploy] install dependencies"
npm install

echo "[deploy] run Prisma migrations"
npm run migrate:all
npx prisma generate
bash scripts/db-sync-all.sh

echo "[deploy] build app"
rm -rf .next
npm run build 2>&1 | tee "$BUILD_LOG"

if [ ! -f .next/BUILD_ID ]; then
  echo "[deploy] ERROR: Next production build was not generated" >&2
  echo "[deploy] Check build log: $BUILD_LOG" >&2
  exit 1
fi

echo "[deploy] start PM2 process"
pm2 start npm --name "$APP_NAME" --cwd "$PROJECT_DIR" -- start -- -p "$PORT"
pm2 save

echo "[deploy] smoke test"
curl -fsSI "http://127.0.0.1:${PORT}/login" >/dev/null
pm2 status "$APP_NAME"

echo "[deploy] OK"
