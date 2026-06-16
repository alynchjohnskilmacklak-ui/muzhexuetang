#!/usr/bin/env bash
# MuZhe edu-manage PostgreSQL full database backup.
# Recommended cron on Aliyun:
#   0 2 * * * cd /opt/edu-manage && /bin/bash scripts/backup-db.sh >> /var/log/edu-manage-backup.log 2>&1
#
# Environment variables:
#   DATABASE_URL      PostgreSQL URL. If omitted, read from .env.
#   DUAL_DB           true enables DATABASE_URL_JUNIOR and DATABASE_URL_SENIOR backups.
#   DATABASE_URL_JUNIOR / DATABASE_URL_SENIOR  Division PostgreSQL URLs.
#   BACKUP_DIR        Local backup directory. Default: /data/backups/edu-manage
#   BACKUP_KEEP_DAYS  Local retention days. Default: 14
#   OSSUTIL_BUCKET    Optional OSS target, e.g. oss://muzhe-backup/edu-manage/
#   RSYNC_REMOTE      Optional rsync target, e.g. user@host:/data/edu-manage-backup/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/data/backups/edu-manage}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

load_env() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    val="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

DUAL_DB="$(load_env DUAL_DB)"
DATABASE_URL="$(load_env DATABASE_URL)"
DATABASE_URL_JUNIOR="$(load_env DATABASE_URL_JUNIOR)"
DATABASE_URL_SENIOR="$(load_env DATABASE_URL_SENIOR)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

dump_one() {
  local label="$1"
  local url="$2"
  local name
  if [ -z "$url" ]; then
    echo "[$(date '+%F %T')] ERROR: database URL for ${label:-default} is not set" >&2
    exit 1
  fi
  if [ -n "$label" ]; then
    name="edu_manage_${label}_${TIMESTAMP}.dump"
  else
    name="edu_manage_${TIMESTAMP}.dump"
  fi

  local backup_file="$BACKUP_DIR/$name"
  local sha_file="$backup_file.sha256"
  # pg_dump does not understand Prisma's ?schema=public query parameter.
  local pg_dump_url="${url%%\?*}"

  echo "[$(date '+%F %T')] Backup started: $backup_file"
  pg_dump --format=custom --no-owner --no-acl --dbname="$pg_dump_url" --file="$backup_file"
  sha256sum "$backup_file" > "$sha_file"
  chmod 600 "$backup_file" "$sha_file"
  echo "[$(date '+%F %T')] Backup finished: $(du -h "$backup_file" | awk '{print $1}')"

  if [ -n "${OSSUTIL_BUCKET:-}" ]; then
    if command -v ossutil >/dev/null 2>&1; then
      ossutil cp "$backup_file" "$OSSUTIL_BUCKET" --force
      ossutil cp "$sha_file" "$OSSUTIL_BUCKET" --force
      echo "[$(date '+%F %T')] Copied backup to OSS: $OSSUTIL_BUCKET"
    else
      echo "[$(date '+%F %T')] WARN: OSSUTIL_BUCKET set but ossutil not found" >&2
    fi
  fi

  if [ -n "${RSYNC_REMOTE:-}" ]; then
    rsync -az "$backup_file" "$sha_file" "$RSYNC_REMOTE"
    echo "[$(date '+%F %T')] Copied backup to rsync target: $RSYNC_REMOTE"
  fi
}

if [ "${DUAL_DB:-}" = "true" ]; then
  dump_one "chuzhong" "$DATABASE_URL_JUNIOR"
  dump_one "gaozhong" "$DATABASE_URL_SENIOR"
else
  dump_one "" "$DATABASE_URL"
fi

find "$BACKUP_DIR" -name 'edu_manage_*.dump' -mtime "+$BACKUP_KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'edu_manage_*.dump.sha256' -mtime "+$BACKUP_KEEP_DAYS" -delete
echo "[$(date '+%F %T')] Local retention kept ${BACKUP_KEEP_DAYS} days"
