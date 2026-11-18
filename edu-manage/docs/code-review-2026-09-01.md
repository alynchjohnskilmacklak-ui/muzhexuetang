# edu-manage 代码审查报告（2026-09-01）

> 审查对象：`edu-manage`（Next.js 16 + React 19 + TS + AntD 5 + Prisma 5 + PostgreSQL 双库）
> 方式：全量静态扫描 + 关键链路人工追踪 + 实跑 `tsc / eslint / vitest / npm audit`；并对 2026-07-24、2026-08-25 两份历史审计逐条复检当前状态。
> 结论口径：所有数字均为本次实测或代码现读，附文件/行号；历史问题标注「已修 / 缓解 / 仍在」。

---

## 0. 健康基线（本次实测）

| 维度 | 实测结果 | 评价 |
| --- | --- | --- |
| 规模 | 464 个 `.ts` + 255 个 `.tsx`（约 719 源文件）；240 个 API 路由；84 个 Prisma 模型；58 个迁移 | 中大型单体 |
| 类型检查 `tsc --noEmit` | **0 错误** | 优 |
| ESLint | **0 错误**，2 warning（均在 `flyer-reference/editor.js` 参考目录，非产品代码） | 优 |
| 单元测试 | 74 文件 / 355 用例，**354 通过、1 失败** | 有 1 个红灯，见 P0-2 |
| 类型纪律 | 645 个非测试源文件，`any` = 0、`@ts-ignore/nocheck` = 0、`eslint-disable` = 7 | 优秀，罕见 |
| 原生 SQL | 31 处全部为 Prisma 标签模板 / `Prisma.sql` 参数化，**无字符串拼接、无注入面** | 优 |
| `apiHandler` 统一包装 | 218 / 240（90.8%），22 个裸路由 | 良，见 P1-7 |
| 生产 `console.log` 调试残留 | 0 | 优 |
| 依赖漏洞 `npm audit`（生产依赖，官方源） | **3 critical / 8 high / 2 moderate / 2 low = 15** | 差，见 P0-1 |
| Git 工作区 | 约 90 个已修改文件未提交，含资金/安全核心，2 个新迁移未跟踪 | 风险，见 P0-3 |

**总评**：工程"基本功"在同类项目里属上游——strict TS、零 any、参数化 SQL、统一错误脱敏、资金链路乐观锁/幂等设计都到位；当前最突出的不是代码写法，而是 **依赖漏洞、未提交的整改、一处仍存在的跨库越权与收费-课时断链，以及一批长期结构债（鉴权多口径、Float 精度、巨石组件、样式硬编码）**。

---

## 1. P0 — 红线，建议本周内处理

### P0-1 依赖漏洞 15 个，其中认证库 3 个 critical
- **证据**：`npm audit --omit=dev`（registry 官方源；淘宝镜像不支持 audit）。
  - critical：`next-auth`、`@auth/core`、`@auth/prisma-adapter`。含「配置异常时鉴权 fail-open」「邮箱 Unicode 同形字绕过」「畸形 Authorization 头导致 getToken 抛异常」「OAuth state/nonce 未绑定 provider」。
  - high：`next`（中间件/Proxy 绕过、Server Action SSRF/DoS、图片优化 SVG DoS 等 8 条）、`sharp`(libvips)、`pdfjs-dist`（恶意 PDF 执行 JS）、`postcss`、`brace-expansion`、`fast-uri`、`nanoid`。
  - moderate：`dompurify`（多项 XSS，注：源码未直接使用，属传递依赖）、`echarts`（XSS）。
  - **`xlsx` high 且 npm 源无修复版**（SheetJS 已迁出 npm，Prototype Pollution + ReDoS）。
- **背景**：2026-08-25 审计时 audit 还是 0，说明基本是近一周新披露，需建立例行更新。
- **建议**：
  1. `npm i next-auth@latest next@latest` 并跑全量回归（重点登录/中间件/双库）；`sharp / pdfjs-dist / postcss / echarts` 同步升级。
  2. `xlsx` 评估替换为官方 CDN 版 SheetJS 或 `exceljs`，移除 npm 旧版。
  3. 在 CI 加 `npm audit --audit-level=high` 阈值门禁。

### P0-2 测试套件当前是红灯
- **证据**：`src/lib/migrate-all-script.test.ts:19` 断言 `script.match(/npx prisma migrate deploy/g)` 长度为 1，但 `scripts/migrate-all.sh` 已重构（改为封装形式），断言失配 → `AssertionError: Target cannot be null or undefined`。
- **影响**：改了部署脚本没同步测试，`npm test` 退出码为 1，任何人跑测试都会看到红，长期会"对红灯脱敏"。
- **建议**：按脚本现状更新断言（或反向确认脚本是否漏了 deploy 步骤），恢复全绿后再提交。

