#!/usr/bin/env bash
set -euo pipefail

echo '[HOST]'
hostname
date -Is

echo '[POSTGRES]'
if command -v psql >/dev/null 2>&1; then
  psql --version
else
  echo 'psql: not installed'
fi
systemctl is-active postgresql 2>/dev/null || true
systemctl --no-pager --type=service --state=running 2>/dev/null | grep -E 'postgres|nginx|pm2' || true

echo '[ENV_KEYS]'
for env_file in /opt/edu-manage/shared/.env /opt/edu-manage/.env /opt/edu-manage/current/.env; do
  if [ -f "$env_file" ]; then
    printf '%s mode=' "$env_file"
    stat -c '%a owner=%U:%G' "$env_file"
    sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p' "$env_file" | sort -u
  fi
done

echo '[DATABASE_URL_METADATA]'
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse

for path in (Path('/opt/edu-manage/shared/.env'), Path('/opt/edu-manage/.env'), Path('/opt/edu-manage/current/.env')):
    if not path.is_file():
        continue
    values = {}
    for raw in path.read_text(errors='replace').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.removeprefix('export ').strip()
        value = value.strip().strip('"').strip("'")
        if key in ('DATABASE_URL', 'DATABASE_URL_CHUZHONG', 'DATABASE_URL_GAOZHONG'):
            parsed = urlparse(value)
            values[key] = {
                'scheme': parsed.scheme,
                'host': parsed.hostname,
                'port': parsed.port,
                'database': parsed.path.lstrip('/'),
                'has_user': bool(parsed.username),
                'has_password': bool(parsed.password),
            }
    print(path)
    for key, metadata in sorted(values.items()):
        print(f'  {key}: {metadata}')
PY

echo '[POSTGRES_DATABASES]'
sudo -u postgres psql -Atqc "SELECT datname || '|' || pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datistemplate = false ORDER BY datname" 2>/dev/null || true

echo '[MIGRATION_COUNTS]'
for db_name in muzhe_chuzhong muzhe_gaozhong; do
  printf '%s|' "$db_name"
  sudo -u postgres psql -d "$db_name" -Atqc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL' 2>/dev/null || echo 'unavailable'
done

echo '[SHARED_PUBLIC]'
find /opt/edu-manage/shared/public -maxdepth 2 -mindepth 1 -printf '%y %p -> %l\n' 2>/dev/null | sort
du -sh /opt/edu-manage/shared/public /opt/edu-manage/shared/public/* 2>/dev/null | sort -h

echo '[NGINX_AND_CERTS]'
nginx -v 2>&1 || true
find /etc/nginx/sites-enabled -maxdepth 1 -type l -printf '%p -> %l\n' 2>/dev/null | sort
certbot certificates 2>/dev/null | sed -nE '/Certificate Name:|Domains:|Expiry Date:|Certificate Path:/p' || true
