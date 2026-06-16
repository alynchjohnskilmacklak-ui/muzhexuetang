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

## 一、本地打包

在 Windows 项目目录下执行（PowerShell 或 Git Bash）：

```bash
cd D:\01牧哲学堂上课安排\01牧哲学堂上课安排\coding\edu-manage

# 清理旧包
rm -f ../edu-manage-20260526.tar

# 打包（只包含必要源码文件）
mkdir -p deploy-tmp
cp -r src prisma public scripts deploy-tmp/
cp package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs AGENTS.md deploy-tmp/
tar -cf "../edu-manage-20260526.tar" -C deploy-tmp .
rm -rf deploy-tmp

# 查看包大小（应该是 14MB 左右）
ls -lh ../edu-manage-20260526.tar
```

---

## 二、上传到服务器

1. 打开阿里云控制台 → ECS 实例 → 远程连接 → **Workbench**
2. 左侧菜单点击「文件传输」
3. 将本地 `edu-manage-20260526.tar` 拖拽到服务器 `/tmp/` 目录

---

## 三、服务器部署命令

SSH 连接服务器后，**逐条执行**：

```bash
# 1. 停止服务
pm2 stop edu-manage

# 2. 进入目录
cd /opt/edu-manage

# 3. 备份 .env（必须！tar 会覆盖）
cp .env /tmp/edu-manage.env.bak

# 4. 解压新代码
tar -xf /tmp/edu-manage-20260526.tar

# 5. 恢复 .env
cp /tmp/edu-manage.env.bak .env

# 6. 切换到 PostgreSQL schema
cp prisma/schema.pg.prisma prisma/schema.prisma

# 7. 安装依赖
npm install

# 8. 生成 Prisma 客户端
npx prisma generate

# 9. 生产迁移（新增表/字段时必执行）
# 双库环境必须使用 migrate:all；单独 prisma migrate deploy 只会更新一个库。
npm run migrate:all

# 10. 导入种子数据（有新学校数据时执行）
npx tsx scripts/seed-schools.ts

# 11. 构建项目（约 60 秒）
npm run build

# 12. 启动服务
pm2 start edu-manage --update-env

# 13. 保存 PM2 配置
pm2 save

# 14. 查看日志确认正常
pm2 logs edu-manage --lines 20
```

---

## 四、一键部署（可选）

所有步骤合并为一条命令：

```bash
pm2 stop edu-manage && cd /opt/edu-manage && cp .env /tmp/edu-manage.env.bak && tar -xf /tmp/edu-manage-20260526.tar && cp /tmp/edu-manage.env.bak .env && cp prisma/schema.pg.prisma prisma/schema.prisma && npm install && npm run migrate:all && npx tsx scripts/seed-schools.ts && npm run build && pm2 start edu-manage --update-env && pm2 save && pm2 logs edu-manage --lines 5
```

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
| `Could not find a production build in '.next'` | 构建失败或 .next 被删 | 执行 `npm run build` |
| `Property 'highSchoolInfo' does not exist` | Prisma 客户端未更新 | 执行 `npx prisma generate` |
| 种子数据报 `highSchoolInfo` 表不存在 | 未执行生产迁移 | 执行 `npm run migrate:all` |
| 构建卡住超过 3 分钟 | 内存不足或 .next 损坏 | `rm -rf .next && npm run build` |
| 登录后跳转失败 | `.env` 被覆盖 | 检查 `AUTH_URL` 和 `AUTH_SECRET` |
| Prisma 报 `url` 字段错误 | 全局 Prisma 版本不兼容 | 必须用 `npx prisma` 而非全局 `prisma` |
| PM2 不停重启刷屏 | .next 损坏 | `pm2 stop edu-manage` → 重新构建 |
| `tar` 解压后文件不全 | 上传中断 | 确认包大小 14MB，重新上传再解压 |
| `npm install` 报错 | node_modules 残留 | `rm -rf node_modules && npm install` |

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

3.  **清理旧产物**：
    如果部署后页面未更新或报错，尝试清理 `.next` 目录并重新构建：
    ```bash
    pm2 stop edu-manage
    rm -rf .next
    npm run build
    pm2 start edu-manage --update-env
    ```

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

## 八、紧急回滚

如果新版本有问题，用旧 tar 包恢复：

```bash
pm2 stop edu-manage
cd /opt/edu-manage

# 用上一个备份的 tar 包恢复
tar -xf /tmp/edu-manage-BACKUP.tar
cp /tmp/edu-manage.env.bak .env

npm install && npx prisma generate
npm run build && pm2 start edu-manage --update-env
```
