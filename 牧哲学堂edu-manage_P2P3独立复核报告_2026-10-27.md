# 牧哲学堂 edu-manage P2/P3 改动 — 独立复核报告（Agent C，不信任执行方结论）

- 复核时间：2026-10-27
- 仓库根：`D:\01muzhexuetang\muzhexuetang\coding`；应用源码：`edu-manage/`
- 复核方式：只读复核，全部命令独立重跑；未修改任何源码
- 基线对比：`git diff 33b4353..e4b07f1`
- **总结论：12 项全部通过（0 不通过）**。执行方声明的 commit 列表、验证数字、删除/包装/升级内容经独立复跑均属实；仅 2 处需记录的口径说明（非失败），见第 2、6 项备注。

---

## 1. 最终状态 — 通过

命令：`git log --oneline -15`、`git status --short`、`git branch -vv`、`git diff --name-only 33b4353 e4b07f1 -- edu-manage/prisma/migrations`

- HEAD = `e4b07f1`，自基线 `33b4353` 起恰好 12 个新 commit，与声明完全一致：
  - Phase A 6 个：`c79e32c`(A1) `ae1036a`(A2) `38a11be`(A3) `0ad3bb4`(A4) `860d8ae`(A5) `c6f09dc`(A6)
  - Phase B 5 个：`f766a67`(B2) `319e66d`(B3) `d77f280`(B4) `1e7174e`(B5) `ea08d54`(B6)
  - B6-3 补修：`e4b07f1`
- `git status` 仅 ` ? _context_mode_review` 一行噪音（子模块 untracked content），无任何已跟踪文件改动。
- 分支 `main` 领先 `origin/main` 16 个提交（4 旧 + 12 新），**未 push**（远程引用未变）。
- `prisma/migrations` 在最近 12 个 commit 中 **0 文件改动**（diff 输出为空）。

## 2. 全量验证复跑 — 通过

命令（均在 `edu-manage/` 实跑）：

| 命令 | 独立实测结果 |
|---|---|
| `npx vitest run` | **Test Files 152 passed (152)，Tests 726 passed (726)**，exit 0，耗时 11.34s |
| `npm run type-check`（tsc --noEmit） | 无输出，exit 0 |
| `npm run build` | exit 0，路由表正常枚举（ƒ Proxy、静态/动态路由齐全） |
| `node scripts/security-check.mjs` | **29 行 PASS**，exit 0（含 uploads/rate-limit/hsts/danger-phrase/.env untracked 等） |
| `npx eslint src` | **0 errors / 136 warnings**，exit 0 — 与声明基线逐字一致 |

裸 `npm run lint`（eslint 不带路径）判定：exit 1，报 47,106 errors，报错路径分布：
- 主体 = `.codex-release-staging/.next/server/app/**.page.js` —— 冻结发布快照内的 **未跟踪构建产物**（已核实 `git ls-files edu-manage/.codex-release-staging/.next` 为空）。
- 另有 edu-manage 根下 3 个旧一次性脚本（`test-regex.js`、`tmp-check-meals.cjs`、`verify-password.js`）报 require-imports error —— 经 `git ls-files` 确认为旧 commit `1644f3d` 已跟踪文件，**本 12 commit 零触碰**（预存技术债，非本批引入）。
- live `src/` 内仅 136 条 warning（no-unused-vars / no-location-assign 等），0 error。
- **口径备注（非失败）**：执行方称裸 lint 报错路径为"untracked/gitignored 构建产物"，其中那 3 个 .js 脚本实为已跟踪的旧脚本（非 untracked）；但二者共同点是均不属于本批改动、且 scoped `eslint src` 严格等于 0/136 基线。判定成立。

## 3. Phase A 删除项独立引用复查 — 通过

方法：`git grep -n -I -E <符号> -- edu-manage/src edu-manage/scripts edu-manage/tests edu-manage/package.json edu-manage/next.config.ts …`（git grep 只搜跟踪文件，自动排除 node_modules/.next/_archive/_context_mode_review）。被删文件先经 `Test-Path` + `git ls-files` 确认磁盘与索引双消失。

| 对象 | 实测命中 | 结论 |
|---|---|---|
| chartOptions | 0 | 通过 |
| ParentAccountsTab | 0 | 通过 |
| TeacherAccountsTab | 0 | 通过 |
| teacher/student-profile/[id]/client（路径 import） | 0 | 通过 |
| ParentTodayTimeline | 仅 `buildParentTodayTimeline`（dashboard-workflows.ts:162 数据函数，未删）子串命中；独立组件标识符 0 | 通过 |
| StudentContextPanel | 0 | 通过 |
| humanities-zhongkao-revisions-2026-h | 0 | 通过 |
| math-zhongkao-revisions-2026-j | 0 | 通过 |
| /api/parent/notifications/[id]/read | 0 | 通过 |
| requireTenantContext / assertCanAccessClassGroup / assertCanAccessAttendance / getCurrentTeacherId / requireAdminOrOwnTeacher | 各 0 | 通过 |
| resolveFeedbackCourseBucket | 0 | 通过 |
| isTeacherRole / isAdminRole / getCurrentTeacher（\b 词界） | 各 0 | 通过 |
| stampPdfBrand / stampPdfWatermark | 各 0 | 通过 |
| requireString / requireNumber / requireArray | 各 0 | 通过 |
| @fullcalendar（5 包）/ jspdf-autotable / @vitejs/plugin-react | src+scripts+tests+配置 0；package.json 无条目 | 通过 |
| next.svg / vercel.svg / window.svg / globe.svg | live src 各 0 引用 | 通过 |
| public 6 个 .bak（home.html.bak / -20261003 / -ui、about.html.bak-20261003、shenma-site-verification.txt.bak-20261003 / -20261003b） | 精确文件名 grep 0 命中（echarts.min.js 内 ".bak" 子串为压缩代码误匹配） | 通过 |

