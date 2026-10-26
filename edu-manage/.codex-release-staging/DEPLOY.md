# 牧哲学堂 部署文档

> 每次代码更新后，按此文档操作部署到阿里云服务器。

## 环境信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | `112.124.67.56` |
| 项目路径 | `/opt/edu-manage` |
| 数据库 | PostgreSQL 127.0.0.1:5432 |
| 进程管理 | PM2（进程名 `edu-manage`） |
| Node 版本 | 见 `.nvmrc` |

---

## 一、本机一键构建（Docker Linux 预构建）

> 前置条件：Docker Desktop 已启动且引擎就绪（Linux 容器 + WSL 2 后端，内存 ≥4GB）。
> 构建全程在 Docker 的 Linux x64 Node 22 环境中完成，与服务器 Ubuntu 环境一致，
> 不会把 Windows 的 `.next` / `node_modules` 上传服务器。

在 Windows 项目目录下执行：

```powershell
cd "D:\01muzhexuetang\muzhexuetang\coding\edu-manage"

powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1
```

自动执行：

```text
Windows 项目源码
    ↓
Docker Linux Node 22（node:22-bookworm-slim，glibc 与 Ubuntu 兼容）
    ↓
npm ci（Linux 原生依赖：Prisma / Sharp 等）
    ↓
Prisma generate
    ↓
Next.js production build（standalone 输出）
    ↓
组装 .next/standalone + public + prisma 迁移工具链
    ↓
生成 release\edu-manage-runtime-日期.tar.gz（内含 Linux node_modules，服务器零安装）
```

可选参数：

| 参数 | 说明 |
|------|------|
| `-Registry https://registry.npmmirror.com` | npm 镜像加速（国内网络推荐） |
| `-NoCache` | 不使用 Docker 构建缓存（脚本或依赖异常时用） |

---

## 二、上传到服务器

```powershell
scp ".\release\edu-manage-runtime-20260827-1530.tar.gz" root@112.124.67.56:/tmp/
```

或用阿里云控制台 → ECS → 远程连接 → **Workbench** → 文件传输，拖拽到 `/tmp/`。

---

## 三、服务器部署（免安装、免构建）

SSH 连接服务器，只需一条命令：

```bash
cd /opt/edu-manage
bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-20260827-1530.tar.gz
```

脚本自动完成：

```text
1. 备份 .env
2. 备份数据库（pg_dump，双库自动处理）
3. 备份上传文件（public/uploads 与独立 UPLOAD_DIR）
4. 停止旧 PM2 进程 → 清理旧运行产物
5. 解压预构建程序（Linux x64 standalone）
6. 恢复 .env 与上传文件
7. Prisma 数据库迁移（migrate-all，双库）
8. 重启 PM2（node --env-file=.env server.js）
9. 健康检查（curl /login，失败自动打印日志）
```

**不再执行**：`npm install` / `npm run build` / `npx prisma generate`，2核4G 服务器 1~2 分钟即可完成部署。

---

## 五、验证部署

```bash
# 检查服务状态
pm2 status

# 检查最近日志（无报错 = 正常）
pm2 logs edu-manage --lines 10

# 检查端口是否在监听
netstat -tlnp | grep 3000
```

浏览器访问：**http://112.124.67.56:3000**

---

## 六、常见问题速查表

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `Could not find a production build in '.next'` | 服务器 `.next` 被误删或不完整 | 重新上传预构建包并执行部署脚本（本机无需重新构建时直接再传一次） |
| `Property 'xxx' does not exist` | Prisma 客户端版本不符 | 本机重新执行预构建（`prisma generate` 已内置于 Docker 构建）后重新部署 |
| 种子数据报表不存在 | 未执行生产迁移 | 部署脚本已自动执行 `migrate-all`；可手动再跑 `bash scripts/migrate-all.sh` |
| 部署脚本健康检查失败 | 迁移未完成或 .env 异常 | 查看 `pm2 logs edu-manage --lines 50` |
| 登录后跳转失败 | `.env` 未恢复 | 检查 `NEXTAUTH_URL` 和 `NEXTAUTH_SECRET`（部署脚本自动备份/恢复 .env） |
| PM2 不停重启刷屏 | standalone 产物损坏 | 本机重新执行 `build-linux-release.ps1` 再部署 |
| 上传的 tar 包解压后文件不全 | 上传中断 | 确认包完整（本地 `ls -lh` 对照大小），重新上传再部署 |
| 构建时 npm ci 太慢 | 国内网络访问官方 registry 慢 | `build-linux-release.ps1 -Registry https://registry.npmmirror.com` |
| `prisma migrate` 报错 | 数据库连接或迁移冲突 | 双库环境必须用 `migrate-all`（部署脚本已内置），单独 `migrate deploy` 只更新一个库 |

---

## 七、安全与维护守则 (Operational Guardrails)

为确保部署安全与系统稳定，请遵循以下规范：

1.  **打包前安全检查**：
    在执行打包命令前，务必运行：
    ```bash
    npm run security:check
    ```
    该脚本会检查是否存在未加密的 `.env` 文件或本地数据库文件，防止泄露。

2.  **Schema 同步必行**：
    每次部署后（特别是包含数据库变更的版本，如 6月7日的反馈字段扩展），必须在服务器执行：
    ```bash
    npm run migrate:all
    ```
    确保两个分部数据库结构与生产代码完全一致。双库环境必须用 `npm run migrate:all`，单独的 `prisma migrate deploy` 只会更新一个库。

3.  **产物异常处理**：
    如果部署后页面未更新或报错，说明预构建产物与预期不符，重新执行本机预构建并重新部署：
    ```powershell
    powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1
    ```
    （服务器端不要手工删 `.next` / 重跑 build，产物一律来自 Docker 预构建）

4.  **安全**：构建产物**不包含 `.env`**（构建脚本已排除），服务器密钥只存在于服务器本地的 `.env`，由部署脚本自动备份/恢复。

## 七·补、常见问题（预构建模式）

| 问题 | 解决 |
|------|------|
| 构建时 `prisma generate` 报 `ECONNRESET` | 国内网络访问引擎服务器不稳定，自动重试；仍失败则稍后重跑脚本 |
| 构建时 `npm ci` 报网络错误 | 用镜像重跑：`build-linux-release.ps1 -Registry https://registry.npmmirror.com` |
| `npm ci` 报 `package.json and package-lock.json are not in sync` | 本地先执行 `npm install`（自动补全 lockfile）后重新构建 |

## 八、环境变量检查清单

部署后确认 `.env` 中以下变量都存在：

```
DATABASE_URL          → PostgreSQL 连接串
NEXTAUTH_SECRET       → 任意随机字符串
NEXTAUTH_URL          → http://112.124.67.56:3000
AUTH_TRUST_HOST       → true
DEEPSEEK_API_KEY      → DeepSeek API 密钥
MIMO_API_KEY          → MiMo API 密钥（可选）
KIMI_API_KEY          → Kimi API 密钥（可选）
WXPUSHER_APP_TOKEN    → 微信推送 Token
```

---

## 九、紧急回滚

如果新版本有问题，用上一版预构建包回滚（同样免安装、免构建）：

```bash
cd /opt/edu-manage
bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-上一版.tar.gz
```

数据库如需回滚，用 `scripts/backup-db.sh` 生成的 `/data/backups/edu-manage/*.dump` 恢复。
