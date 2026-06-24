#!/usr/bin/env bash
# edu-manage 一键部署脚本（服务器端执行）
# 用法: sudo bash deploy-server.sh [端口号，默认3000]
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/edu-manage}"
PORT="${1:-3000}"
TAR_FILE="$(ls -t edu-manage-deploy-*.tar.gz 2>/dev/null | head -1)"

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 执行: sudo bash deploy-server.sh"
  exit 1
fi

if [ -z "${TAR_FILE}" ]; then
  echo "错误: 未找到 edu-manage-deploy-*.tar.gz，请确认 tar 包在当前目录"
  exit 1
fi

echo "=== 1. 安装 Node.js 22（如未安装） ==="
if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "=== 2. 停止旧服务 ==="
pm2 delete edu-manage 2>/dev/null || true

echo "=== 3. 解压到 ${APP_DIR} ==="
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}"
tar -xzf "${TAR_FILE}" -C "${APP_DIR}"

echo "=== 4. 数据库迁移 ==="
cd "${APP_DIR}"
npx prisma generate
bash scripts/db-sync-all.sh

echo "=== 5. 启动服务 ==="
npm install -g pm2 2>/dev/null || true
pm2 start npm --name edu-manage -- start -- -p "${PORT}"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "============================================"
echo "  部署完成!"
echo "  访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'SERVER_IP'):${PORT}"
echo "============================================"
