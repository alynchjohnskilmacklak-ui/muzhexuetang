#!/usr/bin/env bash
# Dump both junior/senior databases, gzip, upload to OSS (logical backup).
# Requires: pg_dump, gzip, ossutil (or aliyun CLI) configured.
# Set DATABASE_URL_JUNIOR / DATABASE_URL_SENIOR or derive from DATABASE_URL.

set -eu

BACKUP_TMP="${BACKUP_TMP:-/tmp/edu-backups}"
OSS_BUCKET="${OSS_BUCKET:-}"
KEEP_DAYS="${KEEP_DAYS:-7}"
DATE_STAMP="$(date +%Y%m%d-%H%M%S)"

if [ -z "$OSS_BUCKET" ]; then
  echo "[FATAL] OSS_BUCKET 未设置" >&2
  exit 1
fi

mkdir -p "$BACKUP_TMP"

dump_one() {
  local label="$1"
  local db_url="$2"
  local outfile="${BACKUP_TMP}/${label}-${DATE_STAMP}.sql.gz"

  if [ -z "$db_url" ]; then
    echo "[WARN] ${label} 数据库连接串未配置，跳过" >&2
    return
  fi

  echo "[INFO] 导出 ${label} → ${outfile}"
  pg_dump "$db_url" | gzip > "$outfile" || {
    echo "[FATAL] ${label} pg_dump 失败" >&2
    rm -f "$outfile"
    exit 1
  }

  echo "[INFO] 上传 ${outfile} → ${OSS_BUCKET}"
  local oss_key="${label}-${DATE_STAMP}.sql.gz"

  if command -v ossutil &>/dev/null; then
    ossutil cp "$outfile" "${OSS_BUCKET}${oss_key}" --quiet || {
      echo "[FATAL] ${label} ossutil 上传失败" >&2
      rm -f "$outfile"
      exit 1
    }
  elif command -v aliyun &>/dev/null; then
    aliyun oss cp "$outfile" "${OSS_BUCKET}${oss_key}" --quiet || {
      echo "[FATAL] ${label} aliyun oss 上传失败" >&2
      rm -f "$outfile"
      exit 1
    }
  else
    echo "[FATAL] 未找到 ossutil 或 aliyun CLI" >&2
    rm -f "$outfile"
    exit 1
  fi

  rm -f "$outfile"
  echo "[INFO] ${label} 备份完成"
}

dump_one "chuzhong" "${DATABASE_URL_JUNIOR:-}"
dump_one "gaozhong" "${DATABASE_URL_SENIOR:-}"

# Rotate old backups
echo "[INFO] 清理超过 ${KEEP_DAYS} 天的旧备份"
DELETE_BEFORE="$(date -d "-${KEEP_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${KEEP_DAYS}d +%Y%m%d)"

cleanup_prefix() {
  local prefix="$1"
  if command -v ossutil &>/dev/null; then
    ossutil ls "${OSS_BUCKET}" 2>/dev/null | grep "${prefix}-" | while read -r _ _ _ _ _ key; do
      file_date="$(echo "$key" | grep -oP "${prefix}-\K\d{8}")"
      if [ -n "$file_date" ] && [ "$file_date" -lt "$DELETE_BEFORE" ]; then
        echo "[INFO] 删除过期备份: $key"
        ossutil rm "${OSS_BUCKET}${key}" --quiet || echo "[WARN] 删除 $key 失败" >&2
      fi
    done
  elif command -v aliyun &>/dev/null; then
    aliyun oss ls "${OSS_BUCKET}" 2>/dev/null | grep "${prefix}-" | while read -r _ _ _ _ _ key; do
      file_date="$(echo "$key" | grep -oP "${prefix}-\K\d{8}")"
      if [ -n "$file_date" ] && [ "$file_date" -lt "$DELETE_BEFORE" ]; then
        echo "[INFO] 删除过期备份: $key"
        aliyun oss rm "${OSS_BUCKET}${key}" --quiet || echo "[WARN] 删除 $key 失败" >&2
      fi
    done
  fi
}

cleanup_prefix "chuzhong"
cleanup_prefix "gaozhong"

echo "[INFO] 全部数据库备份完成"
