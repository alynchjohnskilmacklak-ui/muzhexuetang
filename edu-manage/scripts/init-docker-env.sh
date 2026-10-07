#!/usr/bin/env bash
set -Eeuo pipefail

target_dir="${1:-/opt/edu-manage-docker/source}"
public_url="${2:-https://muzhexuetang.xyz}"
env_file="$target_dir/.env"

install -d -m 750 "$target_dir"

if [[ -f "$env_file" ]]; then
  echo "Existing $env_file preserved."
  exit 0
fi

umask 077
postgres_password="$(openssl rand -hex 24)"
auth_secret="$(openssl rand -hex 32)"
cron_secret="$(openssl rand -hex 32)"

cat > "$env_file" <<EOF
POSTGRES_PASSWORD=$postgres_password
DUAL_DB=true
NEXTAUTH_SECRET=$auth_secret
AUTH_SECRET=$auth_secret
NEXTAUTH_URL=$public_url
AUTH_URL=$public_url
PUBLIC_APP_URL=$public_url
AUTH_TRUST_HOST=true
CRON_SECRET=$cron_secret
STORAGE_DRIVER=local
UPLOAD_DIR=public/uploads
RATE_LIMIT_DRIVER=auto
SESSION_EVENT_DRIVER=auto
APP_TIMEZONE=Asia/Shanghai
AI_TIMEOUT_MS=60000
AI_RATE_LIMIT_PER_MINUTE=10
AI_RATE_LIMIT_PER_DAY=100
EOF

chmod 600 "$env_file"
echo "Created $env_file with server-generated secrets."
