#!/usr/bin/env bash
set -e
# ====== 牧哲学堂 tar 部署脚本 ======
# 用法：将 tar 包上传到 /tmp/，然后执行此脚本
# scp deploy-xxx.tar root@112.124.67.56:/tmp/
# ssh root@112.124.67.56 "bash /opt/edu-manage/deploy-from-tar.sh deploy-xxx.tar"
#
# 步骤：备份.env → 解压 → 恢复.env → npm install → prisma → 构建 →
#       复制static到standalone（关键！） → 重启PM2

TAR_NAME="${1:-deploy.tar}"
PROJECT_DIR="/opt/edu-manage"
BUILD_LOG="${PROJECT_DIR}/build.log"

cd "${PROJECT_DIR}"

echo "========================================="
echo " 牧哲学堂部署: $(date '+%Y-%m-%d %H:%M:%S')"
echo " 包名: ${TAR_NAME}"
echo "========================================="

# ---- 1. 备份 .env ----
echo "[1/7] 备份 .env"
cp .env /tmp/edu-manage.env.bak

# ---- 2. 解压 ----
echo "[2/7] 解压 ${TAR_NAME}"
tar -xf "/tmp/${TAR_NAME}" -C "${PROJECT_DIR}"

# ---- 3. 恢复 .env ----
echo "[3/7] 恢复 .env"
cp /tmp/edu-manage.env.bak .env

# ---- 4. 安装依赖 ----
echo "[4/7] 安装依赖"
npm install

# ---- 5. Prisma ----
echo "[5/7] 生成 Prisma Client + 同步所有库（双库 JUNIOR+SENIOR）"
bash scripts/db-sync-all.sh

# ---- 6. 清理旧构建 + 重新构建 ----
echo "[6/7] 清理旧构建产物"
rm -rf .next

echo "[6/7] 开始构建（输出写入 ${BUILD_LOG}）"
npm run build 2>&1 | tee "${BUILD_LOG}"

# 检查构建是否失败
if grep -qE "Failed to compile|Build error|Next\.js build worker exited with code: [^0]" "${BUILD_LOG}"; then
  echo ""
  echo "❌ 构建失败！请检查 ${BUILD_LOG}"
  echo "   旧服务未受影响，仍在运行。"
  exit 1
fi

echo "[6/7] 构建成功"

# ---- 6b. 复制 static 到 standalone（关键！Next.js 不会自动复制） ----
echo "[6/7] 复制客户端静态文件到 standalone 目录"
cp -r .next/static .next/standalone/.next/static

# ---- 7. 重启 ----
echo "[7/7] 重启 PM2 服务"
pm2 delete edu-manage 2>/dev/null || true
pm2 start node --name edu-manage -- .next/standalone/server.js
pm2 save

echo ""
echo "========================================="
echo " ✅ 部署完成"
echo "    验证: curl -I http://localhost:3000/volunteer-sim"
echo "========================================="
