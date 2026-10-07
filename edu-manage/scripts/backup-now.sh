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

echo "[backup-now] === Persistent public files backup ==="
set --
for relative_dir in \
  public/uploads \
  public/services \
  public/marketing \
  public/business-assets \
  public/volunteer/docs
do
  if [ -e "$PROJECT_DIR/$relative_dir" ]; then
    set -- "$@" "$relative_dir"
  fi
done

if [ "$#" -gt 0 ]; then
  tar -czf "$OUT_DIR/shared-public.tar.gz" -C "$PROJECT_DIR" "$@"
  sha256sum "$OUT_DIR/shared-public.tar.gz" > "$OUT_DIR/shared-public.tar.gz.sha256"
  chmod 600 "$OUT_DIR/shared-public.tar.gz" "$OUT_DIR/shared-public.tar.gz.sha256"
else
  echo "[backup-now] no persistent public directories found"
fi

if [ -n "$(load_env OSS_BUCKET)" ]; then
  echo "[backup-now] === Optional OSS upload ==="
  bash "$SCRIPT_DIR/backup-uploads.sh"
else
  echo "[backup-now] OSS_BUCKET not configured; local archive retained"
fi

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
