# 分册五：防数据窃取与数据泄露

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + React 19.2.4 + Prisma 5.22/PostgreSQL 15 + next-auth 5.0.0-beta.32 + Redis 6.2.1 + ali-oss 6.23 + sharp + mammoth，Docker 部署于阿里云，已配 CDN）。
> 审查方式：**只读静态审查**，未启动 dev server，未请求线上站点、未读取线上 OSS 对象、未下载任何真实业务数据；所有"防护是否被真正调用 / 覆盖多少路由"的结论均基于全仓 grep 调用点计数与逐行精读。需要线上运行态才能确认的假设一律进入文末"待实测项"。
> 范围限定：服务端导出/下载通道、OSS 签名与上传校验、错误响应与日志脱敏、Sentry 上送面、构建产物与静态资源泄露、备份目录与本地文件读取路由、数据库/Redis 端口暴露。认证码流、会话固化、对象级越权、爬虫枚举、SSRF 主体由分册一/二/三/四覆盖，本册仅在交叉处引用。
> 依赖版本证据：`package.json:87` 服务端 Excel 库为 `xlsx`（SheetJS 0.20.3，CDN tgz）；`:64` html2canvas 1.4.1、`:65` jspdf 4.2.1、`:68` modern-screenshot 4.7.0 均为**客户端浏览器侧**依赖；`:55` @sentry/nextjs 11.9.0；`:56` ali-oss 6.23.0；`:67` mammoth 1.12.0；`:78` redis 6.2.1。全仓**未发现** exceljs / pdfkit / puppeteer 服务端渲染依赖；服务端 PDF 压缩脚本为 `scripts/compress-pdf.py`（Dockerfile:62 拷贝进 runner）。

## 5.1 结论摘要（最要命的 5 条）

1. **`/api/settings/backup/create` 是当前最宽的一条整库级回包通道**：仅 `admin` 单角色鉴权（`src\app\api\settings\backup\create\route.ts:11`），但 `students / teachers / courses / classGroups / fees / enrollments / makeupRequest` 七个 `findMany()` **无 `select`、无 `take` 上限**（`:16-25`），全标量行随 JSON 整体回包（`:44`），其中包含手机号、家长手机号、邮箱、备注自由文本；仅 `attendance` 限 5000 条、`examPaper` 限 1000 条（`:22-23`）。双库模式按 session division 选库，单库模式下存在跨部回包风险。审计日志只有一条笼统的"导出了业务数据"（`:47-49`），无字段级、无行数明细之外的约束。
2. **全部服务端导出/下载通道没有一条专用限流规则，也没有按用户/按日的导出配额与冷却期**：`RATE_RULES` 21 条规则（`src\lib\rate-limit.ts:14-36`）中不存在 export / finance / salary / students / backup 前缀；导出 GET 命中通用 `/api` 200 rpm，GET/HEAD 被放宽到 300 rpm（`src\lib\api-handler.ts:97-104`，`:103`），限流键为 `IP:路径前缀`（`src\lib\rate-limit.ts:156`），不按被登录用户聚合。20 个导出/下载路由里只有 `settings/export/students`、`settings/export/finance` 两处写了 `EXPORT_STUDENTS / EXPORT_FINANCE` 审计（带 rowCount），其余 18 处（报表导出、考勤导出、薪资流水、反馈档案、原图下载、志愿文档下载、备份 JSON 等）均无独立审计条目。
3. **OSS 私有 bucket 开关在代码里从未被读取**：`ALIYUN_OSS_PRIVATE_BUCKET` 只出现在 `src\lib\storage\index.ts:13` 的注释中，全 src grep 仅命中该注释；`put()` 成功后直接拼公网 baseUrl + 对象名返回**未签名**公网 URL（`src\lib\storage\index.ts:219-225`，`:274-277`）。bucket 到底是 public-read 还是私有，代码无法判定，取决于 OSS 控制台配置，归入待实测。本地 driver 下历史 `legacyUrl` 形如 `/uploads/<key>`（`src\app\api\upload\route.ts:224`），而 proxy matcher 显式排除了 `uploads`、`volunteer` 前缀（`src\proxy.ts:202`），该静态旁路是否被 Nginx/CDN 直出需线上核对。
4. **上传校验"图片严、文档松"**：图片通道有 magic bytes 校验（JPEG/PNG/GIF/WebP/HEIC/HEIF/AVIF，`src\app\api\upload\route.ts:29-45,108-113`），材料通道有 15 类扩展名 + 文件头双校验（`src\lib\material-file.ts:1-5,22-41`）；但通用上传的**文档类只做扩展名正则、不校验文件头**（`src\app\api\upload\route.ts:51-53`），志愿文档通道 17 类扩展名 + 20MB、**同样无 magic bytes**（`src\app\api\volunteer\documents\route.ts:35,40`）。`.html/.svg/.js` 不在任何白名单内会被拒；但文档容器内的恶意内容（宏、脚本、伪装扩展名）无第二道防线。
5. **Sentry 接入但未做任何 PII 脱敏配置**：`sentry.server.config.ts:3-8` 与 `sentry.client.config.ts:3-10` 只有 dsn / environment / tracesSampleRate（生产 0.1）/ replay 采样（session 0.1、error 1.0）；全 src grep **0 处** `beforeSend / beforeBreadcrumb / sendDefaultPii / maskAll / blockAll`，未显式关闭默认 PII 上送，client replay 未配 masking。统一错误处理在生产环境把 500 脱敏为通用文案（`src\lib\api-handler.ts:136-140`），query 参数做了脱敏（`:21,36-55`），但**未对 request body / cookie 做脱敏**；上传失败时把 `uploadErr.message` 原样拼进前端响应（`src\app\api\upload\route.ts:239-243`）。

## 5.2 导出通道清单

> 角色口径：`admin` = 管理员；`teacher` = 教师；`parent` = 家长；`登录` = 任意已认证角色。限流证据统一指向 `src\lib\api-handler.ts:97-104`（`checkRateLimit` 调用点）与 `src\lib\rate-limit.ts:14-36`（规则表）；除特别注明外，所有路由均经 `apiHandler` 包装，获得通用兜底限流，**无导出专用规则**。
> 服务端 Excel 生成方式：`XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })` 全部在内存 buffer 完成，不落临时盘；品牌水印由 `src\lib\export-xlsx-brand-server.ts:10-22` 从 `public/brand/` 读 logo/watermark 后在内存叠加。服务端未发现 `fs.writeFile` 把导出产物写到 `public/` 下的路由。

