#!/usr/bin/env bash
# Aliyun one-command deploy script for edu-manage.
# Run on the server. Defaults target: http://112.124.67.56:3000

set -euo pipefail

APP_NAME="${APP_NAME:-edu-manage}"
APP_DIR="${APP_DIR:-/opt/edu-manage}"
REPO_URL="${REPO_URL:-https://github.com/alynchjohnskilmacklak-ui/muzhexuetang.git}"
PUBLIC_IP="${PUBLIC_IP:-112.124.67.56}"
PORT="${PORT:-3000}"
DB_NAME="${DB_NAME:-edu_manage}"
DB_USER="${DB_USER:-edu_admin}"
RUN_SEED="${SEED_DATABASE:-0}"
DB_PASSWORD="${DB_PASSWORD:-}"
DATABASE_URL="${DATABASE_URL:-}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"
NEXTAUTH_URL="${NEXTAUTH_URL:-http://${PUBLIC_IP}:${PORT}}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy.sh"
  exit 1
fi

read_env_value() {
  local key="$1"
  local line value

  if [ ! -f .env ]; then
    return 0
  fi

  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 || true)"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "${value}"
}

echo "=== Install system packages ==="
apt-get update
apt-get install -y ca-certificates curl git openssl postgresql postgresql-contrib

if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >/dev/null 2>&1; then
  echo "=== Install Node.js 22 ==="
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "=== Start PostgreSQL ==="
systemctl enable postgresql
systemctl start postgresql

echo "=== Get application code ==="
if [ -f package.json ] && [ -d prisma ]; then
  APP_DIR="$(pwd)"
  echo "Using current directory: ${APP_DIR}"
elif [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}"
  git pull --ff-only
else
  rm -rf "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

if [ -z "${NEXTAUTH_SECRET}" ]; then
  NEXTAUTH_SECRET="$(read_env_value NEXTAUTH_SECRET)"
fi

if [ -z "${DATABASE_URL}" ]; then
  DATABASE_URL="$(read_env_value DATABASE_URL)"
fi

if [ -z "${NEXTAUTH_SECRET}" ]; then
  NEXTAUTH_SECRET="$(openssl rand -base64 32)"
fi

if [ -z "${DB_PASSWORD}" ] && [[ "${DATABASE_URL}" == postgresql://"${DB_USER}":*@* ]]; then
  DB_PASSWORD="${DATABASE_URL#postgresql://${DB_USER}:}"
  DB_PASSWORD="${DB_PASSWORD%@*}"
fi

if [ -z "${DB_PASSWORD}" ]; then
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
fi

if [ -z "${DATABASE_URL}" ]; then
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
fi

echo "=== Create or update database user and database ==="
sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -v db_user="${DB_USER}" \
  -v db_password="${DB_PASSWORD}" \
  -v db_name="${DB_NAME}" <<'SQL'
SELECT format('CREATE USER %I WITH PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'db_user')\gexec

SELECT format('ALTER USER %I WITH PASSWORD %L', :'db_user', :'db_password')\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name')\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'db_user')\gexec
SQL

echo "=== Configure production environment ==="
if [ -f prisma/schema.pg.prisma ]; then
  cp prisma/schema.pg.prisma prisma/schema.prisma
fi

cat > .env <<ENVEOF
DATABASE_URL="${DATABASE_URL}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="${NEXTAUTH_URL}"
AUTH_SECRET="${NEXTAUTH_SECRET}"
AUTH_URL="${NEXTAUTH_URL}"
AUTH_TRUST_HOST=true
ENVEOF

echo "=== Install dependencies ==="
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "=== Build and migrate ==="
npx prisma generate
npx prisma db push

if [ "${RUN_SEED}" = "1" ]; then
  echo "=== Seed database ==="
  npx tsx prisma/seed.ts
else
  echo "=== Skip seed database ==="
  echo "To import demo data once, run: SEED_DATABASE=1 bash deploy.sh"
fi

npm run build

echo "=== Start application with PM2 ==="
npm install -g pm2
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
pm2 start npm --name "${APP_NAME}" -- start -- -p "${PORT}"
pm2 save

echo "=== Configure PM2 startup ==="
pm2 startup systemd -u root --hp /root || true

echo "=== Deploy complete ==="
echo "URL: ${NEXTAUTH_URL}/login"
echo "Database user: ${DB_USER}"
echo "Database name: ${DB_NAME}"
echo "Database password was generated for this deploy and saved in ${APP_DIR}/.env"
