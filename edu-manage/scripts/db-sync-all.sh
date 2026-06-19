#!/usr/bin/env bash
# 对两个库（或单库）执行 prisma db push。纯加列/加表安全幂等。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"   # 项目根

read_env() {
  local key="$1" val="${!1:-}"
  if [ -z "$val" ] && [ -f .env ]; then
    val="$(grep -E "^${key}=" .env | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

DUAL="$(read_env DUAL_DB)"
JUNIOR="$(read_env DATABASE_URL_JUNIOR)"
SENIOR="$(read_env DATABASE_URL_SENIOR)"
LEGACY="$(read_env DATABASE_URL)"

push_one() {
  local label="$1" url="$2"
  if [ -z "$url" ]; then echo "[db-sync] 跳过 $label（连接串为空）"; return 0; fi
  echo "[db-sync] === $label ==="
  DATABASE_URL="$url" npx prisma db push --skip-generate
}

npx prisma generate
if [ "${DUAL:-false}" = "true" ]; then
  push_one "初中部 JUNIOR" "$JUNIOR"
  push_one "高中部 SENIOR" "$SENIOR"
else
  push_one "默认库" "${LEGACY:-$JUNIOR}"
fi
echo "[db-sync] 完成。"
