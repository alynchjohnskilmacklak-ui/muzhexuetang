# J · 新功能与通知数据通路审计（ID: J）

> 范围：通路 1 背单词 vocab；通路 9 通知 notifications / unread-counts；通路 10 家长绑定 bind / getParentChildren 可见范围。
> 仓库根：`edu-manage`（Next.js 16 App Router / React 19 / TS / Prisma 5.22 / PostgreSQL）。
> 方法：先 Grep 定位行号再局部 Read；数据库抽样走 Node + Prisma `$queryRaw` 只读脚本（`_audit20261108\j_sample.js`、`j_sample_links.js`、`j_sample_links2.js`），未执行任何写操作 / DDL / migrate。
> 判定档：连通 / 部分连通 / 孤岛；风险等级：高 / 中 / 低。

## 一、通路结论表

| # | 通路 | 写方(file:line) | 读方(file:line) | 中间转换层 | 结论 | 风险等级 | 失效时用户看到什么 |
|---|---|---|---|---|---|---|---|
| 1 | 背单词 VocabProgress / VocabSession | `src/app/api/parent/vocab/session/route.ts:92-112`（进度）、`:124-142`（会话） | `src/app/api/parent/vocab/route.ts:40-42,71-76`；`src/app/api/parent/vocab/deck/route.ts:33-36`；页面 `src/app/parent/vocab/_components/VocabHome.tsx:79-161,200-203` | `src/lib/vocab-bank.ts:116-136`（状态推导/抽题） | **孤岛** | 中 | 学生/家长只能在背单词页看到自己本次记录；教师端、周报、成长报告、学情档案、家长首页统计均不消费这些数据；记录随页面卸载后无任何下游沉淀 |
| 9 | 通知 Notification / 未读数 | 30+ 写入点（见二、通路 9 清单）；统一封装 `src/lib/notifications.ts:55` `createNotification`、`:59` `createManyNotifications` | 列表 `src/app/parent/notifications/page.tsx:20-29`；未读数 `src/app/api/parent/unread-counts/route.ts:40-44`、`src/app/api/parent/notifications/unread-count/route.ts:16`；详情 `src/app/parent/notifications/[id]/page.tsx:113-119` | `src/lib/notification-read-state.ts:9-18`（未读 where / 已写数据）；`src/lib/parent-unread.ts:28,43`（聚合未读） | **部分连通** | 中 | 6 条 admin「leave」通知落地页 `/leave-requests` 不存在，点击 404；2 条 `wxpusher_feedback` 通知无 href/relatedId，只能看标题内容；15 条 `PAPER_PUBLISHED` 的 `link:/parent/grades` 指向不存在路由（当前被 href 兜底覆盖，属潜在死链） |
| 10 | 家长绑定 / 可见范围 | 绑定变更 `src/app/api/admin/students/[id]/family/route.ts:47-50`（换绑）、`:90-93`（解绑置空） | 列表 `src/app/api/parent/children/route.ts:16`；详情/统计路由 12 个走 `getParentChildren+findParentChild`；其余 15 个路由直接用 visibility where | `src/lib/parent-children.ts:6-58`；`src/lib/business-visibility.ts:84-119`；`src/lib/auth/guards.ts:123-129`；`src/lib/classroom-feedback/access.ts:193-201` | **部分连通** | 中 | 解绑后旧孩子的通知仍留在通知中心（列表只按 userId 过滤，不复核当前绑定）；成长档案/归档走 history where 不排 INACTIVE，与首页/今日面板的活跃口径不一致；无唯一判据函数，5 套并行实现存在口径分裂风险 |

## 二、逐条证据

### 通路 1：背单词 VocabProgress / VocabSession

#### 写方（① 写了哪些字段）

- **VocabProgress（学生 × 单词 掌握状态）**：`src/app/api/parent/vocab/session/route.ts:92-112`
  - 已有记录走 `update`：`status`（LEARNING / MASTERED / WRONG）、`correctCount`、`wrongCount`、`lastResult`（CORRECT/WRONG）、`lastAt`；无记录走 `create`，同字段 + `studentId`、`wordId`。
  - 证据片段：
    ```ts
    // session/route.ts:92-101
    await tx.vocabProgress.update({
      where: { id: previous.id },
      data: { status: next.status, correctCount: next.correctCount,
              wrongCount: next.wrongCount, lastResult: next.lastResult, lastAt: new Date() },
    })
    ```
- **VocabSession（每次练习留档）**：`src/app/api/parent/vocab/session/route.ts:124-142`
  - 写入 `studentId`、`grade`、`volume`（硬编码「上册」）、`unit`、`total`、`correct`、`wrongIds[]`、`answers Json`。
  - **无连续天数 / streak 字段**：schema `prisma/schema.prisma:2340-2371` 两模型均无 streak/date-streak 列；全仓 Grep `streak|连续.*天|consecutive` 仅命中无关模块，vocab 链路无连续天数计算。
