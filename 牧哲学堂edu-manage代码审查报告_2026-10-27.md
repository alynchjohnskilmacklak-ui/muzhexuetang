# 牧哲学堂 edu-manage 全栈代码审查报告

- 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.3.4 + React 19 + TypeScript + Prisma/PostgreSQL + Antd 5 + NextAuth 5 beta）
- 审查方式：6 个并行专项审查（连通性/死代码/安全/UI 设计/布局/功能显示）+ 主持人对关键 HIGH 级证据的独立抽查复核；全部基于真实代码读查，非静态猜测
- 运行时验证：**未验证**（本地 3000 端口被 Vivado hw_server.exe 占用，dev server 未运行；除 npm audit 为真实命令输出外，其余结论均为静态走读）。修复后建议在 dev 环境补做运行时冒烟
- 审查日期：2026-10-27

---

## 一、总体结论

**主链路健康，无致命断链、无已证实的越权/注入漏洞；但存在 6 项 HIGH 级问题需优先处理（生产依赖 Critical CVE、会话吊销缺口、标签配色漂移、移动端弹窗/表格适配），以及一批中低危的体验与卫生问题。**

| 维度 | 高 | 中 | 低 | 一句话结论 |
|---|---|---|---|---|
| A. 连通性 | 0 | 0 | 3 | 236 个 fetch 全部命中真实路由，0 断链；3 项一致性优化 |
| B. 死代码 | 0 | ~11 | ~9 | 12 个确认死文件、58 个死导出、6 个未使用依赖包、根目录散落 232 个一次性文件 |
| C. 系统安全 | 1 | 2 | 5 | 未发现新越权；next 16.3.4 存在 2 个 Critical CVE；会话吊销在 124 个路由失效 |
| D. UI 设计 | 3 | 4 | ~5 | 家长端教师标签/VIP 徽章三处配色漂移；约 60 处桌面弹窗不居中 |
| E. 布局管理 | 2 | ~10 | ~8 | 家长端 fees 裸表格 + 20+ 处原生 Modal 小屏溢出 |
| F. 功能显示 | 0 | 4 | 8 | 备份页签权限门控缺失、会员升级死路由、两处错误态缺失 |

### 优先级 TOP 10（建议修复顺序）

1. **【高】升级 next ≥16.4.3**（生产自托管，2 个 Critical：Image Optimization SVG 未认证 RCE + SSRF，另含缓存投毒）— C-高-1
2. **【高】家长端教师等级标签 + VIP 徽章配色回归 constants 单一数据源**（三处 CSS 漂移，直接违背"VIP 色彩区分/教师标签配色精准"）— D-高-1~3
3. **【中】`getCurrentUser()` 统一接入 `validateSessionMark`**（改密/停用/踢出后 124 个路由旧 JWT 仍可用最长 30 天）— C-中-1
4. **【高】原生 `<Modal>` 统一改走 `BrandModal`**（小屏溢出 20+ 处 + 桌面端不居中约 60 处，同源问题一并解决）— E-高-2 / D-中-1
5. **【高】家长端缴费页改 `ResponsiveTable` 卡片列表**（360–414px 手机上 8 列表格横向滚动）— E-高-1
6. **【中】功能显示四连修**：备份页签 super-admin 门控、会员升级 href 改 `/parent/benefits`、考勤页与费用页补错误态 — F-中-1~4
7. **【中】死代码清理**：12 个死文件 + @fullcalendar 全家桶/jspdf-autotable 卸载 + 58 个死导出（守卫函数与薪资分桶函数优先）— B
8. **【中】CSP script-src 去掉 `'unsafe-inline'`（nonce/hash 化）** — C-中-3
9. **【低】dompurify / katex / sharp / @xmldom 等 29 项 audit 漏洞升级** — C-低
10. **【低】连通性一致性**：27 个 route 对齐 apiHandler、删除死端点、6 个松散 Prisma 模型补 relation — A-低-1~3

---

## 二、A. 全部连通性（路由↔页面↔API↔Prisma↔跨端数据流）

**主链路完好：282 个 route handler、236 个客户端 fetch 调用全部对齐，0 断链、0 方法不匹配（脚本初报 10 处均为扫描窗口误报，已逐一人工核实）。** 错误响应结构全项目统一 `{ error: string }`，客户端统一解析 `payload.error`，无"写 A 读 B"状态断裂。