| 导出接口 | 可调用角色 | 数据范围是否按权限裁剪 | 频率限制(证据) | 敏感字段 | 风险等级 | 证据(文件:行) |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/reports/export/[chartKey]` 报表 Excel 导出 | admin（`:64` 非 admin 403） | 是。division + 当前 term 裁剪（`:69-73`）；7 个 chartKey 分支全部 `groupBy/count/金额聚合`，无个人行 | 通用 `/api` 200 rpm，GET 放宽 300 rpm；无专用规则（`rate-limit.ts:35`，`api-handler.ts:103`）；无审计 | 仅阶段人数、掌握程度、留存率、互动率、月度金额、考勤状态计数、操作次数；无姓名/电话/邮箱 | 低 | `src\app\api\reports\export\[chartKey]\route.ts:4,47-56,64,69-73,76-165`；默认分支 400（`:164-165`）；文件名固定图表标签 + ISO 日期（`:81,88,101,121,138,155,162`），chartKey 走 switch，不可参数控文件名 |
| `GET /api/reports/students` 学员概览 | admin（`:12`） | 是。division + term 裁剪（`:22-25`）；`take: 300`（`:31`） | 通用限流；无专用规则；无审计 | 行字段 id/name/grade/school/parentName/status/attendanceCount（`:45-53`）；**不含** phone/parentPhone/email | 低-中 | `src\app\api\reports\students\route.ts:12,16-17,21-32,45-53` |
| `GET /api/reports/teachers` 教师概览 | admin（`:12`） | 是。division 裁剪（`:22`）；无 `take` 上限（教师表量级小） | 通用限流；无专用规则；无审计 | 行字段 id/name/subjects/employmentType/monthlyHours/studentCount/monthFeedback/rating（`:35-44`）；无电话/邮箱 | 低 | `src\app\api\reports\teachers\route.ts:12,16,21-25,35-44` |
| `GET /api/reports/parent-logins` 家长登录排行 | admin（`:11`） | 是。division 裁剪（`:24`）；`parentUsers` select 仅 id/name（`:25`）；排行 `take: 10`（`:45`） | 通用限流；无专用规则；无审计 | 排行仅 name/count/lastAt（`:66-73`）；无 IP、无电话、无邮箱 | 低 | `src\app\api\reports\parent-logins\route.ts:11,15,23-26,39-47,51-54,66-73` |
| `GET /api/reports/parent-engagement` 家长互动 | admin / teacher（`:13`） | 部分。teacher 限定当前活跃 term + division（`:20-23`）；纯聚合计数（`:25-39`） | 通用限流；无专用规则；无审计 | 仅推送数/已读率/反应率/评论率/咨询回复率；无个人字段 | 低 | `src\app\api\reports\parent-engagement\route.ts:13,19-23,25-39,45-52` |
| `GET /api/reports/attendance-stats` 考勤统计 | admin / teacher（`:14`） | 是。teacher 限定本人课次（`:36-41`）；纯聚合（`:48-64`） | 通用限流；无专用规则；无审计 | 仅出勤/请假/旷课/补课计数与比率；无个人行 | 低 | `src\app\api\reports\attendance-stats\route.ts:14,20-29,32-43,48-64` |
| `GET /api/reports/paper-stats` 试卷薄弱点 | admin / teacher（`:13`） | **部分缺口**。division + term 裁剪（`:19-23`），但 **teacher 未按本人课次/本人学生裁剪**，可见整 division 该 term 的薄弱知识点 Top10（`:42-48`） | 通用限流；无专用规则；无审计 | 仅科目/知识点 + 计数；无学生姓名 | 中 | `src\app\api\reports\paper-stats\route.ts:13,19-23,35-48,51-58` |
| `GET /api/reports/volunteer-stats` 志愿填报统计 | admin / teacher（`:10`） | **否**。查询无 division / term 过滤（`:22-25`），跨学部计数 | 通用限流；无专用规则；无审计 | 仅 guideViews/docDownloads/consultations/quotaQueries 四个计数（`:28-33`） | 中（跨部） | `src\app\api\reports\volunteer-stats\route.ts:10,15-26,28-33` |
| `GET /api/reports/summary` 数据总览 KPI | admin（`:52`） | 是。division + term 裁剪（`:55-59`）；聚合 KPI 与月度财务金额（`:129-147`） | 通用限流；无专用规则；无审计；响应 `Cache-Control: private, no-store`（`:179`） | 计数、掌握率、金额聚合；无个人行 | 低 | `src\app\api\reports\summary\route.ts:47-59,82-99,129-147,162-181` |
| `GET /api/attendance/export` 考勤 Excel 导出 | admin / teacher（`:17`） | 部分。teacher 限定本人班级（`:36-41`）；student select 仅 name（`:56`）；**无 `take` 上限**（`:53-60`） | 通用限流；无专用规则；无审计；内存 XLSX（`:76`）；文件名固定日期（`:82`） | 列：班级/日期/学员/状态/扣课时（`:65-71`）；无电话/邮箱 | 中 | `src\app\api\attendance\export\route.ts:17,24-29,31-45,53-60,65-71,73-84` |
| `GET /api/settings/export/students` 学员全量 Excel | admin（`requireAdminUser` `:14`） | 是。division 裁剪（`:20`）；include enrollments+fees（`:21`）但回包剥离电话/邮箱；**无 `take` 上限**（`:19-23`） | 通用限流；无专用规则；**有审计** `EXPORT_STUDENTS` + rowCount（`:45-48`）；no-store + nosniff（`:53-54`） | 行字段：姓名/性别/年级/学校/剩余课时/总课时/状态/报名课程/缴费总额/注册日期（`:28-33,37`）；不含 phone/parentPhone/email | 中 | `src\app\api\settings\export\students\route.ts:14,17,19-23,25-34,36-44,45-48,49-56` |
| `GET /api/settings/export/finance` 财务 Excel 导出 | admin（`:14`） | 是。year + division 裁剪（`:17-21`）；**无 `take` 上限**（`:20-24`） | 通用限流；无专用规则；**有审计** `EXPORT_FINANCE` + rowCount（`:43-46`）；no-store + nosniff（`:51-52`） | 行含学员名/类型/金额/状态/日期/**notes 备注自由文本**（`:26-32,35`）——notes 可能夹带家长留言、联系方式等 PII | 中 | `src\app\api\settings\export\finance\route.ts:14,17-24,26-37,41-46,47-55` |
| `GET /api/admin/salary/export` 教师薪资流水 Excel | admin（`requireAdminUser` `:53`） | 是。teacherId 校验属于当前 division（`:63-67`）；student select 仅 id/name（`:112-115`），无电话；行含学生姓名/金额/课时/科目（`:130-185`） | 通用限流；**无审计日志、无独立限流**；内存 workbook（`:196-204`）；文件名经 `safeFilenamePart` 清洗 `\/:*?"<>|` 并截 40 字（`:40-42,205`）；`ADMIN_UNAUTHORIZED` 403（`:215-217`） | 学生姓名、科目、课时、金额、反馈次数；无家长联系方式 | 中 | `src\app\api\admin\salary\export\route.ts:53,55-67,71-74,112-115,130-185,196-213,215-217`；workbook 生成 `src\lib\salary-export.ts:307` |
| `GET /api/admin/students/[id]/feedback-export` 单学生反馈档案 Markdown | admin（`requireAdminUser` `:42`） | 是。按 studentId 加载归档（`:45-50`）；图片链接走签名 token（`:54-57`）；文件名 = 学生名 + 固定后缀（`:59`）；`Cache-Control: private, no-store`（`:65`） | 通用限流；无独立审计 | 单学生反馈全文（文本/评语）；图片经 `/api/files/view` 签名通道 | 低-中 | `src\app\api\admin\students\[id]\feedback-export\handler.ts:42,45-50,51-58,59-67`；route.ts 为薄包装 |
| `GET /api/admin/classroom-feedback/image-download` 反馈原图下载 | admin（`requireAdminUser` `:13`） | 是。asset 按 DB id 查（`:17-25`）；`safeDownloadName` 去换行/引号/反斜杠/斜杠（`:8-10,30`）；attachment（`:35`）；私有 no-store（`:36`） | 通用限流；无独立审计 | 反馈原图文件体；元数据不含电话 | 低 | `src\app\api\admin\classroom-feedback\image-download\route.ts:13,17-25,29-38` |
| `GET /api/volunteer/documents/[id]/download` 志愿文档下载 | **仅 `auth()` 登录，无角色校验**（`:11-12`），家长可调 | 部分。fileUrl 必须 `/volunteer/docs/` 前缀（`:18`）；`path.join(public, fileUrl)` 后 `readFile`（`:20-21`）；前缀来自 DB，**未见 `safeRelativePath` 归一化**（对比 `src\app\api\uploads\[filename]\route.ts:41-46`） | 通用限流（`/api/volunteer` 10 MB body 限制 `api-handler.ts:17`）；无独立审计 | 文档文件体（政策说明/配额表/压缩包/文本） | 中 | `src\app\api\volunteer\documents\[id]\download\route.ts:11-12,16-21,23-30` |
| `GET /api/files/view` 反馈图片签名/登录通道 | HMAC token 有效则免 session（`:16-22`），否则 `requireAuthenticatedUser`（`:22`） | 是。token 通道按签名 division 选库（`:25-26`）；DB 查 asset（`:28-39`）；非 token 通道走 `canAccessFeedbackImage`（`:47-54`）；nosniff（`:71`） | 通用限流；无独立审计 | 图片文件体；元数据 select 不含电话 | 低 | `src\app\api\files\view\route.ts:14-22,25-39,42-55,57-73` |
| `GET /api/files/[id]` 文件元数据 | 登录（`:12`） | 是。feedback 走 `canAccessFeedbackImage`（`:37-44`），其余走 `assertCanAccessFileAsset`（`:48-55`）；**仅回元数据，不回文件体**（`:58-68`） | 通用限流；无独立审计 | filename/originalName/mimeType/size/url/ownerType/createdAt；不含电话/邮箱 | 低 | `src\app\api\files\[id]\route.ts:12,16-24,30-45,47-56,58-68` |
| `GET /api/materials/[id]/view` 讲义/资料预览下载 | 登录（`:74`）+ audience 校验（`:86`）+ 教师/家长 visibility 二次校验（`:92-123`） | 是。本地路径 `..`/绝对路径拦截（`:153-155`）+ publicRoot 前缀校验（`:157-160`）；docx 预览 HTML 转义 + 紧 CSP `default-src 'none'; style-src 'unsafe-inline'; img-src data:`（`:27,33`） | 通用限流；无独立审计 | 讲义文件体（PDF/图片/Word）；按 audience 隔离 | 低 | `src\app\api\materials\[id]\view\route.ts:73-88,91-123,130-147,152-160,162-186` |
| `POST /api/settings/backup/create` 业务数据 JSON 备份 | admin（`:11`） | **否**。七个 `findMany()` 无 select、无 take（`:16-25`）；双库按 session division 选库；回包 `data` 全标量（`:44`）；`restorable: false`（`:29`）；审计仅一条笼统记录（`:47-49`） | 通用限流；无专用规则；无 rowCount 之外的导出约束 | students/teachers/fees/enrollments/makeups 全标量行，含 phone/parentPhone/email/notes；attendance 5000、examPaper 1000 封顶 | **高** | `src\app\api\settings\backup\create\route.ts:8-12,14-25,27-45,47-51` |
| `GET /api/public/teacher-showcase/portrait` 公开教师头像 | 公开 token 校验（`:43-48`），无 session | 是。`data:image` base64 限 8MB（`:26`）；`/avatars//people/` 走 publicRoot 前缀校验（`:31-33`）；其余 key 拒 `..`/反斜杠（`:38`）；上传头像强制马赛克（`:14-19,69-75`）；webp 320×320（`:67,73,75`） | 未走 apiHandler（与分册四 D-4 一致），无应用层限流；nosniff（`:81`） | 仅头像图像；不上传教师电话/邮箱 | 低 | `src\app\api\public\teacher-showcase\portrait\route.ts:21-40,42-48,50-60,62-75,77-83` |

### 5.2.1 报表/列表型接口中的数据面补充（非文件导出）

- `GET /api/admin/data-admin/[entity]`：admin（`src\app\api\admin\data-admin\[entity]\route.ts:22-23`），limit 已 clamp 到 1–100（`:39`），division 作用域（`:45`），返回前经 `sanitizeDataAdminRecord` 按 key 名剥离 password/sessionToken/access_token/refresh_token/hashedPassword/secret/apiKey/token/credential（`src\lib\data-admin\entities.ts:158-177`）；**但 phone/parentPhone/email 不在剥离名单**（学生可搜字段含 parentPhone/phone，`:39`；教师可搜 phone/email，`:49`），admin 可在后台分页看到联系方式，属预期内的管理员可见面，问题在于该通道同样无导出审计与按用户配额。
- `GET /api/admin/data-admin/overview`：admin（`src\app\api\admin\data-admin\overview\route.ts:13`），仅 7 个计数（`:34-41`），无个人行。
- 服务端 PDF：`src\lib\export-report-pdf.ts:40-41`、`src\lib\classroom-feedback\parent-pdf.ts:651-652` 使用 jsPDF，调用点均在客户端组件（`src\app\parent\archive\client.tsx:29`、`src\app\(main)\students\[id]\page.tsx:478,521`），**在浏览器内生成**，不经服务端文件落盘。

## 5.3 OSS 签名/上传安全

> 调用点计数口径：签名下载 URL 由 `generateOssSignedUrl`（`src\lib\storage\index.ts:476-482`）→ `AliyunOssDriver.generateSignedUrl`（`:314-337`）；浏览器直传签名由 `generateOssPostSignature`（`:467-473`）→ `:280-311`；反馈图片 HMAC 签名由 `createFeedbackExportImageUrl` / `verifyFeedbackExportImageToken`（`src\lib\classroom-feedback\export-image-url.ts:21-66`）。访问鉴权链：`src\lib\upload-policy.ts:3-19`（角色×类型矩阵）、`src\lib\upload-access.ts:41-110`（文件资产全链校验）、`:113-149`（按 url/key/storageKey/previewUrl/thumbnailUrl 反查 FileAsset）、`:156-187`（关联归属校验）。