- **写入前置权限**：`session/route.ts:58-60` 先 `getParentChildren` + `findParentChild` 校验归属，非法 studentId 返回 403。
- **DB 落库抽样**（`j_sample.js` 第 1 段）：VocabProgress **16 行 / 1 名学生**（马子墨，ACTIVE，parentId=parentUserId 同账号），MASTERED 5、WRONG 11；VocabSession **2 行 / 1 名学生**，2 条均 finished；最近时间 `2026-11-05T13:21:52Z`。属单人测试数据规模。

#### 读方（② 有没有报表 / 学情档案 / 成长报告 / 家长端统计读它）

- **读方 A · 本页目录/统计**：`src/app/api/parent/vocab/route.ts:40-42` 读 `vocabProgress` 算 stats；`:71-76` 读 `vocabSession` 取最近 10 次记录；`src/app/parent/vocab/_components/VocabHome.tsx:79-81` 取 `stats.total/mastered/learning/wrong`，`:130-161` 渲染已掌握/学习中/错词卡片，`:200-203` 渲染 `recentSessions` 列表。
- **读方 B · 本页抽题池**：`src/app/api/parent/vocab/deck/route.ts:33-36` 读 `vocabProgress` 过滤 WRONG/LEARNING 复习池与未掌握池。
- **教师端：零读方**。全仓 Grep `vocab|单词` 在 `src/app/teacher/**` 命中 0 个文件；`src/app/api/teacher/**` 无 vocab 模型引用。
- **报表 / 成长报告 / 学情档案：零接入**。
  - `src/app/api/reports/**` Grep `vocab` 命中 0；
  - 成长报告 `src/app/api/parent/students/[id]/growth-report/handler.ts:31` 调 `getStudentGrowthArchive`，学情档案 `src/app/api/parent/students/[id]/learning-report/route.ts:36-37` 调 `getStudentProfile`；`src/lib/student-profile.ts` 聚合的表为 Student / ExamPaper / GradeRecord / WeaknessRecord / LearningGoal / AchievementBadge / ClassroomFeedback / PerformancePost / Attendance / StageSummary，**不含 VocabProgress / VocabSession**；`src/lib/student-growth/archive.ts` 同路径亦无 vocab 表。
  - 家长首页聚合 `src/lib/parent-dashboard.ts:156-171` 只查 Notification / PerformancePost，无 vocab。
  - `src/lib` 下仅 `vocab-bank.ts` 与其测试文件出现 vocab（词表/状态推导工具），无任何聚合消费。
- **③ 教师端可见性**：不可见。教师侧没有任何接口、页面、报表读取背单词进度或会话记录。
- **④ 是否进聚合（周报 / 成长报告 / 学情评分）**：未进入。`src/app/api/parent/weekly-report/route.ts:25-26` 只取 getParentChildren 后按考勤/作业/反馈聚合；VocabProgress 未被 join。

#### 转换层

- 有，`src/lib/vocab-bank.ts`：`deriveStatus`（:116）、`applyVocabResult`（:122，按 `MASTERED_THRESHOLD=2` 次正确推导掌握）、`buildVocabDeck`（:138）、词表过滤 `filterVocabCumulative`（:52）。转换层只服务本页出题与状态展示。

#### 口径分裂

- 有一处小分裂：进度表 `VocabProgress.status` 三态 `LEARNING/MASTERED/WRONG`（schema:2344），目录接口把未作答词补计为 LEARNING（`vocab/route.ts:57-59`）；会话表只存本次 correct/wrong，不回写掌握度。两表之间没有跨表对账。
- 会话 `volume` 硬编码「上册」（`session/route.ts:129`），与进度表按词表单元匹配，下册词表接入后需复核。

#### 判定：**孤岛**

- 理由：写方仅家长背单词页自身；唯一读方是它自己的页面回显（统计卡片 + 最近练习记录 + 本页抽题池），无任何跨页面、跨角色、跨报表的下游消费。按 SPEC2 标准「唯一读方是它自己的详情页 → 孤岛」。页内统计卡片属于自回显，不构成下游消费；家长端其他页面（首页/档案/周报）未消费。
- 备注：与任务提示中「家长端有统计卡片消费则判部分连通」对照——本卡片与写方同处 `/parent/vocab` 单页，未跨场景，仍按孤岛计；若后续把掌握度接入家长首页卡片或成长报告，可升为部分连通。

#### 失效现象

- 学生做完一组背单词后，掌握度/错题只在 `/parent/vocab` 页面刷新时可见；换设备或次日打开家长端首页、成长档案、教师端学生页，看不到任何背单词痕迹。
- 教师无法据此安排针对性练习；周报/成长报告不出现单词维度。

#### 确定性：[已核实]（代码全仓 Grep + 数据库抽样双证）

---

### 通路 9：通知 Notification / unread-counts

#### 通知类型枚举（① 类型清单）

- 模型字段：`type String @default("INFO")`（`schema.prisma:824`），无 DB 枚举约束，为自由字符串；前端 `src/app/parent/notifications/client.tsx` 内有 `TYPE_META` 映射表兜底图标/文案。
- 代码中出现的写入类型与接收方（按写入点）：

