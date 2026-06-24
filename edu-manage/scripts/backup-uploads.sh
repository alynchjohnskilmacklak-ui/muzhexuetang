#!/usr/bin/env bash
# Backup /opt/edu-manage/uploads to OSS with rotation (keep 7 days).
# Requires: tar, ossutil (or aliyun CLI) configured with credentials.

set -eu

UPLOAD_DIR="${UPLOAD_DIR:-/opt/edu-manage/uploads}"
BACKUP_TMP="${BACKUP_TMP:-/tmp/edu-backups}"
OSS_BUCKET="${OSS_BUCKET:-}"
KEEP_DAYS="${KEEP_DAYS:-7}"
DATE_STAMP="$(date +%Y%m%d)"

if [ -z "$OSS_BUCKET" ]; then
  echo "[FATAL] OSS_BUCKET 未设置，请在环境变量或本脚本中配置 OSS bucket（如 oss://my-bucket/backups/uploads/）" >&2
  exit 1
fi

if [ ! -d "$UPLOAD_DIR" ]; then
  echo "[WARN] 上传目录 $UPLOAD_DIR 不存在，跳过备份" >&2
  exit 0
fi

mkdir -p "$BACKUP_TMP"
ARCHIVE="${BACKUP_TMP}/uploads-${DATE_STAMP}.tar.gz"

echo "[INFO] 打包 $UPLOAD_DIR → $ARCHIVE"
tar -czf "$ARCHIVE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

echo "[INFO] 上传 $ARCHIVE → $OSS_BUCKET"
if command -v ossutil &>/dev/null; then
  ossutil cp "$ARCHIVE" "${OSS_BUCKET}uploads-${DATE_STAMP}.tar.gz" --quiet || {
    echo "[FATAL] ossutil 上传失败" >&2
    rm -f "$ARCHIVE"
    exit 1
  }
elif command -v aliyun &>/dev/null; then
  aliyun oss cp "$ARCHIVE" "${OSS_BUCKET}uploads-${DATE_STAMP}.tar.gz" --quiet || {
    echo "[FATAL] aliyun oss 上传失败" >&2
    rm -f "$ARCHIVE"
    exit 1
  }
else
  echo "[FATAL] 未找到 ossutil 或 aliyun CLI，请安装其中之一" >&2
  rm -f "$ARCHIVE"
  exit 1
fi

rm -f "$ARCHIVE"
echo "[INFO] 上传完成，开始清理超过 ${KEEP_DAYS} 天的旧备份"

DELETE_BEFORE="$(date -d "-${KEEP_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${KEEP_DAYS}d +%Y%m%d)"

if command -v ossutil &>/dev/null; then
  ossutil ls "${OSS_BUCKET}" 2>/dev/null | grep 'uploads-' | while read -r _ _ _ _ _ key; do
    file_date="$(echo "$key" | grep -oP 'uploads-\K\d{8}')"
    if [ -n "$file_date" ] && [ "$file_date" -lt "$DELETE_BEFORE" ]; then
      echo "[INFO] 删除过期备份: $key"
      ossutil rm "${OSS_BUCKET}${key}" --quiet || echo "[WARN] 删除 $key 失败" >&2
    fi
  done
elif command -v aliyun &>/dev/null; then
  aliyun oss ls "${OSS_BUCKET}" 2>/dev/null | grep 'uploads-' | while read -r _ _ _ _ _ key; do
    file_date="$(echo "$key" | grep -oP 'uploads-\K\d{8}')"
    if [ -n "$file_date" ] && [ "$file_date" -lt "$DELETE_BEFORE" ]; then
      echo "[INFO] 删除过期备份: $key"
      aliyun oss rm "${OSS_BUCKET}${key}" --quiet || echo "[WARN] 删除 $key 失败" >&2
    fi
  done
fi

echo "[INFO] 备份完成"
