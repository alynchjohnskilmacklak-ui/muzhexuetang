# 分册四：防爬与防枚举

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + React 19 + Prisma 5.22/PostgreSQL + next-auth 5.0.0-beta.32 + Redis + 阿里云 OSS，Docker 部署于阿里云，已配 CDN）。
> 审查方式：**只读静态审查**，未启动 dev server，未对线上站点做任何爬取、压测、批量枚举或 UA 伪装；所有"是否被调用 / 覆盖多少路由"的结论均基于全仓 grep 调用点计数。需要线上流量才能确认的假设一律进入文末"待实测项"。
> 范围限定：爬虫可见面（robots/sitemap/静态资源/UA 策略）、分页与批量拉取上限、存在性枚举接口、公开 API 可抓取性、限流体系真实覆盖率、WAF/CDN/Bot 管理与验证码现状。认证码流、会话固化、越权对象级访问、上传越权由分册一/其他分册覆盖，本册仅在交叉处引用。

## 4.1 结论摘要（最要命的 5 条）

1. **唯一匿名可批量抓取的教师名册接口 `/api/public/teacher-showcase` 既无分页（`findMany` 不带 `take`），也未挂任何限流**：该路由未走 `apiHandler`、未调用 `checkRateLimit`，匿名一次请求即可拉全量在职教师的对外展示字段（姓氏+老师称呼、层级、科目、简介、院校、学历、头像种子/类型；全名、性别原值、手机号、邮箱不下发，见 `src\app\api\public\teacher-showcase\route.ts:157-169`）。
2. **4 个后台列表接口的 `limit/pageSize` 未做上限 clamp**，`?limit=100000` 会被原样送入 Prisma `take`：`teachers`、`notifications`、`leave-requests`、`settings/logs`；其中 `teachers` 还先做了一次不带 `take` 的全量 `findMany` 再在内存里排名分页（`src\app\api\teachers\route.ts:29-30, 50-53`）。前置条件是已登录会话（`teachers` GET 未做角色守卫，其余需 admin/teacher），被拖走的是教师、通知、请假、日志全量字段。
3. **登录链路与 4 个预检接口的响应可区分"账号不存在 / 存在但密码错 / 已停用 / 已锁定"**，限流只按共享 IP 桶（20/10/5 rpm），没有按被探测账号聚合的慢速探测防护；慢速换 IP 即可逐条捞"哪些手机号/邮箱注册了系统"（证据见 4.4，与分册一 A-2/A-8 交叉）。
4. **限流体系存在真实覆盖盲区**：296 个非测试 `route.ts` 中 287 个走 `apiHandler` 获得兜底限流，9 个未包装；未包装里 `teacher-showcase`（匿名）、`parent/students/[id]/learning-report`、两个 cron、`health`、两个 webhook、`portrait` 均未挂应用层限流。`src\lib\api-rate-limit.ts`（156 字节）为废弃空壳，全仓 0 处业务引用。
5. **代码与部署配置层面未见任何 WAF、CDN Bot 管理、边缘 `limit_req`、验证码/滑块/turnstile/hCaptcha/极验**；`deploy\nginx\edu-manage.conf` 仅做反向代理、头转发与证书跳转，无 Bot/UA/ACL 规则。线上 CDN 是否在控制台另配了 Bot 策略，代码库无证据，归入 ③ 架构运维层待核实。

## 4.2 robots / sitemap / 静态面暴露

### 4.2.1 robots.ts 实际输出规则

文件：`src\app\robots.ts`（App Router 生成，`public` 下不存在静态 `robots.txt`）。

- `robots.ts:6-7`：`userAgent: '*'`，Allow `/`、`/images/`、`/marketing/`；`:18` Sitemap 指向 `https://muzhexuetang.xyz/sitemap.xml`。
- `robots.ts:8-16`：Disallow 前缀清单（逐条核对源码）：
  - `/api/`、`/login`、`/reset-password`、`/activate/`、`/parent/`、`/teacher/`；
  - `/dashboard`、`/academic-terms`、`/ai`、`/attendance`、`/classroom-feedback`、`/communications`、`/courses`、`/data-admin`、`/fees`、`/grades`、`/lesson-previews`、`/login-records`、`/materials`、`/meals`、`/notifications`、`/parent-access`、`/parent-messages`、`/performance`、`/phet`、`/reports`、`/schedule`、`/services`、`/settings`、`/student-archive`、`/students`、`/study-hall`、`/teacher-logs`、`/teacher-salary`、`/teachers`、`/trash`、`/volunteer`、`/volunteer-sim`。

**判定**：
- 家长端 `/parent/*`、教师端 `/teacher/*`、管理端主要列表页均在 Disallow 内；`/api/` 整体禁止。
- 比对 `src\app` 下全部 `page.tsx`（剥离 `(main)` 路由组前缀后），**有 9 个认证页前缀未出现在 Disallow 清单**（均为登录后页面，proxy 会把匿名请求重定向/401，风险为"君子协定"级别）：
  `/appointment-detail`、`/class-detail`、`/closed-loop`、`/communication-center`、`/daily-class`、`/feedback-performance`、`/single-session-feedback`、`/teacher-compliance`、`/volunteer-center`。
- 一致性小瑕疵：`robots.ts:13` Disallow 了 `/services`，但 `src\proxy.ts:89` 把 `/services/` 前缀列入匿名公开白名单，`next.config.ts:77` 也有 `/business-assets/services/* → /services/*` 的 rewrite；robots 禁止抓取的目录在应用层却是公开静态资源，两条规则对 `/services/*` 的意图需要对齐。
- **注意**：robots 只是给合规爬虫看的提示，不构成任何访问控制；匿名 API 的真实拦截在 `src\proxy.ts:64-97` 的公开白名单内（见 4.5/4.6）。

### 4.2.2 sitemap.ts 覆盖范围

文件：`src\app\sitemap.ts:5-6`，只输出两条 URL：首页 `/`（`monthly`）与 `/about`（`weekly`）。

**判定**：
- sitemap **没有**提交家长端、管理端、教师端页面，也没有提交任何带 `[id]` 的详情页（学生档案、教师详情、课时详情、反馈详情等均不在内）。这一点是安全的。
- 唯一需注意：`/about` 由 `next.config.ts:74` rewrite 到 `public\about.html`，静态页内含有机构联系电话（`public\about.html:34, 973-975`），属于对外宣传信息，预期公开。

### 4.2.3 public 目录静态线索盘点