| 项目 | 现值 | 是否合理 | 证据(文件:行) |
| --- | --- | --- | --- |
| OSS PostObject 签名有效期 | 默认 **300 秒**（`expireSeconds ?? 300`）；materials 直传签名同样 **300 秒** | 基本合理（5 分钟直传窗口），偏短但安全侧可接受 | `src\lib\storage\index.ts:285,288,310`；`src\app\api\materials\oss-signature\route.ts:44` |
| OSS 私有对象签名下载 URL 有效期 | storage 层默认 **300 秒**（`expireSeconds ?? 300`）；`/api/uploads/sign` 通道用 **3600 秒（1 小时）**，签名结果缓存 **50 分钟**（`SIGNED_URL_CACHE_MS = 50*60*1000`） | 1 小时偏长；同一对象签名被进程内 Map 缓存 50 分钟，缓存期内复用同一过期时间戳 URL | `src\lib\storage\index.ts:326,328`；`src\app\api\uploads\sign\route.ts:12-14,66-80` |
| 反馈导出图片 HMAC 签名有效期 | 默认 **7×24×60×60 = 604800 秒（7 天）**；HMAC-SHA256，消息体 `assetId:division:expires`；division 仅 JUNIOR/SENIOR；过期校验 + `timingSafeEqual` 恒时比较 | **偏长**：反馈档案 Markdown 分享后图片链接 7 天内可重放；secret 缺失时**降级为未签名** `/api/files/view?id=` 裸链（无 fail-closed） | `src\lib\classroom-feedback\export-image-url.ts:3,16-18,32-33,37,56,59,62-65` |
| objectKey 可控性（越权签别人文件） | `/api/uploads/sign`：keys 截 **50 个**（`:27`）；先 `canAccessFeedbackImage`（`:38-42`）再 `assertCanAccessStoredFileAsset` 按 DB 反查（`:49`）；对象在 FileAsset/反馈策略内解析不到则 404，**不能签任意 key**。材料 PUT 通道 key 正则 `^materials/material-\d+-[0-9a-f-]+\.[a-z0-9]+$`（`:148`），且扩展名与 key 扩展名必须一致（`:148`）。PostObject policy 条件为精确 `{ key }`（非 prefix 通配） | 合理：签名键受 DB 归属约束；但 sign 通道缓存键为 `key`（`storage:key`），跨用户复用同一签名 URL 时未在缓存键中混入 userId | `src\app\api\uploads\sign\route.ts:25-30,37-59,66-80`；`src\lib\storage\index.ts:290-297`；`src\app\api\materials\upload\route.ts:146-150` |
| 目录前缀与用户隔离 | 文件名由 `safeFilename` 生成 `{prefix}-{timestamp}-{uuid}.{ext}`（`:363-369`），ext 仅留 `a-z0-9.`、超过 8 字符降 `.bin`（`:364-365`）；前缀取自 ownerType（`teacher-feedback / parent_upload / admin_material / avatar / meal_image / parent_message`），**目录前缀不含 userId**；隔离依赖 FileAsset 的 visibility/ownerType/studentId/lessonId/postId 归属链，而非对象路径 | 部分合理：随机化到位，但路径层无用户命名空间；一旦鉴权链某一环漏判，同前缀对象之间无目录隔离兜底 | `src\lib\storage\index.ts:363-369`；`src\app\api\upload\route.ts:88,123`；`src\lib\upload-access.ts:41-110,113-149`；`src\lib\upload-policy.ts:21-31` |
| MIME / 扩展名白名单（通用上传） | 图片 ext：jpg/jpeg/png/gif/webp/heic/heif/avif（`:48`）；文档 ext：pdf/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z（`:51-53`）；`.html/.svg/.js` 不在列表被拒 | 图片白名单合理；文档白名单含压缩包（zip/rar/7z）需结合 magic bytes 与下载 nosniff 评估 | `src\app\api\upload\route.ts:47-53` |
| MIME / 扩展名白名单（材料通道） | 15 类：pdf/jpg/jpeg/png/gif/webp/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z（`:1-5`）；OSS 直传签名仅 7 类文档：pdf/doc/docx/xls/xlsx/ppt/pptx（`oss-signature:8`） | 合理；直传签名收窄到文档，图片走服务端中转 | `src\lib\material-file.ts:1-5,9-11`；`src\app\api\materials\oss-signature\route.ts:8,34-37` |
| 大小上限（通用上传，按类型） | teacher-feedback **20MB**、parent-upload **10MB**、admin-material **50MB**、avatar **5MB**、parent-message **10MB**、default **10MB**（`:18-27`）；网关 body 上限：lesson-previews 210MB、materials/upload 210MB、/api/upload 30MB、exam-papers 10MB、volunteer 10MB、默认 5MB（`api-handler.ts:12-18`） | 阈值分层清晰；admin-material 50MB 与网关 210MB 之间余量充足 | `src\app\api\upload\route.ts:18-27`；`src\lib\api-handler.ts:9-19,112-120` |
| 大小上限（材料/志愿/识别） | 材料：OSS **200MB** / local **50MB**（`materials/upload:70`）；PUT 元数据通道 fileSize ≤ **200MB**（`:142,157`）；OSS 直传签名 **200MB**（`oss-signature:9`）；志愿文档 **20MB**（`documents:40`）；试卷识别单图 **3MB**、base64 总量 **10MB**、最多 **4 张**（`recognize:12-14`） | 200MB 材料上限偏大，压缩包/文档场景需配合服务端解压审计；其余合理 | `src\app\api\materials\upload\route.ts:70-74,142-144,157-159`；`src\app\api\materials\oss-signature\route.ts:9`；`src\app\api\volunteer\documents\route.ts:40-41`；`src\app\api\exam-papers\recognize\route.ts:12-14` |
| magic bytes（图片） | JPEG `FF D8 FF`、PNG `89 50 4E 47`、GIF `GIF87a/89a`、WebP `RIFF....WEBP`、HEIC/HEIF/AVIF `....ftyp` + brand 白名单（`:31-43`） | 合理；图片通道不信 Content-Type | `src\app\api\upload\route.ts:29-45,108-113` |
| magic bytes（材料） | pdf `%PDF`；jpg/jpeg/png/gif/webp/rar/7z 各自签名；zip/docx/xlsx/pptx 校验 PK(03 04/05 06/07 08)；doc/xls/ppt 校验 OLE(`D0 CF 11 E0…`)；未知 ext 返回 false（`:26-41`） | 合理；PUT 直传后还回读 OSS 对象前 16 字节做二次签名校验（`materials/upload:153-162`） | `src\lib\material-file.ts:22-42`；`src\app\api\materials\upload\route.ts:76-79,152-162` |
| magic bytes（文档类 / 志愿文档） | **缺失**：通用上传文档分支只走 ext 正则（`upload:51-53`）；志愿文档 17 类 ext + 20MB，无文件头校验（`documents:35-41`） | **不合理**：可上传伪装扩展名的文档/压缩包；下载时若 Content-Type 宽松存在混淆风险 | `src\app\api\upload\route.ts:51-53,103-105`；`src\app\api\volunteer\documents\route.ts:35-41,45-49` |
| 危险扩展名（html/svg/js） | 图片/文档/材料三个白名单均不含 `.html/.svg/.js/.mjs/.htm`；`.svg` 也不在图片白名单（`upload:48`） | 合理：存储型 XSS 面被扩展名层关闭；但需注意若 OSS bucket 与站点同域且允许上传 html 会形成同源脚本执行——当前白名单已排除 | `src\app\api\upload\route.ts:48,51-53`；`src\lib\material-file.ts:1-5`；`src\app\api\volunteer\documents\route.ts:35` |
| bucket 域名关系 / 公开读 | `put()` 成功后 URL = `ALIYUN_OSS_PUBLIC_BASE_URL || https://{bucket}.{endpoint}` + `/` + 对象名，**不带签名**（`:219-225`）；`getUrl` 同样拼公网 baseUrl（`:274-277`）。`protectedUploadFallback` 对私有 OSS 不走裸公网，回落 `/api/uploads/<key>` 代理（`upload-url.ts:31-36`）。`ALIYUN_OSS_PRIVATE_BUCKET` 仅注释（`storage:13`），**代码零读取** | **待实测**：bucket ACL、CDN 回源域名、是否与站点同域，代码无法证实；若 bucket 为 public-read 且对象 key 可枚举/泄露，裸公网 URL 可直接读 | `src\lib\storage\index.ts:13,216-229,274-277,462-464`；`src\lib\upload-url.ts:31-36`；`src\app\api\upload\route.ts:179,211-213,222-224` |
| 文件名随机化 | 服务端中转通道：`safeFilename` UUID（`storage:363-369`）；志愿文档 POST：`{Date.now()}-{file.name}`，非单词字符替换 `_`（`documents:46`），**保留原始文件名、无 UUID** | 志愿文档文件名可预测（时间戳 + 原名），且落在 `public/volunteer/docs/` 静态目录 | `src\lib\storage\index.ts:363-369`；`src\app\api\volunteer\documents\route.ts:46-49,57` |
| OSS 故障本地回落 | `uploadBuffer` 在 `allowLocalFallback: true` 时 OSS 配置错误可落本地持久存储（`storage:392-399`）；sign 通道对象不可用回落 `/api/uploads/`（`sign:73-75,85`）；materials PUT 失败抛 `StorageConfigurationError`（`materials/upload:90-97,163-167`） | 回落保证可用性，但本地路径受 proxy matcher 排除影响（见 5.4 / 待实测 T-12） | `src\lib\storage\index.ts:383-401`；`src\app\api\uploads\sign\route.ts:61-76,81-86` |
| MIME 取值来源 | `mimeType` 取自客户端 `file.type`（`upload:175,228`），未由服务端按文件头反推 | 部分依赖客户端声明；下载通道按 ext 映射 Content-Type（`material-file.ts:55-73`），nosniff 兜底 | `src\app\api\upload\route.ts:122,175,228`；`src\lib\material-file.ts:55-73` |

## 5.4 错误响应 / 日志 / 构建产物泄露

### 5.4.1 统一错误处理（前端可见面）

- 生产环境 500 统一脱敏：`isDev = NODE_ENV !== 'production'`；生产只回 `"服务器错误，请稍后重试"`，dev 才回 `err.message`（`src\lib\api-handler.ts:136-140`）。**不向前端返回 stack trace、Prisma/SQL 原文、内部路径**——该结论由 catch 分支逐行确认：返回体只有 `{ error: message }`（`:140`）。
- 业务异常分类回前端：`AuthError` 回 `err.message` + `err.status`（`:124-126`）；`TEACHER_UNAUTHORIZED / ADMIN_UNAUTHORIZED / 无权限` 统一回 403"无权限"（`:127-129`）；`ValidationError` 回校验消息 400（`:130-131`）。
- 上送 Sentry 的是脱敏后 error + 脱敏 url：`sanitizeUrlForLog` 剥用户名密码、把敏感 query 名置 `[REDACTED]`、清空 hash（`:36-55`）；`sanitizeErrorForLog` 对 message/stack/cause 递归做敏感 query 正则替换，深度上限 5 层（`:57-82`）；`Sentry.captureException(safeError, { extra: { url: requestUrl } })`（`:133-135`）。
- **脱敏缺口**：
  1. 脱敏正则 `SENSITIVE_QUERY_PARAM` 只覆盖 query 参数名（`token/secret/password/passwd/authorization/auth/api_key/signature/credential/code`，`:21`），**未对 request body、cookie、header 做脱敏**；全 src grep 未发现读取/记录 body 或 cookie 入日志的业务代码（cookie 读取仅 `parent-portal-theme.ts:13`、若干 parent 页面读 `PARENT_ACTIVE_CHILD_COOKIE` 做 UI 子级切换，不入日志），但 Sentry 默认是否携带 body/cookie 取决于 SDK 配置（见 5.4.3）。
  2. 上传通道把内部错误消息原样吐给前端：`catch (uploadErr) { const msg = uploadErr instanceof Error ? uploadErr.message : ...; return { error: \`上传失败：${msg || code || '未知错误'}\` } }`（`src\app\api\upload\route.ts:239-243`）；OSS 错误经 `classifyOssError` 归类后仍可能带 SDK 消息片段（`storage:114-131`）。材料中转通道同类问题：`StorageConfigurationError` 的 `err.message` 直接回前端（`materials/upload:91-94,165`）。
  3. 试卷识别上游 AI 错误回显前 **120 字符**：`AI 识别失败：${detail.slice(0, 120) || res.status}`（`recognize:125-127`），可能带出上游网关/鉴权内部细节。
