#!/usr/bin/env bash
# MuZhe edu-manage PostgreSQL full database backup.
# Recommended cron on Aliyun:
#   0 2 * * * cd /opt/edu-manage && /bin/bash scripts/backup-db.sh >> /var/log/edu-manage-backup.log 2>&1
#
# Environment variables:
#   DATABASE_URL      PostgreSQL URL. If omitted, read from .env.
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
BACKUP_FILE="$BACKUP_DIR/edu_manage_$TIMESTAMP.dump"
SHA_FILE="$BACKUP_FILE.sha256"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_DIR/.env" ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//')"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date '+%F %T')] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

# pg_dump does not understand Prisma's ?schema=public query parameter.
PG_DUMP_URL="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date '+%F %T')] Backup started: $BACKUP_FILE"
pg_dump --format=custom --no-owner --no-acl --dbname="$PG_DUMP_URL" --file="$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$SHA_FILE"
chmod 600 "$BACKUP_FILE" "$SHA_FILE"
echo "[$(date '+%F %T')] Backup finished: $(du -h "$BACKUP_FILE" | awk '{print $1}')"

find "$BACKUP_DIR" -name 'edu_manage_*.dump' -mtime "+$BACKUP_KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'edu_manage_*.dump.sha256' -mtime "+$BACKUP_KEEP_DAYS" -delete
echo "[$(date '+%F %T')] Local retention kept ${BACKUP_KEEP_DAYS} days"

if [ -n "${OSSUTIL_BUCKET:-}" ]; then
  if command -v ossutil >/dev/null 2>&1; then
    ossutil cp "$BACKUP_FILE" "$OSSUTIL_BUCKET" --force
    ossutil cp "$SHA_FILE" "$OSSUTIL_BUCKET" --force
    echo "[$(date '+%F %T')] Copied backup to OSS: $OSSUTIL_BUCKET"
  else
    echo "[$(date '+%F %T')] WARN: OSSUTIL_BUCKET set but ossutil not found" >&2
  fi
fi

if [ -n "${RSYNC_REMOTE:-}" ]; then
  rsync -az "$BACKUP_FILE" "$SHA_FILE" "$RSYNC_REMOTE"
  echo "[$(date '+%F %T')] Copied backup to rsync target: $RSYNC_REMOTE"
fi