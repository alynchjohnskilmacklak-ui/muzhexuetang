#!/usr/bin/env bash
# 对初中部、高中部两个库依次执行 prisma migrate deploy，最后生成一次 client。
# 用法：bash scripts/migrate-all.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# 从 .env 读取变量（仅当未在环境中提供时）
load_env() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    val="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

DUAL_DB_VAL="$(load_env DUAL_DB)"
JUNIOR_URL="$(load_env DATABASE_URL_JUNIOR)"
SENIOR_URL="$(load_env DATABASE_URL_SENIOR)"
LEGACY_URL="$(load_env DATABASE_URL)"

deploy_one() {
  local label="$1"; local url="$2"
  if [ -z "$url" ]; then
    echo "[migrate] ERROR: $label 连接串为空，跳过" >&2
    return 1
  fi
  echo "[migrate] === $label 迁移开始 ==="
  DATABASE_URL="$url" npx prisma migrate deploy
  echo "[migrate] === $label 迁移完成 ==="
}

if [ "$DUAL_DB_VAL" = "true" ]; then
  deploy_one "初中部 JUNIOR" "$JUNIOR_URL"
  deploy_one "高中部 SENIOR" "$SENIOR_URL"
else
  deploy_one "默认库 DATABASE_URL" "$LEGACY_URL"
fi

echo "[migrate] 生成 Prisma Client"
npx prisma generate
echo "[migrate] 全部完成"
