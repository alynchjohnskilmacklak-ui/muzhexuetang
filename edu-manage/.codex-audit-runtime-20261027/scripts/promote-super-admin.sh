#!/usr/bin/env bash
# Promote a user to SUPER_ADMIN in both databases.
# Usage: bash scripts/promote-super-admin.sh renwentao@nuc.com
set -eu

EMAIL="${1:?用法: bash scripts/promote-super-admin.sh <email>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

read_env() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ] && [ -f .env ]; then
    val="$(grep -E "^${key}=" .env | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

JUNIOR="$(read_env DATABASE_URL_JUNIOR)"
SENIOR="$(read_env DATABASE_URL_SENIOR)"
LEGACY="$(read_env DATABASE_URL)"

promote() {
  local label="$1" url="$2"
  if [ -z "$url" ]; then
    echo "[$label] 连接为空，跳过"
    return 0
  fi
  echo "=== $label ==="
  echo "  当前角色:"
  psql "$url" -c "SELECT email, role FROM \"User\" WHERE email='${EMAIL}';" || true
  psql "$url" -c "UPDATE \"User\" SET role='SUPER_ADMIN' WHERE email='${EMAIL}';"
  echo "  提权后:"
  psql "$url" -c "SELECT email, role FROM \"User\" WHERE email='${EMAIL}';"
}

if [ -n "$JUNIOR" ] || [ -n "$SENIOR" ]; then
  promote "初中部 JUNIOR" "$JUNIOR"
  promote "高中部 SENIOR" "$SENIOR"
else
  promote "默认库" "$LEGACY"
fi

echo "完成。请退出登录后重新登录，新会话才会带上 SUPER_ADMIN。"
