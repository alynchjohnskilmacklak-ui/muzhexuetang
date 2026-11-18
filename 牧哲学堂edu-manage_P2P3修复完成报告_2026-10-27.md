# 牧哲学堂 edu-manage P2/P3 修复完成报告（2026-10-27）

- 基线：`33b4353`（P0/P1 六项已上线后的工作树）
- 最终：`e4b07f1`（新增 **12 个 commit**，全部未 push，分支领先 origin/main 16）
- 范围：审查报告《牧哲学堂edu-manage代码审查报告_2026-10-27.md》P2（死代码清理、CSP、连通性一致）与 P3（audit 低危、布局中危、功能低危）
- 硬约束：任何删除均先静态引用分析（全仓 Grep + import/require + 动态 require + barrel 再导出链 + 测试/scripts/配置引用），零引用才删；存在引用或不确定一律保留并标注；每批删除后全量验证，失败即回滚；分批独立 commit
- 独立复核：`牧哲学堂edu-manage_P2P3独立复核报告_2026-10-27.md`（12/12 项通过，0 不通过）

---

## 一、逐项完成清单（P2）

| 项 | 状态 | 内容 | 验证 |
|---|---|---|---|
| **A1 死文件 12 个** | ✅ 已删 8 / 保留 2 | 删：reports/chartOptions.ts、settings/ParentAccountsTab.tsx、settings/TeacherAccountsTab.tsx、teacher/student-profile/[id]/client.tsx（page 为纯 redirect shim）、Parent/ParentTodayTimeline.tsx（同名数据函数 buildParentTodayTimeline 独立存活勿删）、teacher/StudentContextPanel.tsx、practice-sets/-h.ts、-j.ts（barrel 独缺注册）｜保留：attendance-stats.ts（仅测试引用）、volunteer-2025.ts（被 volunteer-sim 页面真实 import） | 每项全仓 grep 零引用；vitest 726/726、type-check 0、build 0、security 29/29、eslint src 0err/136warn |
| **A2 死端点** | ✅ 已删 | `/api/parent/notifications/[id]/read` PATCH（全仓 0 fetch 调用；实际用 POST mark-read + 详情页服务端直查库） | 同上，全绿 |
| **A3 死导出 58 个** | ✅ 已删 15 / 保留约 43 | 删：guards.ts 5 守卫（requireTenantContext/assertCanAccessClassGroup/assertCanAccessAttendance/getCurrentTeacherId/requireAdminOrOwnTeacher）、api-validate.ts 三件套（requireString/requireNumber/requireArray，ValidationError 在用保留）、teacher-portal.ts 3 工具（isTeacherRole/isAdminRole/getCurrentTeacher，requireCurrentTeacher/requireTeacherPage 在用保留）、teacher-salary.ts 2 分桶（resolveFeedbackCourseBucket×2）、export-brand.ts 2 印章（stampPdfBrand/stampPdfWatermark）｜保留：data-admin 回收站写路径（回收站为保留功能）、visibility 过滤函数（路由在用）、约 43 个未具名死导出（分报告未随附，按"不确定→保留"安全规则未动） | 15 个符号逐一 grep 零调用（共删 277 行）；全绿 |
| **A4 未使用依赖** | ✅ 已卸 7 | @fullcalendar/core、daygrid、interaction、react、timegrid（^6.1.20）+ jspdf-autotable + @vitejs/plugin-react（devDep）；卸载前全仓 0 import/配置引用 | 卸载后 vitest 726/726、build 0、全绿 |
| **A5 根目录归档** | ✅ 已归档 229 | 根目录 229 个一次性调试/部署文件移至 `_archive/2026-10-27-one-time/`（gitignored 归档位，**物理保留可恢复**）；保留根 package.json 编排壳、.gitignore/.npmrc/.gitattributes、全部 15 个 .md 文档 | 归档不影响构建图；全绿 |
| **A6 public 卫生** | ✅ 已删 10 | 6 个 .bak（home.html.bak 等，会被 CDN 暴露）+ 4 个 Next.js starter 图标（next/vercel/window/globe.svg）；**file.svg 在用保留**（2 处 fallback） | 删除前逐名 grep 零引用；全绿 |
| **B1 CSP nonce 化** | ⚠️ **保留现状**（有运行时实证） | 去掉 unsafe-inline 后 build 通过，但 PORT=3010 实测：Next flight 内联脚本与 hydration 被 CSP 阻断（hydration #412 报错）；nonce 方案需改框架入口 src/proxy.ts（规格排除项），hash 无法覆盖动态 flight 脚本 → 回滚 next.config.ts，**保留 unsafe-inline** | 冒烟证据完整记录于证据文件；next.config.ts 与基线 0 diff |
| **B2 27 route 对齐** | ✅ 已完成 | 281 个 route.ts 扫描，27 个未包装；排除外部回调（auth/[...nextauth]、cron×2、health、wxpusher/callback）后 **22 个文件 30 个 GET/POST 导出**统一 `apiHandler` 包裹，错误结构 `{ error }` 不变 | 全绿（含 build 枚举路由） |
| **B3 Prisma relation** | ✅ 已完成 | schema.prisma 仅 TeacherMessage 补命名 relation（TeacherPortalMessages）+ onDelete:SetNull + teacherId 改可空（消除悬空外键）；其余 5 模型为快照/日志性质保持；**未生成/运行任何 migration**（prisma generate v5.22.0 通过，migrations 目录零改动） | 全绿 |