9 个被删文件（8 死文件 + 死端点 route.ts）在 live src 磁盘与 git 索引中均已消失（Test-Path 全 False、git ls-files 空）。

> 口径备注：`.codex-release-staging/` 是旧 commit `1644f3d` 提交的冻结发布快照（1171 个跟踪文件），其内仍保留被删文件的旧副本 —— 这是冻结快照固有内容，本 12 commit 零触碰，live 构建配置（tsconfig/next.config/vitest）0 处引用它。不构成 live 源码悬空引用。

## 4. 保留项确认 — 通过

- **attendance-stats.ts**：`src/lib/attendance-hours.test.ts:3` `import { calculateAttendanceRate, clampDeductHours } from './attendance-stats'` ✅
- **volunteer-2025.ts**：`src/app/(main)/volunteer-sim/page.tsx:29` `} from '@/data/volunteer-2025'`；另有 `volunteer-2025.test.ts:2` 测试引用 ✅
- **file.svg**：仍在 `edu-manage/public/file.svg`；live src 两处 fallback 引用 —— `(main)/volunteer/_components/StepEditor.tsx:65` 与 `parent/volunteer/client.tsx:148`（`fallback="/file.svg"`）✅
- **ValidationError**：`api-handler.ts:5` import + `:67 instanceof` 判断；`danger-guard.ts:4` import + `:32/:36/:51` 三处 throw ✅（api-validate.ts 本体保留，仅删 requireString/Number/Array 三个导出）

## 5. 归档确认 — 通过

- `_archive/2026-10-27-one-time/` 物理存在，递归统计 **229 个文件**，与声明一致；`git check-ignore` 命中（gitignored 归档位，物理保留可恢复）。
- 仓库根目录：恰好 **15 个 .md 文档** + `.gitattributes`/`.gitignore`/`.npmrc`/`package.json`/`package-lock.json`；无 `tmp_*`/`check_*`/`fix_*`/`_*.py/.sql/.log/.js/.ps1` 等散落文件（模式扫描为空）。

## 6. B2 抽查 — 通过（含 1 处口径备注）

- 已包装 route（均 `import { apiHandler } from '@/lib/api-handler'` 且导出用 `apiHandler(async…)` 包裹，错误结构 `{ error }` 由 api-handler 统一）：
  - `admin/salary/settle/route.ts`：L11 `export const POST = apiHandler(...)` ✅
  - `admin/salary/route.ts`：L14 GET、L218 POST、L265 DELETE 全部包装 ✅
  - `parent/practice-bank/route.ts`：L15 `export const GET = apiHandler(...)` ✅
- 应排除 route 未被包装：
  - `auth/[...nextauth]/route.ts`：apiHandler 0 命中 ✅
  - `health/route.ts`：0 命中 ✅；`wxpusher/callback/route.ts`：0 命中 ✅
  - cron：`daily-ops-report` 0、`retry-notifications` 0；`trash-cleanup` 有 2 处 apiHandler 命中 —— 经 `git diff 33b4353..HEAD` 核实该文件**本批零改动**，包装在基线即存在（预存），非本次新增。
- B2 commit `f766a67` 实际改动 **22 个 route.ts**，与声明"22 个内部 route"一致。
- **口径备注（非失败）**：执行方称"排除 cron"，但基线时 trash-cleanup 已被 apiHandler 包装；本批确实未触碰任何 cron route。属基线遗留，不影响本批等价性。

## 7. B3 抽查 — 通过

`git diff 33b4353..e4b07f1 -- edu-manage/prisma/schema.prisma` 仅 4 增 1 删，逐行：

```diff
+  // 教师门户站内消息：教师被硬删除时 teacherId 置空，消息正文保留作历史记录。
+  portalMessages     TeacherMessage[]           @relation("TeacherPortalMessages")
-  teacherId   String
+  teacherId   String?
+  teacher     Teacher?  @relation("TeacherPortalMessages", fields: [teacherId], references: [id], onDelete: SetNull)
```

仅涉及 Teacher/TeacherMessage 关系与 teacherId 可空化；`prisma/migrations` 目录 0 新增文件（第 1 项已证）。

## 8. B4 抽查 — 通过

