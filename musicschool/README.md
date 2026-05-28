# 牧哲学堂教育管理系统

牧哲学堂（MOREJOY Education）教育管理平台，支持管理员、教师、家长三端协作。

## 技术栈

- **框架**: Next.js 16 + React 19
- **语言**: TypeScript
- **UI**: Ant Design 5 + Tailwind CSS 4
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth v5 (Credentials Provider)
- **数据获取**: SWR

## 本地启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库连接信息

# 3. 初始化数据库
npx prisma db push
npx prisma generate

# 4. 初始化种子数据（访问一次即可）
curl http://localhost:3000/api/setup

# 5. 启动开发服务器
npm run dev
```

## 环境变量说明

```env
DATABASE_URL="postgresql://user:password@localhost:5432/muzhexuetang"
AUTH_SECRET="your-auth-secret"
```

## 默认演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@test.com | 123456 |
| 家长1 | parent1@test.com | 123456 |
| 家长2 | parent2@test.com | 123456 |

教师账号：`{姓名拼音}@tea.com`，密码为姓名拼音（如 `wanglaoshi@tea.com` / `wanglaoshi`）。

## 主要功能模块

### 管理员端
- **排课系统**: 教室矩阵、教师课表、周总览，支持一对一/小班课排课
- **考勤管理**: 课程签到，按日期/教师/班型筛选
- **学员管理**: 学员档案、课时管理、状态跟踪
- **教师管理**: 教师信息、资质、评级管理
- **课程管理**: 班级管理、课次安排
- **试卷管理**: 试卷录入、批改、推送家长
- **表现反馈**: 课堂表现记录、家长推送
- **成绩管理**: 考试成绩记录与分析
- **志愿填报**: 石家庄中考志愿填报指南
- **报表统计**: 多维度数据报表

### 教师端
- **我的课表**: 精品班课/突击全能班双Tab
- **工作台**: 待处理事项、课程时间线
- **表现反馈**: 多学员批量反馈
- **考勤录入**: 可视化考勤网格

### 家长端
- **首页**: 学员概览、情绪日历、通知
- **教师信息**: 教师卡片、学历背景
- **课程表**: 节次矩阵课程表
- **考勤**: 考勤日历与统计

## 数据库迁移

```bash
# 开发环境直接推送
npx prisma db push

# 生产环境使用迁移
npx prisma migrate deploy
npx prisma generate
```