`public\` 共 525 个文件。按扩展名分组（实测）：png 255、webp 170、jpg 43、svg 30、gif 8、txt 5、html 4、pdf 3、ico 1、js 1、json 1、mjs 1、mp4 1、xlsx 1、xml 1。其中 html/txt/xml/js/mjs 多为搜索引擎验证文件（`baidu_verify_codeva-*.html`、`BingSiteAuth.xml`、`ByteDanceVerify.html`、`shenma/sogou/WW_verify/*.txt`、`0a03….txt`）与前端库（`echarts.min.js`、`pdf.worker.min.mjs`），属预期公开。

**已核对无以下高危静态线索**（`Select-String`/扩展名扫描）：
- 无 `.env` / `.env.*`、无 `.map` source map、无 `.sql`、无 `.bak/.backup`、无 `.zip/.tar/.gz`、无 `.log`、无数据库转储、无调试 HTML 页。
- `.dockerignore:20-21` 在构建上下文中排除了 `.env`、`.env.*`（`:22` 保留 `.env.example`）；`.dockerignore:32` 排除 `public/uploads`，`:33-36` 排除 `public/services`、`marketing`、`business-assets`、`volunteer/docs`（这些目录在生产由 compose `:68-73` 的主机共享挂载提供）。

**仍可被直接访问的静态业务素材**：
| 路径 | 类型/大小 | 判定 |
| --- | --- | --- |
| `public\volunteer\docs\2025-allocation-quota.xlsx` | xlsx，志愿配额表 | 业务数据素材，公开目录可直接下载，可被整站镜像 |
| `public\volunteer\docs\2022-plan-explanation.txt` | txt，政策说明 | 公开素材，预期内 |
| `public\volunteer\docs\` 目录 | 上传的指南文档 | `src\proxy.ts:92` 对 `/volunteer/docs/*` 放行匿名访问；文档按文件名可直链下载（文件名含时间戳+UUID，不可顺序猜测，但泄露链接即永久可达，无签名/过期）；该目录已被 `.dockerignore:36` 排除出镜像构建，线上内容来自 compose `:73` 主机共享挂载，是否存在待实测 T-7 |
| `public\uploads\` 根目录 9 个历史上传文件（3 组 `admin_material`/`meal_image`/`teacher_upload`，各含原图 png/jpg + 预览 webp + 缩略图 webp） | 本地历史上传残留 | 本地 dev 残留；`.dockerignore:32` 已排除出生产构建，线上由 compose `:69` 主机共享挂载提供，是否仍存在待实测 T-7 |
| `public\uploads\materials\test-shuxue.pdf` / `test-yuwen.pdf` / `test-yingyu.pdf` | 462-463 字节测试 PDF | 测试残留，体积极小，无数据泄露，但应清理 |
| `public\home.html`、`public\about.html` | 静态营销页，含联系电话（`home.html:38, 1529-1541, 2055`） | 对外宣传信息，预期公开 |
| `public\manifest.json` | PWA 清单，`start_url: /login` | 无敏感信息 |

### 4.2.4 UA / Bot 策略

- 全仓 `src\` 下 UA 仅被解析用于设备指纹记录：`src\lib\auth.ts:126-128`、`src\app\api\auth\log-device\route.ts:18-30`、`src\app\api\auth\session-ping\route.ts:39-46`（经 `src\lib\device.ts:1` `parseUserAgent` 拆出 device/os/browser）；**没有任何基于 UA 的拒绝、降级或拦截逻辑**（`src\proxy.ts:56` 仅为注释，不含 UA 判断）。
- 未发现 `robots` 之外的爬虫识别（无 UA 黑名单、无无头浏览器指纹识别、无行为风控）。

## 4.3 分页与全量拉取风险表

> 扫描口径：`src\app\api` 下 343 个目录、296 个非测试 `route.ts`。参数解析方式逐条精读；`take` 为固定值或角色作用域收敛的标注为"风险低"。鉴权层级以路由内实际 `auth()/getCurrentUser/requireAdminUser/requireCurrentTeacher/requireParent` 为准；proxy 白名单见 `src\proxy.ts:64-97`。

### 4.3.1 参数未 clamp / 未带上限的接口

| 路由 | 参数 | 是否有上限 | 实现方式（文件:行） | 能否被用来全量拖库 | 工作量 |
| --- | --- | --- | --- | --- | --- |
| `GET /api/teachers` | `limit`（默认 100）、`page` | **否，未 clamp**；且另有一次全量 `findMany` 内存排名 | `src\app\api\teachers\route.ts:29-30` `const limit = parseInt(searchParams.get('limit') \|\| '100')`；`:50-53` `tierRows` 不带 `take`；`:59-65` 内存 `slice` 分页；`:41-46` 支持按姓名/手机号/科目模糊搜索；GET 仅校验会话（`:18-19`），无 admin 角色守卫 | 前置：任意已登录会话（GET 未限制 admin 角色）。`?limit=100000` 直达 `take`；`tierRows` 先全表载入内存排名，教师表不大但模式可复制到更大的表 | 小 |
| `GET /api/notifications` | `limit`（默认 20）、`page` | **否，未 clamp** | `src\app\api\notifications\route.ts:22-23` `parseInt` 无 `Math.min`；`:32-33` `skip/take: limit`；角色：`admin`（`:16-18`） | 前置：管理员。`?limit=100000` 单请求拉全量通知（含学员姓名、发送对象） | 小 |
| `GET /api/leave-requests` | `limit`（默认 20）、`page` | **否，未 clamp** | `src\app\api\leave-requests\route.ts:17-18` `parseInt` 无 clamp；`:36-45` `take: limit`；角色：admin/teacher，teacher 按本人学员作用域（`:26-30`） | 前置：管理员或教师。管理员可跨校区全量拉请假记录；教师受本人学员作用域收敛 | 小 |
| `GET /api/settings/logs` | `pageSize` | **否，未 clamp** | `src\app\api\settings\logs\route.ts:17` `parseInt` 无 clamp；`:35-36` `take: pageSize`；角色：admin（`:11` `role !== 'admin'` 403） | 前置：管理员。`?pageSize=100000` 拉全量审计日志（含操作人、动作、目标、时间） | 小 |
| `GET /api/admin/students/[id]/feedback-archive` | `pageSize` | 路由层未 clamp，**但 lib 层兜底 clamp 20-100** | `src\app\api\admin\students\[id]\feedback-archive\route.ts:29-30` 原始透传；`src\lib\classroom-feedback\archive.ts:361-362` `clampPositiveInteger(pageSize, 20, 100)` | 不能超 100；风险已被 lib 兜底，属写法不一致（路由裸传、lib 兜底） | 小（收口到路由层） |
| `GET /api/volunteer/quota` | 无入参分页 | 固定 `take: 2000` | `src\app\api\volunteer\quota\route.ts:24-28`；鉴权：仅要求登录（`:10-11`），parent 角色也能读 | 前置：任意已登录账号（含家长）。单请求最多 2000 条配额记录（学校名、区县、各类计划数、备注） | 小 |

### 4.3.2 不带 `take` 的 `findMany`（按鉴权与作用域分级）

| 路由 | 鉴权/作用域 | 实现方式（文件:行） | 全量拖库风险 | 工作量 |
| --- | --- | --- | --- | --- |
| `GET /api/public/teacher-showcase` | **匿名**（GET/HEAD 放行，proxy 白名单 `src\proxy.ts:44-46, 77`），无 apiHandler、无限流 | `src\app\api\public\teacher-showcase\route.ts:91-108` 双库 `teacher.findMany({ where:{status:'ACTIVE'} })` 无 `take`；内部 select 含全名/性别/院校/简介（`:95-106`），公开输出 `publicTeachers`（`:157-169`）仅保留姓氏称呼、层级、科目、脱敏简介（`:63-80`）、院校、学历、头像种子/类型；响应 `Cache-Control: public, max-age=0, s-maxage=0, must-revalidate`（`:174`） | **高**：一次请求拉全量在职教师对外名册；无分页契约、无独立限流、无每日总量；全名与联系方式不下发，残留风险为半公开画像整表镜像 | 小 |
| `GET /api/volunteer/schools` | **匿名**（proxy 白名单 `src\proxy.ts:96`），走 apiHandler（规则 500 rpm/IP） | `src\app\api\volunteer\schools\route.ts:18-57` 学校全量；`:102` 配额全量；`:103` 一分一档 2025/2026 全量；均无 `take` | **中高**：单请求镜像学校基础信息+招生电话+地址+学费+高考率+官网+配额+一分一档；500 rpm/IP 阈值偏宽 | 小 |
| `GET /api/schools` | 任意登录用户（仅 `auth()`，无角色判断，`:10-11`） | `src\app\api\schools\route.ts:14-57` `highSchoolInfo.findMany` 无 `take`，select 含电话（`:49`）、地址（`:27`）、学费（`:43`）、高考率（`:45`）、官网（`:48`）、来源 URL（`:50`）；`Cache-Control: private, no-store`（`:106`） | 中：家长登录后即可拉全量学校档案表；属数据治理问题（公开业务资产还是内部数据需产品确认） | 小 |
| `GET /api/rooms` | 任意登录用户 | `src\app\api\rooms\route.ts:10-15` 教室配置全量，无 `take` | 低：配置表，行数少 | 小 |
| `GET /api/courses` | 管理员（`src\app\api\courses\route.ts:29`） | `src\app\api\courses\route.ts` `course.findMany` 无 `take`，含教师姓名、科目、类型、状态 | 低：管理员作用域内的课程目录，行数有限 | 小 |
| `GET /api/reports/teachers` | 管理员（`src\app\api\reports\teachers\route.ts:12-13`） | `src\app\api\reports\teachers\route.ts` 教师绩效汇总 `findMany` 无 `take` | 中：管理员作用域；绩效含课时/收入维度的口径需在数据治理分册复核 | 中 |
| `GET /api/highlights` | 任意登录用户（`getCurrentUser`） | `src\app\api\highlights\route.ts` 亮点配置全量，无 `take` | 低：运营配置表 | 小 |
| `GET /api/volunteer/documents` | 任意登录用户 | `src\app\api\volunteer\documents\route.ts` 指南文档清单全量，无 `take`；文件本体在 `/volunteer/docs/` 静态公开目录 | 低-中：清单可被枚举文件名后直链下载 | 小 |
| `GET /api/volunteer/steps` | 登录；parent 仅见 `isPublished: true`，admin/teacher 见全部 | `src\app\api\volunteer\steps\route.ts:21-22` `guideStep.findMany` 无 `take` | 低：步骤配置表 | 小 |
| `GET /api/teacher/students` | 教师，按本人学员作用域 `teacherStudentWhere` | `src\app\api\teacher\students\route.ts:18-30`，无 `take` | 低：作用域收敛到本人学员 | 小 |
| `GET /api/teacher/messages` | 教师，仅未读 | `src\app\api\teacher\messages\route.ts`，无 `take`，未读收件箱 | 低：未读集合天然有限 | 小 |
| `GET /api/teacher/salary` | 教师，按 `teacherId` 作用域 | `src\app\api\teacher\salary\route.ts:20-22`，无 `take` | 低：本人交易记录 | 小 |
| `GET /api/teacher/schedule` | 教师，按本人排课 | `src\app\api\teacher\schedule\route.ts:25-34`，无 `take`，日期区间收敛 | 低 | 小 |
| `GET /api/teacher/trends` | 教师，按本人近 6 个月 | `src\app\api\teacher\trends\route.ts:29-38`，无 `take`，时间区间收敛 | 低 | 小 |
| `GET /api/parent/today` | 家长，仅本人子女 `parentLinkedStudentWhere(userId)` | `src\app\api\parent\today\route.ts:28-31`，无 `take` | 低：作用域收敛到本人子女 | 小 |
| `GET /api/messages` | 登录，按 `getAccessibleParentMessageWhere` 作用域 | `src\app\api\messages\route.ts:68` 固定 `take: 100` | 低：有固定上限 | — |
| `GET /api/settings/export/students` | 管理员，设计为全量导出 | `src\app\api\settings\export\students\route.ts:19-23` `student.findMany` 无 `take`；`:45-48` 写审计日志 `EXPORT_STUDENTS`；`Cache-Control: no-store, private` | 中：导出接口按设计全量；有审计但无导出冷却/次数上限（见 D-10） | 小 |

### 4.3.3 已正确 clamp 的接口（基线确认）

| 路由 | 上限 | 实现方式（文件:行） |
| --- | --- | --- |
| `GET /api/students` | 500 | `src\app\api\students\route.ts:62-64` `Math.min(500, Math.max(1, requestedLimit))`；管理员（`:48-50`） |
| `GET /api/fees` | 200 | `src\app\api\fees\route.ts:125-126` `Math.min(200, Math.max(1, ...))` |
| `GET /api/fees/students` | 100 | `src\app\api\fees\students\route.ts:36` `Math.min(100, Math.max(10, ...))` |
| `GET /api/login-records` | 100 | `src\app\api\login-records\route.ts:77-78` |
| `GET /api/materials` | 200 | `src\app\api\materials\route.ts:46-47` |
| `GET /api/parent-communications` | 100 | `src\app\api\parent-communications\route.ts:79` |
| `GET /api/performance` | 50 | `src\app\api\performance\route.ts:41-42` |
| `GET /api/teacher/classroom-feedback` | 50 | `src\app\api\teacher\classroom-feedback\route.ts:51` |
| `GET /api/feedback` | 200 | `src\app\api\feedback\route.ts:55` clamp、`:119` `take: limit`；`all=1`（`:53`）仅放宽日期过滤，`take` 仍受限 |
| `GET /api/admin/classroom-feedback` | 200 | `src\app\api\admin\classroom-feedback\route.ts:32` |
| `GET /api/admin/salary` | 200 | `src\app\api\admin\salary\route.ts:38-39` |
| `GET /api/admin/data-admin/[entity]` | 100 | `src\app\api\admin\data-admin\[entity]\route.ts:38-39` |
| `GET /api/admin/course-change-events` | 100 | `src\app\api\admin\course-change-events\route.ts:13-14` |

### 4.3.4 分页后门排查

- 全仓未发现 `?all=true` / `?all=100000` 这类绕过分页的布尔后门；`all=1` 仅出现在 `feedback`、`admin/classroom-feedback`，作用是放宽**日期过滤**，`take` 上限仍在（`src\app\api\feedback\route.ts:53, 55`；`src\app\api\admin\classroom-feedback\route.ts:25, 32`）。
- 未发现 `take: undefined` 显式绕过；未发现 `findMany()` 不带任何 `where` 的裸全量查询（所有无 `take` 的查询均带角色/校区/时间作用域或属公开配置表）。

## 4.4 枚举型接口清单

> 判据：① 返回是否区分"不存在"与"存在但无权限/密码错"；② 是否按输入回显身份信息；③ 是否有频率限制（证据到文件:行）。登录口令爆破与账号锁定细节见分册一 A-2/A-3/A-8，本册从"逐条探测存在性"角度复核。

| 编号 | 接口 | 可枚举对象 | 响应是否可区分存在/不存在 | 有无频率限制（证据） | 危害 |
| --- | --- | --- | --- | --- | --- |
| E-1 | `POST /api/auth/detect-role` | 手机号/邮箱/账号 → 角色与校区 | **是**：命中返回 `role/division/emailPrefix`，未命中 `role: null`（`src\app\api\auth\detect-role\route.ts:17-23`；解析逻辑 `src\lib\login-accounts.ts:356-435`）。管理员账号被静默返回 null | 有，IP 5 rpm（`src\lib\rate-limit.ts:15`）；无按输入账号维度的探测计数 | 慢速换 IP 可逐条探测"该手机号是否注册、属于教师/家长/管理员"；管理员被隐藏但普通账号可枚举 |
| E-2 | `POST /api/auth/login-check` | 邮箱/手机号 + 角色 → 预检是否可登录 | **是**：`{ok:true}` 200（`:29`）与 `{ok:false,error}` 400（`:23-26`）两态可直接区分；错误文案统一为"账号信息暂不可用…"，但 `ok` 布尔值泄露存在性 | 有，IP 20 rpm（`src\lib\rate-limit.ts:16`） | 配合账号字典批量探测有效账号；无需尝试口令即可确认存在 |
| E-3 | `POST /api/auth/check-role` | 邮箱 → 角色 | **是**：返回 `role` 或 `null`（`src\app\api\auth\check-role\route.ts:24-33`）；管理员被抑制为 null | 有，IP 10 rpm（`src\lib\rate-limit.ts:19`） | 探测角色归属；可与 E-1 交叉验证 |
| E-4 | `POST /api/auth/login-status` | 邮箱 → 锁定状态/失败次数/剩余次数 | **弱信号可区分**：不存在账号 `failCount=0, locked=false, remaining=5`；存在且近期失败的账号 `failCount>0`（`src\app\api\auth\login-status\route.ts:12-14`） | 有，IP 10 rpm（`src\lib\rate-limit.ts:18`） | 可侧信道识别"正在被攻击/近期失败"的账号；响应时延差未核实（待实测 T-5） |
| E-5 | NextAuth 凭证登录 `POST /api/auth/callback/credentials` | 账号 + 口令 | **是，区分最细**：错误码 `BAD_USERNAME`（账号不存在）/ `BAD_PASSWORD`（密码错）/ `BAD_ROLE`（身份不符）/ `DISABLED`（已停用）/ `LOCKED`（已锁定），码源 `src\lib\login-accounts.ts:471-515, 558-598`；失败计数在 `src\lib\credential-auth.ts:52-54`；文案映射 `src\app\login\page.tsx:65-83` | 有：共享 IP 20 rpm（`src\lib\rate-limit.ts:17`；`credential-auth.ts:29-32`）；内存账号桶 10 次/5 分钟、锁 15 分钟（`src\lib\login-rate-limit.ts:16-18, 37`）；另有 DB 持久化锁 5 次/30 分钟、锁 30 分钟（`login-accounts.ts:30-31, 232-249`） | 不仅能枚举账号存在性，还能区分"已停用/已锁定"；账号维度锁定只保护已知账号，对字典首探无效 |
| E-6 | `POST /api/auth/forgot-password` | 邮箱/手机号 → 重置邮件 | **文案已统一**：无论存在与否都返回通用提示（`src\app\api\auth\forgot-password\route.ts:39-90`），不回显存在性；**残留时序侧信道**：仅命中账号才走库查询/发信，响应时延可能不同 | 有，IP 5 rpm（`src\lib\rate-limit.ts:21`） | 需计时攻击或邮件投递侧泄露；静态无法确认时延差（待实测 T-6） |
| E-7 | `GET /api/teachers`（搜索 `q`） | 教师姓名/手机号/科目 | 登录即可达（GET 仅校验会话 `src\app\api\teachers\route.ts:18-19`，未做 admin 角色守卫）；返回命中列表，空结果与有权限无命中不可对匿名区分 | 走 apiHandler 兜底 200/300 rpm；无搜索关键字维度限流 | 前置：任意已登录会话。可按姓名/手机号模糊批量拉取教师名册（与 D-1/D-2 合并治理） |
| E-8 | `GET /api/students`（搜索 `q`） | 学员姓名/家长姓名/家长手机号 | 仅管理员可达（`src\app\api\students\route.ts:48-50`）；`OR` 模糊匹配姓名/电话/家长名/家长电话（`:108-113`）；上限 500（`:62-64`） | 兜底限流；无关键字维度限流 | 前置：管理员。可按手机号反查家长-学员绑定关系 |
| E-9 | `GET /api/admin/global-search` | 姓名关键字（跨用户/教师/学员/家长） | 仅管理员；每类 `take: 8`（`src\app\api\admin\global-search\route.ts:28-35`） | 兜底限流 | 前置：管理员；结果条数受限 |
| E-10 | `GET /api/teachers/options` | 在职教师姓名/科目 | 仅管理员（`src\app\api\teachers\options\route.ts:10` `requireAdminUser`）；全量 active 教师，无 `take`（`:12-16`） | 兜底限流 | 前置：管理员；用于下拉选项，名册可整表导出 |
| E-11 | `POST /api/teachers`（创建冲突响应） | 教师手机号 | 写接口；手机号已存在返回 409 `TEACHER_PHONE_EXISTS`，错误文案回显提交的手机号与已存在教师姓名（`src\app\api\teachers\route.ts:217-222`） | 兜底限流 | 前置：管理员；可用于手机号存在性反向核对，但前置门槛高 |
| E-12 | `GET /api/auth/activate/[token]` | 激活令牌 | 非法/过期 404，有效 200 并回显家长姓名/邮箱/学员（`src\app\api\auth\activate\[token]\route.ts:25-35`）；令牌 `randomBytes(32)` 256-bit 熵（见分册一 A-5） | 无独立令牌维度限流；走兜底 | 令牌熵足够使在线枚举不可行；风险在链接泄露后的复用窗口 |
| E-13 | `GET/POST /api/volunteer/consultation` | 家长留言线索（姓名/电话/学员） | 登录用户；parent 仅见本人 `parentId`，admin 见全部（`src\app\api\volunteer\consultation\route.ts:9-11,16`）；`take: 100`（`:19`） | 兜底限流 | 低：属业务线索表，非账号体系 |
| E-14 | `GET /api/schools` | 学校档案（电话/地址/学费/官网） | 任意登录用户可读全量（`src\app\api\schools\route.ts:10-11` 鉴权、`:14-57` 查询），不区分角色 | 兜底限流 | 非账号枚举，但家长角色可批量拉取学校商业信息 |

### 4.4.1 短信/推送发送侧

- 未发现独立的"发送短信验证码 / 发送推送"面向匿名用户的接口；家长通知与企微推送由后台任务与管理员/教师动作触发（`src\app\api\notifications\route.ts`、`src\lib\wxpusher.ts`、`src\lib\qywx.ts`）。
- WxPusher 回调 `src\app\api\wxpusher\callback\route.ts:14-17` 校验 `appToken`；企微事件 `src\app\api\qywx\event\route.ts:44-50` 校验签名与 CorpId。未发现可被匿名利用的"按手机号触发推送"接口。

## 4.5 限流真实覆盖率

### 4.5.1 lib 模块覆盖表

| lib 模块 | 文件大小 | 导出的函数 | 全项目调用点数量（非测试） | 实际保护的路由 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `src\lib\rate-limit.ts` | 5982 B | `checkRateLimit`、`checkRateLimitSync`、`getRule` | 直接 import 5 个非测试文件：`lib\api-handler.ts:3`、`lib\credential-auth.ts:10`、`app\api\ai\public-assistant\route.ts:4`、`lib\teacher-ai-rate-limit.ts:1`、`lib\api-rate-limit.ts:2`（转发）；`app\api\ai\chat\route.ts` 不直接 import 本 lib，其进程内 Map 桶见 D-5/D-14 | 287 个经 `apiHandler` 包装的路由（兜底桶）+ 3 个直接调用点（public-assistant、credential-auth、teacher-ai） | **生效（核心限流）**；Redis 在线时跨进程共享，`REDIS_URL` 未配置时降级内存（`src\lib\rate-limit.ts:1-9, 47-60`） |
| `src\lib\api-rate-limit.ts` | 156 B | 旧版 `deprecatedRateLimiter` 风格转发（纯 re-export） | **0 处业务引用**（grep 全仓非测试文件无 import） | 无 | **空壳/死代码**，易被误判为"API 层独立限流已生效"；与分册一 B-1 同一项 |
| `src\lib\login-rate-limit.ts` | 2856 B | `checkCredentialRateLimit`、`recordCredentialFailure`、`clearCredentialFailures`、`buildCredentialAccountKey` | 1 处：`lib\credential-auth.ts` | 仅 NextAuth 凭证登录；内存账号桶 10 次/5 分钟、锁 15 分钟（`:16-18`）；另有 DB 持久化锁 5 次/30 分钟、锁 30 分钟（`login-accounts.ts:30-31,232-249`） | **生效（仅登录链路）**；内存桶随重启清空；不覆盖注册、预检、找回密码等其他枚举面 |
| `src\lib\teacher-ai-rate-limit.ts` | 374 B | `checkTeacherAiRateLimit` | 2 处：`app\api\teacher\ai-feedback\article\route.ts`、`app\api\teacher\ai-feedback\chat\route.ts` | 2 个教师 AI 反馈接口 | **生效（2 个接口）**；按 `teacher:${teacherId}` 键 2 次/分钟（`teacher-ai-rate-limit.ts:3,6-12`），内部复用 `rate-limit.ts` |
| `src\lib\request-ip.ts` | 664 B | `getTrustedClientIp` | 5 处：`lib\api-handler.ts`、`lib\auth.ts`、`app\api\ai\public-assistant\route.ts`、`app\api\auth\log-device\route.ts`、`app\api\auth\session-ping\route.ts` | 所有 IP 维度限流与审计取 IP | **生效**；仅读 `X-Real-IP`，不采信 `X-Forwarded-For`（`src\lib\request-ip.ts:15-17`）；信任前提见 D-15 |

### 4.5.2 包装覆盖率与未包装路由清单

- 扫描口径：`src\app\api` 下 **343 个目录、296 个非测试 `route.ts`**（另有 56 个 `route.test.ts`）。
- **287 个**路由经 `apiHandler` 包装，在入口统一执行 `checkRateLimit`（`src\lib\api-handler.ts:97-110`）；**9 个**未包装。
- `RATE_RULES` 共 **21 条前缀规则**（`src\lib\rate-limit.ts:15-35`），兜底 `/api` 200 rpm；`GET/HEAD` 在 apiHandler 内被放宽到 300 rpm（`src\lib\api-handler.ts:101-103`）。

**未包装的 9 个路由逐个定性**：

| 路由 | 自身鉴权 | 是否有应用层限流 | 定性 |
| --- | --- | --- | --- |
| `api\auth\[...nextauth]\route.ts` | NextAuth provider；`credential-auth.ts` 内挂 `checkRateLimit` + `checkCredentialRateLimit` | 有（登录双限流） | 生效，未走包装但已自行接线 |
| `api\cron\daily-ops-report\route.ts` | URL query `CRON_SECRET`/`HEALTH_TOKEN` 比对（`:56-58`） | 无 | 令牌保护；无速率限制，令牌泄露后可被高频触发 |
| `api\cron\retry-notifications\route.ts` | 同上（`:256-258`） | 无 | 同上 |
| `api\health\route.ts` | 未带 `HEALTH_TOKEN` 仅回 `{status:'ok'}`（`:26-28`）；带 token 才返回 DB 延迟/内存/uptime | 无 | 匿名侧不泄露内部指标；带 token 详情无节流 |
| `api\parent\students\[id]\learning-report\route.ts` | `getCurrentUser` 鉴权（`:28-29`），家长按本人子女作用域 | **无**（未走 apiHandler） | 登录后接口；AI 调用按 AI 限流规则兜底（前缀 `/api/ai` 之外，走 200 rpm 兜底） |
| `api\public\teacher-showcase\route.ts` | **匿名**（proxy 白名单） | **无**（未走包装、未调 `checkRateLimit`） | **最高优先盲区**：匿名全量名册 + 无限流 + 无分页 |
| `api\public\teacher-showcase\portrait\route.ts` | 匿名但需公开头像令牌 `verifyPublicTeacherPortraitToken`（`:43-48`） | 无 | 令牌保护；头像出站经马赛克处理（`:14-19, 69-75`） |
| `api\qywx\event\route.ts` | 签名 + CorpId 校验 | 无 | webhook；签名通过前不落地业务 |
| `api\wxpusher\callback\route.ts` | `appToken` 比对（`:14-17`） | 无 | webhook；令牌校验通过前不落地业务 |

### 4.5.3 公开 API 可抓取性与单 IP 额度复核

| 接口 | 匿名可达 | 限流证据 | 返回资产 | 镜像评估 |
| --- | --- | --- | --- | --- |
| `POST /api/ai/public-assistant` | 是（`src\proxy.ts:76`） | `checkRateLimit(ip, 'public-home-assistant', 5)`，5 rpm/IP（`src\app\api\ai\public-assistant\route.ts:44-52`）；无每日总量上限 | 营销问答文本（DeepSeek 调用） | 单 IP 5 次/分钟；无日配额，存在成本侧被反复调用的风险；限流键为 IP |
| `GET /api/public/teacher-showcase` | 是（GET/HEAD，`src\proxy.ts:44-46, 77`） | **无**（4.5.2 已列） | 全量在职教师对外展示集合（姓氏称呼/层级/科目/院校/学历/脱敏简介/头像种子，无全名与联系方式） | 一次请求整表镜像；无分页、无 ETag 契约、无每日上限、无服务端长缓存 |
| `GET /api/volunteer/schools` | 是（`src\proxy.ts:96`） | apiHandler 规则 500 rpm/IP（`src\lib\rate-limit.ts:31`）；`Cache-Control: no-store` | 学校档案 + 配额 + 一分一档 | 500 rpm 阈值明显高于其他公开接口；单请求数据量大，适合加缓存与分页 |
| `GET /api/volunteer/yifenyidang` | 否（不在 proxy 白名单，需登录；路由内无角色判断，`:7-15`） | apiHandler 兜底 200 rpm；`Cache-Control: public, max-age=3600, stale-while-revalidate=300`（`src\app\api\volunteer\yifenyidang\route.ts:31`）；按 `year` 过滤、无 `take` | 全年一分一档表 | 登录后可拉全表；有浏览器/CDN 缓存削峰 |
| `GET /api/volunteer/quota` | 否（需登录，任意角色） | apiHandler 兜底 200 rpm；固定 `take: 2000` | 配额记录 | 家长账号即可拉 2000 条 |
| `/volunteer/docs/*` 静态目录 | 是（`src\proxy.ts:92`） | 无应用层限流；由 Nginx/CDN 缓存层承担 | 指南文档、xlsx、txt | 文件名可被清单接口（`/api/volunteer/documents`）枚举后直链下载 |

### 4.5.4 IP 取值与绕过面

- `src\lib\request-ip.ts:15-17`：仅取 `X-Real-IP`，`X-Forwarded-For` 完全不解析；这一设计避免了"攻击者换 XFF 第一个值绕过 IP 限流"。
- 残留前提：`X-Real-IP` 必须由上层 Nginx/CDN **覆写**，不能透传客户端自带的值。当前 Nginx 配置 `proxy_set_header X-Real-IP $remote_addr`（`deploy\nginx\edu-manage.conf:12, :53`），本机直连场景正确；CDN 回源后该头是否被覆写为真实访客 IP，代码库无证据（待实测 T-4）。若 CDN 未覆写，所有匿名请求将归并到 CDN 出口 IP，限流要么集体误伤、要么按错误 IP 分桶。

## 4.6 WAF / CDN / Bot 管理现状（配置证据）

### 4.6.1 已核配置文件清单

| 文件 | 与防爬/Bot 相关的内容 | 结论 |
| --- | --- | --- |
| `deploy\nginx\edu-manage.conf` | 63 行，三个 server 块（80 代理、80→443 跳转、443 SSL 代理）：`proxy_pass http://127.0.0.1:3000`（`:9, :50`）；`proxy_set_header X-Real-IP $remote_addr`（`:12, :53`）；`X-Forwarded-For` 追加（`:13, :54`）。**全文无 `limit_req_zone` / `limit_req`，无 `map` UA 黑名单，无 WAF 模块（lua/modsecurity），无 `allow/deny` ACL，无 Bot 识别规则，无静态文件缓存段** | Nginx 层未见限流与 Bot 管理 |
| `deploy\nginx\old-cutover-proxy.conf` | 旧切换代理配置，仅 `proxy_pass` 与头转发，同样无 `limit_req`/Bot 规则 | 遗留配置，不生效 |
| `compose.production.yaml` | 服务端口 `127.0.0.1:3000:3000`（`:65-66`）；无独立边缘网关/WAF/限流容器；无 `traefik/nginx-ingress` 限流注解 | 应用层直挂本机回环，边缘防护不在 compose 内 |
| `next.config.ts:82-159` | 仅安全响应头（CSP、HSTS、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`）与静态/API 缓存头；无 Bot/UA/频率相关配置 | 无 Bot 规则 |
| `Dockerfile` / `Dockerfile.runtime` | 纯 Next standalone 运行时构建，无网络层规则；`public` 静态目录拷贝进镜像（`Dockerfile:56-59`） | 无 WAF/限流 |
| `docs\production-safety.md:37-64` | 仅应用层限流说明（Redis 降级、IP 取头、CDN 回源需覆写真实 IP 的注意事项）；**无 WAF、CDN Bot 管理、边缘 ACL、验证码章节** | 文档层未规划边缘防护 |
| `阿里云预构建部署说明.md` | 构建/产物/部署流程说明；**未出现 CDN 域名回源、WAF、Bot 管理、边缘限流、UA 拦截的配置步骤** | 运维层策略未落文档 |

### 4.6.2 验证码 / 人机校验排查

- 全仓 `src\` 与 `package.json` 关键字 `captcha / turnstile / hcaptcha / recaptcha / geetest / slider / 滑块 / verification code`：**0 处人机校验命中**（唯一 `slider` 字样是 `globals.css:7833` 的 slick 轮播样式类 `slick-slider`，与验证码无关）。
- 结论：登录、预检、找回密码、公开 AI 问答、留言提交等所有面向匿名/弱鉴权的环节，**均无图形验证码、滑块、Cloudflare Turnstile、hCaptcha、极验等人机校验**；也无设备指纹之外的行为风控。

### 4.6.3 CDN 侧现状（证据边界）

- 已知事实：生产已配 CDN（任务背景与 `docs\production-safety.md:41` 关于 CDN 回源真实 IP 的提示互证）。
- 代码库与仓库内配置中**未发现** CDN 侧 Bot 管理、UA 黑名单、边缘 `limit_req`、URL ACL、静态目录鉴权签名的任何痕迹；线上 CDN 控制台是否另配了上述策略，仓库无法证实或证伪，归入 ③ D-13，待运维在控制台核对（待实测 T-3）。

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| D-1 | 匿名接口 `/api/public/teacher-showcase` 无分页、无独立限流，一次请求镜像全量在职教师名册 | ①已具备但不完善 | 教师对外资料被整站批量爬取；公开 AI 问答与展示页成为数据出口 | 小(<1天) | 立刻 |
| D-2 | 4 个后台列表 `limit/pageSize` 未 clamp（teachers/notifications/leave-requests/settings/logs），`?limit=100000` 直达 `take`；teachers 另有全量 `findMany` 内存分页 | ①已具备但不完善 | 已登录的管理员/教师可单请求拖全量通知/请假/日志/教师数据；大 `take` 可造成 DB 与内存压力 | 小(<1天) | 近期 |
| D-3 | 登录与 4 个预检接口响应区分存在性/停用/锁定，限流仅按共享 IP，无被探测账号维度聚合 | ①已具备但不完善 | 慢速换 IP 逐条枚举注册手机号/邮箱及账号状态；字典首探不触发账号锁定 | 小(<1天) | 近期 |
| D-4 | 9 个路由未走 `apiHandler`；其中 teacher-showcase（匿名）、learning-report、cron、health、两个 webhook 未挂应用层限流 | ①已具备但不完善 | 限流覆盖存在结构性盲区；匿名接口与内部任务端点不受统一桶约束 | 小(<1天) | 近期 |
| D-5 | 兜底限流 200 rpm、GET 300 rpm 偏宽；公开 AI 助手 5 rpm/IP 但无日配额；Redis 降级内存；ai/chat 为进程内 Map | ①已具备但不完善 | 高频批量拉取与 AI 成本滥用；多实例/重启后限流状态失真 | 中(1-3天) | 近期 |
| D-6 | robots.ts 遗漏 9 个认证页前缀；`/services` 规则与静态 rewrite 意图不一致 | ①已具备但不完善 | 仅君子协定级别风险；向侦察者暴露路径结构的代价有限 | 小(<1天) | 长期 |
| D-7 | `/volunteer/docs/*` 静态目录匿名公开，上传文档按文件名直链可达，无签名/过期；public 内存量 xlsx/测试 PDF 残留 | ①已具备但不完善 | 文档链接泄露后永久可下载；测试残留混淆生产资产清单 | 小(<1天) | 近期 |
| D-8 | 全链路无验证码/滑块/turnstile/hCaptcha/极验，无 Bot 指纹与行为风控 | ②完全缺失 | 换 IP 慢速枚举、接口薅取、AI 成本滥用无人机校验兜底 | 大(>3天) | 长期 |
| D-9 | 无跨接口按"被探测账号/手机号/关键字"聚合的频率限制 | ②完全缺失 | 同一手机号可在 detect-role、login-check、check-role、login-status、登录、找回密码之间被分散探测，单接口阈值都不超限 | 中(1-3天) | 近期 |
| D-10 | 全量导出接口无冷却期与每日次数上限，仅受兜底 200 rpm 约束 | ②完全缺失 | 管理员账号（或被窃会话）可反复导出全量学员/费用表；审计日志有记录但无事前节流 | 小(<1天) | 近期 |
| D-11 | 公开数据接口无分页契约/ETag/分片返回，名册类资源一次响应整表 | ②完全缺失 | 降低爬取成本，整站镜像无需翻页 | 中(1-3天) | 长期 |
| D-12 | Nginx 无 `limit_req`、无 UA/Bot 黑名单、无 ACL；仓库未见 WAF 模块与规则 | ③架构运维层 | 应用层桶被绕过（直连回环/多 IP）后无第二道边缘防线 | 中(1-3天) | 近期 |
| D-13 | CDN 侧 Bot 管理/边缘限流/ACL 在代码与文档中无证据，线上配置待核实 | ③架构运维层 | 若 CDN 未配边缘规则，所有防爬压力都压在应用单机桶上 | 中(1-3天) | 近期 |
| D-14 | 限流驱动 auto 降级内存；ai/chat 桶为进程内 Map；多实例下阈值被分摊、重启清零 | ③架构运维层 | 分布式部署时限流阈值失真；重启后被封账号/IP 记录清空 | 中(1-3天) | 近期 |
| D-15 | IP 维度唯一信任 `X-Real-IP`，前提是上层 Nginx/CDN 覆写该头；CDN 回源透传情况待核实 | ③架构运维层 | 若回源未覆写，限流按错误 IP 分桶（误伤或失效），审计 IP 失真 | 小(<1天) | 近期 |
| D-16 | 未见异常 UA、高频 401、单 IP 大流量下载的日志审计与告警配置 | ③架构运维层 | 批量爬取/枚举行为无可观测信号，事后无法回溯定位 | 中(1-3天) | 长期 |

## ① 已具备但不完善

### D-1 匿名教师名册接口无分页、无独立限流

- **证据**：
  - `src\app\api\public\teacher-showcase\route.ts:91-108`：双库 `teacher.findMany({ where: { status: 'ACTIVE' } })`，**无 `take`、无 `skip`**；内部 select 含全名、性别、院校、简介（`:95-106`）。
  - 公开输出在 `:157-169` 的 `publicTeachers` 映射中收敛为：姓氏+老师称呼、层级、科目、脱敏简介、院校、学历、头像种子/类型；全名、性别原值、手机号、邮箱不下发；简介经 `getPublicTeacherBio`（`:63-80`）剥离收费/单位/带生数量与全名。
  - 该路由不在 `apiHandler` 包装内，全文未出现 `checkRateLimit`（4.5.2 清单第 6 行）。
  - 匿名放行：`src\proxy.ts:44-46, 77` 对 GET/HEAD 放行 `/api/public/teacher-showcase`；响应 `Cache-Control: public, max-age=0, s-maxage=0, must-revalidate`（`:174`），即 CDN/浏览器不做长缓存，每次都回源。
- **危害**：匿名攻击者单次请求即可拉取全部在职教师的对外展示集合（姓氏称呼、层级、科目、院校、学历、简介、头像种子）；无翻页、无每日上限、无服务端长缓存，配合公开 AI 问答与展示页可构成半公开教师画像出口。全名与联系方式虽不下发，但科目/院校/层级/简介组合仍可被用于人物关联测绘。
- **利用前置条件**：匿名即可，无需登录。
- **修复方案**：
  1. 在 `src\app\api\public\teacher-showcase\route.ts` 入口加 `checkRateLimit(getTrustedClientIp(req.headers), '/api/public/teacher-showcase', 30)`（参照 `public-assistant\route.ts:44-52` 的写法），或直接改为 `apiHandler` 包装并在 `RATE_RULES` 增加前缀规则。
  2. 给 `findMany` 加 `take`（如 100）与分页参数；对外名册字段进一步收敛（去掉 `university/bio` 等非展示必需项，以页面实际渲染字段为准）。
  3. 为该静态名册加 `s-maxage` 服务端缓存（如 300s），避免每次请求回源全表。
- **工作量**：小(<1天)
- **优先级**：立刻

### D-2 后台列表分页上限未 clamp，大 `take` 直达 Prisma

- **证据**：
  - `src\app\api\teachers\route.ts:29-30`：`const limit = parseInt(searchParams.get('limit') || '100')`，无 `Math.min/Math.max`；`:50-53` `tierRows = teacher.findMany({ ... })` 不带 `take`；`:59-65` 在内存中 `slice` 分页。
  - `src\app\api\notifications\route.ts:22-23`：`parseInt` 无 clamp；`:32-33` `take: limit`；角色 admin（`:16-18`）。
  - `src\app\api\leave-requests\route.ts:17-18`：`parseInt` 无 clamp；`:36-45` `take: limit`；admin/teacher，teacher 按本人学员作用域（`:26-30`）。
  - `src\app\api\settings\logs\route.ts:17`：`pageSize = parseInt(...)` 无 clamp；`:31-37` `take: pageSize`；admin。
  - 对照已正确写法：`src\app\api\students\route.ts:61-64` `Math.min(500, Math.max(1, requestedLimit))`。
- **危害**：持有登录会话（或被窃会话）后，`?limit=100000` 可单请求拉全量通知、请假记录、审计日志；`teachers` 的全表 `findMany` 先把教师表载入内存排名，大表场景存在 DB/内存压力；`parseInt` 未指定 radix 且未处理 `NaN`，异常值还可能让 `take/skip` 落入非预期分支。
- **利用前置条件**：已登录会话；`notifications/settings/logs` 需 admin，`leave-requests` 需 admin/teacher，`teachers` GET 未做角色守卫（登录即可达）。匿名仍被 proxy 白名单拦截。
- **修复方案**：在上述 4 个路由的参数解析处统一改为 `Math.min(上限, Math.max(1, Number(...) || 默认值))`，建议上限：teachers 200、notifications 200、leave-requests 100、settings/logs 200；`teachers:50-53` 的全量 `tierRows` 改为 DB 端排序 + `take/skip`，或先 `count` 再分页加载；`parseInt` 补 radix 10 并对 `NaN` 兜底。可在 `src\lib\` 新增 `clampListParams(searchParams, {defaultLimit, maxLimit})` 复用，收口所有裸 `parseInt`。
- **工作量**：小(<1天)
- **优先级**：近期

### D-3 预检/登录接口响应可区分账号存在性，缺少被探测账号维度聚合限流

- **证据**：
  - `src\app\api\auth\detect-role\route.ts:17-23`：命中返回角色，未命中 `role: null`；规则 5 rpm/IP（`src\lib\rate-limit.ts:15`）。
  - `src\app\api\auth\login-check\route.ts:21-29`：`ok: true/false` 两态；规则 20 rpm/IP（`:16`）。
  - `src\app\api\auth\check-role\route.ts:24-33`：`role` 或 `null`；规则 10 rpm/IP（`:19`）。
  - `src\app\api\auth\login-status\route.ts:12-14`：返回 `failCount/locked/remaining`；规则 10 rpm/IP（`:18`）。
  - 登录错误码分流：码源 `src\lib\login-accounts.ts:471-515, 558-598`，失败计数 `src\lib\credential-auth.ts:52-54`；前端文案映射 `src\app\login\page.tsx:65-83`；账号维度锁定为内存桶 10 次/5 分钟锁 15 分钟（`login-rate-limit.ts:16-18`）+ DB 持久化 5 次/30 分钟锁 30 分钟（`login-accounts.ts:30-31,232-249`），均只在失败发生后生效，字典首探不计入。
- **危害**：攻击者用账号字典 + 轮换 IP，可在每个接口 5-20 rpm 的共享桶内慢速探测"哪些手机号/邮箱注册了系统、属于什么角色、是否被停用/锁定"；现有账号维度锁定只保护已被撞过的账号，首次探测不计入。
- **利用前置条件**：匿名；需要 IP 池或慢速单 IP（受 5-20 rpm 约束）。
- **修复方案**：
  1. 响应收敛：`login-check` 的 `ok` 布尔改为与登录一致的通用错误（存在/不存在同态响应）；`check-role` 对未命中与无权限返回相同结构；`login-status` 对不存在账号返回与存在账号相同的 `remaining` 区间，隐藏 `failCount` 差值。
  2. 在 `src\lib\login-rate-limit.ts` 增加"按被探测标识（手机号/邮箱规范化后的 hash）聚合"的计数：跨 detect-role/login-check/check-role/login-status/登录/找回密码共享同一把"标识维度"桶（如 20 次/天/标识），与现有 IP 桶取交集。
  3. 统一认证侧响应时延：未命中账号走一次恒定耗时的空哈希比较，抹平时序差。
- **工作量**：小(<1天)
- **优先级**：近期

### D-4 未走 apiHandler 的路由未挂统一限流，存在覆盖盲区

- **证据**：296 个非测试 `route.ts` 中 9 个未包装（4.5.2 清单）；`teacher-showcase`、`portrait`、`learning-report`、两个 cron、`health`、两个 webhook 未调用任何限流函数。
- **危害**：统一桶约束不到这些端点；匿名 `teacher-showcase` 是最直接的数据出口，cron/health 令牌泄露后也无速率兜底。
- **利用前置条件**：teacher-showcase 匿名；其余需令牌或登录。
- **修复方案**：
  1. `learning-report` 改为 `apiHandler` 包装（保留现有 `getCurrentUser` 守卫）。
  2. `cron/*`、`health` 在令牌校验通过后补一个低频 IP 桶（如 30 rpm），防止令牌泄露后的高频触发。
  3. 两个 webhook 保持签名校验不变；可在签名校验前加匿名 IP 桶（如 60 rpm）抑制伪造报文冲击。
  4. 在 `scripts\security-check.mjs` 增加一条检查：所有 `route.ts` 必须 import `apiHandler` 或显式调用限流函数，未接线的列入告警（当前脚本未覆盖此项）。
- **工作量**：小(<1天)
- **优先级**：近期

### D-5 兜底阈值偏宽，AI 公开接口无日配额，降级路径风险

- **证据**：
  - 兜底 `/api` 200 rpm，`GET/HEAD` 放宽 300 rpm（`src\lib\rate-limit.ts:35`；`src\lib\api-handler.ts:101-103`）。
  - 公开 AI：5 rpm/IP、无每日上限（`src\app\api\ai\public-assistant\route.ts:44-52`）；登录 AI 聊天 `ai/chat\route.ts:136-163` 为进程内 `Map` 桶，默认 10 次/分钟、100 次/天，重启清零。
  - 驱动降级：`src\lib\rate-limit.ts:1-9`，`REDIS_URL` 未配置时走内存 `memBuckets`。
- **危害**：200/300 rpm 的兜底桶对列表与导出类接口偏宽；公开 AI 接口无日配额，单 IP 可长期持续消耗 DeepSeek 调用成本；多实例部署时内存桶各自为政，阈值被分摊；重启后失败计数与封禁状态清空。
- **利用前置条件**：匿名（公开 AI）；已登录（其他接口）。
- **修复方案**：
  1. 对列表/搜索/导出前缀在 `RATE_RULES` 单独设更低阈值（如 30-60 rpm），兜底桶只用于写操作与高频轮询。
  2. `public-assistant` 增加按 IP 的每日配额（复用 Redis 计数或 `ai/chat` 的日桶结构）。
  3. 推动 `ai/chat` 桶切换到 Redis 驱动，与 `rate-limit.ts` 统一；`memBuckets` 超过容量时的淘汰策略保留，但生产必须强制 Redis。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-6 robots 清单遗漏认证页前缀，规则与 rewrite 存在不一致

- **证据**：`src\app\robots.ts:8-16` 未覆盖 `/appointment-detail`、`/class-detail`、`/closed-loop`、`/communication-center`、`/daily-class`、`/feedback-performance`、`/single-session-feedback`、`/teacher-compliance`、`/volunteer-center`；`robots.ts:13` Disallow `/services`，而 `src\proxy.ts:89` 匿名放行 `/services/`、`next.config.ts:77` 有对应 rewrite。
- **危害**：robots 是君子协定，proxy 仍在匿名访问时拦截；遗漏的代价主要是路径结构暴露给侦察者，不构成直接数据泄露。
- **利用前置条件**：无（仅影响合规爬虫行为）。
- **修复方案**：把 9 个遗漏前缀补进 `robots.ts`；明确 `/services` 是公开营销页（应 Allow）还是内部页（应在 rewrite 处加鉴权），消除两条规则的矛盾。
- **工作量**：小(<1天)
- **优先级**：长期

### D-7 公开静态目录可直链下载上传文档，public 存在测试残留

- **证据**：
  - `src\proxy.ts:92`：`/volunteer/docs/` 前缀匿名放行。
  - `src\app\api\volunteer\documents\route.ts`：文档清单登录可读，文件本体在静态目录按文件名访问；`public\volunteer\docs\2025-allocation-quota.xlsx` 已在目录内。
  - 测试残留：`public\uploads\materials\test-shuxue.pdf`、`test-yuwen.pdf`、`test-yingyu.pdf`（462-463 B）；`public\uploads\` 根目录 9 个历史上传文件（3 组原图/预览/缩略图，本地残留，`.dockerignore:32` 已排除出镜像构建，线上由 compose `:69` 共享挂载提供，待实测 T-7）。
- **危害**：指南/配额文档链接一旦泄露即永久可达，无签名、无过期、无访问计数；测试 PDF 与历史上传残留混淆生产资产清单。
- **利用前置条件**：知道或枚举出文件名（清单接口需登录）。
- **修复方案**：
  1. 上传文档迁出 `public` 目录，改走带签名 URL 的私有对象存储（与现有 `src\lib\storage.ts` 上传链路一致），签名带过期时间。
  2. 删除 3 个测试 PDF 与 `uploads/uploads` 本地残留；在 `.dockerignore` 已有排除的前提下，确认生产镜像内不存在这些文件（待实测 T-7）。
  3. 对必须公开的 xlsx/txt 素材，在文件名与目录清单上明确标注"公开"。
- **工作量**：小(<1天)
- **优先级**：近期

## ② 完全缺失

### D-8 全链路无人机校验（验证码/滑块/Turnstile/hCaptcha/极验），无 Bot 指纹风控

- **证据**：`src\` 与 `package.json` 对 `captcha/turnstile/hcaptcha/recaptcha/geetest/slider/滑块` 0 命中；UA 仅在 `auth.ts:126-128`、`log-device\route.ts:18-30`、`session-ping\route.ts:39-46` 被解析为设备指纹，不参与拦截决策。
- **危害**：登录爆破、账号枚举、公开接口薅取、AI 成本滥用都没有第二道人机关卡；换 IP + 慢速请求即可绕过应用层 IP 桶。
- **利用前置条件**：匿名；脚本化请求。
- **修复方案**：
  1. 优先在登录与预检接口接入无感校验（Cloudflare Turnstile 或 hCaptcha），失败多次/高频后强制弹出；公开 AI 问答与留言提交可接入轻量 Turnstile。
  2. 补充基础风控信号：UA 一致性、请求间隔分布、单 IP 401/403 比例，命中阈值后要求人机校验。
  3. 选型与接入点写入 `docs\production-safety.md`，避免只在前端校验（校验结果必须服务端复核）。
- **工作量**：大(>3天)
- **优先级**：长期

### D-9 无跨接口按被探测标识聚合的枚举防护

- **证据**：现有限流键为 IP（`rate-limit.ts`）与登录账号（`login-rate-limit.ts`）；detect-role/login-check/check-role/login-status/登录/找回密码各自独立分桶，没有"同一手机号/邮箱被反复探测"的聚合计数（4.4 E-1~E-6）。
- **危害**：攻击者把同一标识分散到 6 个接口探测，单接口都不超阈值，整体却完成了账号存在性测绘。
- **利用前置条件**：匿名；持有手机号/邮箱字典。
- **修复方案**：在 `src\lib\` 新增 `identity-pivot-limit.ts`：对规范化后的标识 hash 计数（如 20 次/天/标识、5 次/小时/标识），上述 6 个接口在解析出标识后统一调用；超限返回通用 429。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-10 全量导出接口无冷却期与每日次数上限

- **证据**：`src\app\api\settings\export\students\route.ts:19-23` 全量 `findMany`；`:45-48` 写审计日志 `EXPORT_STUDENTS`；仅受 apiHandler 兜底 200 rpm 约束，接口内无"每日 N 次 / 两次间隔 ≥ X 分钟"限制。同类导出（费用、登录记录、反馈归档）同口径。
- **危害**：管理员账号或被窃会话可在一天内反复导出全量学员/费用/日志表；审计日志能事后追责，但没有事前节流，数据泄露窗口内可被多次拉走。
- **利用前置条件**：管理员会话。
- **修复方案**：在 `src\lib\` 新增导出限流 helper：按 `userId + 导出类型` 计数（如 10 次/天、间隔 ≥ 5 分钟），Redis 持久化；超限 429 并记审计日志；大表导出改为异步任务 + 下载链接签名过期。
- **工作量**：小(<1天)
- **优先级**：近期

### D-11 公开/半公开数据接口无分页契约与防镜像响应设计

- **证据**：`teacher-showcase`、`volunteer/schools`、`schools`、`volunteer/quota` 等整表返回（4.3.2、4.5.3）；响应无 `nextCursor/ETag` 分页契约，`schools` 等接口 `Cache-Control` 策略未统一。
- **危害**：爬取方一次请求即可整表镜像，无需翻页尝试；缺少 ETag 也使缓存重验证无法削减重复拉取。
- **利用前置条件**：匿名或低权限账号。
- **修复方案**：名册/目录类接口统一游标分页（`cursor` 或 `page+pageSize`）；为稳定数据加 `ETag`/`s-maxage` 缓存；公开接口响应字段与页面实际渲染字段对齐，不输出多余列。
- **工作量**：中(1-3天)
- **优先级**：长期

## ③ 架构性/运维层问题（WAF、CDN Bot 管理、端口、日志审计）

### D-12 Nginx 层无 `limit_req`、无 Bot/UA 黑名单、无 ACL；仓库未见 WAF 规则

- **证据**：`deploy\nginx\edu-manage.conf:1-63` 仅反向代理、头转发与证书跳转，全文无 `limit_req_zone/limit_req`、无 UA `map`、无 `allow/deny`、无 WAF 模块；`compose.production.yaml:65-66` 仅绑定 `127.0.0.1:3000`，无边缘网关容器。
- **危害**：应用层 IP 桶是唯一防线；直连回环（若被内网触达）、多 IP 轮换、恶意 UA 脚本都没有第二道边缘拦截。
- **利用前置条件**：网络可达应用端口或绕过应用层逻辑。
- **修复方案**：
  1. 在 Nginx 增加 `limit_req_zone`（按 IP）对 `/api/` 粗粒度兜底（如 100 r/s、burst 20），与应用层桶形成两层；静态资源目录单独限额。
  2. 对已知攻击 UA/无头浏览器特征做 `map` 拦截或降级；保留对正常搜索引擎 UA 的放行名单。
  3. 评估接入阿里云 WAF 或 Nginx 层面的基础规则集；规则配置纳入 `deploy\nginx\` 版本管理。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-13 CDN 侧 Bot 管理 / 边缘限流 / ACL 配置在仓库中无证据，待控制台核对

- **证据**：`docs\production-safety.md`、`阿里云预构建部署说明.md`、`compose.production.yaml`、`next.config.ts` 均未出现 CDN Bot 管理、边缘限流、UA 拦截、URL ACL、静态签名的配置；线上 CDN 已配置属任务背景事实，但其规则无法从仓库证实。
- **危害**：若 CDN 未配边缘规则，所有防爬压力集中在应用单机桶；CDN 缓存未覆盖的动态接口会被直接回源打到应用。
- **利用前置条件**：匿名。
- **修复方案**：运维在阿里云 CDN/DCDN 控制台核对并归档：Bot 管理（搜索引擎放行、恶意脚本拦截）、边缘限流规则、动态接口缓存策略、`/volunteer/docs/` 等静态目录的访问控制；把规则截图/导出写入 `docs\`，使代码库与线上配置可对照审计。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-14 限流驱动 auto 降级内存，多实例/重启场景防护失真

- **证据**：`compose.production.yaml:59` 已注入 `REDIS_URL=redis://redis:6379`，`docs\production-safety.md:39,43` 说明 `RATE_LIMIT_DRIVER=auto` 在 Redis 连接/命令失败时静默降级为进程内存；`src\lib\rate-limit.ts:1-9, 47-60` 内存桶 `memBuckets`；`src\app\api\ai\chat\route.ts:28, 145-167` 桶为进程内 `Map`，**不走 Redis**，重启清零。
- **危害**：Redis 故障期间限流退化为单机内存，多实例下阈值被实例数分摊；`ai/chat` 的分钟/日配额始终在进程内，重启即清空；生产发布重启后失败计数、封禁状态、AI 日配额丢失。
- **利用前置条件**：Redis 不可用/重启；或生产扩为多实例；频繁发布重启。
- **修复方案**：在启动校验（`src\lib\env-security.ts` 类似机制）中要求生产 `REDIS_URL` 可用，Redis 故障时拒绝降级内存或显式告警；`ai/chat` 桶迁移到 Redis 与主限流统一；内存驱动仅保留给本地 dev，并在启动日志中明确告警"限流运行在内存模式"；监控 `[rate-limit] Redis 不可用，降级为内存限流` 日志（`docs\production-safety.md:43`）。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-15 IP 取信依赖 `X-Real-IP` 被上层覆写，CDN 回源透传情况待核实

- **证据**：`src\lib\request-ip.ts:15-17` 只读 `X-Real-IP`；`deploy\nginx\edu-manage.conf:12, :53` `proxy_set_header X-Real-IP $remote_addr`；`docs\production-safety.md:41` 已提示 CDN 回源需覆写真实 IP。
- **危害**：若 CDN/多层代理未覆写 `X-Real-IP` 而是透传客户端自带值，攻击者可自造该头绕过 IP 限流并污染登录审计 IP；若 CDN 把所有请求写成自己的出口 IP，则匿名限流集体误伤、无法按真实访客分桶。
- **利用前置条件**：链路中存在未正确覆写头的代理层。
- **修复方案**：在 Nginx/CDN 层确认 `X-Real-IP`（或统一改造为校验后的 XFF 最右可信段）由边缘覆写；应用侧可在配置中声明可信代理网段，只接受可信代理传入的 IP 头；上线前用 T-4 方法实测。
- **工作量**：小(<1天)
- **优先级**：近期

### D-16 缺少异常爬取/枚举行为的日志审计与告警

- **证据**：仓库内未发现针对异常 UA、高频 401、单 IP 大流量下载、批量导出的日志聚合或告警规则；`scripts\security-check.mjs` 覆盖的是代码静态检查，不含运行时行为审计。
- **危害**：批量爬取、账号枚举、导出滥用在发生时无可观测信号，事后只能靠 DB 审计日志回溯，发现滞后。
- **利用前置条件**：—
- **修复方案**：在 apiHandler 限流命中、401/403 集中、导出接口调用处增加结构化日志（IP、接口、标识 hash、UA、命中桶）；接入日志告警（单 IP 分钟级 401 超阈值、单用户导出超阈值、匿名接口流量突增）。
- **工作量**：中(1-3天)
- **优先级**：长期

## 待实测项

> 以下假设静态代码无法确认，**禁止对线上站点做爬取、压测、批量枚举或 UA 伪装**；验证一律在本机 dev 环境低频、单点、可回滚地进行，或由运维在控制台/日志侧核对。

| 编号 | 待验证假设 | 验证方法（低频、单点、可回滚） | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| T-1 | `/api/public/teacher-showcase` 实际返回条数与响应体积，以及在无限流情况下连续 3 次请求是否均 200 | 本机 `next dev` 启动后，仅用 `curl` 请求 3 次该接口，记录返回 JSON 的教师条数与字节数；不并发、不翻页 | 仅打本机 dev 库，无线上影响 | 确认量级后决定分页大小与缓存策略（D-1） |
| T-2 | 4 个未 clamp 接口在 dev 库下 `?limit=1000` 是否被 Prisma 接受并返回超量数据 | 本机登录测试账号，逐个请求 `teachers/notifications/leave-requests/settings/logs?limit=1000`，观察返回条数；验证完即关 dev server | 仅本机 dev 库；不指向线上 | 验证 D-2 修复前的真实行为，作为回归基线 |
| T-3 | 阿里云 CDN 控制台是否已配 Bot 管理、边缘限流、UA 拦截、动态缓存规则 | 运维登录 CDN/DCDN 控制台导出规则清单，与本报告 4.6 对照；不触发任何线上探测 | 只读控制台操作 | 归档规则到 `docs\`；缺失项按 D-13 补齐 |
| T-4 | CDN 回源后 `X-Real-IP` 是否为真实访客 IP；应用拿到的 IP 是否与访问日志一致 | 在 dev/预发环境经 Nginx 发起请求，对比 `logDeviceFingerprint` 记录的 IP 与 Nginx `$remote_addr`；线上仅核对日志字段，不构造伪造头请求 | 低频单次；伪造头测试只在本机直连场景做 | 确认 D-15 信任链；必要时调整边缘头覆写 |
| T-5 | E-4 `login-status` 对存在/不存在账号的响应时延差是否可被计时区分 | 本机 dev 环境分别用存在与不存在的测试邮箱各请求 5 次，记录响应时间分布；不做批量字典 | 本机 dev；请求量极小 | 若存在显著时延差，按 D-3 第 3 条抹平 |
| T-6 | `forgot-password` 对存在/不存在账号的响应时延差，以及发信失败是否回显差异 | 本机 dev 关闭真实发信（使用 mock/无效 SMTP 配置），两类邮箱各请求 3 次计时；核对响应体完全一致 | 本机 dev；不向真实邮箱发信 | 确认文案统一之外是否还需恒定时延处理 |
| T-7 | 生产共享挂载目录内是否残留 `public/uploads/` 9 个历史上传文件与 3 个测试 PDF；`/volunteer/docs/` 线上文件清单 | 运维在服务器上列主机 `/srv/edu-manage/shared/public/uploads` 与 `/volunteer/docs` 目录（compose `:69, :73` 挂载）；不通过 URL 逐个访问线上文件 | 只读主机目录 | 按 D-7 清理残留；公开素材登记造册 |
| T-8 | 生产 Redis 是否在线、限流是否走 Redis 驱动；`ai/chat` 进程内桶重启后是否清空 | compose 已注入 `REDIS_URL`（`compose.production.yaml:59`），运维核对运行时 Redis 连通性与降级日志；在预发环境触发 429 后重启实例，观察主限流桶是否保留、`ai/chat` 日配额是否重置 | 配置只读核对 + 预发低频验证 | 按 D-14 将 AI 桶迁移 Redis，并对内存降级加告警 |
| T-9 | robots/sitemap 线上实际输出与静态分析是否一致（含 9 个遗漏前缀是否被搜索引擎收录） | 用 `curl https://域名/robots.txt`、`/sitemap.xml` 各取一次；搜索引擎收录情况通过站长工具后台查看，不做主动提交 | 单次只读 GET | 按 D-6 补齐 Disallow 清单 |

## 覆盖说明（扫描口径与覆盖数，不作为结论本身）

- **路由覆盖**：`Get-ChildItem src\app\api -Recurse -Filter route.ts`，共 **296 个非测试路由文件**、**343 个 api 目录**；另有 56 个 `route.test.ts` 未纳入业务结论。
- **分页参数扫描**：正则 `searchParams\.get\('(limit|pageSize|page)'\)` 命中 17 个路由文件；逐个精读参数解析行与 `take/skip/slice` 用法，分类结果见 4.3.1-4.3.3。
- **全量查询扫描**：正则 `findMany\(` 与 `take:` 计数比对，筛出"含 `findMany` 但无 `take:`"的 97 个文件（含主查询与嵌套 include 子查询）；其中列表/查询型接口逐个核对鉴权角色与作用域（4.3.2），配置表/小表/作用域收敛项已标注低风险。
- **枚举接口扫描**：目录名匹配 `search|options|activate|check|exists|verify|phone|login|detect|forgot|reset|sms|push|consult`，共命中 20+ 路由；精读登录、预检、搜索、创建冲突、激活令牌、留言 14 项（4.4 E-1~E-14）。
- **限流引用扫描**：对 `rate-limit / api-rate-limit / login-rate-limit / teacher-ai-rate-limit / request-ip` 五个 lib 名称做全仓 import/调用点计数（排除 `*.test.ts`），结果见 4.5.1；`apiHandler` 包装覆盖率按文件级 `Select-String "apiHandler"` 判定（287/296）。
- **WAF/验证码扫描**：在 `src\`、`package.json`、`deploy\`、`docs\`、根目录 `*.yaml/*.ts/*.md` 内 grep `waf|cdn|acl|bot|ratelimit|limit_req|captcha|turnstile|hcaptcha|geetest|slider|recaptcha`；命中项均为注释/文档提示，未发现生效规则或依赖。
- **静态面扫描**：`public\` 全量 525 个文件按扩展名分组；高危扩展名（`.env/.map/.sql/.bak/.backup/.zip/.tar/.gz/.log/.db`）0 命中；可疑 xlsx/pdf/txt/html 逐个核对用途。
- 未覆盖：前端页面内的客户端搜索/下拉拉取逻辑、对象存储（OSS）桶策略与 CDN 缓存键规则、线上真实流量分布；这些分别由前端代码审查分册、运维配置核对与待实测项 T-3/T-7 覆盖。
