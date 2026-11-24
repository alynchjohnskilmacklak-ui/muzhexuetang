# 分册三：授权与越权（家长端 / 小程序 / 公开入口）

> 审查范围：`src/app/api` 下 `parent`、`miniapp`、`public`、`qywx`、`wxpusher`、`ai`（含 public-assistant）、`volunteer`、`schools`、`weather`、`telemetry`、`health`、`auth`（激活/回调/令牌类）路由。
> 审查方式：纯静态只读审查，未请求线上站点、未调用小程序接口、未伪造回调。需动态验证的假设统一列入文末"待实测项"。
> 基线：Next.js 16 App Router + next-auth v5（JWT 会话，`sessionMark` 单点登录标记）+ Prisma/PostgreSQL + Redis。家长身份来自 `ParentActivationToken` 激活流程，家长↔学员绑定关系存库（`User.parentId` / `User.parentUserId`，谓词见 `src/lib/business-visibility.ts:84-90`）。
> 判定口径：**合格**＝身份/角色/归属三道门齐备；**残缺**＝某道门存在但不完整（含依赖中间件兜底、角色校验缺失、常量时间比较缺失等）；**裸奔**＝敏感动作/数据在缺少有效身份或归属校验下可被触发。

## 路由"四道门"覆盖矩阵