### P0-3 约 90 个文件改动未提交，含资金/安全核心与 2 个未跟踪迁移
- **证据**：`git status` 显示 `src/app/api/admin/attendance/submit/route.ts`、`src/lib/teacher-salary.ts`、`src/lib/rate-limit.ts`、`src/app/api/admin/cleanup/route.ts`、`prisma/schema.prisma` 等均为 `M`；新迁移 `prisma/migrations/20260823183000_harden_lesson_pay_idempotency/`、`20260826143000_add_lesson_preview_material/` 为 `??` 未跟踪；同时删除了 `vercel.json / railway.* / deploy*.sh` 等。
- **影响**：本轮最有价值的资金安全整改（扣课时乐观锁、薪资幂等、Redis 限流）全部停留在工作区，**没有落盘到 git**，存在误丢、无法回滚、线上构建与本地不一致的风险；未跟踪迁移一旦漏打包，部署时数据库结构会缺。
- **建议**：按主题拆分提交（资金一致性 / 限流 / 部署体系 / UI），两个迁移务必 `git add`，通过后打 tag；之后不要让大批改动长期悬空。

### P0-4 `fees/[id]` 跨学部越权（旧 S-01，仍未修）
- **证据**：`src/app/api/fees/[id]/route.ts:10-13` 的 `requestFeePrisma()` 直接从 **URL query** 取 `division`（`?division=SENIOR`），与登录 session 脱钩；PATCH/DELETE 用裸 `auth()` 只判 `role==='admin'`，**无 `sessionMark` 校验**。
- **影响**：初中库管理员在请求里带 `?division=SENIOR` 即可改/删高中库收费记录（财务写操作跨库越权）；被单点踢下线的旧 JWT 仍可操作。
- **建议**：学部只从 `session.user.division`（或 `requireAdminUser()` + `getRequestPrisma()`）取，忽略 URL 传入；改用严格 guard 获得 sessionMark/账号状态校验。建议顺带排查是否还有别的路由从 query 读 division。

### P0-5 收费入账不联动课时（旧 F-06，仍未修）
- **证据**：`src/app/api/fees/route.ts` 的 POST 只 `fee.create` 写缴费台账，全链路没有更新 `Enrollment.remainHours`、也不写 `HourTransaction`。
- **影响**：登记收费后学员课时余额不增加，形成"钱账与课时账两张皮"，需人工再调课时，易漏易错（资金/课时一致性）。
- **建议**：缴费入账在**同一事务**内：写 Fee → 增加对应 enrollment 课时 → 写 HourTransaction（type 充值）→ 通知家长；并补一条"Fee 汇总 vs 课时增量"对账校验。

---

## 2. P1 — 本迭代内收口（安全一致性 / 数据根基）