- 控制台日志：`console.error('[API Error]', sanitizeUrlForLog(req?.url), safeError)`（`api-handler.ts:139`）；上传失败、OSS 初始化失败等旁路日志带 `message/stack`（`storage:204-207,319-323,330-334`；`upload:196-202,242`），这些只落服务器进程日志，不直接回前端。

### 5.4.2 日志文件扫描（只读确认"有没有"，不抄原文）

- `security.log`（29 行）、`security-final.log`（29 行）：敏感词（password / secret / token / accessKey / Bearer / PRIVATE）词面各命中 8 处、分布在 6 行，逐行核对均为 **PASS 检查项的描述句**（如"…does not expose passwords…"、"…hardcoded password removed…"、"…password verification requires bcrypt hash…"、"…production requires HTTPS and strong auth secret…"）；手机号 `1[3-9]\d{9}`、AccessKey、私钥段命中 0，**未发现真实手机号、密码明文、AccessKey、Token、私钥原文**。
- 根目录另有数十个运行/构建日志（`dev-server.log`、`_dev4.log`、`build-*.log`、`vitest*.log`、`docker-buildx-*.log` 等），均被 `.dockerignore:23` `*.log` 排除出构建上下文、被 `.gitignore:64` `*.log` 排除出版本库；本次未逐行展开其内容（遵守"不抄原文"约束），建议运维在服务器上确认这些日志不含 DB 连接串/请求体（待实测 T-17）。
- 生产启动安全校验：`src\lib\env-security.ts:18-46` 校验 `AUTH_SECRET/NEXTAUTH_SECRET ≥32 字符`（`:28`）、两 secret 一致（`:31`）、`NEXTAUTH_URL` 必须 https（`:37`）、双库 URL 存在（`:42-43`）；本地 `local-docker` 豁免（`:3-16,22`）；`src\instrumentation.ts:1-7` 在 nodejs runtime 启动时调用 `assertProductionSecurityEnv`。
- 危险操作二次鉴权：`src\lib\danger-guard.ts:25-59`，SUPER_ADMIN + bcrypt 校验本人密码（`:49`）+ 逐字确认短语（`:35`）；代码注释明确"绝不硬编码密码"（`:23`），全仓未发现硬编码密码常量。

### 5.4.3 Sentry 上送面

- `sentry.server.config.ts:3-8`：仅 dsn / environment / `tracesSampleRate`（生产 0.1，dev 1.0）/ `enabled`；**无 `beforeSend`、无 `beforeBreadcrumb`、未显式 `sendDefaultPii: false`**。
- `sentry.client.config.ts:3-10`：同上，另配 `replaysSessionSampleRate: 0.1`（`:7`）、`replaysOnErrorSampleRate: 1.0`（`:8`）；**未配 replay mask/block 选项**（全 src grep `maskAll/blockAll` 0 命中）。
- 判定：代码层未做事件清洗；是否实际收到 cookie/body/DOM 文本取决于 Sentry 项目后台配置与 SDK 默认行为，代码库无证据关闭，归入待实测 T-15。错误事件经 `api-handler.ts:133-135` 上送时 error 已脱敏、url 已脱敏，但 Sentry SDK 默认捕获的 request 上下文（headers/cookies/body）不在该脱敏链路内。

### 5.4.4 响应头 / Source Map / 构建产物

- `next.config.ts:35`：`output: 'standalone'`（独立运行目录，免服务器 npm install/build）；全文件 **未出现 `productionBrowserSourceMaps`**（grep 0 命中），即默认 false，浏览器侧不发布 `.map`。
- 安全响应头（`next.config.ts:6-31`，全局 `/:path*` `:84-87`）：
  - `X-Content-Type-Options: nosniff`（`:7`）；`X-Frame-Options: SAMEORIGIN`（`:8`）；`Referrer-Policy: strict-origin-when-cross-origin`（`:9`）；`Permissions-Policy: camera=(), microphone=(), geolocation=()`（`:10`）。
  - CSP（`:11-27`）：`default-src 'self'`；`script-src 'self' 'unsafe-inline'`（dev 再加 `'unsafe-eval'`，`:15`）；`style-src 'self' 'unsafe-inline'`；`img-src` 含 self/data/blob/`*.aliyuncs.com`/`wxpusher.zjiecode.com`（`:17`）；`connect-src` 含 Moonshot/DeepSeek/WxPusher/aliyuncs（`:19`）；`frame-src` 一组教育站点（`:20`）；`frame-ancestors 'self'`（`:21`）；`object-src 'none'`（`:22`）；`base-uri 'self'`（`:23`）；`form-action 'self'`（`:24`）；生产 `upgrade-insecure-requests`（`:25`）。
  - HSTS 仅生产：`max-age=31536000; includeSubDomains; preload`（`:28-30`）。
  - API 路由 `Cache-Control: no-store`（`:89-93`）+ `X-Content-Type-Options: nosniff`（`:154-158`）。
  - **缺口**：`script-src` 含 `'unsafe-inline'`（`:15`）；**未配 COOP / COEP**（grep `Cross-Origin-Opener|Cross-Origin-Embedder` 0 命中）；`poweredByHeader: false`（`:38`）。
- 上传/文件通道的 nosniff 覆盖不齐：
  - 有 nosniff：`files/view:71`、`students/export:54`、`finance/export:52`、materials view CSP（`:33`）、portrait（`:81`）、uploads thumbnail（`uploads/[filename]:110`）。
  - **缺 nosniff**：uploads OSS fallback 响应（`uploads/[filename]:125-131`）、本地原图响应（`:157-164`）；材料本地/OSS 响应仅 `X-Frame-Options`，未带 nosniff（`materials/[id]/view:140-147,179-186`）；志愿文档下载按 ext 映射 Content-Type，未带 nosniff（`volunteer/documents/[id]/download:25-29`）；反馈原图下载仅 Content-Type/Content-Length/Content-Disposition/no-store，未带 nosniff（`admin/classroom-feedback/image-download:31-37`）。

### 5.4.5 镜像构建 / .dockerignore / .gitignore / public 目录

- `Dockerfile`（runner 阶段 `:44-79`）：仅 COPY `.next/standalone`（`:56`）、`.next/static`（`:57`）、`public/`（`:58`）、4 个备份/压缩脚本（`:59-62`）、`package.json/package-lock.json`（`:69`）、`.prisma`（`:75`）；**未 COPY `.env`**，环境变量由 compose `env_file: .env`（`compose.production.yaml:46-47`）注入；runner 降权 `USER node`（`:77`）、`EXPOSE 3000`（`:78`）。builder 阶段 `COPY . .`（`:27`）但受 `.dockerignore` 先行过滤。
- `.dockerignore` 已排除：`.env` / `.env.*`（保留 `.env.example`，`:20-22`）、`*.log`（`:23`）、`*.tar/*.tar.gz`（`:24-25`）、`*.zip`（`:26,63`）、`*.pem`（`:27`）、`*.db`（`:28-29`）、`release`（`:9`）、`tmp`（`:10`）、`output/outputs`（`:11-12`）、`docs`（`:31`）、`public/uploads|services|marketing|business-assets|volunteer/docs`（`:32-36`）、`*.dump`（`:42`）、`backups`（`:43`）、`/*.sql`（`:54`）、`/_*`（`:65`）、`compose.production.yaml`（`:49`）、根 `*.js/*.cjs/*.py/*.ps1/*.bat/*.txt/*.html/*.png/*.jpg`（`:52-62`）。
  - **缺口**：`data/` 目录**未列入** `.dockerignore`；但 runner 阶段不 COPY `data/`，实际不进运行镜像（builder trace 只打包被 import 的代码，`data/volunteer/*.json` 仅由 `package.json:37,39` 的本地 import 脚本消费，非运行时路由）。
- `.gitignore`：已排除 `.env*`（保留 example，`:35-36`）、`*.log`（`:64`）、`/release/`（`:57`）、`/output/`（`:61`）、`tmp/`（`:73`）、`exports/`（`:67`）、`*.tar/*.tar.gz`（`:55-56`）、`outputs/`（`:80`）。
  - **缺口**：**未排除根目录 `*.sql`、`*.zip`、`/_*`、`data/`、`backups/`**。本地工作区实测存在：`_prod_chuzhong.sql` **54,700,566 B**、`_prod_gaozhong.sql` 92,874 B、`_q_local.sql` 与 `_q7~_q27.sql`、`_truncate.sql` 等共 **25 个 SQL**；`src.zip` 1,742,805 B、`prisma.zip` 99,935 B、`scripts.zip` 97,913 B；数十个 `_*.js/_*.py/_*.cjs/_*.mjs` 调试脚本。这些文件是否被 git 跟踪，本机 git CLI 不在 PATH，**未能核验**（待实测 T-13）。
- `public/` 扫描（扩展名分组）：未发现 `.env`、数据库转储、备份目录、调试 HTML、`.map` source map、`.zip/.tar`。可被静态直连的业务素材：
  - `public/volunteer/docs/2025-allocation-quota.xlsx`（12,218 B）、`2022-plan-explanation.txt`：志愿配额/政策素材，proxy 白名单 `/volunteer/docs/` 放行匿名（`proxy.ts:92`）。
  - `public/uploads/materials/test-*.pdf`（约 463 B 测试件）：测试残留，体积极小、无数据泄露，建议清理。
  - `public/images/practice/*.svg` 100 个、`public/people/default-teacher.svg`、`public/file.svg`（391 B）：提交的静态教学素材，非用户上传。
  - `echarts.min.js`（1,030,855 B）、`pdf.worker.min.mjs`（1,265,413 B）：前端库；`about.html/home.html/manifest.json/搜索引擎验证 html` 为预期公开。
- 本地 scratch 目录体量（实测，均不在 runner COPY 清单内）：`backups/` 7 文件 **55.19 MB**（含 `edu_manage_chuzhong_*.dump` 6.29 MB、`edu_manage_gaozhong_*.dump` 284 KB、`shared-public.tar.gz` 51.30 MB 及 sha256）；`data/` 21 文件 **3.31 MB**（教材目录/题库 JSON、志愿录取参考 CSV/JSON）；`output/` 1 文件 0.21 MB；`release/` 43 文件 **1494.15 MB**（两个构建镜像 tar：973.70 MB + 518.39 MB）；`tmp/` 58 文件 **641.81 MB**；`exports/`、`outputs/` 不存在。

### 5.4.6 环境变量持有情况（只记键名/是否已配置，值略）