- `package.json` overrides：`"dompurify": "^3.4.17"`、`"@xmldom/xmldom": "^0.8.15"`、`"qs": "^6.17.0"` ✅
- `npm audit --registry=https://registry.npmjs.org/`（绕过未启动的本地代理 7890）：**40 vulnerabilities (11 low / 10 moderate / 18 high / 1 critical)**，与声明 43→40 一致，≤40 ✅
- audit --json 的 vulnerabilities 键集合中 **dompurify / @xmldom/xmldom / qs 均不存在**（三包告警消除）✅
- `katex: ^0.17.0` 保留未动；`xlsx: ^0.18.5`、`next-auth: 5.0.0-beta.32` 基线未动 ✅

## 9. B5 抽查 — 通过

- MainLayout（`src/components/Layout/MainLayout.tsx`）：L19 `isNarrow = useIsMobile(1024)`，L39 注释"平板区间（768–1023px）强制 icon-only Sider"，L40 `effectiveCollapsed = isNarrow ? true : collapsed`，L61 传 Sidebar、L63 margin 72/220 切换 ✅
- teacher/attendance 按钮：`page.tsx:561/575/587` 三处 `minHeight: isMobile ? 44 : 36` ✅
- teacher/salary 主 Table：`page.tsx:264` `scroll={{ x: 860 }}` ✅
- globals.css :root：L112–115 `--spacing-xs:12px / --spacing-sm:14px / --spacing-md:16px / --spacing-lg:24px` ✅
- 小字号 12px：volunteer-sim 副标题/图例多处 `fontSize: 12`（L816/843/1083/1085/1087 等）✅

## 10. B6 抽查 — 通过

- 管理端教师日志列表页 `(main)/teacher-logs/page.tsx`：L14 fetcher `if (!r.ok) throw new Error(...)`；L50 useSWR；L94–96 `{error && <Alert type="error" message="教师行为日志加载失败" …/>}` ✅
- 详情页 `(main)/teacher-logs/[teacherId]/page.tsx`：L12–15 fetcher 同样 `if (!r.ok) throw`，L39 useSWR error 态 ✅
- ParentLayout `src/components/Layout/ParentLayout.tsx`：L161「升学服务」组；L179–181 `isSenior = session…division === 'SENIOR'`，`visibleNavItems = navItems.filter(item => !(isSenior && item.key==='volunteer-group'))` —— SENIOR 家长隐藏升学服务，对齐 Sidebar 门控 ✅
- 考勤 ABSENT 卡片：`teacher/attendance/page.tsx:550` `{s.status === 'ABSENT' && (<div style={{fontSize:11, color:'#B42318'…}}>原始记录：旷课（按缺课处理，非请假）</div>)}` ✅
- fees 学生收费汇总 Modal Spin（commit `e4b07f1`，+8/-4）：diff 实测 —— import 增 `Spin`；useSWR 解构增 `isLoading: studentAggLoading`；`studentAgg ? (统计卡+表格) : studentAggLoading ? (<div 居中><Spin size="large"/></div>) : null` ✅

## 11. CSP — 通过

- `git diff 33b4353..e4b07f1 -- edu-manage/next.config.ts` 输出为空（**零改动**）；文件内 `'unsafe-inline'` 仍存在（2 处命中），为既定保留决策。
- Phase B 证据文件（evidence-phaseB.md L7–L11）记录运行时冒烟结论：临时去 unsafe-inline → build 通过、PORT=3010 起服务，但浏览器实测 /login 与 / 的 Next flight 内联脚本被 CSP 阻断、React hydration #412 报错；根因 nonce 需改被排除的 proxy.ts、hash 白名单无法覆盖动态 flight 脚本 → 保留现状。✅

## 12. 证据文件存在性 — 通过

- `evidence-phaseA.md`（Agent A scratch，10,936 字节）存在；含逐项 grep 命令（rg -n "符号" edu-manage）+ 命中摘要表 + 保留理由表 + 每批五条验证数字（vitest 726/726、type-check/build/security 29/29、eslint src 0err/136warn）。
- `evidence-phaseB.md`（Agent B scratch，6,141 字节）存在；含 B1 CSP 冒烟结论、B2 22 route、B3 schema diff、B4 audit 43→40、B5/B6 改动清单。

---

## 附：复核中独立发现的口径差异（均非失败，不阻断验收）

1. **裸 lint 报错路径定性**：执行方称报错来自"untracked/gitignored 构建产物"。实测主体确为 `.codex-release-staging/.next` 未跟踪构建产物；但 edu-manage 根下 `test-regex.js`/`tmp-check-meals.cjs`/`verify-password.js` 是旧 commit `1644f3d` 的**已跟踪**一次性脚本（非 untracked），本批零触碰。scoped `eslint src` 严格 0 error/136 warning，判定结论成立。
2. **cron 排除口径**：基线时 `cron/trash-cleanup` 已被 apiHandler 包装（旧提交遗留），本批未触碰任何 cron route；执行方"排除 cron"指本批动作，与基线遗留并存，不影响等价性。
