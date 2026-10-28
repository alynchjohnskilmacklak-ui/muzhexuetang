# 部署包与本地目录审计（2026-09-01）

## 结论

生产部署继续使用 `scripts/build-linux-release.ps1` 生成的 Linux standalone 包。服务器只接收同名的 `.tar.gz` 与 `.tar.gz.sha256` 两个文件，不上传源码目录、Windows `.next`、完整 `node_modules` 或业务上传资料。

旧运行包抽样结果：压缩后约 76 MB，解压后约 195 MB。主要占用来自 Next.js 运行依赖、`.next` 服务端产物和独立 Prisma 迁移工具，均为生产启动或迁移所需。可确认的冗余是全量复制 `scripts/` 和 `prisma/`，现已改为白名单。

## 发布包白名单

- `server.js`、`.next/` 和 Next.js standalone 追踪到的 `node_modules/`；
- 版本自带的普通 `public/` 静态资源；
- `prisma/schema.prisma`、`prisma/migrations/`；
- `.deploy-tools/` 中的独立 Prisma CLI；
- `scripts/backup-db.sh`；
- `scripts/migrate-all.sh`；
- `scripts/deploy-prebuilt-tar.sh`；
- `package.json`、`release-manifest.json`。

## 必须排除

- `.env*`、密钥、证书、数据库文件、日志；
- `.git`、`.next`（Windows 本地产物）、`node_modules`（完整开发依赖）；
- docs、测试审查产物、设计参考、缓存、临时目录和旧压缩包；
- seed、数据修复、导入、导出和海报生成脚本；
- `public/uploads`、`public/services`、`public/marketing`、`public/business-assets`、`public/volunteer/docs`。

服务器共享目录必须保存在 `/opt/edu-manage/shared/`。部署脚本先备份数据库，在候选端口通过健康检查后才切换 PM2，并保留最近 5 个服务器版本。

## 本地目录保留规则

- `release/`：只保留最近 2 个完整发布包及对应 SHA256；
- `node_modules/`：本地开发依赖，保留；
- `src/`、`prisma/migrations/`、`public/`、`data/`：源码和正式业务资源，保留；
- `.next/`、`tmp/`、`cachenpm/`、`output/`、`.review/`、根目录旧 tar/zip/log：均为可再生成产物，可清理。

## 本次验证状态

- PowerShell 打包脚本已通过语法解析，相关改动已通过 `git diff --check`。
- 清理后保留的两个旧发布包均通过同名 SHA256 校验，只作为回退/重传备份。
- 新白名单包的 Linux 实构建尚未完成：本机 Docker Desktop 4.78.0 启动时在 `dockerInference` 运行时文件上报错并自动退出，构建脚本在 Docker 引擎预检阶段安全停止，未生成半成品。
- Docker Desktop 恢复正常后，应重新运行构建命令；只有脚本完成 Linux `/login` 冒烟检查和包内容白名单检查后，新包才可上传生产服务器。