## 二、逐项完成清单（P3）

| 项 | 状态 | 内容 | 验证 |
|---|---|---|---|
| **B4 audit 低危** | ✅ 部分完成 | overrides 升级 dompurify 3.4.3→3.4.17、@xmldom/xmldom 0.8.13→0.8.15、qs 6.15.3→6.17.0；npm audit **43→40**，三包告警消除；sharp 已 0.35.5（报告要求达成，剩余 CVE 无修复版）；**保留 katex 0.17.0**（修复 0.19.1 是 major breaking 且仅低危原型污染、渲染面为教师录入）；xlsx/next-auth 基线未动 | 全绿 |
| **B5 布局中危 5 项** | ✅ 已完成 | ① MainLayout 平板（768-1023）icon-only Sider（useIsMobile(1024)）；② 考勤出勤/请假/就餐按钮移动端 minHeight 36→44；③ 教师薪资主 Table scroll.x=860；④ globals.css 建 --spacing-xs/sm/md/lg 刻度（12/14/16/24）；⑤ 小字号提至 12px（mastery 图例、志愿学校副标题、ant-tag、考勤角标） | 全绿 |
| **B6 功能低危 4 项** | ✅ 已完成（4/4） | ① 管理端教师日志列表+详情 fetcher 补 `r.ok` 检查 + SWR error 态 Alert；② 家长端导航「升学服务」组按 division 门控（SENIOR 隐藏，对齐管理端写法）；③ 管理端费用页「学生收费汇总」Modal 请求期间补居中 Spin（e4b07f1，+8/-4，BrandModal props 未动）——初判曾误指家长端，已按管理端实际目标补修；④ 考勤 ABSENT 历史卡片小字标注原始状态（fontSize 11 红棕说明） | 全绿 |

## 三、删除项引用分析证据（摘要）

每个删除项的 grep 命令、命中文件与结论均已落盘：
- Phase A 证据文件：`…\agents\s_000pb8k0RAB\scratch\evidence-phaseA.md`（10.9KB，逐项 grep 命令+命中+结论+保留理由+批次验证数字）
- Phase B 证据文件：`…\agents\o_000pbjG4XZO\scratch\evidence-phaseB.md`（6.1KB，含 CSP 冒烟输出、route 枚举清单、audit 前后对比）

代表性证据（独立复核复跑确认，仅限跟踪文件）：
- 8 个死文件：basename/符号全仓 0 命中；`ParentTodayTimeline` 的命中均为 `buildParentTodayTimeline` 数据函数子串误报；9 个被删文件磁盘+索引双消失
- 死端点：`/api/parent/notifications/[id]/read` 全仓 0 fetch 调用（teacher/messages 与 performance/read 为其他路由）
- 15 个死导出：逐一 grep 仅定义行命中
- 7 个依赖：`@fullcalendar`、`jspdf-autotable`、`@vitejs/plugin-react` 全仓 0 import/配置引用（vitest.config 未引用 react 插件）
- public：6 个 .bak + 4 个 starter svg 零引用；file.svg 2 处 fallback 在用
- 根目录 229 个文件：移动前确认无任何文件引用（package.json scripts、文档均不依赖）

## 四、保留项清单（删除安全规则下明确保留）