- `.env`（已配置，值略）：`DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`AUTH_TRUST_HOST`、`WXPUSHER_APP_TOKEN`、`QYWX_ENABLED`、`QYWX_CORP_ID`、`QYWX_AGENT_ID`、`QYWX_AGENT_SECRET`、`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、`MIMO_API_KEY`、`MIMO_BASE_URL`、`MIMO_MODEL`、`KIMI_API_KEY`、`KIMI_BASE_URL`、`KIMI_MODEL`、`KIMI_VISION_MODEL`、`AI_TIMEOUT_MS`、`AUTH_URL`。
- `.env.local`（已配置，值略）：`AMAP_WEATHER_KEY`、`DOUBAO_MODEL`、`ARK_API_KEY`、`STORAGE_DRIVER`（长度 5 = local）、`ALIYUN_OSS_REGION/BUCKET/ENDPOINT/ACCESS_KEY_ID/ACCESS_KEY_SECRET/PUBLIC_BASE_URL/PRIVATE_BUCKET`（PRIVATE_BUCKET 长度 4）。
- `.env.example`：上述键均为 2 字符或短占位值。
- 生产服务器实际 `STORAGE_DRIVER`、bucket ACL、CDN 回源策略在仓库内无法确认（待实测 T-10/T-11/T-14）。

## 5.5 端口暴露与基础设施

| 服务 | 是否映射公网端口 | 密码/认证 | 证据 |
| --- | --- | --- | --- |
| Redis | **否**。`compose.production.yaml:4-15` 无 `ports:` 段，仅挂 `internal` bridge（`:14-15`） | **无密码**：command `redis-server --save "" --appendonly no --maxmemory 128mb --maxmemory-policy allkeys-lru`（`:7`），**未带 `--requirepass`**；`REDIS_URL=redis://redis:6379`（`:59`）连接串无认证段。限流/会话事件缓存依赖内网隔离 | `compose.production.yaml:4-15,59`；`src\lib\rate-limit.ts:81-104`；`docs\production-safety.md:43,47` |
| PostgreSQL | **否**。`:17-36` 无 `ports:` 段，仅挂 `internal` bridge（`:35-36`） | 有密码：`POSTGRES_USER: edu_admin`（`:21`）、`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?...}` 必填 env（`:22`）；应用连接串按双库注入 `muzhe_chuzhong / muzhe_gaozhong`（`:49-51`） | `compose.production.yaml:17-36,49-51` |
| App（Next.js） | 仅绑宿主机回环：`127.0.0.1:3000:3000`（`:66`），不暴露 0.0.0.0；另挂 `internal`（`:83-84`） | 会话认证在应用层（next-auth + sessionMark 比对 DB `currentSessionToken`，`proxy.ts:125-156`）；env_file 注入 `.env`（`:46-47`）；容器内 `HOSTNAME=0.0.0.0` 仅指容器网卡（Dockerfile:53） | `compose.production.yaml:38-84`；`src\proxy.ts:103-114,125-169`；`Dockerfile:51-55,77-79` |
| Migrate（迁移工具） | 无 `ports:`；`profiles: ["tools"]` 默认不启动（`:93`）；`internal`（`:106-107`） | 复用 DB 密码 env（`:97-99`） | `compose.production.yaml:86-107` |
| 网络 | 单一 `internal` bridge driver（`:113-115`）；无独立外网 overlay | — | `compose.production.yaml:113-115` |

- 数据库直读路由面：全 src grep `sendFile / createReadStream` **0 命中**；`readFile/readFileSync` 生产路由命中点已逐个核对：志愿文档下载（`volunteer/documents/[id]/download:21`）、识别读图（`recognize:74`）、uploads 本地原图（`uploads/[filename]:156`）、公开头像（`portrait:34`）、材料预览（`materials/[id]/view:164`）、备份标签文件（`data-admin/backup:21`）、恢复 env 兜底（`data-admin/restore:23`）、服务文案（`service-content.ts:12`，路径来自服务端目录配置，无用户输入）、志愿配额参考表（`volunteer.ts:134-139`，调用点 `:210` 用默认路径，无用户路径参数）；其余 `readFileSync` 均在 `*.test.ts`。未发现把任意本地路径直接回给客户端的路由。
- 备份/恢复路由面：`data-admin/backup` 全部 `requireSuperAdmin`（`route.ts:34,72,105,120`）；`BACKUP_DIR` env 兜底 `/data/backups/edu-manage`（`:15`）；脚本路径受控（`:36`）；`resolveBackupDirectory` + 前缀 + `isValidBackupId` 校验（`:51-58,109-110,123-126`）；**无 dump 下载端点**；标签文件 0600 写入（`:29`）。`data-admin/restore` 先 `assertDangerAuth`（`restore:50`），backupId 目录前缀校验（`:58-70`），`findDump` 真实前缀 + `isFile` 校验（`:32-39`），恢复前 `pg_restore --list` 预检（`:88`），单事务保护 + 部分完成上报（`:96-111`）；`loadEnv` 兜底读 cwd `.env`（`:17-30`）。

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| E-1 | `settings/backup/create` 七表无 select/无 take 全标量回包 | ①已具备但不完善·导出通道 | 单个 admin 会话即可拖走两库学员/教师/缴费/报名/补课全字段（含电话、邮箱、备注），无行数上限约束 | 中 | 立刻 |
| E-2 | 导出通道无专用限流、无按用户/按日配额 | ①已具备但不完善·限流 | 被盗用的 admin/teacher 凭证可高频重复拉取报表/Excel/JSON，IP 桶 200/300 rpm 不按人聚合 | 中 | 近期 |
| E-3 | 18/20 导出下载路由无独立审计条目 | ①已具备但不完善·审计 | 批量导出发生时无行为留痕，事后无法定位是谁、何时、导了哪批数据 | 小 | 近期 |
| E-4 | paper-stats 教师未按本人课次裁剪；volunteer-stats 跨部不裁剪 | ①已具备但不完善·授权裁剪 | 教师可见整 division 薄弱点排行；跨学部计数互漏（数据面为聚合，无个人行） | 小 | 近期 |
| E-5 | finance notes 自由文本随表导出；考勤/学员/薪资导出无 take 上限 | ①已具备但不完善·字段裁剪/分页 | 备注夹带的 PII 被带走；大库下表全量回包，单次响应体积与内存压力不可控 | 小 | 近期 |
| E-6 | OSS 私有 bucket 开关代码未接线，put 返回未签名公网 URL | ①已具备但不完善·对象存储 | 若 bucket 为 public-read，泄露 key/URL 即可裸读对象；私有判定完全依赖控制台 | 中 | 近期 |
| E-7 | 本地 legacyUrl `/uploads/<key>` 静态旁路，proxy matcher 排除 uploads/volunteer | ①已具备但不完善·访问控制 | 本地 driver 下历史链接可能绕过 `/api/uploads` 鉴权直读静态文件；是否被 Nginx/CDN 直出待核 | 中 | 近期 |
| E-8 | Sentry 无 beforeSend/无 PII 显式关闭、replay 无 masking | ①已具备但不完善·遥测泄露 | 异常事件可能携带 cookie/body/DOM 文本上报第三方；100% 错误 replay 录制整页 DOM | 小 | 近期 |
| E-9 | 文档类上传无 magic bytes；志愿文档通道无文件头校验 | ①已具备但不完善·上传校验 | 伪装扩展名的文档/压缩包可入库；混淆下载场景下内容类型不可信 | 中 | 近期 |
| E-10 | 请求 body/cookie 未纳入脱敏；upload 错误消息内部外泄；识别上游细节回显 120 字符 | ①已具备但不完善·错误/日志 | 内部 SDK/路径/SQL 片段可能经错误响应或遥测外泄；body 内敏感字段未在日志层兜底 | 小 | 近期 |
| E-11 | 部分上传/下载响应缺 nosniff；CSP script-src unsafe-inline；无 COOP/COEP | ①已具备但不完善·响应头 | 浏览器 MIME 嗅探混淆；内联脚本面被放开；跨域隔离纵深缺失 | 小 | 长期 |
| E-12 | 志愿文档下载仅登录、无角色校验 | ②完全缺失·授权 | 家长账号可调 `/volunteer/documents/[id]/download` 读取站内所有志愿文档 | 小 | 立刻 |
| E-13 | `.gitignore` 未排除根 `*.sql/*.zip/_*`；54.7MB 生产 dump 跟踪状态未核 | ②完全缺失·仓库泄露 | 若被 git 跟踪，生产库快照/源码压缩包随仓库分发；协作/备份/CI 场景扩散面大 | 小 | 立刻 |
| E-14 | 反馈图片签名 secret 缺失时降级未签名裸链；7 天 TTL 偏长 | ②完全缺失·签名机制 | 配置缺失时 fail-open；档案分享链接一周内可重放 | 小 | 近期 |
| E-15 | 无上传内容恶意扫描/病毒检测（magic bytes 之外） | ②完全缺失·上传校验 | 含宏/恶意脚本的 Office、压缩包、伪装文档可入库并被其他角色下载 | 中 | 长期 |
| E-16 | Redis 内网无密码 | ②完全缺失·基础设施 | 内网任意可达容器/主机可读写限流计数、会话缓存；依赖"内网隔离"单道防线 | 小 | 近期 |
| E-17 | db/redis 未映射公网端口（正面），但 Redis 无密码 + 单实例内网假设 | ③架构运维·网络隔离 | 公网面收敛到位；风险集中在内网横向与单实例降级 | — | 近期 |
| E-18 | 本地 scratch 体量巨大（release 1494MB / tmp 642MB / backups 55MB）；data/ 未进 dockerignore | ③架构运维·构建上下文 | 构建上下文臃肿；若误把本地目录挂进静态根或打包流程，存在快照/中间产物扩散风险 | 中 | 长期 |
| E-19 | 生产备份以文档 cron 约定为准，仓库内无 cron 安装证据；应用 JSON 导出非 DB 备份 | ③架构运维·备份策略 | 若每日 pg dump cron 未落地，数据库故障恢复依赖单次手动 dump；离线异地备份仅文档提及 | 中 | 近期 |
| E-20 | OSS ACL / CDN 回源缓存 / Nginx 是否直出 uploads 均为线上配置，仓库无证据 | ③架构运维·CDN/对象存储 | 静态旁路、签名 URL 被 CDN 长缓存、同域存储型 XSS 等风险无法在代码层闭环 | 中 | 近期 |
| E-21 | 多组第三方凭证已配置（DB/next-auth/WxPusher/企微/AI Key/OSS AK），仓库无轮换台账与 AK 最小权限证据 | ③架构运维·密钥管理 | 凭证分散在两份 env 与服务器 `.env`；AK 权限范围、轮换记录不可见；泄露后无法快速定位禁用 | 中 | 近期 |

## ① 已具备但不完善

### E-1 业务备份 JSON 通道七表全字段、无行数上限回包