### A-低-1：27 个 route 未走 apiHandler 统一包装

- **证据**：`src/app/api/admin/salary/settle/route.ts:10`、`admin/salary`、`admin/data-admin/*`、`auth/[...nextauth]`、`cron/daily-ops-report`、`parent/practice-bank`、`teacher-logs`、`wxpusher/callback` 等共 27 个文件（全量扫描清单见分报告）。
- **影响**：均自带 try/catch 且错误结构与 apiHandler 一致，不会引发前端解析失败；但未经过统一的限流与请求体大小限制中间件。
- **修复**：逐步包裹 `export const GET = apiHandler(...)`；cron/health/nextauth/wxpusher 外部回调可保持现状。
- **验证**：未验证（静态扫描）。

### A-低-2：`/api/parent/notifications/[id]/read` PATCH 为死端点

- **证据**：`src/app/api/parent/notifications/[id]/read/route.ts:8` 存在但全项目无 fetch 调用；实际使用 `POST /api/parent/notifications/mark-read`（client.tsx:325,341）与详情页服务端直查库（`[id]/page.tsx:36-41`）。
- **影响**：无功能影响，易误导维护者。
- **修复**：删除或注释说明。

### A-低-3：6 个 Prisma 松散模型无 relation 定义

- **证据**：`prisma/schema.prisma:2071`（TeacherMessage）、2021-2057（FileAsset）、1885-1905（FeedbackRewardRecord）、2059-2069（MasteryRecord）、2084-2115（PracticeResult/PracticeAttempt）——字符串外键、无 Prisma relation。
- **影响**：DB 层无引用完整性，但应用层写入前已校验（`admin/teacher-messages/route.ts:25-26`），删除走软删除，无孤儿数据风险。
- **修复**：TeacherMessage 可补 `@relation + onDelete: SetNull`；其余快照/日志性质可保持。

### 已核查无问题（A 维度）

- 236 个 fetch 全部命中真实 route.ts，HTTP 方法匹配 ✅
- 课堂反馈三端状态机：教师 DRAFT/PUBLISHED → 管理端代建/撤销 → 家长端仅见 PUBLISHED，同一 status 字段（注意：无 PENDING 审核中间态，教师可直接发布，属产品设计）✅
- 考勤：普通班直接结算扣课时；INTENSIVE 班 `IntensiveLessonReview` PENDING→APPROVED 审核流完整，`attendanceSubmittedAt` 锁定仅管理员可改 ✅
- 选课/学科变更：division 硬编码隔离 + Serializable 事务 + expectedSubjects 乐观锁 ✅
- 薪资结算：`settlementStatus UNSETTLED→SETTLED` 条件更新行锁 + expectedTotal 金额确认 + P2034 并发 409 ✅
- 回收站：preview(GET)/restore(PATCH)/purge(DELETE) 与 UI 按钮对应 ✅
- Prisma relation/onDelete 策略与业务软删除模式自洽（IntensiveLessonReview Restrict、StudyHall Restrict 等）✅
- 服务端组件直查 Prisma 为 App Router 推荐模式；客户端无直连 Prisma ✅

---

## 三、B. 死代码

方法：临时 Node 脚本遍历 src 全部 1032 个 ts/tsx/mjs 构建引用图 + 逐条人工 Grep 核实 + `npx eslint src` 佐证（136 warnings，其中约 95 条 no-unused-vars）。**悬空 import：0 条。**

### B-中（确认死代码文件，建议删除）

| # | 文件 | 说明 |
|---|---|---|
| 1 | `src/app/(main)/reports/chartOptions.ts`（82 行） | 3 个 ECharts 配置对象全项目 0 引用，reports 页已内联配置 |
| 2 | `src/app/(main)/settings/ParentAccountsTab.tsx`（103 行） | SettingsContent.tsx:5-16 已不引用，家长账号 Tab 下线残留 |
| 3 | `src/app/(main)/settings/TeacherAccountsTab.tsx`（84 行） | 同上，教师账号 Tab 残留 |
| 4 | `src/app/teacher/student-profile/[id]/client.tsx`（~280 行） | page.tsx 已改纯 redirect；功能与 `teacher/student/[id]/client.tsx` 重复 |
| 5 | `src/components/Parent/ParentTodayTimeline.tsx`（178 行） | 组件 0 引用（同名数据函数 buildParentTodayTimeline 独立存活，勿删） |
| 6 | `src/components/teacher/StudentContextPanel.tsx`（160 行） | 已被 teacher/students/[id]/client.tsx 内联取代 |
| 7 | `src/data/practice-sets/humanities-zhongkao-revisions-2026-h.ts`（306 行） | 题库 barrel index.ts 独缺这两套注册，孤儿数据约 626 行 |
| 8 | `src/data/practice-sets/math-zhongkao-revisions-2026-j.ts`（320 行） | 同上 |

