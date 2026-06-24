#!/usr/bin/env bash
# One-click backup: wraps backup-db.sh + backup-uploads.sh into a timestamped directory.
# Called from the admin data-admin/backup API or run manually:
#   bash scripts/backup-now.sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/data/backups/edu-manage}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${BACKUP_DIR}/manual-${TIMESTAMP}"

load_env() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ] && [ -f "$PROJECT_DIR/.env" ]; then
    val="$(grep -E "^${key}=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
  fi
  echo "$val"
}

mkdir -p "$OUT_DIR"

export BACKUP_DIR="$OUT_DIR"
export BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-9999}"

echo "[backup-now] === DB backup ==="
bash "$SCRIPT_DIR/backup-db.sh"

echo "[backup-now] === Uploads backup ==="
bash "$SCRIPT_DIR/backup-uploads.sh" 2>/dev/null || echo "[backup-now] uploads backup skipped (may not be configured)"

# Write metadata
cat > "$OUT_DIR/backup-metadata.json" << JSONEOF
{
  "timestamp": "$(date -Iseconds)",
  "dir": "$OUT_DIR",
  "dualDb": "$(load_env DUAL_DB)",
  "files": $(ls "$OUT_DIR" | jq -R -s -c 'split("\n") | map(select(length > 0))')
}
JSONEOF

echo "[backup-now] done: $OUT_DIR"
echo "$OUT_DIR"