| 类型 | 接收方 | 写入点 file:line | href / link | 落地页核对 | DB 行数（抽样） |
|---|---|---|---|---|---|
| CLASSROOM_FEEDBACK | parent | `src/app/api/feedback/route.ts:645`；`src/lib/classroom-feedback/create.ts:121` | `/parent/class-feedback/[id]` | `/parent/class-feedback/[id]` 页面存在 ✓ | 10236 |
| CLASS_ENROLLMENT | parent | `src/app/api/class-groups/[id]/enrollments/route.ts:240-241` | `/parent/schedule` | `/parent/schedule` 存在 ✓ | 102 |
| CLASS_START | parent | `src/app/api/class-groups/[id]/start/route.ts:61` | `/parent/schedule` | ✓ | 79 |
| PAPER_PUBLISHED | parent | `src/app/api/teacher/papers/route.ts:80` | href `/parent/archive/[id]`；link `/parent/grades` | href 落地 `/parent/archive/[id]` ✓；**link `/parent/grades` 路由不存在**（无 `src/app/parent/grades/page.tsx`）✗ | 15 |
| PARENT_MESSAGE | teacher | `src/lib/parent-message-notifications.ts:32` | `/teacher/messages` | ✓（`src/app/teacher/messages/page.tsx`） | 31 |
| PARENT_MESSAGE_REPLY | parent | `src/lib/parent-message-notifications.ts:59` | `/parent/messages` | ✓ | 14 |
| SCHEDULE_CHANGE | parent | `src/lib/course-change-events.ts:49` | `/parent/schedule` | ✓ | 14 |
| PARENT_MESSAGE_REMINDER | teacher | `src/app/api/messages/[id]/remind/route.ts:53,72` | `/teacher/messages` | ✓ | 13 |
| leave | admin | `src/app/api/parent/leave/route.ts:149-150` | `/leave-requests` | **无页面路由**（仅 API `src/app/api/leave-requests/**`，无 `page.tsx`）✗ | 6 |
| STUDY_HALL_HOMEWORK | parent | `src/app/api/study-hall/route.ts:316` | `/parent/study-hall?date=&entryId=`；link `/parent/study-hall` | ✓ | 5 |
| FEEDBACK_REVIEW | admin | `src/app/api/parent/classroom-feedback/[id]/evaluation/route.ts:139` | `/parent-feedback-reviews?evaluationId=` | ✓（`src/app/(main)/parent-feedback-reviews/page.tsx`） | 4 |
| leave | parent | `src/app/api/leave-requests/[id]/route.ts:67` | `/parent/leave` | ✓ | 2 |
| wxpusher_feedback | parent | `src/app/api/notifications/route.ts:128-136` | **href/link/relatedId 均未传** | 无业务落地页，仅详情页回显标题内容 ⚠ | 2 |
| leave | teacher | `src/app/api/parent/leave/route.ts:165-166` | `/teacher/leave` | ✓ | 2 |
| ATTENDANCE_ABSENCE | parent | `src/lib/attendance-alerts.ts:30` | `/parent/schedule` | ✓（DB 暂无行） | 0 |
| LOW_HOURS_ALERT | parent | `src/lib/attendance-alerts.ts:51` | `/parent/schedule` | ✓（DB 暂无行） | 0 |
| GRADE_RECORD | parent | `src/app/api/grade-records/route.ts:187,204`；`src/app/api/grade-records/[id]/push-to-parent/route.ts:39` | 前者 `/parent/archive` ✓；**push-to-parent `href:'/parent'`**（`push-to-parent/route.ts:44`）——`/parent` 根无 page.tsx ✗（DB 暂无行，潜在死链） | 部分 ✓ | 0 |
| PERFORMANCE_UPDATE | parent | `src/app/api/performance/route.ts:200` | `/parent/archive?feedbackId=` | ✓（DB 暂无行） | 0 |
| STAGE_SUMMARY | parent | `src/app/api/teacher/stage-summary/route.ts:174` | `/parent/archive` | ✓（DB 暂无行） | 0 |
| HOMEWORK_REVIEWED | parent | `src/app/api/teacher/homework/[id]/review/route.ts:19` | `/parent/homework` | ✓（DB 暂无行） | 0 |
| HOMEWORK_ASSIGNED | parent | `src/app/api/teacher/homework/route.ts:111,117` | `/parent/homework` | ✓（DB 暂无行） | 0 |
| EXAM_PAPER | parent | `src/app/api/exam-papers/[id]/publish/route.ts:38` | href `/parent/archive/[id]` ✓；link `/parent/grades` ✗ | 部分 ✓（DB 暂无行） | 0 |
| FEE_OVERDUE | parent / admin | `src/lib/overdue-fee-alerts.ts:57,63` | parent `/parent/fees` ✓；admin `/fees?studentId=` ✓ | ✓（DB 暂无行） | 0 |
| CLASSROOM_PICK | parent | `src/app/api/teacher/interaction/pick/route.ts:148` | `/parent/interaction` 或 `/parent/class-feedback/[id]` | ✓（DB 暂无行） | 0 |
| INFO | parent | `src/app/api/parent-communications/route.ts:298` | `/parent/notifications` | ✓（DB 暂无行） | 0 |
| WEEKLY_DIGEST | parent | `src/app/api/cron/weekly-digest/route.ts:54-57` | `/parent/notifications` | ✓（DB 暂无行） | 0 |
| HOMEWORK_SUBMITTED | teacher | `src/app/api/parent/homework/route.ts:50` | `/teacher/homework` | ✓（`src/app/(main)/teacher/homework/page.tsx`）（DB 暂无行） | 0 |
| HOMEWORK_HELP_REQUEST | teacher | `src/app/api/parent/classroom-feedback/[id]/homework-checkin/route.ts:92` | `/teacher/feedback` | ✓（DB 暂无行） | 0 |
| PARENT_COMMENT | teacher | `src/app/api/performance/[id]/comment/route.ts:73` | `/teacher/students` | ✓（DB 暂无行） | 0 |
| RENEWAL_TERM_END | admin | `src/lib/renewal-term-alerts.ts:57` | `/renewals?termId=` | ✓（DB 暂无行） | 0 |

