---
name: edu-manage-code-review
description: "Use when the user wants to review, audit, walk through, or quality-check the 牧哲学堂 edu-manage education management system codebase — covering UI design, data security, feature completeness, data maintenance, emergency/unscheduled arrangement coordination (请假/调课/停课/补课/校区关闭/教师替换), and user experience. Also use to re-verify whether previously reported issues (edu-manage-code-review-20260719.md / edu-manage-code-review-20260724.md) have been fixed, or to generate a remediation work order. Scope is STRICTLY limited to the edu-manage/ project directory; all other repositories, backup tarballs, and dependency folders in the workspace are off-limits — never download, clone, or install anything. Read-only by default: do not modify code unless the user explicitly asks for fixes."
argument-hint: "[维度] [范围]"
user-invocable: true
license: Internal use for 牧哲学堂 edu-manage project
---

# edu-manage 代码审查 Skill

审查牧哲学堂教育管理系统（`edu-manage/`），覆盖 6 个维度：UI/UX 设计、数据安全与权限、业务功能与突发安排协调、数据维护与一致性、功能完善度与用户体验。

## 0. 铁律（先读这一节）

1. **只审查 `edu-manage/` 一个项目**，其余一律不碰。
2. **禁止任何下载/克隆/安装**：`npm install`、`git clone`、`curl` 下载、`pip install` 全部禁止。
3. **禁止启动服务器、禁止连接生产数据库、禁止 `prisma db push`、禁止修改 `.env`**。
4. **只读审查**：默认不修改任何代码；用户明确要求修复时才改。
5. 每条发现必须给出**真实文件路径 + 行号**，禁止臆测；不确定的写"待核实"。

## 1. 项目范围界定（防乱探索）

