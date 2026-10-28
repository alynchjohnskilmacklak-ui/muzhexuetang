# edu-manage Docker 镜像部署说明（2026-09-12）

本机已构建并验证生产镜像，服务器只需 `docker load` + 切换容器，不编译、不装依赖。

## 一、本机已完成（无需重复）

| 项目 | 结果 |
|---|---|
| 生产镜像构建 | `edu-manage-app:latest`（Dockerfile runner target，Next.js 16.3.4 standalone） |
| 镜像冒烟测试 | `/about`、`/`、`/login` 均 200；重设计后的官网 about/home 已打进镜像 |
| 镜像导出 | `release/edu-manage-app-20260912-1524.tar.gz`（260.6 MB） |
| 完整性校验 | SHA256 `c9f8e0da9608aee148f08d04c20167c3c8ad1a692faa02d34675fb953a644912` |
| 上传总包 | `release/edu-manage-docker-deploy-20260912-1524.tar`（含镜像包 + sha256 + 部署脚本） |

构建期间对本机源码做了两处构建配置优化（已生效）：
- `Dockerfile`：builder 阶段 `NODE_OPTIONS` 提到 2048MB（原 1536 在多核机上 OOM）
- `next.config.ts`：`experimental.cpus: 2`（限制 Next 并行构建 worker，防止高核机内存峰值超限）

## 二、服务器部署（一次性操作，约 3-5 分钟）

### 1. 上传总包到服务器 `/tmp/`

阿里云 Workbench 或 scp：

```powershell
scp ".\release\edu-manage-docker-deploy-20260912-1524.tar" root@服务器IP:/tmp/
```

### 2. 解开总包并安装脚本

```bash
cd /tmp
tar -xf edu-manage-docker-deploy-20260912-1524.tar
mkdir -p /opt/edu-manage/scripts
install -m 755 /tmp/scripts/deploy-docker.sh /opt/edu-manage/scripts/deploy-docker.sh
```

### 3. 检查服务器 Docker

```bash
docker --version && docker compose version
```

若未安装 Docker，先执行一次（首次初始化会建 4G swapfile 并装 docker.io/nginx）：

```bash
bash /opt/edu-manage/scripts/bootstrap-docker-host.sh
```

### 4. 执行部署

```bash
bash /opt/edu-manage/scripts/deploy-docker.sh /tmp/edu-manage-app-20260912-1524.tar.gz
```

脚本自动执行：
1. SHA256 完整性校验
2. 数据库备份（调用服务器现有 backup-db.sh，双库）
3. 保留旧镜像为 `edu-manage-app:rollback-<时间戳>`（回滚用）
4. `docker load` 新镜像
5. 停 PM2 的 edu-manage、移除旧容器
6. 以 **host 网络**启动新容器（直连服务器系统 PostgreSQL 127.0.0.1:5432，数据零迁移），挂载 `/opt/edu-manage/shared/public/{uploads,services,marketing,business-assets,volunteer/docs}` 与 `/data/backups/edu-manage`
7. 健康检查 `http://127.0.0.1:3000/login`（最多 90 秒）
8. 失败自动回滚旧镜像；成功清理回滚标签

## 三、部署后验证

```bash
docker ps --filter name=edu-manage-app
curl -I http://127.0.0.1:3000/login
curl -I https://muzhexuetang.xyz/login
curl -s https://muzhexuetang.xyz/about | grep -c "学员进步对比"   # 应 ≥ 1
docker logs edu-manage-app --tail 30 --timestamps
```

浏览器 `Ctrl+F5` 强刷后检查：
- 官网首页/关于页为新的全宽 4 列布局（不再有大空白）
- 登录、家长端、教师端功能正常

## 四、回滚

```bash
# 查看保留的回滚标签
docker images | grep rollback
# 切换回旧版本
docker rm -f edu-manage-app
docker run -d --name edu-manage-app --restart unless-stopped --network host \
  --env-file /opt/edu-manage/shared/.env \
  -e APP_ROOT=/app -e UPLOAD_DIR=/app/public/uploads \
  -e BACKUP_DIR=/data/backups/edu-manage -e BACKUP_SCRIPT=/app/scripts/backup-now.sh \
  -e NODE_ENV=production -e NODE_OPTIONS=--max-old-space-size=640 \
  -v /opt/edu-manage/shared/public/uploads:/app/public/uploads \
  -v /opt/edu-manage/shared/public/services:/app/public/services \
  -v /opt/edu-manage/shared/public/marketing:/app/public/marketing \
  -v /opt/edu-manage/shared/public/business-assets:/app/public/business-assets \
  -v /opt/edu-manage/shared/public/volunteer/docs:/app/public/volunteer/docs \
  -v /data/backups/edu-manage:/data/backups/edu-manage \
  edu-manage-app:rollback-<时间戳>
```

## 五、注意事项

- 数据库继续使用服务器系统 PostgreSQL，**没有**数据迁移，容器只在 3000 端口接管 Nginx 反代的后端。
- 上传/业务素材目录继续在 `/opt/edu-manage/shared/public/`，与容器镜像内静态页（about/home）互不覆盖。
- 若 Nginx 此前直读了 `/opt/edu-manage/.next/static`（旧 PM2 方案），首次切换后新版本静态资源哈希变化，Nginx 需把 `_next/static` 也回源到 127.0.0.1:3000（或按旧文档刷新 `.next` 软链）。切换后务必验证页面 CSS 是否正常加载。
- 每次部署流程固定为：本机构建 → 导出 → 上传总包 → 服务器解包 → `bash deploy-docker.sh`。