#### ② 每种类型是否都有消费者（落地页核对结论）

- **连通（落地页存在且被详情/列表消费）**：CLASSROOM_FEEDBACK、CLASS_ENROLLMENT、CLASS_START、PARENT_MESSAGE、PARENT_MESSAGE_REPLY、SCHEDULE_CHANGE、PARENT_MESSAGE_REMINDER、leave(parent)、leave(teacher)、STUDY_HALL_HOMEWORK、FEEDBACK_REVIEW、ATTENDANCE_ABSENCE、LOW_HOURS_ALERT、PERFORMANCE_UPDATE、STAGE_SUMMARY、HOMEWORK_REVIEWED、HOMEWORK_ASSIGNED、FEE_OVERDUE、CLASSROOM_PICK、INFO、WEEKLY_DIGEST、HOMEWORK_SUBMITTED、HOMEWORK_HELP_REQUEST、PARENT_COMMENT、RENEWAL_TERM_END。
- **部分连通**：PAPER_PUBLISHED、EXAM_PAPER、GRADE_RECORD —— href 兜底到存在路由，但 `link` 字段残留不存在的 `/parent/grades` 或 `/parent`；当前列表/详情跳转均优先取 href（`src/app/parent/notifications/client.tsx:419-423`、`src/app/parent/notifications/[id]/client.tsx:154` `href || link`），故线上不可达，属潜在死链。
- **死通知**：
  1. `leave`（admin，6 行）：href `/leave-requests` 无页面路由，点击 404。写入点 `src/app/api/parent/leave/route.ts:149-150`。
  2. `wxpusher_feedback`（2 行）：无 href/link/relatedId（`src/app/api/notifications/route.ts:128-136` 只传 userId/title/content/type/studentId/senderId/pushStatus）；详情页 switch 无此类型分支，只渲染标题正文，无法跳转到对应课堂反馈。

#### ③ 死通知清单

| 类型 | 写入点 file:line | 缺失落地页 | DB 规模 | 性质 |
|---|---|---|---|---|
| leave（admin 接收） | `src/app/api/parent/leave/route.ts:149-150` | `/leave-requests` 页面（全仓仅 API `src/app/api/leave-requests/route.ts`、`[id]/route.ts`，无 page.tsx） | 6 行实锤 | 死链接 |
| wxpusher_feedback | `src/app/api/notifications/route.ts:128` | 无 relatedId/href；无法定位对应 ClassroomFeedback | 2 行实锤 | 半死（仅可看文字） |
| PAPER_PUBLISHED / EXAM_PAPER 的 link 字段 | `src/app/api/teacher/papers/route.ts:80`；`src/app/api/exam-papers/[id]/publish/route.ts:38` | `/parent/grades` 页面不存在（`src/app/parent/grades` 目录缺失） | 15 行 link 残留，href 已覆盖 | 潜在死链 |
| GRADE_RECORD（push-to-parent） | `src/app/api/grade-records/[id]/push-to-parent/route.ts:44` | `/parent` 根无 page.tsx，且无中间件/布局级重定向到 `/parent/dashboard` | DB 0 行 | 潜在死链 |

#### ④ 未读数 where 条件与已读回写一致性

- **未读数统计 where**：
  - `src/app/api/parent/unread-counts/route.ts:42-44`：`userId + read:false + visibleNotificationWhere`（`status:'ACTIVE', deletedAt:null`，`src/lib/business-visibility.ts:69-72`）。
  - `src/app/api/parent/notifications/unread-count/route.ts:16`：同口径 `userId + read:false + visibleNotificationWhere`。
  - 列表未读数 `src/app/parent/notifications/page.tsx:27-29`：同口径。
  - 关联内容未读（试卷/成长帖/反馈/消息）另走 `parentVisibleExamPaperWhere` / `parentVisiblePerformancePostWhere` / `parent-unread.ts:28,43` 独立统计，`unread-counts/route.ts:30-36`。