### B-中（未使用导出，重点项）

- `src/lib/auth/guards.ts`：`requireTenantContext / assertCanAccessClassGroup / assertCanAccessAttendance / getCurrentTeacherId / requireAdminOrOwnTeacher` 5 个守卫 0 调用（现行鉴权已改走 assertDangerAuth 等）——**误导风险高，新开发者可能误用未接线的守卫**
- `src/lib/teacher-salary.ts`：`resolveFeedbackCourseBucket / resolveFeedbackCourseBucketFromContext`（薪资结算重点模块中的旧分桶逻辑）
- `src/lib/teacher-portal.ts`：4 个角色工具；`src/lib/export-brand.ts`：stampPdfBrand/stampPdfWatermark（运行期 0 调用）
- `src/lib/api-validate.ts` 校验三件套、`business-visibility/material-visibility` 过滤函数、`data-admin` 回收站写路径 createDeletedRecord/getSoftDeleteConfig

### B-中（未使用依赖）

- **`@fullcalendar/core` `daygrid` `interaction` `react` `timegrid` 5 个包**：全项目 0 引用（已改 antd Calendar/自研课表），建议整体卸载
- **`jspdf-autotable`**：0 引用（jspdf 本体在用）
- `@vitejs/plugin-react`（devDep，疑似）：vitest.config 未引用，716 测试全绿

### B-低（遗留/卫生）

- 未使用导出约 58 个（constants/theme 设计 token、storage 工具、intensive-class 常量等，清单见分报告）
- eslint 约 95 条 no-unused-vars：antd `Select` 误导入约 20 处；`classroom-feedback/page.tsx` 一组未完成的"撤销回复"逻辑残留（setTeacherFilter/replying/revoking/revokeModalOpen 等整组未用）
- 生产 API 路径调试日志：`src/app/api/teacher/ai-feedback/chat/route.ts:292,294` 两处 `console.log('[chat-card]...')`
- public/ 6 个 `.bak` 备份文件（会被 CDN 暴露）+ 4 个 Next.js starter 默认图标（next.svg/vercel.svg/window.svg/globe.svg；file.svg 在用勿删）
- 项目根散落 **232 个** `tmp_*/check_*/fix_*/_*.py/.ps1/.sql/.log` 一次性调试/部署文件（deploy-*.log 20+、_q*.sql 22、_*.py 40+），建议归档
- scripts/ 下 46 个未被 package.json 引用的 ts/mjs 运维脚本，建议确认后归档

### 疑似需人工确认（删除前确认）

- `src/lib/attendance-stats.ts`：仅被测试引用，疑似重构前残留
- settings 两个 Tab 是"永久下线"还是"临时下线"
- `volunteer-2025.ts` 三个旧名兼容导出过渡期是否已结束

### 已排除（正常，勿动）

- `src/instrumentation.ts`、`src/proxy.ts`（Next.js 16 框架约定入口）；app 路由树/框架文件；全部 *.test.*；prisma/seed.ts；package.json scripts 引用的 24 个脚本；`data/parent-practice-bank.ts` 与 `lib/volunteer-school-match.ts` 中被 scripts/ 运维脚本使用的"死符号"；xlsx/next-auth（基线在用）；数据回收站（保留功能）✅

---

## 四、C. 系统安全

**未发现新的越权/注入漏洞**：家长/教师/管理端 20+ 路由数据级 scope 抽查全部到位（parentUserId/teacherId/division 绑定校验完整）；文件上传 magic-bytes+白名单+路径穿越防护、OSS 签名 admin 专属、导出图 HMAC 签名、密码/激活令牌（32B 随机+哈希+一次性+过期）均无问题。**主要风险在依赖与吊销一致性。**