- **证据**：`src\app\api\settings\backup\create\route.ts:11` 仅校验 `user.role !== 'admin'`；`:16-25` 并行 `findMany()`，其中 `students/teachers/courses/classGroups/fees/enrollments/makeupRequest` 七个查询**无 `select`、无 `take`**，`attendance take: 5000`（`:22`）、`examPaper take: 1000`（`:23`）；`:44` `data: { students, teachers, courses, classGroups, fees, enrollments, attendances, examPapers, makeups }` 全量标量入回包；`:30` 标注"不包含账号、完整课堂反馈、上传照片文件"；审计仅 `导出了 ${students} 名学员等数据（非恢复备份）`（`:47-49`）。
- **危害**：单个 admin 会话一次 POST 即可拿到当前库内学员/教师/缴费/报名/补课的全部标量行——含手机号、家长手机号、邮箱、备注；无字段裁剪、无行数封顶、无导出冷却。大库下响应体与服务端内存同时承压。
- **利用前置条件**：有效 admin 会话（被窃取的 admin cookie/密码即可触发）；无需跨部权限技巧，双库模式按 session division 选库。
- **修复方案**：(1) 七表查询显式 `select` 白名单（去除 phone/parentPhone/email/notes 或按导出用途分组）；(2) 补 `take` 上限（如 2000/表）+ 分页或异步生成下载文件；(3) 审计升级为 `BACKUP_JSON_EXPORT`，记录每表 rowCount 与导出者；(4) 该通道与 `data-admin/backup`（SuperAdmin + danger-guard）对齐角色强度。
- **工作量**：中（2-3 天，含导出分页改造）
- **优先级**：立刻

### E-2 导出通道挂通用限流，但无专用规则、无业务级配额

- **证据**：`src\lib\api-handler.ts:97-104` 所有包装路由统一 `checkRateLimit(ip, path, undefined, GET/HEAD 300rpm)`；`src\lib\rate-limit.ts:14-36` 规则表 21 条（`:15-35`），前缀为 auth 8 条 / ai / teacher/ai-feedback / recognize / class-groups / admin/attendance / feedback / upload / materials/upload / volunteer/schools / parent/unread-counts / parent/today / teacher/dashboard /`/api`，**无 export/finance/salary/students/backup 前缀**；`:35` 兜底 `/api` 200 rpm；`:156` 键 `` `${ip}:${segment}` ``，不混入 userId。
- **危害**：被盗用的高权限凭证可按 200–300 rpm 高频重复拉取 20 个导出/下载通道；IP 轮换即可绕过 IP 桶；无"每用户每日导出 N 次/每表 M 行"的业务配额。
- **利用前置条件**：任一可调用导出通道的角色会话；批量脚本 + 代理池。
- **修复方案**：在 `RATE_RULES` 增 `/api/reports/export`、`/api/settings/export`、`/api/admin/salary/export`、`/api/attendance/export`、`/api/settings/backup` 等前缀（建议 10–20 rpm）；限流键追加 userId；新增导出配额（每日次数 + 单次行数 + 冷却期），超限写审计并返回 429。
- **工作量**：中（2-3 天，配额计数需 Redis）
- **优先级**：近期

### E-3 导出审计覆盖不全：仅学员/财务两处落审计

- **证据**：审计调用点 grep 结果——`EXPORT_STUDENTS`：`settings/export/students/route.ts:45-48`（division + rowCount）；`EXPORT_FINANCE`：`settings/export/finance/route.ts:43-46`（year + division + rowCount）。其余导出/下载路由（reports 7 类、attendance/export、salary/export、feedback-export、image-download、files/view、files/[id]、materials view、volunteer download、backup/create）**均无 `createActivityLog` 调用**；backup/create 仅有一条笼统记录（`backup/create:47-49`）。
- **危害**：批量拖库、高频下载原图/档案、越权拉取志愿文档发生后，审计链无法回答"谁在什么时间导了哪批数据、多少行"。
- **利用前置条件**：已登录的有权限账号。
- **修复方案**：在每个导出 handler 成功回包前写 `createActivityLog`（动作 `EXPORT_<CHANNEL>`，对象 division/term/teacherId/studentId，rowCount/fileSize）；报表聚合导出记录参数与命中条数；审计日志单独保留、不可在后台页面删除。
- **工作量**：小（1 天内，逐路由补一行日志）
- **优先级**：近期

### E-4 教师侧两处权限裁剪缺口：试卷薄弱点不按本人课次、志愿统计跨部

- **证据**：`reports/paper-stats/route.ts:13` admin/teacher 均可；`:19-23` division+term 裁剪后，`:42-48` `weaknessRecord.groupBy` 仅按 termId，**未叠加教师本人课次/学生条件**；`reports/volunteer-stats/route.ts:10` admin/teacher 均可；`:22-25` 四个 `count` 查询**无 division、无 term where**，跨学部计数。
- **危害**：教师可见本学部整批学生的薄弱知识点排行（聚合面，无姓名，但属教学数据越界）；志愿咨询/配额计数跨学部互漏。
- **利用前置条件**：有效 teacher 会话。
- **修复方案**：paper-stats 教师分支叠加 `paper: { lesson: { group: { OR 本人教师条件 } } }`（参照 `attendance-stats:36-41` 的 `teacher.id / teacherAssignments` 条件）；volunteer-stats 两分支补 division where（管理员可选全部，教师/默认按本部）。
- **工作量**：小（半天）
- **优先级**：近期

### E-5 财务备注自由文本随表导出；多处导出无行数上限

- **证据**：`settings/export/finance/route.ts:26-32,35` 行含 `f.notes || ''`（备注自由文本）；`:20-24` `fee.findMany` 无 take。`attendance/export:53-60` `attendance.findMany` 无 take；`settings/export/students:19-23` 无 take；`admin/salary/export:71-74` 流水按 teacherId+term 收敛，但无 take 上限。
- **危害**：家长在备注里留下的电话、微信、住址、其他学生姓名等随财务表被一并导出；大库下考勤/学员表全量回包，响应体积与内存不可控。
- **利用前置条件**：admin 会话。
- **修复方案**：finance 导出对 notes 做长度截断 + PII 正则脱敏（手机号/身份证/邮箱）或整列移除；三处无 take 查询补分页/上限；行量级写入审计 rowCount。
- **工作量**：小（半天-1 天）
- **优先级**：近期

### E-6 OSS 私有 bucket 开关代码未接线，put 返回未签名公网 URL

- **证据**：`src\lib\storage\index.ts:13` 注释列出 `ALIYUN_OSS_PRIVATE_BUCKET`；全 src grep 该键仅命中此注释，**运行时无人读取**。`:219-225` `client.put` 后 URL = `ALIYUN_OSS_PUBLIC_BASE_URL || https://{bucket}.{host}` + `/` + `result.name`；`:274-277` `getUrl` 同样拼公网 baseUrl；`:314-337` 签名下载 URL 只在显式调用 `generateOssSignedUrl` 时生成；`upload-url.ts:31-36` `protectedUploadFallback` 仅在 key 存在时回落代理。另：`:347-356` `getDriver()` 遇到未知 `STORAGE_DRIVER` 静默降级 local（`:354` 仅 console.warn），配置拼写错误不会在启动期 fail-closed。
- **危害**：bucket 若为 public-read，任意拿到对象 key/URL 的人可裸读；若为私有，部分历史记录里的裸公网 URL 会 403，但代码也没有按私有策略主动转签名。bucket 真实 ACL 代码无法判定。
- **利用前置条件**：对象 key/URL 泄露（页面缓存、日志、前端历史记录、越权列表接口）；bucket public-read。
- **修复方案**：(1) 在 storage factory 读取 `PRIVATE_BUCKET`，私有模式下 `put/getUrl` 一律返回 `/api/uploads/<key>` 代理路径或签名 URL，不拼裸公网；(2) 控制台确认 bucket ACL 为私有并归档到 `docs/`；(3) 历史 FileAsset 裸公网 URL 迁移到 `protectedUploadFallback` 链路。
- **工作量**：中（2-3 天，含历史 URL 兼容）
- **优先级**：近期

### E-7 本地 legacyUrl `/uploads/<key>` 静态旁路，proxy matcher 排除上传前缀

- **证据**：`src\app\api\upload\route.ts:222-224` `legacyUrl = result.url.replace('/api/uploads/', '/uploads/')`；`src\proxy.ts:202` matcher 排除清单含 `uploads`、`volunteer`；`:81-92` 白名单放行 `/people/ /avatars/ /teacher-portraits/ /services/ /business-assets/ /images/ /volunteer/docs/`；`src\lib\upload-url.ts:1-7` `normalizeUploadUrl` 把 `/uploads/` 改写到 `/api/uploads/`，但 DB 历史记录里的 `/uploads/` 原样保留。compose 本地上传目录挂在 `/app/public/uploads`（`compose.production.yaml:58,69`）。
- **危害**：本地 driver 下，若 Nginx/Next 把 `/uploads/<key>` 当 public 静态文件直出，将绕过 `/api/uploads` 的 `requireAuthenticatedUser` + FileAsset 归属校验（`uploads/[filename]:64,77-94`）；对象 key 可预测性依赖 `safeFilename` UUID（`storage:363-369`）。
- **利用前置条件**：生产 STORAGE_DRIVER=local（本地实测 `.env.local` 长度 5 = local，生产值待核）；静态文件由 Next/Nginx 直出；key 已知或可枚举。
- **修复方案**：(1) proxy matcher 不再排除 `uploads`，或在 Next/nginx 层把 `/uploads/(?!api)` 强制 302/代理到 `/api/uploads/`；(2) 历史 `legacyUrl` 入库即归一化为 `/api/uploads/`；(3) 对照 `docs\production-safety.md:76`"Nginx 不得直出 `/uploads/`"在 nginx conf 落一条 `location /uploads/ { proxy_pass 应用; }`。
- **工作量**：中（1-2 天，含静态链路验证）
- **优先级**：近期

### E-8 Sentry 未做事件脱敏，replay 未配 masking

- **证据**：`sentry.server.config.ts:3-8`、`sentry.client.config.ts:3-10`；全 src grep `beforeSend|beforeBreadcrumb|sendDefaultPii|maskAll|blockAll` **0 命中**；client replay 采样 session 0.1 / error 1.0（`:7-8`）。
- **危害**：异常请求的 headers/cookies/body、页面 DOM 文本（家长留言、学生评语、联系电话）可能随错误事件或 100% 错误 replay 上送 Sentry 项目；第三方 SaaS 形成第二份数据副本。
- **利用前置条件**：应用触发异常；Sentry 项目未在后台另配 PII 过滤（代码库无证据）。
- **修复方案**：server/client 两侧补 `beforeSend`（剥离 cookies/authorization/body 敏感键、脱敏手机号/邮箱）、`beforeBreadcrumb`（剔除导航/输入类面包屑）；显式 `sendDefaultPii: false`；replay 配 `maskAllText: true, blockAllMedia: true`；核对 Sentry 后台数据保留周期与成员权限。
- **工作量**：小（半天-1 天）
- **优先级**：近期

### E-9 文档类与志愿文档上传无文件头（magic bytes）校验