- **已读回写路径**：
  - 单条已读 `src/app/api/parent/notifications/mark-read/route.ts:46-49`：where 含 `id + userId + status in ACTIVE/ARCHIVED + deletedAt:null + read:false`；全量/分类已读 `:44`、`:52-60` 用 `unreadNotificationWhere + visibleNotificationWhere`。
  - 全部已读 `src/app/api/parent/notifications/read-all/route.ts:19`：`userId + unreadNotificationWhere + visibleNotificationWhere`，回写 `notificationReadData()`。
  - 详情页打开即已读 `src/app/parent/notifications/[id]/page.tsx:113-119`：where 同口径，data `{ read:true, readAt }`。
  - 统一已写数据 `src/lib/notification-read-state.ts:13-18`：`notificationReadData()` 同时写 `read:true` 与 `readAt`，计数字段 `read` 与时间戳 `readAt` 在同一 helper 内产出。
- **DB 抽样对账**（`j_sample.js` 第 4 段）：总 10520 行，未读 8359、已读 2166、软删 5；**`read=false 但 readAt 非空` 0 行**（不存在"未读却已有已读时间"）；**`read=true 但 readAt 为空` 758 行**，全部集中在 2026-07-08 ~ 2026-09-12 的 CLASSROOM_FEEDBACK 736 / CLASS_ENROLLMENT 10 / CLASS_START 10 / PAPER_PUBLISHED 2（第 4b 段），属 helper 上线前的历史脏数据；当前所有写路径均经 `notificationReadData()` 同步写两字段，未发现"点开了但未读数不减"的现行代码路径。
- **口径结论**：计数用 `read` 布尔，已读回写同时维护 `readAt`；现行代码 where 与回写范围一致。758 行历史缺 `readAt` 不影响未读计数（`read=true` 不计入未读），仅影响"已读时间"展示为空。

#### 口径分裂

- 列表/计数按 `userId` 聚合，不复核通知 `studentId` 是否仍在当前绑定集合内（见通路 10 残留风险）。
- `type` 为自由字符串，前端 `TYPE_META` 未覆盖全部类型（如 ATTENDANCE_ABSENCE、CLASS_ENROLLMENT、SCHEDULE_CHANGE、leave、wxpusher_feedback 等），未映射类型回退到 INFO 图标与"通知"文案，属展示口径分裂，不影响跳转。

#### 判定：**部分连通**

- 主体闭环：写方 → Notification 表 → 列表/未读数/详情页 → 落地页，主流课堂反馈/排课/消息类通知连通且已读口径一致；存在 2 类实锤死通知 + 3 处潜在死链 + 历史已读时间脏数据。

#### 失效现象

- admin 在请假管理视角点"请假通知"跳到 `/leave-requests` 404；家长点 `wxpusher_feedback` 通知只能看到标题正文，进不到对应反馈详情；残留 `/parent/grades` 链接若未来 href 为空会 404。

#### 确定性：[已核实]（代码路径 + DB 类型/链接/已读口径抽样双证）；`/parent` 根路由是否被布局重定向到 dashboard 为 [待验证]（无 middleware.ts，`src/app/parent` 下未见 page.tsx 与重定向逻辑）。

---

### 通路 10：家长绑定 bind / getParentChildren 可见范围

#### ① 可见范围判据函数：没有唯一判据，存在 5 套并行实现

| # | 实现 | file:line | where 口径 | 用途 |
|---|---|---|---|---|
| 1 | `getParentChildren(prisma, parentId)` | `src/lib/parent-children.ts:6-35` | `parentStudentHistoryWhere`（OR parentId/parentUserId + deletedAt:null，**不排 INACTIVE**），查回后在内存过滤 `status!=='INACTIVE'`，按 `identityId` 分组，返回 `recordIds[]`（含同一身份历史记录 ID） | 页面列表/详情选择入口 |
| 2 | `parentLinkedStudentWhere(parentId)` | `src/lib/business-visibility.ts:84-90` | OR parentId/parentUserId + `status!=='INACTIVE'` + deletedAt:null | 行级 where 直接被各路由复用 |
| 3 | `getParentStudentIds(ctx, prisma)` | `src/lib/auth/guards.ts:123-129` | 封装 #2，返回 ID 数组 | homework 等路由 |
| 4 | `parentFeedbackStudentIds(prisma, parentId)` | `src/lib/classroom-feedback/access.ts:193-201` | `parentStudentHistoryWhere`（**不排 INACTIVE**），扁平 ID 列表 | 成长档案 / 反馈归档鉴权 |
| 5 | `parentStudentHistoryWhere` 直用 | `src/app/api/parent/students/[id]/archive/route.ts:20` | 同 #1 历史口径 | 学生归档鉴权 |

**走统一入口（#1 `getParentChildren` + `findParentChild`）的路由（12 个）**：
`children/route.ts:16`、`vocab/route.ts:30-31`、`vocab/deck/route.ts:26-27`、`vocab/session/route.ts:58-59`、`leave/route.ts:51`、`practice-bank/route.ts:25-26`、`practice-results/route.ts:108-109,219-220`、`profile/route.ts:15,19`、`hours-leaderboard/route.ts:39,50`、`hour-records/route.ts:43-44`、`weekly-report/route.ts:25-26`、`students/[id]/learning-report/route.ts:36-37`。

