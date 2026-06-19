#!/usr/bin/env bash
# 从 tar 包部署 — 支持单库/双库 schema 同步
# 用法: bash deploy-from-tar.sh [tar檔案路徑]
set -euo pipefail

TAR_FILE="${1:-/tmp/edu-manage.tar.gz}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

load_env() {
  local key="$1"; local val="${!key:-}"
  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    val="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

echo "[deploy] 备份 .env"
cp .env /tmp/edu-manage.env.bak 2>/dev/null || true

echo "[deploy] 清理旧文件"
rm -rf src prisma public scripts AGENTS.md DESIGN.md next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs

echo "[deploy] 解压 tar"
tar -xzf "$TAR_FILE"

echo "[deploy] 恢复 .env"
cp /tmp/edu-manage.env.bak .env 2>/dev/null || true

echo "[deploy] 同步 PG schema"
cp prisma/schema.pg.prisma prisma/schema.prisma 2>/dev/null || true

echo "[deploy] npm install"
npm install

echo "[deploy] prisma generate"
npx prisma generate

# ── 双库同步 ──
DUAL_DB="$(load_env DUAL_DB)"
JUNIOR_URL="$(load_env DATABASE_URL_JUNIOR)"
SENIOR_URL="$(load_env DATABASE_URL_SENIOR)"
LEGACY_URL="$(load_env DATABASE_URL)"

if [ "${DUAL_DB:-false}" = "true" ]; then
  echo "[deploy] 双库模式：同步初中部 + 高中部"
  DATABASE_URL="$JUNIOR_URL" npx prisma db push --skip-generate
  DATABASE_URL="$SENIOR_URL" npx prisma db push --skip-generate
else
  echo "[deploy] 单库模式"
  DATABASE_URL="${LEGACY_URL:-$JUNIOR_URL}" npx prisma db push --skip-generate
fi

echo "[deploy] npm run build"
npm run build

echo "[deploy] 复制 static"
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

echo "[deploy] PM2 重启"
pm2 delete edu-manage 2>/dev/null || true
pm2 start node --name edu-manage -- .next/standalone/server.js
pm2 save

echo "[deploy] 预热"
curl -s http://localhost:3000/login > /dev/null || true

echo "=== DEPLOY OK ==="