| 对象 | 保留原因 |
|---|---|
| `src/lib/attendance-stats.ts` | 仅被 attendance-hours.test.ts 引用（测试=引用，删除会破坏测试） |
| `src/lib/volunteer-2025.ts` | 被 volunteer-sim/page.tsx:29 真实 import |
| `public/file.svg` | 2 处 fallback 引用 |
| api-validate 的 ValidationError 类 | 被 api-handler / danger-guard 使用 |
| data-admin 回收站写路径（createDeletedRecord/getSoftDeleteConfig） | 回收站为报告明确"保留功能"，敏感写路径 |
| business/material-visibility 过滤函数 | 大量路由 interdependent 在用 |
| 约 43 个未具名死导出（theme token/storage/intensive 常量等） | 报告称"清单见分报告"但分报告未随附仓库，无法可靠枚举 → 按"不确定→保留" |
| CSP `'unsafe-inline'`（B1） | 运行时实证：移除会阻断 Next flight 内联脚本与 hydration；nonce 方案需改框架入口 proxy.ts（排除项） |
| katex 0.17.0（B4） | 修复版 0.19.1 为 major breaking、仅低危、渲染面为教师录入 |
| sharp 0.35.5（B4） | 已达报告要求版本，剩余 CVE 无修复版 |
| xlsx / next-auth | 已知风险基线（报告第九节），不在升级范围 |

## 五、验证结果汇总

每批均执行五条命令，最终态（独立复核复跑确认）：
- `npx vitest run`：**726/726 全绿**（152 文件）
- `npm run type-check`：**exit 0**
- `npm run build`：**exit 0**（约 53s）
- `node scripts/security-check.mjs`：**29/29 PASS**
- `npx eslint src`：**0 error / 136 warning（与基线逐字一致，零新增）**

裸 `npm run lint` 说明（非本次引入）：扫到 `.codex-release-staging/.next` 未跟踪构建产物报大量 error，另含 3 个旧 commit 1644f3d 已跟踪的一次性脚本（test-regex.js / tmp-check-meals.cjs / verify-password.js）的历史 lint 债——均非本 12 个 commit 改动，且 scoped `eslint src` 严格 0/136 基线。

## 六、commit 列表（12 个，均未 push）

```
e4b07f1 fix(P3-B6-3): 管理端费用页「学生收费汇总」Modal 补居中 Spin（vitest 726/726、type-check 0、build 0、security 29/29、eslint src 0err）
ea08d54 fix(P3-B6): 功能低危——日志页 r.ok+error 态、升学服务 division 门控
1e7174e fix(P3-B5): 布局中危 5 项（平板 icon-only Sider/触控 44/scroll.x 860/间距 token/小字号 12px）+ B6-4 ABSENT 标注
d77f280 chore(P3-B4): audit 低危——overrides 升级 dompurify/xmldom/qs，43→40
319e66d refactor(P2-B3): Prisma TeacherMessage relation（无 migration）
f766a67 refactor(P2-B2): 22 个 route apiHandler 包裹（30 个导出）
c6f09dc chore(P2-A6): public 卫生（6 .bak + 4 starter svg）
860d8ae chore(P2-A5): 归档根目录 229 个一次性文件
0ad3bb4 chore(P2-A4): 卸载 7 个零引用依赖
38a11be chore(P2-A3): 删除 15 个零调用死导出（-277 行）
ae1036a chore(P2-A2): 删除死 PATCH 端点
c79e32c chore(P2-A1): 删除 8 个确认死文件
```

## 七、独立复核结论

独立复核 Agent 全程只读、不采信执行方结论重跑：
- **12/12 项通过，0 不通过**（最终状态/全量验证/28 个删除对象零引用/保留项引用/归档/route 抽查/Prisma diff/audit/布局/功能/CSP 基线/证据文件）
- 口径备注 2 处（非失败）：裸 lint 报错含 3 个预存跟踪脚本；cron/trash-cleanup 的 apiHandler 为基线遗留、本批零触碰

## 八、开放项（诚实声明）

1. **约 43 个未具名死导出**：报告 B-中称"清单见分报告"但分报告未随附；若后续拿到分报告清单，可逐项引用分析后再删（当前按安全规则全部保留，零风险）。
2. **CSP unsafe-inline**：当前唯一未收敛的 C-中-2 项；非代码问题而是框架集成问题（Next flight 内联脚本 + 框架入口排除）。如需根治，需在后续任务中专门评估 Next.js 16 nonce 方案（改 proxy.ts 或上 hash 白名单 + KaTeX 资源加载改造），并配套全页回归。
3. 生产环境尚未部署本批改动；部署前建议按报告第十一节做 dev/生产冒烟（360/768/1440 三档宽度 + /api/health + /api/auth/session）。
