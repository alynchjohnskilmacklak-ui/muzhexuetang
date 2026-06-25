#!/usr/bin/env bash
# backup-now.sh — 双库备份入口（仅用于 muzhe_chuzhong / muzhe_gaozhong）。
# 绝不连接旧库 edu_manage。若 JUNIOR/SENIOR URL 未设置则报错退出，防止静默 dump 错库。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

load_env() {
  local key="$1" val="${!1:-}"
  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    val="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  printf '%s' "$val"
}

JUNIOR="$(load_env DATABASE_URL_JUNIOR)"
SENIOR="$(load_env DATABASE_URL_SENIOR)"

if [ -z "$JUNIOR" ]; then
  echo "ERROR: DATABASE_URL_JUNIOR is not set. Aborting backup to prevent dumping wrong database." >&2
  exit 1
fi
if [ -z "$SENIOR" ]; then
  echo "ERROR: DATABASE_URL_SENIOR is not set. Aborting backup to prevent dumping wrong database." >&2
  exit 1
fi

# Export so backup-db.sh can pick them up without re-reading .env
export DUAL_DB=true
export DATABASE_URL_JUNIOR="$JUNIOR"
export DATABASE_URL_SENIOR="$SENIOR"

exec bash "$SCRIPT_DIR/backup-db.sh" "$@"