- **证据**：`src\app\api\upload\route.ts:51-53` 文档分支仅 `/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i`；`:103-105` 非图片且不允许文档类型才拒绝；图片头校验在 `:108-113`，文档不经过 `isValidImageBuffer`。`src\app\api\volunteer\documents\route.ts:35-41` 17 类 ext + 20MB，无 buffer 头校验；`:45-49` 直接 `writeFile`。材料通道已有完整头校验（`material-file.ts:22-42`）可复用。
- **危害**：伪装成 pdf/doc/zip 的可执行/脚本/HTML 内容可入库；下载时若 Content-Type 宽松或被嗅探，存在混淆打开风险；压缩包内结构无审计。
- **利用前置条件**：具备上传权限的角色（admin/teacher/parent 按类型矩阵）。
- **修复方案**：把 `hasValidMaterialFileSignature` 扩展覆盖通用上传文档类型；志愿文档通道入库前读前 16 字节校验；对 zip/rar/7z 记录内部条目数与解压后大小上限；拒绝双扩展名与空文件。
- **工作量**：中（2 天，含压缩包审计）
- **优先级**：近期

### E-10 脱敏只覆盖 query；body/cookie 未兜底，上传错误消息外泄前端

- **证据**：query 脱敏 `api-handler.ts:21,36-55`；错误脱敏 `:57-82`；未发现 body/cookie 脱敏函数。上传错误回包 `upload/route.ts:239-243` `上传失败：${msg || code || '未知错误'}`；材料通道 `materials/upload:91-94,165` 回 `err.message`；识别上游 `recognize:127` 回 `detail.slice(0, 120)`。
- **危害**：OSS SDK 消息、内部路径、上游网关报错片段可能进入前端响应；若后续某路由把 body 打日志，敏感字段（密码、留言、联系方式）无统一脱敏兜底。
- **利用前置条件**：构造触发错误的上传/识别请求。
- **修复方案**：(1) catch 分支统一回通用文案，内部 err.message 只落服务端日志；(2) 增加 `sanitizeSensitiveBody`（按键名脱敏 + 手机号/邮箱/身份证正则），在日志/Sentry 调用前对 body 副本处理；(3) 上游错误只回 HTTP 状态码与通用提示。
- **工作量**：小（1 天）
- **优先级**：近期

### E-11 部分文件响应缺 nosniff；CSP 保留 unsafe-inline；无跨域隔离头

- **证据**：缺 nosniff 通道：`uploads/[filename]:125-131`（OSS fallback）、`:157-164`（本地原图）、`materials/[id]/view:140-147,179-186`、`volunteer/documents/[id]/download:23-30`。CSP `script-src 'self' 'unsafe-inline'`（`next.config.ts:15`）；grep COOP/COEP 0 命中。
- **危害**：浏览器对未知/宽松 Content-Type 做嗅探，文档/图片被当 HTML 解析时混淆执行；内联脚本允许削弱 CSP 对注入脚本的拦截；无 COOP/COEP 时跨域窗口/进程隔离纵深不足。
- **利用前置条件**：上传或服务端页面被注入可被嗅探执行的内容。
- **修复方案**：所有文件响应头统一加 `X-Content-Type-Options: nosniff`（抽一个 `fileResponseHeaders()` 工具复用）；逐步移除 `'unsafe-inline'`（nonce/hash 改造）；评估加 `Cross-Origin-Opener-Policy: same-origin`、`Cross-Origin-Embedder-Policy: require-corp`（注意与 phet/geogebra 等 frame 嵌入的兼容性）。
- **工作量**：小-中（1-3 天，unsafe-inline 移除工作量偏大）
- **优先级**：长期

## ② 完全缺失

### E-12 志愿文档下载接口无角色校验，家长可读全部站内志愿文档

- **证据**：`src\app\api\volunteer\documents\[id]\download\route.ts:11-12` 仅 `const session = await auth(); if (!session?.user) 401`，**未读 role、未比对 admin/teacher**；对比 POST 通道 `volunteer/documents/route.ts:26` 明确 `['admin','teacher']` 403。`:18` 前缀校验 `/volunteer/docs/`，`:20-21` `path.join(public, fileUrl)` + `readFile`；`:25-29` 按 ext 映射 Content-Type。
- **危害**：任意已登录家长账号，枚举/获取文档 id 后可下载站内全部志愿政策、配额表、压缩包；文档内容为招生参考资料，泄露面限于该目录，但角色边界完全缺失。
- **利用前置条件**：有效 parent 会话；文档 id 可通过 `GET /api/volunteer/documents`（`documents/route.ts:12-19`，同样仅登录）批量获得。
- **修复方案**：download 与列表 GET 补角色/可见性校验（家长仅可见 `PUBLISHED/STUDENT` audience 文档，admin/teacher 全量）；fileUrl 经 `safeRelativePath` 归一化（对齐 `uploads/[filename]:41-46`）后再 join publicRoot。
- **工作量**：小（半天）
- **优先级**：立刻

### E-13 `.gitignore` 未排除根目录 SQL dump / zip / 下划线调试文件，生产库快照跟踪状态未核

- **证据**：`.gitignore:35-36` 排 `.env*`、`:64` 排 `*.log`、`:57` `/release/`、`:61` `/output/`、`:73` `tmp/`；**无 `/*.sql`、无 `/*.zip`、无 `/_*`、无 `/backups/`、无 `/data/`**。`.dockerignore:54,63,65` 已排 `/*.sql/*.zip/_*`（构建上下文侧）。实测根目录：`_prod_chuzhong.sql` 54,700,566 B、`_prod_gaozhong.sql` 92,874 B、`_q*.sql`/`_truncate.sql` 共 25 个、`src.zip` 1,742,805 B、`prisma.zip` 99,935 B、`scripts.zip` 97,913 B。本机 git CLI 不可用，`git ls-files` 未能核验跟踪状态。
- **危害**：若已被 git 跟踪，生产库完整快照（学员/家长/缴费/账号哈希）与源码压缩包随仓库历史、克隆镜像、CI 缓存扩散；删除工作区文件无法清除历史记录。
- **利用前置条件**：仓库被克隆/共享/备份；或 git 历史已推送远端。
- **修复方案**：(1) `.gitignore` 补 `/*.sql`、`/*.dump`、`/*.zip`、`/backups/`、`/data/`、`/_*`；(2) 在有 git 的环境执行 `git ls-files | Select-String '\.(sql|zip|dump)$|^_'` 核验；(3) 已跟踪则从索引移除（保留本地文件）并评估历史清理（filter-repo/ BFG）；(4) 54.7MB dump 确认不含账号明文密码后本地安全删除。
- **工作量**：小-中（历史清理视仓库是否已推送而定）
- **优先级**：立刻

### E-14 反馈图片签名 secret 缺失时 fail-open 降级裸链，7 天 TTL 无收紧机制

- **证据**：`src\lib\classroom-feedback\export-image-url.ts:7` secret 取 `AUTH_SECRET || NEXTAUTH_SECRET`；`:32-33` secret 为空时直接返回未签名 `/api/files/view?id=`；`:3` `DEFAULT_TTL_SECONDS = 7*24*60*60 = 604800`，`:37` 调用未传 `ttlSeconds` 即走默认；`:27` ttlSeconds 为可选参数；校验侧 `:58` secret 缺失直接 false（fail-closed，但生成侧已给裸链）。
- **危害**：部署/配置异常导致 secret 缺失时，反馈档案内图片链接退化为仅靠 `/api/files/view` 登录态校验的普通链接，链接随 Markdown 外发后一周内可被有权限者重放；裸链不带 division 签名约束。
- **利用前置条件**：secret 未配置（env-security 生产校验 `≥32` 字符，`env-security.ts:28`，正常部署不易触发）；或签名链接被转发。
- **修复方案**：secret 缺失时生成侧抛错/fail-closed，不产出裸链；TTL 收到 2–24 小时并按用途区分（档案导出短链、在线预览更短）；链接中 division 已签名，校验侧保持现状。
- **工作量**：小（半天）
- **优先级**：近期

### E-15 上传文件无恶意内容扫描/病毒检测（magic bytes 之外）

- **证据**：上传链路校验项为 ext 白名单 + 大小 + 图片/材料文件头（`upload/route.ts:18-27,29-45,108-113`；`material-file.ts:22-42`）；全仓 grep 无 antivirus/clamav/malware scan/office macro 解析依赖；压缩包仅记录扩展名与大小，不解压审计条目数/嵌套深度。
- **危害**：带宏的 Office 文档、伪装压缩包、恶意 PDF 可入库并被教师/家长下载；服务端预览链路（mammoth 提取 docx 文本、sharp 解码图片）本身也是解析攻击面。
- **利用前置条件**：具备上传权限的角色；下载方打开文件。
- **修复方案**：短期：压缩包限条目数/解压后大小、Office 文档剥离宏标记检查；中期：接入 ClamAV/云查杀对入库文件异步扫描，命中后隔离 FileAsset 并通知管理员；图片解码走 sharp 已有 fail-on 容错（`portrait:65`），上传通道补解码失败回滚。
- **工作量**：中-大（接入扫描服务）
- **优先级**：长期

### E-16 Redis 内网无密码，仅靠网络隔离单道防线

- **证据**：`compose.production.yaml:7` redis command 无 `--requirepass`；`:59` `REDIS_URL=redis://redis:6379` 无 `:password@`；`:14-15,83-84` 仅 internal bridge。限流键、会话事件缓存存于 Redis；`rate-limit.ts:92` 客户端连接串直接取 `REDIS_URL`。
- **危害**：internal bridge 内任一被攻破容器（含未来接入的其他服务）可直连 Redis，读取/篡改限流计数与会话缓存键；无认证也无法在日志层面区分来源。
- **利用前置条件**：内网横向可达（另一容器 RCE、配置错误把端口发布到宿主机）。
- **修复方案**：compose 增加 `REDIS_PASSWORD` env，redis command 加 `--requirepass $REDIS_PASSWORD`，`REDIS_URL` 带密码；评估 Redis 命名空间/键前缀隔离；监控非 internal 网络的 6379 访问。
- **工作量**：小（半天，compose + 环境变量）
- **优先级**：近期

## ③ 架构性 / 运维层问题（端口、备份策略、CDN、镜像构建）

### E-17 公网端口面收敛到位，但内网隔离假设偏强，单实例降级风险未在架构层兜底

- **证据**：`compose.production.yaml:4-15` redis 无 ports、`:17-36` db 无 ports、`:66` app 仅 `127.0.0.1:3000:3000`、`:113-115` 单一 internal bridge。`docs\production-safety.md:43` auto 模式 Redis 故障降级进程内存、`:47,64` 明确单实例约束、重启清零限流/锁定计数；`rate-limit.ts:121-126` 内存兜底、`:98-100,122-124` 显式 redis 模式拒绝降级。
- **判定**：公网暴露面控制是正向现状；风险在"内网无密码 Redis + 限流可降级内存 + 单实例"三者叠加，横向移动与重启后防护失真缺乏架构层冗余。
- **建议**：补 Redis 密码（E-16）；生产 `RATE_LIMIT_DRIVER=redis` 并对 Redis 连通性做启动探活；内存降级只允许 dev 环境；文档中的单实例约束写入部署 runbook，扩容前必须先完成 Redis 化改造。

### E-18 本地 scratch 体量巨大，构建上下文与静态根边界需在运维流程上固化