| 路由 (方法) | 身份来源 | 门2 角色 | 门3 归属 | 判定 | 证据(文件:行) |
|---|---|---|---|---|---|
| parent/children (GET) | next-auth session | 未显式校验 parent | 有：`getParentChildren(prisma, user.id)` 按 parentId 过滤 | 残缺 | `src/app/api/parent/children/route.ts:12-16`；`src/lib/parent-children.ts:6-35` |
| parent/hour-records (GET) | session | 有：`role !== 'parent' → 403` | 有：`parentLinkedStudentWhere(user.id)` + `findParentChild` 逐个校验 | 合格 | `src/app/api/parent/hour-records/route.ts:13,15,24,43-46`；`src/lib/business-visibility.ts:84-90`；`src/lib/parent-children.ts:37-41` |
| parent/hours-leaderboard (GET) | session | 有：parent 限定 | 有：`findParentChild`；同班同学姓名脱敏（`maskNameForParent`） | 合格 | `src/app/api/parent/hours-leaderboard/route.ts:34-36,39,50-51` |
| parent/leave (POST) | session | **未显式校验 parent**，仅判登录 | 有：`findParentChild` 校验 childId 属当前家长；写库前复用同一谓词 | 残缺 | `src/app/api/parent/leave/route.ts:22-25,51-53,122` |
| parent/materials (GET) | session | 有：parent 限定 | 不按学员 id；材料受众限定 `PUBLISHED + STUDENT/BOTH` | 合格 | `src/app/api/parent/materials/route.ts:11-12`；`src/lib/material-visibility.ts:7-12` |
| parent/materials/lesson-previews (GET) | session | 有：parent 限定 | 有：学员名列表仅取 `parentStudentIds` 内 | 合格 | `src/app/api/parent/materials/lesson-previews/route.ts:11-12,77-84` |
| parent/meal-choice (GET) | session | **未显式校验 parent** | 有：`parentLinkedStudentWhere(userId)` 过滤学员与已选餐记录 | 残缺 | `src/app/api/parent/meal-choice/route.ts:17-21,32-46` |
| parent/meal-choice (POST) | session | **未显式校验 parent** | 有：`student.parentId === userId \|\| student.parentUserId === userId` 显式比对 | 残缺 | `src/app/api/parent/meal-choice/route.ts:61-65,72-76,79-89` |
| parent/notifications/mark-read (POST) | session | 有：parent 限定 | 有：`where: { userId, id }` | 合格 | `src/app/api/parent/notifications/mark-read/route.ts:15,18,139` |
| parent/notifications/read-all (PATCH) | session | 有：parent 限定 | 有：`where: { userId }` | 合格 | `src/app/api/parent/notifications/read-all/route.ts:10,13,37` |
| parent/notifications/unread-count (GET) | session | **未显式校验 parent** | 有：`where: { userId }` 计数 | 残缺 | `src/app/api/parent/notifications/unread-count/route.ts:9,16` |
| parent/practice-bank (GET) | session | **未显式校验 parent** | 有：`findParentChild` 校验 childId | 残缺 | `src/app/api/parent/practice-bank/route.ts:16,26` |
| parent/practice-results (GET) | session | **未显式校验 parent** | 有：`findParentChild`；`submissionId` 经 `recordIds.includes(attempt.studentId)` 交叉校验 | 残缺 | `src/app/api/parent/practice-results/route.ts:94-97,108-112,116-119` |
| parent/practice-results (POST) | session | **未显式校验 parent** | 有：`findParentChild` + 已存在提交 `recordIds` 交叉校验 | 残缺 | `src/app/api/parent/practice-results/route.ts:191-194,219-223,228-230` |
| parent/profile (GET) | session | **未显式校验 parent** | 有：`findParentChild` | 残缺 | `src/app/api/parent/profile/route.ts:11-12,15-19` |
| parent/students/[id]/archive (GET) | session | 由归档库按 `viewer.role` 裁决 | 有：`parentStudentIds.includes(studentId)`，跨部拒绝 | 合格 | `src/app/api/parent/students/[id]/archive/route.ts:12-13,18-23,31`；`src/lib/student-archive.ts:159-166,200-204` |
| parent/students/[id]/growth-report (GET) | session | 有：`requireParentUser` | 有：成长档案库按 parent 归属校验 | 合格 | `src/app/api/parent/students/[id]/growth-report/handler.ts:30,41`；`src/lib/student-growth/archive.ts:132-135` |
| parent/students/[id]/learning-report (POST) | session | **未显式校验 parent** | 有：`findParentChild` 校验 id 属当前家长 | 残缺 | `src/app/api/parent/students/[id]/learning-report/route.ts:28-29,33-35` |
| parent/study-hall (GET) | session | 有：`requireParentUser` | 有：`parentLinkedStudentWhere` | 合格 | `src/app/api/parent/study-hall/route.ts:10-11` |
| parent/study-hall (PATCH) | session | 有：`requireParentUser` | 有：`updateMany.where` 复用 `parentLinkedStudentWhere` | 合格 | `src/app/api/parent/study-hall/route.ts:59` |
| parent/today (GET) | session | **未显式校验 parent** | 有：`parentLinkedStudentWhere(userId)` | 残缺 | `src/app/api/parent/today/route.ts:24,31` |
| parent/unread-counts (GET) | session | 有：parent 限定 | 有：`parentLinkedStudentWhere` + `where: { userId }` | 合格 | `src/app/api/parent/unread-counts/route.ts:13-16,22,42,81` |
| parent/unread-counts/read-all (POST) | session | 有：parent 限定 | 有：`parentLinkedStudentWhere` + `where: { userId }` | 合格 | `src/app/api/parent/unread-counts/read-all/route.ts:17-19,23,49` |
| parent/wechat/unbind (POST) | session | 有：parent 限定 | 有：`where: { id: userId }` 只改本人 | 合格 | `src/app/api/parent/wechat/unbind/route.ts:7-9` |
| parent/weekly-report (GET) | session | **未显式校验 parent** | 有：`findParentChild`（childId 可选，缺省取全部绑定学员） | 残缺 | `src/app/api/parent/weekly-report/route.ts:19,26` |
| public/teacher-showcase (GET) | 无需登录（设计公开） | N/A（公开营销页） | N/A；响应不返回教师 id，姓名仅回姓氏标签，bio 姓名替换脱敏 | 合格（设计公开） | `src/app/api/public/teacher-showcase/route.ts:63-69,82-108,150-169`；`src/proxy.ts:44-46,77` |
| public/teacher-showcase/portrait (GET) | 无需登录；AES-256-GCM 签名令牌（teacherId+division+7d 过期，随机 IV + AuthTag） | N/A | 令牌绑定 teacherId；DB 按 teacherId+division+ACTIVE 复核；上传真人头像马赛克化；存储 key 校验 `..`/`\\`；路径穿越复核；nosniff | 合格（设计公开） | `src/lib/public-teacher-showcase-token.ts:14-61`；`src/app/api/public/teacher-showcase/portrait/route.ts:14-19,33,37-39,43-60,63,69-75,81` |
| qywx/bind (POST) | session | 有：仅 admin/teacher；parent 被拒 | 有：admin 选目标时目标必须是同 division 的 admin/teacher；teacher 只能绑自己 | 合格 | `src/app/api/qywx/bind/route.ts:18-19,33-36,44-54` |
| qywx/bind (GET) | session | 登录即可 | 有：只查 `where: { id: user.id }` | 合格 | `src/app/api/qywx/bind/route.ts:92-100` |
| qywx/bind-management (GET) | session | 有：仅 admin | 有：家长列表按 division 过滤 | 合格 | `src/app/api/qywx/bind-management/route.ts:26,30,39-55` |
| qywx/bind-management (POST) | session | 有：仅 admin | 有：联系人须在发送成员客户列表内、`type===1`、重复绑定冲突校验、Serializable 事务 | 合格 | `src/app/api/qywx/bind-management/route.ts:101,111-142,145-169` |
| qywx/bind-management (DELETE) | session | 有：仅 admin | 有：目标家长限定 division | 合格 | `src/app/api/qywx/bind-management/route.ts:186-199` |
| qywx/event (GET) | 企微回调签名（SHA1(sort(TOKEN,timestamp,nonce,echostr))，`timingSafeEqual`）+ AES-256-CBC 解密 + corpId 校验 | N/A | N/A；**未校验 timestamp 新鲜度、未记录 nonce 防重放** | 残缺 | `src/app/api/qywx/event/route.ts:15-16,39-40,44-50,59-78` |
| qywx/event (POST) | 同上签名 + 解密 | N/A | N/A；**未校验 timestamp/nonce**；handler 仅解密回 `success`，不解析事件内容、不改库 | 残缺 | `src/app/api/qywx/event/route.ts:81-98` |
| qywx/test-send (POST) | session | 有：仅 admin/teacher | parent 通道只能发配置的 `QYWX_TEST_SCHOOL_PARENT_ID`；member 通道发给本人；链接 origin 白名单校验防开放重定向 | 合格 | `src/app/api/qywx/test-send/route.ts:18-19,34-49,58-63,65-69` |
| wxpusher/callback (POST) | 仅校验请求体 `appToken === WXPUSHER_APP_TOKEN`（共享密钥，非恒定时间比较） | **无角色校验** | **无归属/待绑定会话校验**：`extra`（用户 id）直接作为 `where: { id: extra }` 写 `wxpusherUid` | 裸奔 | `src/app/api/wxpusher/callback/route.ts:7-8,14-17,19-35` |
| wxpusher/qrcode (GET) | session | 登录即可 | 有：`extra = session.user.id`，不接受前端传 userId | 合格 | `src/app/api/wxpusher/qrcode/route.ts:8-9,19-25` |
| wxpusher/unbind (POST) | session | 登录即可 | 有：`where: { id: userId }` 只解绑本人 | 合格 | `src/app/api/wxpusher/unbind/route.ts:7-8,12-16` |
| ai/chat (POST) | session | 角色映射进 system prompt；digest 按角色取数 | 家长 digest 只含本人学员；教师/管理员 digest 各自作用域 | 合格（限流缺陷见 C-6） | `src/app/api/ai/chat/route.ts:211,120,281`；`src/lib/ai/system-context.ts:53-130` |
| ai/public-assistant (POST) | 无需登录（设计公开） | N/A | N/A；**无任何 DB/工具检索路径**，仅把提问拼进 user 消息；输入去控制字符、限 300 字；IP 限流 5 次/分钟 | 合格（设计公开；无日额度见 C-11） | `src/app/api/ai/public-assistant/route.ts:10,44-52,61-74,76-90` |
| ai/recent-alerts (GET) | session | 家长分支 `requireParentUser`；教师/管理员分支按 userId | 有：家长只查 `parentId/userId` 绑定学员；员工只查本人通知 | 合格 | `src/app/api/ai/recent-alerts/route.ts:143-159,179-181` |
| ai/system-digest (GET) | session | 由 `buildSystemDigest(user)` 按角色分叉 | 家长分支不进入全库统计；员工/管理员分支取本角色作用域 | 合格 | `src/app/api/ai/system-digest/route.ts:9-15`；`src/lib/ai/system-context.ts:53,240-247` |
| volunteer (GET) | session | admin/teacher 取管理版指南，其余取家长版（仅 `isPublished`） | N/A | 合格 | `src/app/api/volunteer/route.ts:11-17`；`src/lib/volunteer.ts:217-238` |
| volunteer (PATCH) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/route.ts:20-26` |
| volunteer/consultation (GET) | session | parent 按 `parentId` 过滤；非 parent（teacher/admin）看全部并含家长姓名 | 有：家长只看自己提交的咨询 | 合格 | `src/app/api/volunteer/consultation/route.ts:8-21` |
| volunteer/consultation (POST) | session | 有：仅 parent | 有：`create.data.parentId = user.id` | 合格 | `src/app/api/volunteer/consultation/route.ts:24-40` |
| volunteer/consultation/[id] (DELETE) | session | parent 可删自己的；admin/teacher 可删任意 | 有：`consultation.parentId === user.id` 否则要求员工角色 | 合格 | `src/app/api/volunteer/consultation/[id]/route.ts:9,15-17,20` |
| volunteer/consultation/[id]/reply (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/consultation/[id]/reply/route.ts:9-12,20-28` |
| volunteer/documents (GET) | session（任意登录角色） | 不区分角色 | N/A；返回志愿指南文档（设计上家长可见） | 合格（设计公开资料） | `src/app/api/volunteer/documents/route.ts:12-18` |
| volunteer/documents (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/documents/route.ts:22-26` |
| volunteer/documents/[id] (DELETE) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/documents/[id]/route.ts:10-13,17` |
| volunteer/documents/[id]/download (GET) | session（任意登录角色） | 不区分角色 | fileUrl 仅校验前缀 `/volunteer/docs/`，**未做 `path.join` 后目录规范化复核**；未设 `X-Content-Type-Options: nosniff` | 残缺 | `src/app/api/volunteer/documents/[id]/download/route.ts:11-29` |
| volunteer/quota (GET) | session（任意登录角色） | 不区分角色 | N/A；公开招生计划/录取分数（家长志愿页使用） | 合格（设计公开数据） | `src/app/api/volunteer/quota/route.ts:9-11,19-35` |
| volunteer/quota (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/quota/route.ts:38-44` |
| volunteer/quota/import (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/quota/import/route.ts:11-17` |
| volunteer/schools (GET) | **无需登录**（proxy 白名单第 96 行放行） | N/A | N/A；高中公开招生信息（地址/电话/学费/录取率/来源链接）+ 公开分配名额与一分一档，无学员家长数据 | 合格（设计公开） | `src/app/api/volunteer/schools/route.ts:16-57,101-103,139`；`src/proxy.ts:96` |
| volunteer/steps (GET) | session | 非编辑角色仅返回 `isPublished: true` | N/A | 合格 | `src/app/api/volunteer/steps/route.ts:15-17,22` |
| volunteer/steps (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/steps/route.ts:28-32` |
| volunteer/steps/reorder (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/steps/reorder/route.ts:9-13` |
| volunteer/steps/[id] (PATCH) | session | 有：`requireEditor`（admin/teacher） | N/A | 合格 | `src/app/api/volunteer/steps/[id]/route.ts:9-15,17-20,28-38` |
| volunteer/steps/[id] (DELETE) | session | 有：`requireEditor`（admin/teacher） | N/A | 合格 | `src/app/api/volunteer/steps/[id]/route.ts:44-50` |
| volunteer/yifenyidang (GET) | **handler 内无任何会话校验**；未登录请求由 proxy 中间件拦截 401 | N/A | N/A；公开中考一分一档统计（教育局公开数据） | 残缺（鉴权依赖 proxy，handler 未自包含） | `src/app/api/volunteer/yifenyidang/route.ts:7-15`；`src/proxy.ts:106-108` |
| schools (GET) | session（任意登录角色，含家长） | 未做角色区分 | N/A；响应含 `updatedBy`（管理员用户 id）内部审计字段 | 残缺 | `src/app/api/schools/route.ts:10-11,55` |
| schools/[id] (PUT) | session | 有：仅 admin | N/A；更新字段白名单 | 合格 | `src/app/api/schools/[id]/route.ts:61,65-69,76-82,94-96` |
| weather/xinle (GET) | session（任意登录角色） | 不区分角色 | N/A；调用高德预报，内部 Key 不回传 | 合格 | `src/app/api/weather/xinle/route.ts:9-11` |
| telemetry/client-performance (POST) | session | 登录即可 | 有：上报字段白名单正则 + 2KB 上限，只记路由名与耗时，不落用户/学员标识 | 合格 | `src/app/api/telemetry/client-performance/route.ts:9-31` |
| health (GET) | `?token=HEALTH_TOKEN` 探针；未带 token 只回 `{status:'ok'}` | N/A | N/A；token 用 `!==` 非常量时间比较；未走 apiHandler（无全局限流） | 残缺 | `src/app/api/health/route.ts:24-28,30-64` |
| auth/activate/[token] (GET) | 能力令牌（32 字节随机，sha256 存库，7 天有效） | N/A | 令牌即凭证；命中才回家长姓名/邮箱/学员列表，未命中 404 通用文案 | 合格（设计公开，令牌即凭证） | `src/app/api/auth/activate/[token]/route.ts:18-30`；`src/lib/parent-activation.ts:15-37,39-60` |
| auth/activate/[token] (POST) | 同上能力令牌 | N/A | 事务内 `updateMany({usedAt:null})` 防重复激活；密码策略校验；激活后 `currentSessionToken` 置空撤销旧会话 | 合格（设计公开） | `src/app/api/auth/activate/[token]/route.ts:32-49`；`src/lib/parent-activation.ts:62-93` |
| auth/change-password (POST) | session | 登录即可 | 有：先 `bcrypt.compare(oldPassword)` 验旧密码；改密后 `currentSessionToken` 轮换撤销旧会话 | 合格 | `src/app/api/auth/change-password/route.ts:11,32-33,36-51` |
| auth/check-role (POST) | 未登录 | N/A | 按 email 反查 role 并回传（admin 被隐藏为 null） | 残缺（角色/账号枚举） | `src/app/api/auth/check-role/route.ts:13-33` |
| auth/detect-role (POST) | 未登录 | N/A | 按 email/手机号反查 role + division 并回传（admin 隐藏） | 残缺（角色/账号枚举） | `src/app/api/auth/detect-role/route.ts:7-23`；`src/lib/login-accounts.ts:356-415` |
| auth/forgot-password (POST) | 未登录 | N/A | 通用文案防枚举；32 字节随机重置令牌 sha256 存库、30 分钟有效、旧令牌作废；限流 5 次/分钟 | 合格 | `src/app/api/auth/forgot-password/route.ts:9,34-41,63-76,78-87,90`；`src/lib/rate-limit.ts:21` |
| auth/kick-events (GET) | session SSE | 登录即可 | 有：订阅频道 `kick:${userId}`，只收本人踢线事件 | 合格 | `src/app/api/auth/kick-events/route.ts:8-13,36-41` |
| auth/log-device (POST) | session | 登录即可 | 有：只更新本人最近一条成功登录记录 | 合格 | `src/app/api/auth/log-device/route.ts:12-13,17,22-39` |
| auth/login-check (POST) | 未登录 | N/A | 仅回 `ok:true/false`；内部 `BAD_USERNAME / BAD_ROLE / LOCKED` 错误码在路由层被归一化为通用文案，对外不可区分；`ok:true` 仍可确认账号存在且入口角色匹配 | 残缺（弱枚举） | `src/app/api/auth/login-check/route.ts:14-29`；`src/lib/login-accounts.ts:569-602` |
| auth/login-status (POST) | 未登录 | N/A | 按 email 回传 `locked / failCount / remaining`，暴露账号锁定状态与失败次数节奏 | 残缺（枚举） | `src/app/api/auth/login-status/route.ts:7-15`；`src/lib/login-accounts.ts:230-251` |
| auth/reset-password (POST) | 能力令牌（sha256 比对、未过期、未使用） | N/A | 禁用账号拒绝；重置后令牌作废、`currentSessionToken` 轮换撤销全部旧会话 | 合格 | `src/app/api/auth/reset-password/route.ts:20-40,46-69`；`src/lib/rate-limit.ts:22` |
| auth/session-ping (GET) | session | 登录即可 | 有：`sessionMark` 与库内 `currentSessionToken` 比对，不一致回 `kicked` | 合格 | `src/app/api/auth/session-ping/route.ts:13-18,22-35` |
| auth/[...nextauth] (GET/POST) | next-auth 核心；CredentialsProvider | authorize 内限定 `admin/teacher/parent` | 登录成功才签发 JWT，写入 sessionMark 并踢掉旧会话 | 合格（框架基线） | `src/app/api/auth/[...nextauth]/route.ts:5`；`src/lib/auth.ts:117-150,171-196,229-232` |
| miniapp/* | — | — | — | **空壳目录**：`src/app/api/miniapp/auth/login/` 下无 `route.ts`，当前不存在小程序服务端接口、自定义 token 或 openid 绑定逻辑；全仓未检出 `wx.login / jscode2session / openid` 服务端实现 | 目录列举结果；全仓 grep 无命中 |
| students/[id]/parent (POST) | session | 有：仅 admin（本分册边界外，管理端路由，顺带核验） | 有：学员存在性校验；事务内绑定 `parentId/parentUserId` 并写 activityLog；初始密码取姓名拼音或自定义 | 合格（边界外，归管理端分册复核） | `src/app/api/students/[id]/parent/route.ts:15-18,22-23,48-84` |
| students/[id]/link-parent (POST) | session | 有：仅 admin（边界外，顺带核验） | 有：学员存在性校验；事务内重绑家长账号并记录日志 | 合格（边界外，归管理端分册复核） | `src/app/api/students/[id]/link-parent/route.ts:18-23` |

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
|---|---|---|---|---|---|
| C-1 | wxpusher/callback 仅靠共享 appToken 比对即可把任意家长账号的推送通道绑到攻击者 UID，无 HMAC、无待绑定会话校验、无归属校验 | 回调鉴权缺失 / 越权写 | appToken 一旦泄露（日志、前端、第三方平台泄露），攻击者可劫持课堂反馈、平安回家通知推送，接收他人孩子的敏感通知 | 中 | 立刻 |
| C-2 | 家长端 10 个文件（12 个 handler）只校验登录、未显式校验 `role==='parent'`，归属防护完全依赖"非家长绑定为空→查不到数据"的兜底 | 角色门残缺 | 一旦数据模型允许员工账号挂学员绑定，或后续复用公共查询函数放宽谓词，兜底消失即变成跨角色越权读/写 | 小 | 近期 |
| C-3 | check-role / detect-role 未登录即可探测账号存在性与角色/学部；login-status 暴露锁定状态与失败次数；login-check 仅 `ok:true/false` 弱枚举 | 信息枚举 | 配合字典批量探测可绘出系统账号与角色清单，并获知目标账号锁定节奏，辅助定向爆破 | 小 | 近期 |
| C-4 | qywx/event 回调未校验 timestamp 偏移、未存 nonce 防重放 | 回调防重放残缺 | 现 handler 不改库，重放暂无实际动作；未来若在该端点落地事件状态变更，捕获报文即可重放触发 | 小 | 近期 |
| C-5 | health 探针 token 用 `!==` 比较（非常量时间），且未走 apiHandler、无全局限流 | 密码学/限流残缺 | 理论上可通过响应时序逐字节推断 token；高频探测可拿到 DB 延迟/uptime/内存等内部运行指标 | 小 | 近期 |
| C-6 | ai/chat 限流为进程内内存 Map，不进 Redis | 架构/限流 | 多实例部署各自计数、进程重启清零，登录用户可绕过分钟/日额度刷量消耗大模型 API 额度 | 中 | 近期 |
| C-7 | schools GET 向登录家长返回 `updatedBy`（管理员用户 id） | 内部字段外泄 | 家长可枚举维护人内部 id，为后续针对内部账号的攻击提供信息 | 小 | 近期 |
| C-8 | documents/[id]/download 未做路径规范化复核，缺 nosniff 响应头 | 文件下载残缺 | 当前 fileUrl 仅服务端写入，风险低；若未来允许前端传文件名，存在目录穿越读文件面；缺少 nosniff 浏览器可能按内容嗅探执行 | 小 | 长期 |
| C-9 | yifenyidang 等 handler 自身无会话校验，鉴权完全依赖 proxy 中间件白名单 | 架构/纵深防御 | 若 proxy matcher 调整、handler 被直连调用或被其他路由复用，未登录即可拉取全量一分一档数据 | 中 | 近期 |
| C-10 | 限流驱动 Redis 故障时 auto 模式降级内存桶，仅本地 console.warn、无 Sentry/告警上报与熔断 | 架构/运维 | 公开接口在 Redis 故障窗口内失去分布式限流，可被慢速/分布式刷量击穿成本 | 小 | 近期 |
| C-11 | public-assistant 仅有 5 次/IP/分钟限流，无每日总额度与黑名单 | 架构/成本 | 无 DB 检索，不构成数据外泄；但可持续调用大模型产生 API 费用（内存降级下更易绕过） | 小 | 近期 |
| C-12 | qywx/event、wxpusher/callback、health、public/teacher-showcase（含 portrait）、parent/learning-report 等 handler 未包裹 apiHandler | 架构/一致性 | 不享受统一 body 大小限制、IP 提取与全局限流，回调/公开端点缺少一致的防爆破基线 | 小 | 长期 |
| C-13 | `/volunteer/docs/` 静态目录在 proxy 白名单内公开，上传附件凭文件名可直下 | 架构/数据边界 | 若误传学员材料、内部文档，静态目录不做鉴权即可被遍历下载 | 小 | 近期 |
| C-14 | miniapp 为空壳，无小程序鉴权/token 体系 | 架构/待办 | 未来接入微信小程序时若沿用"前端传 openid 即信"的做法，将出现身份伪造；需在接入前定方案 | 中 | 长期（接入前必须完成） |

## ① 已具备但不完善

### C-2 家长端多个接口缺显式角色校验，归属校验退化为绑定兜底

- **证据**：`src/app/api/parent/leave/route.ts:22-25`（仅 `if (!session?.user) 401`，无 role 判断）；同类写法见 `parent/meal-choice/route.ts:17-18,61-62`、`parent/notifications/unread-count/route.ts:9`、`parent/practice-bank/route.ts:16`、`parent/practice-results/route.ts:94-97,191-194`、`parent/profile/route.ts:11-12`、`parent/students/[id]/learning-report/route.ts:28-29`、`parent/today/route.ts:24`、`parent/weekly-report/route.ts:19`、`parent/children/route.ts:12-16`。归属侧统一走 `findParentChild` / `parentLinkedStudentWhere`：
  ```ts
  // parent-children.ts:6-35,37-41 —— 非家长 userId 查不到任何绑定学员，兜底返回 null/空集
  export async function getParentChildren(prisma, parentId) { /* parentStudentHistoryWhere(parentId) */ }
  export function findParentChild(children, requested) {
    return children.find((child) => requested && child.recordIds.includes(requested)) || null
  }
  ```
- **危害**：现状下员工账号查不到绑定学员，兜底有效；但这些接口把"角色门"完全押在"绑定为空"这一隐含前提上。一旦后续公共查询函数被复用放宽（例如员工视图也能挂学员）、数据模型允许双角色，或未来新增按手机号而非 userId 取学员的逻辑，越权读成绩/考勤/反馈、越权写请假/反馈将直接暴露。
- **利用前置条件**：需要一个已登录的员工/管理员会话；当前静态代码下因绑定为空尚无法直接读到他人孩子数据。
- **修复方案**：上述 handler 入口统一改用 `requireParentUser()`（`src/lib/auth/guards.ts:114-121`），先验角色再验归属；与现有 `findParentChild` 双层防护，避免单兜底失效。
- **工作量**：小（逐接口加一行角色断言，共 10 个文件、12 个 handler）。
- **优先级**：近期。

### C-3 未登录身份探测接口存在账号/角色/锁定状态枚举

- **证据**：
  - `src/app/api/auth/check-role/route.ts:24-33`：按 email `findUnique` 回传 `role`（admin 置 null），teacher/parent 账号存在性可由 `role` 是否非 null 探测。
  - `src/app/api/auth/detect-role/route.ts:22-23` → `src/lib/login-accounts.ts:356-415`：按 email/手机号返回 `{role, division}`，可同时探测角色与学部归属。
  - `src/app/api/auth/login-check/route.ts:21-29`：路由层把 `precheckLoginAccount` 的所有失败结果归一化为通用 `LOGIN_CHECK_FAILED`（`route.ts:16,24`），对外只见 `ok:true/false`；内部 `BAD_USERNAME / BAD_ROLE / LOCKED`（`src/lib/login-accounts.ts:585,590,598`）不直接回显，但 `ok:true` 仍可确认账号存在且入口角色匹配。
  - `src/app/api/auth/login-status/route.ts:12-15` → `src/lib/login-accounts.ts:230-251`：按 email 回传 `failCount`、`remaining`、`locked` 实时计数，失败次数与剩余次数对外可见。
  - 限流基线：check-role 10rpm、detect-role 5rpm、login-check 20rpm、login-status 10rpm（`src/lib/rate-limit.ts:15-22`），按 IP 计数。
- **危害**：攻击者用字典批量请求可列出系统内 teacher/parent 账号、对应学部与角色；`login-status` 进一步暴露目标账号失败/锁定节奏，为定向撞库、密码喷洒提供情报。
- **利用前置条件**：无需登录；可分布式换 IP 绕过单 IP 限流。
- **修复方案**：
  1. `login-status` 仅回 `locked` 布尔，不回 `failCount/remaining`；`login-check` 维持错误码归一化，并在 `ok:false` 时对存在/角色/锁定走同一响应。
  2. `check-role / detect-role` 在未登录时只回通用角色缺失结果，不回 division；角色探测改由登录态后调用。
  3. 上述接口的限流叠加"按账号维度"计数，避免换 IP 刷账号字典。
- **工作量**：小。
- **优先级**：近期。

### C-4 企微回调未校验 timestamp 新鲜度与 nonce 防重放

- **证据**：`src/app/api/qywx/event/route.ts:44-50` 签名仅做 SHA1 比对与 `timingSafeEqual`；`timestamp` 未解析为时间戳、未与服务器当前时间做 ±5 分钟窗口校验；`nonce` 未落 Redis/DB，不做一次性去重：
  ```ts
  const str = [TOKEN, timestamp, nonce, encrypt].sort().join('')
  const sha = crypto.createHash('sha1').update(str).digest('hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  ```
- **危害**：当前 POST handler（`route.ts:81-98`）只解密回 `success`，不解析事件、不改库，重放不产生内部动作；但签名方案里缺少时间窗口与 nonce 去重，后续若在该端点落地"通讯录变更→自动改绑"等状态动作，捕获一次合法回调即可重放触发。
- **利用前置条件**：需要捕获到一条合法签名回调报文（具备 TOKEN 才能伪造新报文，本端点不能被任意伪造）。
- **修复方案**：校验 `Math.abs(Date.now() - timestamp*1000) < 5*60*1000`；用 Redis `SETNX nonce:timestamp 1 EX 300` 做 nonce 一次性校验，失败回 403。
- **工作量**：小。
- **优先级**：近期。

### C-5 health 探针 token 非常量时间比较，且未纳入统一限流

- **证据**：`src/app/api/health/route.ts:26`：`if (token !== process.env.HEALTH_TOKEN)`；handler 为裸 `export async function GET`，未走 `apiHandler`（对比 `src/lib/api-handler.ts:88-120` 的限流/IP 提取/body 上限），探针命中后返回 `uptime / memory / 双库延迟 / db 状态`（`route.ts:38-63`）。
- **危害**：`!==` 走 JS 字符串短路比较，理论上可通过响应时序逐字节推断 token；无上限的探测还会持续执行 `SELECT 1` 探针并回传内部运行指标。另需注意：当 `HEALTH_TOKEN` 环境变量未配置时，`route.ts:26` 两侧均为 `undefined`，未带 token 的请求也会落入详细探针分支返回 uptime/内存/双库延迟。
- **利用前置条件**：能访问 `/api/health`；注意 proxy 白名单未放行该路径，未登录请求在部署态会被中间件 401，但 handler 自身不依赖 proxy（见 C-9 同类问题）。
- **修复方案**：用 `crypto.timingSafeEqual`（等长后比较）；包一层 `apiHandler` 或显式 `checkRateLimit`；未配置 `HEALTH_TOKEN` 时直接关闭详细探针分支。
- **工作量**：小。
- **优先级**：近期。

### C-7 schools GET 向家长暴露内部审计字段 `updatedBy`

- **证据**：`src/app/api/schools/route.ts:18-56` 查询 select 含 `updatedBy`（`:55`），家长端志愿页 `src/app/parent/volunteer/schools/page.tsx:434` 直接调用本接口；接口仅判登录（`route.ts:10-11`），不区分家长/员工角色。
- **危害**：家长可见每条学校资料最后维护人的内部用户 id，可作为内部账号枚举线索。
- **利用前置条件**：普通家长登录态。
- **修复方案**：家长视图 select 剔除 `updatedBy`（或映射为"管理员维护"文案）；该字段仅在 admin 管理端接口返回。
- **工作量**：小。
- **优先级**：近期。

### C-8 文档下载路径规范化复核缺失，缺 `nosniff`

- **证据**：`src/app/api/volunteer/documents/[id]/download/route.ts:18-29`：仅校验 `doc.fileUrl.startsWith('/volunteer/docs/')`，随后 `path.join(process.cwd(), 'public', doc.fileUrl)` 直接 `readFile`，join 后未复核结果仍在 `public/volunteer/docs/` 目录内；响应未设 `X-Content-Type-Options: nosniff`，非 xlsx 一律 `text/plain`。
- **危害**：当前 `fileUrl` 由上传接口服务端拼时间戳写入（`documents/route.ts:57`），前端不可控，目录穿越暂不可直接利用；若后续放开文件名来源，`/volunteer/docs/../../xxx` 可绕过前缀校验；缺 nosniff 时浏览器可能按内容嗅探处理上传文件。
- **利用前置条件**：需要能控制 DB 中 `fileUrl` 值（当前需 admin/teacher 上传权限）。
- **修复方案**：join 后 `resolved.startsWith(path.join(publicDir,'volunteer','docs'))` 复核；统一加 `X-Content-Type-Options: nosniff`，按扩展名映射 MIME。
- **工作量**：小。
- **优先级**：长期。

## ② 完全缺失

### C-1 WxPusher 回调缺少签名/待绑定会话/归属校验，推送通道可被伪造绑定

- **证据**：`src/app/api/wxpusher/callback/route.ts:7-17,19-35`：
  ```ts
  const uid  = body?.data?.uid  || body?.uid
  const extra = body?.data?.extra || body?.extra
  const appToken = body?.data?.appToken || body?.appToken
  if (!appToken || appToken !== process.env.WXPUSHER_APP_TOKEN) { /* 403 */ }
  // 之后直接：
  await prisma.user.update({ where: { id: extra }, data: { wxpusherUid: uid } })
  ```
  三个关键校验全部缺失：
  1. **无 HMAC/签名**：WxPusher 回调体不携带平台签名，当前唯一凭证是 `appToken`（与主动发消息共用同一共享密钥，见 `src/lib/wxpusher.ts:10-17`），且用 `!==` 非常量时间比较。
  2. **无待绑定会话/二维码校验**：`extra` 是系统用户 id，回调不校验该 id 是否对应一张未使用的绑定二维码（`createBindQrcode` 生成二维码时把 `userId` 放进 `extra`，`src/lib/wxpusher.ts:85-109`），也不校验该用户当前未绑定其他 UID。
  3. **无归属/角色校验，也不校验目标存在性与既有绑定**：登录态不参与（proxy 白名单 `src/proxy.ts:74` 放行）；`update` 全部挂 `.catch(() => null)`（`route.ts:23,30,33`），`extra` 不存在时静默成功，目标已绑定其他 UID 时直接覆盖，不做互斥检查；双库模式下 junior/senior 两库同时被写（`route.ts:27-34`）。
- **危害**：一旦 `WXPUSHER_APP_TOKEN` 泄露（日志打印、WxPusher 平台侧、配置外泄），攻击者可构造 `{data:{uid:"攻击者UID", extra:"受害者家长id", appToken:"泄露token"}}` POST 到 `/api/wxpusher/callback`，把攻击者微信绑定到受害者家长账号。此后课堂反馈、平安回家、通知类推送（`src/lib/wxpusher.ts:59-79`）全部发到攻击者微信，构成他人孩子敏感通知外泄；反向也可解绑受害者的推送通道。`extra` 为 UUID，盲绑不可枚举，但只要拿到/猜到用户 id（例如其他接口回显）即可定向利用。
- **利用前置条件**：掌握 `WXPUSHER_APP_TOKEN`；知晓目标家长用户 id；回调端点公网可达。
- **修复方案**：
  1. 新增"待绑定记录"表（或复用二维码 extra 机制）：服务端生成绑定票据（一次性、10 分钟有效、sha256 存库），回调只接受票据换取 uid，写库后作废；`extra` 不再直接作为用户 id。
  2. 绑定前校验目标用户当前 `wxpusherUid` 为空、角色为 parent（或按业务允许范围），并与 `qywxExternalUserId` 等通道互斥检查。
  3. appToken 比较改 `timingSafeEqual`；密钥与主动发消息密钥分离；回调接 `apiHandler` 限流。
  4. 绑定动作写 `activityLog`，记录 actor、uid、extra。
- **工作量**：中。
- **优先级**：立刻。

## ③ 架构性/运维层问题

### C-6 AI 对话限流为进程内内存桶，多实例/重启可绕过

- **证据**：`src/app/api/ai/chat/route.ts:28` 定义模块级 `rateLimitBuckets = new Map()`；`checkRateLimit`（`route.ts:141-172`）按 `sessionUser.id` 存分钟/日计数，进程内存保存，不写 Redis。对照公开侧 `checkRateLimit`（`src/lib/rate-limit.ts:47-70`）支持 Redis/memory 双驱动。
- **影响**：多实例部署时各实例独立计数，攻击者轮换落到不同实例即可放大额度；实例重启/扩缩容后桶清空，日额度失效。
- **建议**：把 chat 限流迁入 `checkRateLimit` Redis 驱动（租户键 `ai-chat:${userId}`），保留内存桶仅作本地兜底；日额度持久化到 Redis。
- **工作量**：中。**优先级**：近期。

### C-9 部分 handler 鉴权依赖 proxy 中间件，自身未自包含校验

- **证据**：`src/app/api/volunteer/yifenyidang/route.ts:7-15` 无 `auth()`/角色调用；`volunteer/documents/[id]/download/route.ts:11-12`、`volunteer/quota/route.ts:9-11` 等同样只做登录态判断。未登录拦截由 `src/proxy.ts:103-108` 统一完成：
  ```ts
  const session = await auth()
  if (!user) { if (apiRequest) return jsonUnauthorized('Unauthorized') ... }
  ```
  proxy 白名单（`proxy.ts:64-99`）显式放行 auth、wxpusher/callback、qywx/event、public-assistant、teacher-showcase、volunteer/schools 等。
- **影响**：handler 不感知自身访问控制，一旦 `config.matcher`（`proxy.ts:201-203`）收窄、新增部署形态绕过中间件、或 handler 被其他服务端逻辑直接 import 复用，未登录即可拉取数据。纵深防御断裂。
- **建议**：所有需登录 handler 入口至少保留 `requireAuthenticatedUser()`；公开 handler 在代码注释与路由层标注"设计公开"，便于审计区分；proxy 只做会话状态校验，不承担角色/归属裁决。
- **工作量**：中。**优先级**：近期。

### C-10 限流驱动 Redis 故障时降级为内存桶，auto 模式仅有本地 warn、无上报

- **证据**：`src/lib/rate-limit.ts:96-103` Redis 初始化失败：显式 `RATE_LIMIT_DRIVER=redis` 抛错拒绝降级（`:98-100`），`auto` 模式落 `console.warn` 后返回 null 走内存；`121-126` Redis 请求失败时 auto 模式同样回退 `memCheck`；`131-145` 驱动由配置/`REDIS_URL` 决定。降级路径无 Sentry/告警上报、无熔断阈值。
- **影响**：Redis 抖动期间（auto 模式），所有按 IP 的限流（含 public-assistant 5rpm、登录探测接口）退化为单机内存计数，多实例下等于未限流。
- **建议**：降级时上报 Sentry/告警通道；公开接口在 Redis 不可用时收紧为更保守的内存阈值；定期巡检 `RATE_LIMIT_DRIVER` 与 `REDIS_URL` 配置。
- **工作量**：小。**优先级**：近期。

### C-11 公开 AI 助手无每日总额度与调用方黑名单

- **证据**：`src/app/api/ai/public-assistant/route.ts:44-52` 仅 `checkRateLimit(clientIp, path, 'public-home-assistant', 5)`（5 次/分钟/IP）；`79-86` 每次命中真实调用 DeepSeek（maxTokens 500，25s 超时）。全流程无 DB/工具检索（`route.ts` 未 import prisma），提示注入读不到内部数据，但无日额度、无连续异常 IP 拉黑。
- **影响**：不构成数据外泄；主要是成本面：分布式换 IP 可慢速刷量持续产生大模型费用。
- **建议**：加 IP 日额度（如 100 次/天）与连续超限冷却；接入 WxPusher/IP 黑名单；`getCuratedParentFaq` 命中时优先走本地问答，减少模型调用。
- **工作量**：小。**优先级**：近期。

### C-12 公开/回调 handler 未包裹 apiHandler，缺少统一基线

- **证据**：经全量扫描（`import { apiHandler }` 与 `apiHandler(` 调用双重核对），范围内未包裹 `apiHandler` 的 handler 为：`qywx/event/route.ts`、`wxpusher/callback/route.ts`、`health/route.ts`、`public/teacher-showcase/route.ts`、`public/teacher-showcase/portrait/route.ts`、`parent/students/[id]/learning-report/route.ts`。`volunteer/schools`、`volunteer/yifenyidang` 实际已包裹 apiHandler（`volunteer/schools/route.ts:1,16`、`volunteer/yifenyidang/route.ts:2,7`），不计入本项。统一基线（`src/lib/api-handler.ts:88-120`）包含 IP 提取、全局规则限流、body 大小上限、错误归一化与 Sentry 上报；上述 handler 各自手写解析与响应。其中 `parent/students/[id]/learning-report/route.ts:58` 是登录家长可触发的 DeepSeek 调用，归属校验在位（`:33-34`），但未包 apiHandler 也无独立限流，重复调用会持续消耗大模型额度。
- **建议**：评估把回调类 handler 包入 apiHandler（回调解析逻辑保留），公开 GET 端点至少显式声明限流规则与 body 大小上限。
- **工作量**：小。**优先级**：长期。

### C-13 `/volunteer/docs/` 静态目录公开可直下，需约束上传内容

- **证据**：`src/proxy.ts:81-92` 把 `/people/`、`/teacher-portraits/`、`/avatars/`、`/volunteer/picture/`、`/volunteer/docs/` 等静态目录列入白名单，免会话直下。其中 `/volunteer/docs/` 由上传接口落盘 `public/volunteer/docs/`（`src/app/api/volunteer/documents/route.ts:57`），文件名 `时间戳-原文件名`；`/people/` 下为拼音命名的捆绑教师头像（`src/app/api/teacher-photos/route.ts:18` 同样按文件名列出）。目录不做鉴权遍历，但已知/可猜文件名可直接下载。
- **影响**：`/volunteer/docs/` 语义是"公开志愿资料"，若误传学员名单、内部反馈截图等，静态层不拦截即可外泄；`/people/` 拼音文件名可与教师姓名对应，需确认这些捆绑图为插画/默认图而非真人证件照。
- **建议**：上传时做类型/内容审查与目录隔离；内部敏感材料改走带归属校验的签名 URL 下载；定期巡检上述静态目录内容。
- **工作量**：小。**优先级**：近期。

### C-14 miniapp 空壳：小程序鉴权体系尚未落地，接入前须定方案

- **证据**：`src/app/api/miniapp/auth/login/` 目录存在但无 `route.ts`；全仓 grep `openid / wx.login / jscode2session / js_code / miniapp` 无服务端实现命中。当前小程序若有入口，只能复用 next-auth Web 会话。
- **接入前必须明确**：
  1. 登录态用 `wx.login` code → 微信 `jscode2session` 换 openid/session_key，服务端签发自有不透明 token（随机 ≥32 字节、绑定 openid+用户 id、设过期时间、可撤销），**禁止前端直接传 openid 即信**。
  2. token 与家长账号绑定关系落库；接口归属校验复用 `findParentChild` / `parentLinkedStudentWhere` 同一套谓词。
  3. token 存 Redis（带过期与刷新），泄露可踢线；限流按 openid 维度。
- **工作量**：中（接入时）。**优先级**：长期（接入前必须完成）。

## 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
|---|---|---|---|---|
| T-1 | proxy 中间件在生产是否真的拦截所有非白名单 `/api/**` 未登录请求（yifenyidang、quota、documents 等 handler 自不含鉴权） | 测试环境不带 Cookie 直接 `curl GET /api/volunteer/yifenyidang`、`/api/volunteer/quota`、`/api/volunteer/documents`，确认返回 401；并临时注释 proxy 白名单复现 handler 直连 | 若中间件未生效，公开统计/资料接口被未登录拉取 | 按 C-9 在 handler 内补自包含鉴权后复测 |
| T-2 | 生产限流是否走 Redis（而非静默 memory 降级）；public-assistant / 登录探测接口的分钟与日额度是否生效 | 查 `RATE_LIMIT_DRIVER`/`REDIS_URL` 配置与 Redis `rate:*` 键；脚本同 IP 连续打 public-assistant 6 次看第 6 次是否 429；重启进程后内存桶是否清零 | 限流失效导致大模型费用被刷、账号被批量探测 | 确认 Redis 驱动生效；按 C-10 加降级告警 |
| T-3 | wxpusher/callback 在 token 已知条件下能否把攻击者 uid 绑到指定家长 id（静态推断可行，需用测试账号实测写库行为） | 测试环境用测试 appToken 构造 `{data:{uid:testUid, extra:测试家长id, appToken:testToken}}` POST，查该家长 `wxpusherUid` 是否被改写；再验证双库模式 junior/senior 是否同时被写 | 推送通道劫持、他人孩子通知外泄 | 落地 C-1 票据化绑定前，禁止在生产启用 WxPusher 回调；实测后复测 |
| T-4 | qywx/event 重放是否被服务端拒绝（当前预期：不被拒绝，但因 handler 不改库而无实际动作） | 抓一条合法回调报文，间隔 10 分钟重放 POST，观察是否仍回 200；检查库内是否有任何状态字段变化 | 未来事件落地后重放触发状态变更 | 按 C-4 加 timestamp 窗口 + nonce 去重后复测 |
| T-5 | `AUTH_SECRET`/`NEXTAUTH_SECRET` 长度 ≥32 且两者一致；`HEALTH_TOKEN`、`WXPUSHER_APP_TOKEN`、`QYWX_CALLBACK_TOKEN/AES_KEY` 已在生产环境注入且未写入仓库/日志 | 对照 `src/lib/env-security.ts:26-32` 基线核对环境变量；grep 仓库与日志历史是否出现真实密钥 | JWT 可伪造、回调可被伪造、探针可被猜解 | 不满足则轮换全部密钥；报告内不记录任何真实密钥值 |
| T-6 | `/volunteer/docs/`、`/people/`、`/volunteer/picture/` 等免鉴权静态目录下是否存在学员名单、内部反馈、合同、真人证件照等非公开文件 | 列目录与文件名清单，抽样核对文件内容；检查上传接口历史落盘记录与 `/people/` 图片是否为真人照片 | 静态目录未鉴权导致内部材料/真人头像外泄 | 按 C-13 清理并隔离，敏感材料改签名 URL |
| T-7 | ai/chat 内存限流在多实例/重启下的绕过幅度 | 压测：多实例轮换请求观察分钟/日计数；重启后日计数是否清零 | 登录用户绕过额度刷大模型费用 | 按 C-6 迁入 Redis 后复测 |
| T-8 | teacher-showcase 分享令牌在 7 天过期后是否真的失效；篡改 teacherId/division 后 AES-GCM AuthTag 是否拒绝 | 测试环境生成令牌，过期后访问 portrait；篡改密文 1 字节再访问，确认返回 403 | 分享链接可越权访问其他教师头像 | 若可通过则检查 token 校验分支与 `AUTH_SECRET` 配置 |
| T-9 | 家长会话被改密/重置后，旧 JWT 是否在 session-ping/kick-events 链路被立即判 `kicked` | 登录后记录会话，另一处改密，再用旧 Cookie 调 `/api/auth/session-ping`，确认回 `kicked` 401 | 旧会话残留导致账号共享 | 若未失效，排查 `currentSessionToken` 同步与 JWT 刷新路径 |