**绕开 #1、自己组装 where 的路由（逐个列 file:line）**：

| 路由 | file:line | 用的判据 | 备注 |
|---|---|---|---|
| `parent/today/route.ts` | `:31` `parentLinkedStudentWhere`；`:71,86` `parentActiveEnrollmentWhere` | #2/#3 活跃口径 | 考勤/课次/今日通知取数 |
| `parent/study-hall/route.ts` | `:11` `parentLinkedStudentWhere`；`:59` 关联 where | #2 | 自习记录归属校验 |
| `parent/interaction/route.ts` | `:22` `parentLinkedStudentWhere` | #2 | 课堂互动记录 |
| `parent/meal-choice/route.ts` | `:33` `parentLinkedStudentWhere`；`:72-73` **内联 `isOwner = student?.parentId===userId \|\| student?.parentUserId===userId`** | #2 + 内联 | POST 内联校验未排 INACTIVE / deletedAt，口径弱于 #2 |
| `parent/unread-counts/route.ts` | `:22` `parentLinkedStudentWhere`；`:30,36` 关联内容 where | #2 | 未读聚合 |
| `parent/unread-counts/read-all/route.ts` | `:23` `parentLinkedStudentWhere` | #2 | 全部已读 |
| `parent/hour-records/route.ts` | `:24` `parentLinkedStudentWhere`；`:30,60,94` `parentActiveEnrollmentWhere`/#2 | #2/#3 | 课时记录 |
| `parent/classroom-feedback/[id]/practice-replies/route.ts` | `:22` `parentLinkedStudentWhere` | #2 | 练习回复 |
| `parent/classroom-feedback/[id]/evaluation/route.ts` | `:34` `parentLinkedStudentWhere`；`:41,66,105` 回执联合键 `feedbackId_parentUserId` | #2 + 回执归属 | 回执级校验，非学生绑定 |
| `parent/classroom-feedback/[id]/homework-checkin/route.ts` | `:15` `parentLinkedStudentWhere`；`:41,73,77` 回执联合键 | #2 + 回执归属 | 同上 |
| `parent/homework/route.ts` | `:10,35` `getParentStudentIds`；`:17,47,48` `parentUserId` 回执归属 | #3 | 作业提交 |
| `parent/materials/lesson-previews/route.ts` | `:17` `parentVisibleLessonWhere`；`:33` `parentActiveEnrollmentWhere` | 课程组可见口径 | 课件预览 |
| `parent/students/[id]/archive/route.ts` | `:20` `parentStudentHistoryWhere` 直用 | #5 | 学生归档 |
| `parent/students/[id]/growth-report/handler.ts` | `:31,43` → `getStudentGrowthArchive` → `access.ts:197-201` #4 | #4 | 成长报告 |
| `parent/materials/route.ts` | `:24` `parentVisibleMaterialWhere()` | 目录可见口径（年级/科目级，非学生专属） | 课件目录 |

#### ② 与 Attendance / TeacherSalaryTransaction 可见范围一致性；家长是否可读工资表

- **Attendance 口径**：`parent/today/route.ts:94-101` 考勤 where = `studentId in studentIds`（studentIds 来自 `parentLinkedStudentWhere`，:31,:53）+ `createdAt` 当日 + `deletedAt:null`；归档链路 `students/[id]/archive` 经 `getStudentArchive(..., parentStudentIds)` 鉴权。考勤随绑定学生集合过滤，解绑后不可见。
- **TeacherSalaryTransaction（工资表）**：
  - `src/app/api/parent/**` 全量 Grep `teacherSalaryTransaction|salary|Salary|工资|课时费|compensation` **0 命中**；`src/app/parent/**` 页面同 Grep **0 命中**。
  - 工资表读取方仅在 admin / teacher 侧：`src/app/api/admin/salary/route.ts:47,276`、`admin/salary/export/route.ts:71`、`src/app/api/teacher/salary/route.ts:20`、`src/app/api/teacher/trends/route.ts:33`、`src/lib/teacher-dashboard.ts:582`、`src/lib/teacher-salary.ts:143,176,455,543,578,613`、`src/lib/salary-settlement.ts:39,53,58`、`src/lib/intensive-settlement.ts:82,88,120,133,147`、`src/lib/study-hall/rewards.ts:56,79`、数据清理 `data-correction/*`。这些 lib 均未被 parent 路由 import。
  - DB 抽样（`j_sample.js` 第 7 段）：TeacherSalaryTransaction 2191 行关联 teacher 角色账号，5003 行 teacherId 关联为空（历史行），**0 行关联 parent 角色**。
  - **结论：家长端无任何接口/页面/共享 lib 能读到工资表，隔离成立。**
- **Attendance 与绑定口径一致性**：今日面板考勤用 #2 活跃口径；归档/成长档案用 #4/#5 历史口径（见口径分裂），存在 INACTIVE 记录是否可见的差异。

#### ③ 多孩子：列表与详情是否同一集合