- **证据**：实测 `release/` 43 文件 1494.15 MB（两个构建镜像 tar 973.70 MB + 518.39 MB）、`tmp/` 58 文件 641.81 MB、`backups/` 7 文件 55.19 MB、`data/` 21 文件 3.31 MB、`output/` 1 文件 0.21 MB；`.dockerignore:9-12,43` 排 release/tmp/output/outputs/backups，但 `data/` 未列；`Dockerfile:56-75` runner 只拷 standalone/static/public/脚本/lock/.prisma，不拷这些目录。compose 卷挂载清单 `:68-74` 仅挂 shared public 子目录与 `/data/backups/edu-manage`。
- **风险**：若部署脚本误把本地 `release/`（历史构建产物/压缩包）或 `backups/`（dump）挂进 Nginx 静态根或容器 public 目录，将形成快照直读面；当前代码与 compose 配置未见该错误挂载，但流程上无强制校验。
- **建议**：`.dockerignore` 补 `data/`；部署脚本增加静态根目录白名单校验；定期清理本地 release/tmp；服务器上核对 `/srv/edu-manage/shared/` 与 `/data/backups/edu-manage` 的目录权限（0700，对齐 `production-safety.md:13`）。

### E-19 数据库备份以文档 cron 约定为准，仓库内无落地证据；应用 JSON 导出不是 DB 备份

- **证据**：`docs\production-safety.md:5-21` 约定每日 02:00 `backup-db.sh` pg dump 到 `/data/backups/edu-manage`；`:30-35` 离线备份 OSSUTIL/RSYNC 仅为可选项；`settings/backup/create:29-30` 自身标注 `restorable: false`、"不是数据库恢复备份"、"最多 5000 条考勤和 1000 份试卷"；`data-admin/backup` 脚本路径受控（`backup/route.ts:36`）但仓库内不含 cron 安装单元。
- **风险**：若服务器 cron 未实际安装或每日 dump 失败无告警，数据库故障只能依赖历史手动 dump；备份无异地副本时，主机/磁盘故障即数据丢失。
- **建议**：运维核对服务器 `crontab -l` 含两条备份/清理 cron；备份目录加完整性校验（sha256 已有，`backups/.../*.sha256`）与保留周期；补一份定期恢复演练记录；离线异地备份落地（OSS 或 rsync 备机）。

### E-20 OSS ACL / CDN 缓存键 / Nginx 静态直出策略均为线上配置，代码层无法闭环

- **证据**：`storage:219-225,274-277` 公网 URL 拼接逻辑；`proxy.ts:81-97,202` 静态白名单与 matcher 排除；`docs\production-safety.md:68-78` 约定部署包排除 `public/uploads`、Nginx 不直出 `/uploads/`、长期目标私有 OSS + 签名 URL；`deploy\nginx\edu-manage.conf:8-12,49-53` 仅一条 `location /` 反代 `127.0.0.1:3000`，无独立 uploads 静态 root/alias。
- **风险**：CDN 是否缓存 API 响应/签名 URL、是否把 `/uploads/`、`/volunteer/docs/` 回源到应用、bucket 是否与站点同域，均需控制台核对；若 CDN 长缓存签名 URL 或 public-read 对象，签名有效期与代理鉴权都会被绕过。
- **建议**：导出 CDN 缓存规则与 bucket ACL 归档到 `docs/`；API 与签名 URL 配置 `no-store`/短 TTL；上传目录不走 CDN 缓存；定期巡检 OSS 对象列表与访问日志。

### E-21 环境密钥持有面：多组第三方凭证已配置，需确认注入路径与轮换记录

- **证据**：`.env` 持有 DB 连接串、next-auth secret、WxPusher token、企业微信 CorpID/AgentID/AgentSecret、DeepSeek/MIMO/KIMI API Key（键名见 5.4.6，值略）；`.env.local` 持有高德 Key、ARK Key、OSS AccessKeyId/Secret、bucket/endpoint/公网域名；compose `env_file: .env`（`:46-47`）注入容器；Dockerfile 未 COPY `.env`；`.gitignore:35-36`、`.dockerignore:20-22` 排除 env 文件。
- **风险**：密钥分散在本地两份 env 与服务器 `.env`；仓库无密钥轮换/过期记录；OSS AccessKey 权限范围（是否可写其他 bucket/列出对象）代码层不可见。
- **建议**：核对 OSS AK 为最小权限（限本 bucket 读写、禁 list/删其他资源）；建立密钥轮换台账；本地 `.env.local` 不随备份包上传；异常 AK（疑似泄露）可在阿里云控制台直接禁用。

## 待实测项

> 以下假设静态代码无法确认，**禁止对线上站点做爬取、压测、批量下载或 UA 伪装**；验证一律在本机 dev 环境低频、单点、可回滚地进行，或由运维在控制台/容器/日志侧只读核对。

| 编号 | 待验证假设 | 验证方法（低风险、单点、可回滚） | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| T-10 | 生产 `STORAGE_DRIVER` 实际值（本地 `.env.local` 长度 5 = local；生产 compose 未覆盖该变量） | 运维在服务器 `docker exec edu-manage-app printenv STORAGE_DRIVER` 只读查看；不发起对象读写 | 只读容器环境变量 | 确认走本地文件还是 OSS；决定 E-6/E-7 修复优先级 |
| T-11 | OSS bucket ACL 是 public-read 还是私有；对象能否用裸公网 URL 直读 | 运维在 OSS 控制台查看 bucket 读写权限与对象 ACL；挑 1 个已知测试对象核对，不遍历列表 | 只读控制台 | 若 public-read，按 E-6 转私有 + 签名 URL |
| T-12 | `/uploads/<key>` 与 `/volunteer/docs/*` 在 Nginx/CDN 下是否绕过鉴权直连 | 本机 dev 启动后，用未登录会话直接 GET 一个已知本地测试文件路径，观察 200 静态直出还是 302/401；线上仅由运维核对 nginx `location` 与 CDN 回源规则，不构造批量请求 | 本机 dev 低频；线上只读配置 | 按 E-7/E-12 收敛静态旁路 |
| T-13 | 根目录 `*.sql / *.zip / _*` 是否被 git 跟踪 | 在装有 git 的环境执行 `git ls-files` 过滤 `\.(sql|zip|dump)$` 与 `^_`；不提交、不推送任何文件 | 只读索引查询 | 已跟踪则按 E-13 从索引移除并评估历史清理 |
| T-14 | CDN 是否缓存 API 响应、签名 URL、上传目录 | 运维在 CDN 控制台查看缓存键规则与命中日志；抽查响应 `Cache-Control`/`Age` 头，不主动刷缓存 | 只读配置 | 签名 URL/API 配 no-store；上传目录排除缓存 |
| T-15 | Sentry 项目实际是否收到 cookie/request body/replay DOM 文本 | 运维在 Sentry 后台查看最近错误事件的 request 上下文与 replay 样本；必要时在预发环境触发一次受控 500 观察上送内容 | 预发单次受控触发 | 按 E-8 补 beforeSend/masking 后复测 |
| T-16 | Redis 内网是否有其他容器/主机可连；6379 是否仅 internal 可达 | 运维核对 compose 网络与宿主机防火墙；从另一容器 `redis-cli ping` 验证连通性，不写入键 | 内网只读探测 | 补 requirepass（E-16）；收紧网络策略 |
| T-17 | 服务器上 `release/ tmp/ backups/ data/` 是否被其他服务或 Nginx 静态根覆盖；历史日志是否含 DB 连接串/请求体 | 运维 `docker exec`/`ls` 核对目录位置与权限；抽样 grep 服务器日志中的连接串/手机号模式，不导出日志到外部 | 只读容器与服务器文件系统 | 按 E-18 固化目录边界；清理残留日志 |
| T-18 | 生产模式 500 是否真的不返回 `err.message`/stack | 本机以 `NODE_ENV=production` 启动 dev/预发，触发一次受控异常（如临时断库），观察响应体仅含通用文案；验证后恢复配置 | 本机/预发单次；不指向线上 | 若回显内部消息，按 E-10 收紧 catch 分支 |
| T-19 | 材料/讲义静态目录（`public/services marketing business-assets`）线上文件清单是否含用户上传残留 | 运维在容器 `public/` 下列目录核对；不通过 URL 逐个访问 | 只读容器文件系统 | 清理 test-*.pdf 等测试残留；公开素材登记造册 |

## 覆盖说明（扫描口径与覆盖数，不作为结论本身）

- **导出/下载路由覆盖**：`src\app\api\reports\*` 9 个、`attendance/export`、`settings/export/students|finance`、`admin/salary/export`、`admin/students/[id]/feedback-export`、`admin/classroom-feedback/image-download`、`volunteer/documents/[id]/download`、`files/view`、`files/[id]`、`materials/[id]/view`、`settings/backup/create`、`public/teacher-showcase/portrait`，共 21 个通道（20 个导出/下载路由 + 1 个公开头像）逐个精读角色/裁剪/字段/限流/审计/文件名。
- **限流引用扫描**：对 `checkRateLimit` 做全仓调用点计数；`apiHandler` 包装覆盖率沿用分册四结论（296 个非测试路由中 287 个包装）；`RATE_RULES` 21 条前缀逐条核对，确认无导出/财务/薪资/学员专用规则。
- **上传链路覆盖**：`upload-policy.ts`（角色×类型矩阵 3-19）、`upload-access.ts`（资产校验 41-110、DB 反查 113-149、关联校验 156-187）、`upload-url.ts`（归一化/回落 1-43）、`material-file.ts`（白名单/文件头 1-80）、`storage/index.ts`（local/OSS 双驱动 133-338、工厂与安全文件名 340-401）、`/api/upload`、`/api/uploads/sign`、`/api/uploads/[filename]`、`/api/materials/oss-signature`、`/api/materials/upload`、`/api/volunteer/documents` 逐个核对 ext 白名单、大小、文件头、文件名、回落路径。
- **文件读取扫描**：全 src grep `sendFile|createReadStream|readFile(|readFileSync(`，生产路由命中 10 处（见 5.5 列表），其余均在 `*.test.ts`；未发现任意路径直读路由。
- **错误/日志/Sentry 扫描**：精读 `api-handler.ts` 全量 catch/脱敏链路；grep `beforeSend|beforeBreadcrumb|sendDefaultPii|maskAll|blockAll|setUser|cookies()`；扫描 `security.log / security-final.log` 敏感正则命中并逐行定性；env 文件只统计键名与值长度特征，未抄录任何 secret/key 原文。
- **构建产物扫描**：精读 `Dockerfile`（deps/builder/migrator/runner 四阶段）、`.dockerignore`、`.gitignore`、`next.config.ts` 全量头/缓存/rewrite 配置；`public/` 全量按扩展名分组；根目录与 scratch 目录按文件数/体积实测；`compose.production.yaml` 逐服务核对 ports/networks/command/env。
- 未覆盖：前端页面内客户端 jspdf/modern-screenshot 生成逻辑的数据面（浏览器本地，不经服务端落盘）、OSS 桶策略与 RAM 权限、CDN/Nginx 线上实际规则、Sentry 后台数据保留策略；这些分别由前端代码审查、运维配置核对与待实测 T-10~T-19 覆盖。
