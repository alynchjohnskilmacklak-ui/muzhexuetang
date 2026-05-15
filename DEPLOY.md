# 部署上线指南

## 第一步：创建 Supabase 数据库（2分钟）

1. 打开 https://supabase.com → 用 GitHub 登录
2. 点击 "New project" → 输入名称 "edu-manage" → 设置数据库密码（记住它）
3. 等待数据库创建完成（约2分钟）
4. 进入 Settings → Database → Connection String → 选择 URI → 复制连接字符串

## 第二步：切换 PostgreSQL

```bash
# 替换 schema
cp prisma/schema.pg.prisma prisma/schema.prisma
# 安装 PostgreSQL 依赖
npm install @prisma/client
npx prisma generate
```

## 第三步：配置环境变量

编辑 `.env`：
```
DATABASE_URL="你复制的 Supabase 连接字符串"
NEXTAUTH_SECRET="运行 openssl rand -base64 32 生成"
NEXTAUTH_URL="https://你的域名.vercel.app"
```

## 第四步：推送数据库并导入种子数据

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

## 第五步：部署到 Vercel

1. 推送代码到 GitHub
   ```bash
   git init && git add -A && git commit -m "feat: education management system"
   git remote add origin https://github.com/你的用户名/edu-manage.git
   git push -u origin main
   ```
2. 打开 https://vercel.com → 用 GitHub 登录
3. 点击 "New Project" → 导入你的 GitHub 仓库
4. 在 Environment Variables 中添加：
   - `DATABASE_URL` = 你的 Supabase 连接字符串
   - `NEXTAUTH_SECRET` = 你的随机密钥
   - `NEXTAUTH_URL` = `https://你的项目名.vercel.app`
5. 点击 Deploy

部署完成后，你的家长就可以通过 `https://你的项目名.vercel.app` 访问了。

## 本地开发（SQLite）

本地开发继续使用 SQLite，不需要 PostgreSQL。
切换到 PostgreSQL 只在部署前执行一次。
