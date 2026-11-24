# Linux 预构建部署

本流程在 Windows 本机的 Linux Docker 容器中完成依赖安装、Prisma Client 生成和 Next.js 构建。阿里云服务器只负责校验、备份、迁移、解压和重启，不再执行 `npm install` 或 `npm run build`。

## 日常三步

### 1. 本机构建

```powershell
cd "D:\01muzhexuetang\muzhexuetang\coding\edu-manage"
powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1 -Registry https://registry.npmmirror.com
```

构建会生成两个文件：

```text
release\edu-manage-runtime-YYYYMMDD-HHMM.tar.gz
release\edu-manage-runtime-YYYYMMDD-HHMM.tar.gz.sha256
```

脚本会自动执行 Linux 运行时冒烟检查。只有 `/login` 检查通过才会输出安装包。
本机 `release/` 默认只保留最近 2 个完整版本；可以用 `-KeepLocalReleases 3` 调整，但不建议长期堆积旧包。

### 发布包里应该有什么

发布包是可直接启动的 Linux 运行包，不是源码备份，只包含：

- Next.js standalone 服务端和 `.next/static`；
- Next.js 实际追踪到的生产运行依赖；
- 需要随版本发布的 `public/` 静态资源；
- `prisma/schema.prisma` 与完整 `prisma/migrations/`；
- 独立 Prisma CLI，用于服务器免安装执行迁移；
- `backup-db.sh`、`migrate-all.sh`、`deploy-prebuilt-tar.sh`；
- `release-manifest.json` 与运行所需的 `package.json`。

发布包明确不包含：

- `.env`、密钥、数据库文件和本机日志；
- 源代码、测试、文档、设计稿、缓存和旧发布包；
- 完整开发依赖；
- seed、数据修复、导入、海报生成等一次性脚本；
- `public/uploads`、`public/services`、`public/marketing`、`public/business-assets`、`public/volunteer/docs`。

最后五类目录属于服务器共享数据，由 `/opt/edu-manage/shared/public/` 持久保存并链接到每个版本，不能通过发布包覆盖。

### 2. 上传两个文件

```powershell
scp ".\release\edu-manage-runtime-YYYYMMDD-HHMM.tar.gz" root@<服务器IP>:/tmp/
scp ".\release\edu-manage-runtime-YYYYMMDD-HHMM.tar.gz.sha256" root@<服务器IP>:/tmp/
```

### 3. 服务器执行

```bash
cd /opt/edu-manage
bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-YYYYMMDD-HHMM.tar.gz
```

部署脚本会依次完成：SHA256和环境预检、数据库备份、Prisma迁移、候选端口健康检查、PM2切换、正式健康检查。候选版本失败时不会停止旧服务；正式切换失败时会尝试自动恢复旧版本。

## 第一次启用预构建部署

服务器上的旧版 `deploy-prebuilt-tar.sh` 不具备版本化发布保护。第一次必须先单独更新脚本：

```powershell
scp ".\scripts\deploy-prebuilt-tar.sh" root@<服务器IP>:/tmp/deploy-prebuilt-tar.sh
```

```bash
cd /opt/edu-manage
install -m 755 /tmp/deploy-prebuilt-tar.sh scripts/deploy-prebuilt-tar.sh
bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-YYYYMMDD-HHMM.tar.gz
```

部署成功后，安装包中的脚本会自动更新服务器稳定入口，后续不需要再单独上传脚本。
部署成功时也会更新 `/opt/edu-manage/scripts/backup-db.sh`，保证每日数据库备份任务使用当前审核过的脚本。

## Nginx 静态资源直出（仅版本化预构建部署）

仓库提供 `deploy/nginx/edu-manage-prebuilt.conf`，用于本节的 `/opt/edu-manage/current` 版本化发布方式。它从当前版本直接提供 `/_next/static/` 和 `public/` 下的 `/images/`、`/teacher-portraits/`、`/about-images/`、`/videos/`、`/people/`、`/stickers/`，减少这些静态请求经过 Node.js 的开销。缓存时长与 `next.config.ts` 对应；Nginx gzip 只在 `/_next/static/` 的静态资源位置启用。

这个站点文件是预构建部署的可选配置。**Docker/Compose 部署继续使用原来的 Nginx 配置**，不要把 `/opt/edu-manage/current` 路径套用到容器发布。未列出的路径继续由 Next.js 处理；特别是 `/uploads/`、`/api/`、`/services/`、`/marketing/`、`/business-assets/` 和 `/volunteer/docs/` 没有配置 Nginx 直出。静态文件不存在时也会回源到 Next.js。

如要启用，请先在服务器上确认当前部署由 `scripts/deploy-prebuilt-tar.sh` 管理，并将该配置安装为活动站点配置。之后先执行 `sudo nginx -t`；只有检查通过后，运维人员再按既有变更流程重载 Nginx。不要在未确认部署模式时切换此配置。

## 服务器目录

```text
/opt/edu-manage/
├── current -> releases/当前版本
├── releases/                 # 不可变程序版本，默认保留最近5个
├── shared/
│   ├── .env
│   └── public/
│       ├── uploads/
│       ├── services/
│       ├── marketing/
│       ├── business-assets/
│       └── volunteer/docs/
└── scripts/deploy-prebuilt-tar.sh
```

第一次版本化部署会从现有 `/opt/edu-manage/.env` 和 `public/` 中迁移共享内容。后续版本只链接这些目录，不覆盖家长资料、上传文件和服务器管理的业务素材。

## 前置条件

部署脚本会在停止服务前检查：

- Node.js 22或更高版本；
- PM2、curl、OpenSSL；
- `pg_dump` 与 `psql`；
- `pg_dump` 主版本不低于PostgreSQL服务器主版本；
- `.env` 中的HTTPS站点地址、32位以上认证密钥和数据库地址；
- 压缩包完整性、SHA256和可用磁盘空间。

## 部署后检查

```bash
pm2 status edu-manage
curl -fsS http://127.0.0.1:3000/login >/dev/null && echo OK
readlink -f /opt/edu-manage/current
pm2 logs edu-manage --lines 30 --nostream
```

程序版本可以自动恢复，但数据库迁移不会自动回退。生产迁移必须保持向后兼容，破坏性数据库修改需要单独安排维护和恢复方案。