- DB 抽样（`j_sample.js` 第 6 段）：活跃绑定下，1 孩家长 104、2 孩家长 25、4 孩家长 1。
- 列表：`parent/children/route.ts:16` → `getParentChildren`，按 identityId 分组，`recordIds` 含同身份历史记录；`resolveParentChildRequest`（`src/lib/parent-child-selection.ts:35-45`）支持 URL ID / cookie 记忆 / 首个兜底，非法显式 ID 标 `invalidChild` 不静默放行。
- 详情：走 #1 的路由用 `findParentChild(children, studentId)` 匹配 `recordIds.includes(requested)`（`src/lib/parent-children.ts:37-41`），与列表同一集合；不存在"列表只显示 1 个、详情翻出第 2 个"的情况。
- **口径差异点**：成长报告（#4）、学生归档（#5）直接按 history where 取扁平 ID，未做 #1 的 INACTIVE 身份过滤；若某身份下存在 INACTIVE 历史记录，详情/归档可能识别到列表已隐藏的记录 ID。属部分连通级口径分裂，未发现越权跨家长（仍限定 OR parentId/parentUserId）。

#### ④ 解绑 / 换绑后历史通知与历史考勤的残留可见性（越权风险）

- **解绑动作**：`src/app/api/admin/students/[id]/family/route.ts:89-103`，仅 `student.update({ parentId:null, parentUserId:null })` + ActivityLog，**不清理** Notification、回执、考勤、作业提交等历史行。
- **通知残留风险（代码层实锤）**：
  - 通知列表 `src/app/parent/notifications/page.tsx:20-23` where = `userId + visibleNotificationWhere`，**不含 studentId 绑定复核**；家长首页聚合 `src/lib/parent-dashboard.ts:156-157` 同口径。解绑后，指向旧孩子的历史通知标题/内容仍会出现在通知中心与首页提醒里。
  - 对照：今日面板通知 `parent/today/route.ts:102-111` 带了 `studentId in studentIds` 过滤；通知中心列表未带，两处口径不一致。
  - 通知内关联内容（反馈/试卷/成长帖）点开时由 mark-read / 详情链路的 `parentVisible*Where` 复核绑定，旧绑定内容关联数据会被挡，但通知标题正文残留。
- **考勤残留**：今日面板与归档均按 `studentId in 绑定学生集合` 过滤，解绑后考勤行不再可见（`today/route.ts:94-101`；归档经 parentStudentIds 鉴权）。
- **DB 现状**：`j_sample.js` 第 5 段——当前 DB 中 `Notification.studentId` 指向已解绑学生的残留行为 **0 行**（现网尚未发生解绑后留通知的实例），风险为代码层潜在越权/信息残留，非现网已发生。
- **换绑**：`family/route.ts:47-50` updateMany 覆盖 parentId/parentUserId；换绑前写给旧家长的通知仍挂旧家长 userId，不会串到新家长；新家长只能看到换绑后写入的通知。

#### 口径分裂汇总

1. 活跃 vs 历史：#2/#3 排 INACTIVE；#1/#4/#5 不排 INACTIVE（#1 内存补过滤身份，#4/#5 未补）。
2. 列表通知不复核学生绑定，今日面板复核；回执级表（FeedbackParentReadReceipt 等）按 `parentUserId` 归属，解绑后回执行仍挂原家长账号。
3. `parentLinkedStudentWhere` 双字段 OR（`parentId` 或 `parentUserId`），与 family 换绑时 `parentId = current.parentId || parentUserId`（`family/route.ts:49`）的回填方向需保持一致。

#### 判定：**部分连通**

- 主流绑定闭环：登录家长 → 统一入口取孩子集合 → 详情/考勤/作业/材料鉴权；工资表隔离；多孩子列表/详情同集合。但存在 5 套并行判据、INACTIVE 口径分裂、解绑后通知标题正文残留三项未闭环问题。

#### 失效现象

- 解绑某孩子后，家长通知中心仍能看到该孩子旧通知的标题与内容（点进关联内容打不开）；成长档案/归档可能识别到列表已隐藏的 INACTIVE 历史记录；不同页面孩子筛选口径偶有不一致。

#### 确定性：[已核实] 代码 where 逐路由核对 + DB 抽样；解绑残留现网实例 0（[已核实] 当前无残留行），风险定级为代码层潜在。

## 三、孤岛清单（本片范围内）

| # | 表/功能 | 谁写 | 有没有下游消费方 | 是不是"设计了但没接" | 建议 |
|---|---|---|---|---|---|
| 1 | VocabProgress / VocabSession（背单词） | 家长端背单词练习提交 `vocab/session/route.ts:92-142` | 仅 `/parent/vocab` 本页回显（目录统计 + 最近记录 + 抽题池）；教师端、周报、成长报告、学情档案、家长首页统计零消费 | **是**：表结构、状态机（LEARNING/MASTERED/WRONG）、错题池都已设计，但未接入任何学情聚合 | 拍板后择一接入：① 家长首页/成长报告加"单词掌握度"卡片；② 教师端学生学情页展示错题与掌握率；③ 周报纳入单词维度。接入前注意补连续天数/最近练习时间字段 |
| 2 | wxpusher_feedback 通知 | `api/notifications/route.ts:128` | 仅通知列表/详情文字回显，无 relatedId 无法跳转反馈详情 | 部分是：推送通道（wxpusher/企微）是主链路，站内通知缺少关联落点 | 写入时回填 `relatedType:'CLASSROOM_FEEDBACK'` + `relatedId`，复用 CLASSROOM_FEEDBACK 的落地跳转 |
| 3 | leave（admin）通知 | `parent/leave/route.ts:149-150` | admin 通知中心可见，但 `/leave-requests` 页面不存在 | 是：落地页漏建 | 补 admin 请假审核页面路由，或把 href 改到现有审核入口 |