### P1-6 鉴权入口 4~5 套并存，严格度不一致
- **证据**：
  - 严格口径 `src/lib/auth/guards.ts`（校验 sessionMark 单点踢人 + 账号禁用状态）：直接使用约 32 处，外加 `teacher-portal.ts` 包装的 teacher/* 一批。
  - 宽松口径 `src/lib/get-user.ts` 的 `getCurrentUser/requireRole` 与各路由手写 `await auth()`：合计约 167 处，**不校验 sessionMark、不校验账号是否被禁用/停用**。
- **影响**：被"踢下线"或被停用的账号，其已签发 JWT（maxAge 30 天）仍能访问所有走宽松口径的接口（含 `fees`、`admin/attendance/submit` 等写操作），单点登录踢人/停用策略在这些路由上实际失效。
- **建议**：统一收敛到 `guards.ts`；短期至少让 `getCurrentUser` 内部补上 `validateSessionMark` + `isUserActive`，并把"手写 auth() 判 role"的路由逐步替换为 `requireXxx`。新增路由强制走严格口径（可加 ESLint 约束或代码评审清单）。

### P1-7 22 个路由未包 `apiHandler`（缺统一限流 / 错误脱敏 / 体积校验）
- **证据**：`admin/salary`、`admin/salary/config`、`admin/salary/export`、`admin/data-admin`(×3)、`teacher-logs`(×3)、`teacher-photos`、`volunteer/schools`、`meals/report/[id]`、`wxpusher/callback`、`class-groups/[id]/start`；合理豁免：`auth/[...nextauth]`、`health`、`setup`、`cron/*`（自带 token）。
- **建议**：业务路由统一改 `export const X = apiHandler(...)`；`wxpusher/callback`（外部可打）、`volunteer/schools`（限流规则配了却因未包装而不生效）优先。

### P1-8 金额 / 课时用 `Float`（旧 D-04，仍在）
- **证据**：`Fee.amount`、`TeacherSalaryTransaction.amount`、`Enrollment.remainHours/usedHours/totalHours`、`HourTransaction.amount/beforeHours/afterHours`、`Attendance.hoursDeducted` 等均为 `Float`；`fees/route.ts` 用 `reduce` 浮点求和后 `toFixed(2)` 仅在展示层掩盖误差。
- **影响**：二进制浮点累加产生分位误差，金额/课时是要对账的字段，长期会出现尾差。
- **建议**：金额改 `Decimal @db.Decimal(10,2)`；课时改整数分钟或 `Decimal(6,2)`。迁移前先用现有 `scripts/normalize-hours.ts` 固化数据，灰度双写校验后切类型。

### P1-9 状态字段 enum / String 混用，且已出现大小写漂移
- **证据**：一部分用 Prisma enum（`GroupStatus/LessonStatus/EnrollStatus/PaperStatus/AttStatus…`），另一部分用裸 `String`（`User.role/status/division`、`Student.status`、`Schedule.status`、`Fee.status/type`、`ClassroomFeedback.status`、`LeaveRequest.status` 等），数据库层无 CHECK 约束。已出现不一致：`prisma/seed` 与 `api/setup` 写 `status:'active'` 小写，而业务代码查 `'ARCHIVED'/'INACTIVE'/'RESIGNED'` 大写；`Schedule.status` 默认小写 `scheduled`，`ClassLesson` 用大写 enum。
- **影响**：容易写入非法/异大小写状态，查询漏数据，状态机不可靠。
- **建议**：统一为 Prisma enum（或至少 DB CHECK + 常量层单一来源）；先做一次数据归一化（大小写/别名）再收紧。

### P1-10 部分高频外键缺索引（旧 D-05 部分残留）
- **证据**：`GradeRecord.assessmentId/studentId`、`DimensionScore.gradeId`、`ClassHighlight(studentId/teacherId/gradeId/groupId)`、`TeacherAlert.teacherId`、`GuideViewLog`、`Assessment` 等缺 `@@index`。
- **影响**：数据量增长后，按学生/教师/课次的关联查询与级联删除走顺序扫描。
- **建议**：补迁移加索引（参考已有的 `20260605000000_add_performance_indexes`、`20260520162000_add_performance_indexes` 做法），上线前 `EXPLAIN ANALYZE` 验证。

### P1-11 Student 双家长字段并存（旧 D-06，仍在）
- **证据**：`Student.parentId`(FK User) 与 `Student.parentUserId`(非 FK 字符串) 并存，代码多处 `parentId || parentUserId` 兜底。
- **影响**：两字段不一致时，家长通知/绑定会发到错误账号。
- **建议**：一次性数据迁移把 `parentUserId` 并入 `parentId`，删除冗余列，代码统一。

### P1-12 限流的内存实现与 X-Forwarded-For 信任
- **证据**：`src/lib/login-rate-limit.ts` 仍是进程内 `Map`（IP 20/min、账号 10/5min 锁 15min）；`apiHandler`/`rate-limit` 取 `x-forwarded-for` 第一个值作为 IP。`docs/production-safety.md` 自己也要求 PM2 单实例。
- **影响**：多实例 / 重启后登录锁定与全局限流失效；若 Nginx 未强制覆写客户端传入的 XFF，攻击者可伪造该头绕过按 IP 限流。
- **建议**：生产配置 `REDIS_URL`（代码已支持，显式 redis 模式会 fail-closed，直接启用即可）；Nginx 用 `ngx_http_realip_module` 或固定 `proxy_set_header X-Forwarded-For $remote_addr`，不信任客户端自带 XFF。

### P1-13 微信推送重试 cron 没有实际调度
- **证据**：`api/cron/retry-notifications` 在代码与 `docs/production-safety.md` 中都没有 crontab 条目（文档只配了 `daily-ops-report` 21:00）。
- **影响**：推送失败的通知不会自动重试，"重试接口"形同虚设（关联旧 E-05）。
- **建议**：在服务器 crontab 补一条（如每 5 分钟），并把 token 改为 `Authorization: Bearer`（见 P3）。

### P1-14 没有任何自动化质量门禁（无 CI / 无 pre-commit）
- **证据**：无 `.github/workflows`、无 `husky`、无 `lint-staged`；`type-check/lint/test/audit` 全靠手动。这正是 P0-2 测试变红、P0-3 大批改动悬空却无人拦截的根因。
- **建议**：加最小 CI（`tsc --noEmit` + `eslint` + `vitest run` + `prisma validate` + `npm audit --audit-level=high`），pre-commit 跑 lint-staged；主分支保护要求 CI 通过。

---

## 3. P2 — 可维护性 / 性能 / 体验，排期治理

| 编号 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| P2-15 | **巨石客户端组件** | `volunteer-sim/page.tsx` 2278 行/30 个 useState；`teacher/feedback/page.tsx` 1807 行/47 state/8 fetch；`courses/page.tsx` 1689 行/28 state/13 fetch；`schedule/intensive` 1194；≥400 行组件 25+ 个 | 按区块拆"容器 + 展示组件"，数据/副作用抽自定义 hook；优先拆 Top5；静态内容移出 `'use client'` 边界 |
| P2-16 | **数据获取双轨** | 316 处手写 `fetch`（117 文件）与 76 文件用 `useSWR` 并存，同一文件常混用（如 courses 13 fetch + 8 swr），加载/错误/缓存/重验证策略不统一 | 统一到 SWR（或 React Query）+ 单一 fetcher 与稳定 key；写操作走统一 mutate 约定 |
| P2-17 | **样式技术债且在增长** | `globals.css` 7000+ 行、**234 处 `!important`**（7-24 报告时 222，不减反增）；约 4494 处内联 `style`；品牌橙 `#E8784A/#E87545` 双值、冷灰 `#98A2B3/#1F2329` 大量硬编码；三套圆角口径（DESIGN.md / theme.ts / AntD） | 先"冻结新增"（lint 规则禁止新硬编码色/近似色），再按页面族迁到 CSS 变量 / CSS Module / 组件变体，截图回归 |
| P2-18 | **测试结构偏科** | 355 用例几乎全是 `src/lib` 纯函数单测（质量不错），但 240 个 API 路由、255 个组件基本无集成/组件测试；资金、越权、双库隔离最该被回归保护却没有 HTTP 级测试 | 为资金链路、鉴权/越权、双库 division 补关键路径集成测试（Vitest + 测试库/路由处理器直调），不追求覆盖率数字，先覆盖高风险路径 |
| P2-19 | **一次性修复脚本堆积** | `scripts/` 52 个，大量 `fix-*/cleanup-*/normalize-*/dedupe-*/backfill-*`，且被挂进 `package.json` scripts；反映历史数据一致性靠事后补救 | 归档到 `scripts/one-time/` 并从 package.json 移除；根因改用约束/迁移/事务在应用层固化，避免再产生新修复脚本 |
| P2-20 | **新旧两套排课模型收尾** | legacy `Schedule` 直接查询已降到 5 处（`class-groups/[id]`、`teacher-busy`、`cleanup`、`teachers/[id]`、`rooms/[id]`），新模型为 `ClassGroup/ClassLesson`；`production-safety.md` 也承认并存 | 定里程碑彻底停用并删除 legacy 模型；过渡期新统计 PR 必须声明数据源范围，避免漏数 |
| P2-21 | **输入校验靠手写** | `api-validate.ts` 仅 3 个基础 helper，各路由手写 `typeof` 判断，严格度不一 | 引入 `zod` 统一 body/query/params schema，类型可反推，消除手写漏判 |
| P2-22 | **请求体上限偏大 / chunked 绕过** | `materials/upload` 210MB、`next.config` bodySizeLimit 50MB；`apiHandler` 只校验 `content-length`，chunked 请求无此头会跳过（最终靠 Next 50MB 兜底，两层口径不一致） | 收紧上传上限并对实际流计数；统一 apiHandler 与 Next 的上限口径 |

---

## 4. P3 — 卫生项 / 小改进

1. **工具/参考目录未 ignore**：`.impeccable/`、`.serena/`、`.claude/`、`flyer-reference/`、`.review/` 出现在工作区，建议加入 `.gitignore`，避免污染仓库与 lint 扫描。
2. **疑似无用依赖**（8-25 depcheck 已提示，仍在）：`@auth/prisma-adapter`（JWT 策略下 PrismaAdapter/Session 表疑似未用）、`@fullcalendar/*`、`jspdf-autotable`；确认后删除以减小攻击面与体积。
3. **文档与实现漂移**：README 写 `curl /api/setup`（无 token），实际要求 `SETUP_TOKEN`；`production-safety.md` 说限流"全内存"，实际已支持 Redis；8-25 文档写 audit 0 漏洞，当前 15。文档随代码一并更新。
4. **CSP 仍允许 `script-src 'unsafe-inline'`**（Next 常见折中），可逐步迁到 nonce 方案收窄 XSS 面。
5. **cron token 走 query 参数**会进入访问日志，建议改 `Authorization: Bearer` 头。
6. **登录时序侧信道（低风险）**：用户不存在时不跑 bcrypt，理论上可据此枚举账号；本系统为半封闭教育系统且 detect-role 本身返回角色，风险低，可对"用户不存在"也跑一次假 compare 拉平时序。
7. `tsconfig.target` 仍为 `ES2017`、`allowJs:true`，可结合运行时（Node/现代浏览器）上调 target 并关闭 allowJs（需评估参考目录）。

---

## 5. 历史问题复检（避免照抄旧报告）

| 旧编号 | 结论 | 当前证据 |
| --- | --- | --- |
| F-01 考勤扣课时并发竞态 | **大幅缓解（残余低危）** | `attendance-balance.ts` 已用条件更新 `updateMany({where:{id,remainHours:{gte:x}}})` + 3 次重试 + 失败抛错，配合 attendance 唯一约束 upsert，不会扣成负数；但 `alreadyDeducted` 仍在事务外读取（`submit/route.ts:107-111`），普通班缺 ClassLesson 级抢占锁，极端并发下同一课次仍可能重复进入扣减分支，建议像突击班那样加状态抢占 |
| F-02 薪资触发非原子 | **已修** | `createLessonPayInTransaction(tx, lessonId)` 已在 `$transaction` 内（`submit/route.ts:223`） |
| F-03 课时费并发双计 | **已修** | schema 已有 `lessonPayKey @unique`、`@@unique([feedbackId,type])`、迁移 `20260823183000_harden_lesson_pay_idempotency`，且 `teacher-salary.ts:133` 用 `SELECT … FOR UPDATE` 行锁 |
| S-05 cleanup 无二次确认 | **已修** | POST 走 `assertDangerAuth`（超管+密码+短语），GET 限超管 |
| S-03 teacher-salary PII 日志 | **已修** | 明细日志已移除，全仓生产 console.log = 0 |
| S-08 登录限流仅内存 | **部分** | 全局限流已支持 Redis；登录锁定仍内存（→ P1-12） |
| F-06 收费-课时断链 / S-01 fees 越权 / D-04 Float / D-06 双家长字段 | **仍在** | 见 P0-5 / P0-4 / P1-8 / P1-11 |

---

## 6. 做得好、建议保持

- **类型与代码卫生**：strict TS、645 文件 0 any / 0 ts-ignore、tsc 与 eslint 全绿、SQL 全参数化、生产无调试日志。
- **资金链路整改方向正确**：扣课时乐观条件更新 + 重试、薪资并入考勤事务、课时费三重幂等键 + 行锁、突击班结算 `updateMany` 抢占锁。
- **安全基建完整**：bcrypt + 5 次失败锁 30 分钟 + 登录日志、sessionMark 单点踢人、危险操作三重鉴权、统一错误脱敏（生产不回显内部错误，Sentry 上报）、分级限流且支持 Redis fail-closed、上传 magic-bytes + OSS 服务端签名、安全响应头/CSP 较全、`.env`/`dev.db` 未入库。
- **领域纯函数 + 单测意识强**（355 用例覆盖扣课时、结算、状态机、密码策略等核心规则）、双学部库隔离、`ActivityLog/DeletedRecord` 审计链完整。

---

## 7. 建议行动顺序

1. **当天**：恢复测试全绿（P0-2）→ 把工作区整改分主题提交、补跟踪两个迁移（P0-3）。
2. **本周**：升级 next-auth/next 等 critical/high 依赖并回归（P0-1）；修 fees 跨库越权（P0-4）与收费联动课时（P0-5）。
3. **两周**：鉴权口径统一（P1-6）、22 路由补 apiHandler（P1-7）、启用 Redis 限流 + Nginx XFF（P1-12）、补 cron 调度（P1-13）、搭最小 CI 门禁（P1-14）。
4. **本月**：Float→Decimal、状态 enum 化、补外键索引、合并家长字段（P1-8~11）。
5. **持续**：拆巨石组件、统一数据获取、样式 token 收口、补高风险集成测试、清理一次性脚本与 legacy 排课（P2）。