### C-高-1：next 16.3.4 存在 2 个 Critical CVE（npm audit 真实输出，已验证）

- **证据**：`npm audit --omit=dev`（官方 registry）：29 个漏洞（10 low/3 mod/14 high/2 crit）。`next 16.0.0-16.4.0`：GHSA-2464-fhr4-w9xw（Image Optimization SVG **未认证 RCE**）、GHSA-cjq9-62q9-8jv4（**SSRF**）、GHSA-4jqv-mc3x-m676/GHSA-mcj8-r9mp-w47p（SSG/ISR 缓存投毒）、GHSA-673q-mjm6-r5xr（use cache typed arrays RCE）等 10 条公告；修复版本 **16.4.3**。
- **影响**：生产为 Docker 自托管 standalone，`/_next/image` 暴露面真实存在；remotePatterns 仅限 `**.aliyuncs.com` 只能部分缓解 SSRF，SVG RCE 与缓存投毒不受其限。
- **修复**：排期升级 next ≥16.4.3（锁定 minor 回归测试）；@sentry/nextjs 的 Critical（tunnel middleware bypass）已确认未用 tunnelRoute，实际不可利用，随升级消除。

### C-中-1：会话吊销在 124 个 `getCurrentUser()` 鉴权路由上失效

- **证据**：`src/lib/get-user.ts:6-52` 只做 `auth()` 读 JWT + role 判断，**不调用** `validateSessionMark()`、不查用户 status；对比 `src/lib/auth/guards.ts:81-118` 的 requireXxx 守卫均调用（查库比对 currentSessionToken + isUserActive）。全项目 **124 处** 路由直接用 getCurrentUser()，含回收站恢复/彻底删除（`admin/trash/[id]/route.ts:8,17`）、薪资调整（`admin/intensive-settlement/adjust/route.ts:10`）、考勤导出（`attendance/export/route.ts:15`）、class-groups/*、exam-papers/*、messages/*、dashboard/* 等。
- **影响**：改密（change-password 已轮换 currentSessionToken）、管理员停用账号、单点踢出后，旧 JWT cookie 在上述路由仍有效最长 30 天（`src/lib/auth.ts:231` session.maxAge）。非鉴权绕过，但放大被盗 cookie 杀伤面（高危写接口可用）。
- **修复**：`getCurrentUser()` 内部统一接入 validateSessionMark + isUserActive（与 guards 对齐），或高危写路由迁移到守卫函数。

### C-中-2：CSP script-src 携带 `'unsafe-inline'`

- **证据**：`next.config.ts:15`：`script-src 'self' 'unsafe-inline' ...`，无 nonce/hash。
- **影响**：任何一处 XSS 可直接执行脚本，CSP 纵深防御失效（当前 dangerouslySetInnerHTML 仅 2 处且已转义/KaTeX，风险面可控）。
- **修复**：迁移 nonce-based CSP（middleware 生成 per-request nonce），或对 KaTeX 输出加 hash 白名单。

### C-低（5 项）

- **低-1**：`src/app/api/wxpusher/callback/route.ts:15` appToken 用 `!==` 非常量时间比较 → 改 `crypto.timingSafeEqual`
- **低-2**：`src/app/api/exam-papers/recognize/route.ts:78,127` 登录教师可控制 http URL 透传 Moonshot 代取 + 回显上游错误前 120 字 → imageUrls 白名单（本站/aliyuncs）+ 错误收敛
- **低-3**：dompurify（14 条 XSS 绕过公告，≤3.4.16）/ katex（原型污染，≤0.18.1，修复 0.19.1 breaking）→ 评估升级，题库渲染面为教师/管理员录入，门槛较高
- **低-4**：登录限流 IP 桶在进程内存（`src/lib/login-rate-limit.ts:8-18`），多副本扩容需迁 Redis（当前单容器无影响）
- **低-5**：sharp <0.35.5 librsvg CVE（上传图片解析链，SVG 不在白名单，可达性低）→ 常规升级

### 已核查无问题（C 维度）

- 密码重置/家长激活令牌：32B 随机 + 哈希落库 + 过期 + 一次性原子 claim + 激活即踢旧会话 ✅
- 登录防爆破双层（Redis checkRateLimit + IP 20/分 + 账号 10 次/5 分锁 15 分）✅
- NextAuth：JWT 30 天、cookie httpOnly/sameSite=lax/secure(prod)、callbackUrl 全部硬编码本域（无开放重定向）✅
- 上传：magic bytes + 扩展名白名单 + 分档大小限制 + 关联校验 + 路径穿越防护 ✅；OSS 签名 admin 专属 300s ✅
- 高危数据恢复：SUPER_ADMIN 白名单 + 本人密码 bcrypt 二次校验 + 确认短语 + execFile 无 shell 拼接 ✅
- 敏感日志/响应：console 敏感字段仅 2 处无关命中；settings/accounts 哈希不出库（DTO 剔除 password 字段）✅；导出接口 admin 专属 + nosniff ✅
- 生产 500 仅通用文案，详情进 Sentry ✅；cron token 校验 ✅；setup 生产 404 ✅
- 响应头：HSTS/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy/poweredByHeader 齐全 ✅

---

## 五、D. UI 设计

三端共用同一 `ANTD_THEME`（`src/constants/theme.ts:70-161`），XLSX 导出全量嵌入 Logo+平铺水印、PDF/Canvas 统一品牌条+斜向水印、PageLayout/BrandModal 内置水印、登录页/启动屏/404 Logo 齐全——**品牌植入基本面好**。问题集中在家长端标签配色漂移。

### D-高-1：家长端「经验教师」标签错用品牌绿（与「新晋教师」撞色）

- **证据**：`src/app/globals.css:9711-9715` `.parent-teacher-tier-tag--experienced` 为 `background: var(--color-primary)`（品牌深绿 #14574D）+ 白字 + 橙色边框（#F2B58F，绿底橙框自相矛盾）；而单一数据源 `src/constants/teacher-tier.ts:44-49` 定义经验教师=橙色系（#E8784A/#FFF7F1）。「新晋教师」为绿色渐变（globals.css:9716-9719）——两档同色系，无法逐级区分。
- **影响**：家长端教师列表等级辨识错误，违背"教师标签配色精准"。
- **修复**：改回 constants 橙色标签（bg #FFF7F1、字 #E8784A、border #F2B58F）或直接 inline 引用 TIER_THEME。

### D-高-2：家长端教师列表 ELITE 与 SENIOR 渲染完全相同（无法区分）

- **证据**：`globals.css:9706-9710`（--senior）与 `globals.css:9740-9746`（--elite）为同一金色渐变（#C9A45C→#A8873D）+ #123C35 字 + 同边框 #D6B56A，仅 ELITE 多一层光晕；constants 本以"深绿底金字 ELITE" vs "浅米底深绿字金边 SENIOR"区分。
- **修复**：恢复 constants 的区分（ELITE 深绿底 #0E2E2A 金字；SENIOR 浅米底 #F8F3E7 深绿字金边）。

### D-高-3：家长端首页 VIP 徽章变绿，丢失橙色识别

- **证据**：`globals.css:9828-9832` `.parent-dashboard-home--vip .parent-membership-badge` 为品牌深绿 #14574D 白字；NORMAL 徽章为浅绿渐变（9858-9862），SVIP 为金（2387）。结果三档"两绿一金"，VIP 失去 `membership.ts:36-43` 规定的橙色 accent（#F0875B）。
- **修复**：VIP 徽章回橙色系（bg #F0875B 或 #FFF7F1 底 #B85C2E 字）。

### D-中（4 项）

- **中-1**：桌面端约 60 处原生 `<Modal>` 未设 `centered`（antd 默认 top:100px 顶对齐），与 BrandModal 居中弹窗视觉不一致。证据：`DeleteConfirmModal.tsx:59`、`courses/page.tsx:1936`、`StudentForm.tsx:168`、`teacher/leave/page.tsx:204`、`fees/client.tsx:437` 等。**与 E-高-2 同源，统一走 BrandModal 一并解决**。
- **中-2**：家长端导航壳无 Logo（`ParentLayout.tsx:287-289` 桌面侧栏、`MobileLayout.tsx:29,180-189` 移动顶栏仅文字），管理端/教师端侧栏均有 Logo。家长端是 B 端手机主战场 → 补 24~28px Logo。
- **中-3**：对比度不达 AA（实测 WCAG 公式）：经验教师橙字 #E8784A on #FFF7F1 = 2.75:1；新晋教师绿字 #3E8E6E on #F7FBF8 = 3.79:1（10~12px 标签需 ≥4.5）→ 加深字色。
- **中-4**：两套圆角刻度并存（theme.ts RADIUS 6-20 vs globals.css --radius 4-24 vs ANTD_THEME borderRadius 10/14/8/6），调圆角要改三处 → 收敛单一 token。

### D-低（要点）

- 成功色双值：globals.css:50 `#1D9E75` vs theme.ts:36 `#137A5A`
- public/ 同一 Logo 多份重复（96978 字节同图 4 份 + 其他版本共 5 个文件）→ 收敛 1~2 个规范文件
- 反馈分享图：知识点详解默认展开无高度上限（`classroom-feedback/page.tsx:1160`）→ 限高；多学员名单「、」拼接撑高卡片 → 超 N 人截断「等 N 人」；分享图无斜向水印（可接受，其他导出均有）
- 色相同义（低，可接受）：VIP 橙与经验教师橙同色相、SVIP 深绿与资深教师深绿同色，徽章已有 👑 图标缓解

### 已核查无问题（D 维度）

- 三端共用同一 ANTD_THEME ✅；全部 XLSX 导出嵌入 Logo+平铺水印（考勤/报表/工资/学员/财务/模板 6 处）✅；PDF/Canvas 统一品牌条+斜向水印 ✅；BrandModal 内置水印 + 强制居中 + 移动端规格 ✅；移动端 ≤767px 全局弹窗居中 ✅；分享图顶部品牌带/底部品牌语/教师标签同源 ✅

---

## 六、E. 布局管理

移动端基础打得较好（MobileLayout safe-area、BrandModal 小屏规格、overflow-x:clip、触控 44px、overscroll-behavior 等 18 项已核查通过）。**问题集中在家长端两处 HIGH 与桌面端中危适配。**

### E-高-1：家长端缴费账单为裸 Table，手机端横向滚动

- **证据**：`src/app/parent/fees/client.tsx:166` `<Table scroll={{x:820}}>` 8 列（学员/课程/金额/类型/日期/状态/缴费时间/操作）；家长端其他列表均用 ResponsiveTable 卡片列表，唯独此页 360–414px 手机横向滚动。
- **修复**：改用 `ResponsiveTable` + `renderMobileItem` 缴费卡片（金额/状态/日期为主信息）。

### E-高-2：20+ 处原生 `<Modal width={400~800}>` 小屏溢出

- **证据**：`TeacherLayout.tsx:357`、`parent/messages/client.tsx:939`、`parent/profile/client.tsx:184`、`parent/volunteer/schools:377`、`(main)/courses:1254`、`materials:392`、`fees:507`、`notifications:383`、`academic-terms:434`、`students/[id]:875/921/999` 等；固定 width 在 320–360px 屏上溢出被裁切。
- **修复**：统一 `BrandModal`（已内置 `calc(100vw - 24px)` + 90dvh）或加 `width={isMobile ? 'calc(100vw-24px)' : 560}` 分支。

### E-中（要点）

- 769–1023 平板区间管理端仍走 220px Sider，表格横向滚动常驻（`MainLayout.tsx:59`）→ 二级断点/icon-only Sider
- 教师端考勤按钮 `minHeight:36` 低于 44px 触控推荐（`teacher/attendance/page.tsx:558,572,584`）→ 移动端 44
- 教师端薪资主 Table 桌面端无 `scroll.x`（`teacher/salary/page.tsx:257`）→ 加 860
- 管理端 Content 无 max-width，>1920px 超宽屏 measure 过长（`MainLayout.tsx:61`）→ maxWidth 1600 居中
- 间距 token 缺失（仅 `--spacing-section:96px`），家长端页面 padding 出现 4 种写法（12 14 24 / 16 14 / 24 16 / 12 16）→ 建 --spacing-* 刻度
- 小字号滥用：archive:902 fontSize:10、volunteer/schools:175 11.5、attendance:544 角标 9、globals.css:341 ant-tag 11 → 说明文字提至 12px
- `--font-serif-cn` 仅在 home.module.css:13 局部定义，BusinessShowcase.module.css:23 引用可能失效 → 提升到 :root/@theme
- 教师端/家长端 Content maxWidth 写死（1280/800/1140）无响应式缩放 → `min(Npx, 100%)`

### E-低（要点）

- globals.css:306/329 两段重复 `@media (max-width:767px)`；providers.tsx:38 toast 手写 innerWidth 判定未走 useIsMobile；classroom-feedback:1071 固定 height:140 + overflow:hidden 图片裁切；字体栈可显式加 'PingFang SC'（无实际影响）

### 已核查无问题（E 维度，18 项）

中文字体栈（Noto Sans SC/Microsoft YaHei/-apple-system）、viewport meta、safe-area 刘海屏适配、BrandModal 小屏规格、useIsMobile 横屏小屏分支、minWidth:0 防 flex 溢出（100+ 处）、ellipsis 截断普遍、MobileLayout 触控 44–46px、touch-action、overscroll-behavior、tabular-nums、prefers-reduced-motion、桌面 Sider fixed + Content marginLeft、登录页 100dvh、图片预览 objectFit ✅

---

## 七、F. 功能显示

三端布局级角色守卫、API 鉴权覆盖（116/117 有守卫）、全局 loading/error 边界、教师薪资页三态、筛选→分页重置联动均良好。**无高级问题；4 项中级（权限可见性与错误态）+ 8 项低级。**

### F-中-1：「备份与恢复」页签对普通 admin 可见，但接口要求 super-admin

- **证据**：`src/components/DataAdmin/BackupRestorePanel.tsx` 无条件渲染备份/恢复；`(main)/data-admin/client.tsx` 页签对所有 admin 展示；`api/admin/data-admin/backup/route.ts` GET/POST 均 `requireSuperAdmin` → 普通 admin 点备份才 toast 无权限，**且 GET 403 时历史列表静默渲染空列表**（像"从未备份过"）。
- **修复**：复用 `GET /api/admin/settings` 的 isSuperAdmin 隐藏页签；或 403 时渲染"仅限超级管理员"提示卡。

### F-中-2：会员升级按钮指向死路由 `/parent/membership`（实际为 `/parent/vip`、`/parent/benefits`）

- **证据**：`src/constants/membership.ts:163-166` 三个等级 href 全为 `/parent/membership`（我已独立核实家长端路由目录中不存在该路径）；`parent/dashboard/client.tsx:393` SVIP 点击即 404。
- **修复**：href 改 `/parent/benefits`；SVIP 可考虑不渲染按钮。

### F-中-3：管理端考勤页加载失败静默渲染「当天无课程」

- **证据**：`(main)/attendance/page.tsx:22` fetcher throw，:320-325 仅处理 isLoading/空数组，SWR error 未消费 → 接口 500/403 时显示"这一天没有课程"。
- **修复**：补 error Alert + 重试按钮（mutate）。

### F-中-4：管理端费用页加载失败静默空表 + 统计卡归零

- **证据**：`(main)/fees/client.tsx:52-54` fetcher throw，表格无 error 分支 → 失败被误读为"没有费用记录"。
- **修复**：同 F-中-3。

### F-低（8 项，要点）

- 管理端教师日志列表/详情 fetcher 无 `r.ok` 检查（500 返回 HTML 时 .json() 抛异常被吞，页面按空渲染）→ 补 ok 检查 + error 态
- 家长端导航「升学服务」组无条件渲染，管理端已按 division 隐藏（`ParentLayout.tsx:78-83` vs `Sidebar.tsx:84-93`）→ 同步门控
- 费用页学员明细 Modal 请求期间空 body（fees/client.tsx:112）→ 加 Spin
- academic-terms 首屏加载期统计卡下方空白（:312 无骨架）→ Skeleton
- 考勤 ABSENT 历史记录在考勤页并入「请假」展示（`attendance-status.ts:23-26`、attendance/page.tsx:54-58）——两按钮为有意设计，但"缺勤 vs 请假"扣费含义不同（见 attendance-hours.ts:20-21），建议卡片小字标注原始状态
- 薪资文案：教师端「手动调整」vs 管理端「月结调整」（同 enum）；教师端费率说明硬编码默认值（22/26 元/小时）不随管理员配置变化
- 角标 fetcher 失败静默（Sidebar/TeacherLayout/ParentLayout）→ 建议至少 console.warn
- `api/volunteer/yifenyidang` 无鉴权 + Cache-Control public（疑似公开数据）→ 业务确认后归档"有意设计"

### 已核查无问题（F 维度）

三端布局守卫与重定向、API 鉴权整体覆盖、全局 loading/error/not-found 边界、教师薪资页三态与金额格式（yuan + toFixed(2)）、家长端反馈列表空态/分页、课时 remain/total 与计费模式对应、会员等级常量单一来源、筛选→分页重置联动、考勤扣课时规则与家长端五态口径 ✅

---

## 八、已核查无问题总清单（跨维度汇总）

1. 客户端零 NEXT_PUBLIC 环境变量泄露（基线）✅
2. admin API 权限守卫全覆盖（requireAdminUser 统一校验，基线）✅
3. $queryRaw/$executeRaw 全部 Prisma.sql 参数化（基线）✅
4. dangerouslySetInnerHTML 仅 2 处（JSON-LD 已转义 + KaTeX，基线）✅
5. 头像兜底文件完整；CSP blob img-src 非拦截源（基线）✅
6. 236 个 fetch 全命中、0 断链、0 方法不匹配 ✅
7. 课堂反馈/考勤/选课/薪资/回收站五大业务流状态机与并发控制自洽 ✅
8. 错误响应结构全项目统一 `{error}` ✅
9. 20+ 路由数据级 scope（parentUserId/teacherId/division 绑定）无新越权 ✅
10. 上传/OSS/导出图 HMAC/密码与激活令牌/防爆破/高危恢复流程 ✅
11. 响应头 HSTS/XFO/nosniff/Referrer-Policy/Permissions-Policy ✅
12. 三端共用 ANTD_THEME；6 类导出全量 Logo+水印植入 ✅
13. 移动端安全区/触控/滚动穿透/中文字体栈/ellipsis 等 18 项布局 ✅
14. 三端布局守卫 + API 鉴权 116/117 + 全局三态边界 ✅
15. 悬空 import 0 条 ✅
16. 分享图头像 blob 缓存链路（CachedAvatarImage noCache，上轮已修复部署）✅

---

## 九、已知风险（维持基线记录，未动）

- **xlsx@0.18.5**：npm 已知 ReDoS/原型污染类公告且无修复版本，需换维护包名；风险面=管理端 CSV/xlsx 导入导出。升级时同步回归导出水印链路（brandXlsxBuffer）。
- **next-auth@5.0.0-beta.32**：beta 版 API 未冻结，保持锁定；升级需跟随官方 breaking changes。

---

## 十、修复优先级建议

| 优先级 | 事项 | 归属 |
|---|---|---|
| P0 | 升级 next ≥16.4.3（含 @sentry/nextjs 同步） | C |
| P0 | 家长端三处标签配色回归 constants | D |
| P1 | getCurrentUser 接入 validateSessionMark | C |
| P1 | 原生 Modal 统一 BrandModal（居中+小屏宽度一次解决） | E/D |
| P1 | 家长端 fees 改 ResponsiveTable | E |
| P1 | 备份页签门控 + 会员 href 修复 + 考勤/费用错误态 | F |
| P2 | 死代码清理（12 文件 + 6 依赖 + 58 导出 + 根目录归档） | B |
| P2 | CSP nonce 化 | C |
| P2 | 27 个 route 对齐 apiHandler；删除死端点；Prisma 补 relation | A |
| P3 | audit 低危项（dompurify/katex/sharp/@xmldom/qs 等）批量 fix | C |
| P3 | 布局中危项（平板断点/触控 44/薪资表 scroll.x/间距 token/小字号） | E |
| P3 | 功能显示低危项（日志页 error、division 门控、Modal Spin 等） | F |

---

## 十一、运行时验证说明

- 本机 3000 端口被 **Vivado hw_server.exe**（PID 11724）占用，Next.js dev server 未运行；除 `npm audit`（真实命令输出，已验证）外，本报告全部结论为**静态代码走读（未验证）**。
- 建议修复 P0/P1 后在 dev 环境补测：`360/768/1440` 三档宽度家长端与教师端页面截图；`/api/health`、`/api/auth/session` 冒烟；`/dashboard/data-admin`（403 场景）、`/parent/dashboard`、`/attendance`、`/fees`（错误态场景）。
- 审查过程未修改项目任何源码/配置（各专项临时脚本仅存于各自工作区）。