> 本片范围内其余通路（考勤、作业、反馈、消息、课时、材料、成长帖、试卷、自习）均有对应页面/接口消费，不计孤岛。

## 四、需要用户拍板的业务口径问题

1. **背单词数据要不要进学情聚合？**
   - 口径 A（接入成长报告/周报/教师端）：家长与教师能看到单词掌握趋势；需要补跨表聚合接口与教师端展示，且要定义"掌握度"是否计入学情评分。
   - 口径 B（维持孤岛）：背单词仅作为家长端练习工具，数据不进档案；现状如此，但错题/掌握记录长期沉淀在两张表里无人消费。
2. **解绑后历史通知是否保留可见？**
   - 口径 A（保留）：家长能看到与孩子的历史沟通记录；需在通知中心明确"已解绑孩子"分组/标识，避免误认为当前在读。
   - 口径 B（解绑即归档/隐藏）：列表 where 增加 `studentId in 当前绑定集合` 复核，旧孩子通知移入归档；需评估家长申诉历史沟通记录的诉求。
3. **INACTIVE 学生记录在成长档案/归档中是否可见？**
   - 口径 A（可见历史身份记录）：沿用 history where，成长档案保留跨学期痕迹；需在前端标注"已离校/历史身份"。
   - 口径 B（与列表一致隐藏）：#4/#5 也补 INACTIVE 过滤，统一走 `parentLinkedStudentWhere` 口径。
4. **`/parent/grades` 死链是补页面还是改链接？**
   - 口径 A：补家长端成绩页（ `/parent/grades`）；口径 B：把 PAPER_PUBLISHED / EXAM_PAPER 的 `link` 字段统一改为 `/parent/archive`，删除无效路由引用。
5. **连续天数（streak）是否要做？** schema 与代码目前均无该字段；若产品需要"连续打卡 N 天"，需先加字段与回写规则，再决定是否进成长报告。

## 五、已确认正常

1. **工资表隔离**：家长端 API 与页面零工资表引用；TeacherSalaryTransaction 读取方全部在 admin/teacher 侧 lib 与路由；DB 抽样 0 行 parent 角色关联。证据：`src/app/api/parent/**` Grep 0 命中；`src/lib/teacher-salary.ts:143` 等仅教师侧调用；`j_sample.js` 第 7 段。
2. **未读数与已读回写口径现行一致**：计数 where（`read:false + ACTIVE + deletedAt:null`）与四类已读路径同范围；`notificationReadData()` 同步写 `read/readAt`；DB 0 行"未读却有 readAt"。证据：`notification-read-state.ts:9-18`；`unread-counts/route.ts:42`；`read-all/route.ts:19`；`j_sample.js` 第 4 段。
3. **多孩子列表/详情同集合**：12 个路由走 `getParentChildren + findParentChild(recordIds)`，URL 非法 ID 不静默兜底到首个孩子；DB 25 个两孩家长、1 个四孩家长。证据：`parent-children.ts:37-41`；`parent-child-selection.ts:35-45`；`j_sample.js` 第 6 段。
4. **主流通知落地页存在**：课堂反馈、排课、消息、作业、试卷归档、自习、考勤提醒、课时预警、续费提醒等 25 类通知的 href 均能解析到真实页面路由（路由目录逐个 Test-Path 核对）。
5. **考勤随绑定过滤**：今日面板考勤按绑定学生集合 + deletedAt:null 过滤，解绑后不可见。证据：`today/route.ts:31,94-101`。

## 六、未能确认 / 需运行时验证

1. `/parent` 根 URL 是否被布局/中间件重定向到 `/parent/dashboard`：代码中无 `middleware.ts`，`src/app/parent` 根无 page.tsx；`GRADE_RECORD` push-to-parent 的 `href:'/parent'`（`push-to-parent/route.ts:44`）线上行为需 dev 环境实测（现 DB 无该类型行）。
2. 758 行 `read=true 无 readAt` 历史脏数据是否需要回填：本次只读未修复；回填脚本需另行评审，避免改动已读状态。
3. `wxpusher_feedback` 2 行通知对应的原始课堂反馈是否仍可通过反馈列表反查：通知未存 relatedId，需运行时按学生 + 日期反查确认。
4. 双库（JUNIOR/SENIOR）分库场景下，`getParentChildren` 与各 where 走 `getRequestPrisma()` 后的跨部一致性，本次抽样仅覆盖当前连接库；需在双库开启环境复核。
5. 通知 `pushStatus`（wxpusher/企微）推送失败重试链路不在本片通路范围内，未核对送达与站内已读是否同步。