**唯一审查目标**: `D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16 + React 19 + AntD 5 + Tailwind 4 + Prisma 5 + PostgreSQL 双库，管理员/教师/家长三端）。

**工作区根目录 `D:\01muzhexuetang\muzhexuetang\coding\` 已于 2026-07-24 归档整理，除 `edu-manage/` 外一律禁止探索**：

- `_archive/`（部署包 `edu-manage-deploy-*.tar.gz`、旧部署副本、`old-tar-backup/` 历史备份）—— 禁止
- `_vendor/`（第三方仓库：`firecrawl`、`firecrawl-duplicate`、`github-mcp-server`、`github-mcp-server-duplicate`、`MinerU`、`awesome`）—— 禁止
- `_projects/`（`mu-zhe-smart-edu-video`）—— 禁止
- 依赖与缓存：`node_modules/`、`cachenpm/` —— 禁止
- 含凭据的本地代理配置：`chain-*.yaml`、`openai-*.yaml` —— 禁止打开、禁止输出内容
- `migrate-agent-data-to-d.ps1`、根目录 `package.json`/`package-lock.json`（仅 claude-code 包装脚本）—— 禁止
- 审查报告（可读）：`edu-manage-code-review-20260719.md`（第一轮）、`edu-manage-code-review-20260724.md`（第二轮·整理版，含编号/状态/验收标准）

**`edu-manage/` 内部同样注意**：`node_modules/`、`.next/`、`tmp/`（LibreOffice 配置）、`outputs/`、`api.zip`、`prisma.zip`、`scripts.zip`、`src.zip` 不读；`edu-manage/.env` **可读但严禁输出其中的密钥/密码/连接串到报告**（涉及时写 `<redacted>`）。

## 2. 审查维度（六维）

| 维度 | 重点 |
|------|------|
| ① UI/UX 设计 | DESIGN.md 一致性（warm light 主题、#E8784A 主色、圆角 10/14、禁渐变/禁第二强调色/禁 side-stripe）、三端配色/页头统一、暗色残留、toast 统一、loading/空/错状态、可访问性（非语义可点击、aria）、破坏性操作确认、移动端 360px |
| ② 数据安全与权限 | 鉴权覆盖（apiHandler 包装率）、IDOR/越权、跨校区隔离（division 是否来自 session）、敏感信息日志、SSRF、上传链路、依赖漏洞（`npm audit --omit=dev`）、限流、危险操作二次确认 |
| ③ 业务功能与突发安排 | 排课/考勤/扣课时/薪资/通知闭环；请假（家长/教师）、调课、停课、补课、校区关闭、教师替换的端到端链路：是否通知、是否校验冲突、是否闭环、是否对账 |
| ④ 数据维护与一致性 | schema vs migrations 漂移（尤其部分唯一索引）、索引覆盖、Float 精度、事务完整性、备份/恢复（sha256、保留策略）、cron 调度、数据健康脚本 |
| ⑤ 功能完善度 | 三端导航可达性（孤儿页）、声明功能 vs 实际入口、看板指标真实性、配置项是否被消费、阈值一致性 |
| ⑥ 用户体验 | 关键旅程（家长激活→课表→缴费→反馈；教师考勤→反馈→请假→薪资）、反馈与异常体验、长列表分页、通知体系、搜索效率 |

## 3. 必读文件（按此顺序，控制上下文）

0. `WORKSPACE.md`（根目录目录分类说明：工作区结构、禁止探索区、维护约定）
1. `edu-manage/AGENTS.md` 与 `edu-manage/CLAUDE.md`（项目规则与设计系统摘要）
2. `edu-manage/DESIGN.md`（完整设计系统）、`edu-manage/PRODUCT.md`、`edu-manage/README.md`
3. `edu-manage/docs/frontend-rules.md`、`docs/production-safety.md`、`docs/database-management.md`
4. 第一轮报告 `edu-manage-code-review-20260719.md`、第二轮整理版 `edu-manage-code-review-20260724.md`（**先复检已知问题，再找新问题**）
5. 基础设施：`src/lib/api-handler.ts`、`src/lib/rate-limit.ts`、`src/lib/prisma.ts`、`src/lib/auth/guards.ts`、`src/proxy.ts`、`src/constants/theme.ts`

**NOT 注意**: edu-manage 用的是 Next.js 16（有破坏性变更），不熟悉时参考 `edu-manage/node_modules/next/dist/docs/` 的官方文档再下结论，不要凭旧版知识臆断。

## 4. 已知问题基线（复检优先）

审查前先对照第二轮报告（`edu-manage-code-review-20260724.md`）的编号清单逐项复检，**已修复的标注 ✅，未修复的引用旧编号**，避免重复报告同一问题。核心编号速查：

- **P0 资金链路**：F-01 扣课时竞态（`admin/attendance/submit/route.ts:111-115`）、F-02 薪资非原子（`:275-277`）、F-03 课时费无唯一约束（`teacher-salary.ts:137`）、F-04 批量复制无事务（`copy-friday-to-saturday/route.ts:275-298`）、F-05 停课双路径退款不一致、F-06 收费不联动课时（`fees/route.ts:227-242`）、F-07 停课退款不核对实际扣减
- **突发安排**：E-01 请假零联动、E-02 教师请假模块缺失、E-03 调课不通知不查冲突、E-04 补课无 UI 不闭环、E-05 突发通知无微信推送、E-06 校区关闭无通知、E-07 教师替换无冲突检查、E-08 缺对账报表
- **安全**：S-01 fees/[id] 跨校区越权、S-02 20 个路由未包 apiHandler、S-03 PII 日志（`teacher-salary.ts:585-595`）、S-04 SSRF（`recognize/route.ts:78`、`ai/chat/route.ts:286-291`）、S-05 cleanup 硬删无确认、S-07 依赖漏洞（next-auth critical 等）
- **数据维护**：D-01 部分唯一索引未入 schema、D-02 生产 db push、D-03 备份误删手动备份、D-04 Float 23 处、D-05 缺索引、D-06 双 parent 字段
- **UI**：U-01 双橙 55 处+冷灰、U-02 暗色残留（`parent/performance/client.tsx:82`）、U-03 紫渐变 banner、U-04 模拟缴费、U-06 双 toast、U-07 三端外壳配色
- **功能**：G-01 缴费页孤儿页、G-02 通知设置死配置、G-03 cron 无调度、G-04 看板空数据

复检命令示例（只读）：

```bash
# 旧问题定位（在 edu-manage 目录下）
grep -n "alreadyDeducted" src/app/api/admin/attendance/submit/route.ts
grep -rn "console.log" src/lib/teacher-salary.ts | head -20
# 未包装路由统计
grep -rLn "apiHandler" src/app/api --include="route.ts"
# 依赖审计（只读，不安装）
npm audit --omit=dev --json
```

## 5. 审查流程

1. **读必读文件**（§3），明确项目规则与已知基线。
2. **确定本次范围**：用户指定维度则聚焦该维度；未指定则六维全查但控制深度（每维 5-8 条最有价值的发现）。
3. **复检已知问题**（§4），记录状态变化。
4. **深挖新问题**：按维度打开对应目录/路由，逐文件核对；每个发现记录 `文件:行号` 与证据。
5. **输出报告**（§6 模板）。

## 6. 输出报告模板（Markdown，中文）

```markdown
# edu-manage 审查报告（YYYY-MM-DD）
**范围**: 本次审查维度/目录
**方法**: 只读审查，未修改代码

## 总体评价（一段话）
## 发现清单（按严重度 P0>P1>P2 排序）
每条:
- **【P0】标题** — `文件:行号`
  - 问题: …
  - 证据: 引用关键代码/结构
  - 建议: …
## 旧问题复检（编号 → ✅已修复 / ⚠️部分修复 / ❌未修复 + 证据）
## 亮点（做得好的，防止误改）
## 优先修复顺序（Top 5）
```

要求：给每条发现分配编号（新问题用 N-01…），若命中第二轮报告已有编号（F/E/S/D/U/G 系列）则直接引用旧编号并标注"复检"。

## 7. 常见陷阱提示

- 双库模式：`getRequestPrisma()` 从 session 取库；URL 参数带 division 的路由要警惕跨校区越权。
- `apiHandler` 包装 ≠ 有鉴权：包装只提供限流/错误处理，鉴权看 `requireAdminUser/requireTeacherUser/requireParentUser` 或 `getCurrentUser`。
- 部分唯一索引（`WHERE "isActive" = true` 等）Prisma schema 无法表达，存在于 raw SQL 迁移——**不要用 `prisma db push` 验证 schema**（会删索引），改用 `prisma migrate status`。
- 家长端是移动优先（目标用户 35-50 岁），UI 问题按 360px 宽度视角判断。
- `xlsx`、`next-auth` 等已知高危依赖复检时以 `npm audit` 实际输出为准。
- 不要因为"旧报告写过"就跳过——很多问题（F-01/F-02/F-04）确认仍存在，复检结论本身有价值。
