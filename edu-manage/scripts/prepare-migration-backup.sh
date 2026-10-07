#!/usr/bin/env bash
set -euo pipefail

phase="${1:-precopy}"
case "$phase" in
  precopy|final) ;;
  *) echo "usage: $0 [precopy|final]" >&2; exit 2 ;;
esac

backup_root=/data/backups/edu-manage
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$backup_root/codex-migration-${phase}-${timestamp}"
install -d -m 700 "$backup_dir"

for database in muzhe_chuzhong muzhe_gaozhong; do
  dump="$backup_dir/${database}.dump"
  sudo -u postgres pg_dump \
    --format=custom \
    --compress=6 \
    --no-owner \
    --no-privileges \
    "$database" >"$dump"
  pg_restore --list "$dump" >/dev/null
done

tar --create --gzip \
  --file="$backup_dir/shared-public.tar.gz" \
  --directory=/opt/edu-manage/shared public
tar --list --gzip --file="$backup_dir/shared-public.tar.gz" >/dev/null

(cd "$backup_dir" && sha256sum ./* >SHA256SUMS)
chmod 600 "$backup_dir"/*

echo "BACKUP_DIR=$backup_dir"
du -h "$backup_dir"/* | sort -h
(cd "$backup_dir" && sha256sum --check SHA256SUMS)
