# R3 `src/lib/**` 核心库 + `src/proxy.ts` 中间件 审查报告（第六轮）

> 审查时点：2026-11-10；仓库 `edu-manage`；变更集截止 2026-11-09 00:00（含之后改动）。
> 取证环境：本地库 `postgresql://postgres:***@127.0.0.1:5432/edu_manage`，仅 SELECT（探针脚本 `balance_probe.mjs`，跑完即删，未留在仓库）。未碰 3000 端口 dev（PID 31700），未改源码/库，未 migrate，未做 git 操作。
> **快照核对**：本分片 66 个文件（37 源文件 + 29 配套 `.test.ts`）的 mtime/size 与 `R0-变更集快照.json` **全部一致**，无"审计期间被改动"文件。
> 边界：本报告只覆盖 `src/lib/**` 与 `src/proxy.ts`、`src/proxy.test.ts`；路由/页面层仅在"库被谁调用、是否被真正使用"的连通性核对处点到为止，不越界对 API 做独立结论（与 R2 分片分工）。

---

## 1. 本片覆盖清单

### 1.1 文件域（66 个，从快照 `path` 前缀 `src\lib\` / `src\proxy` 筛出）

#### A. 课时/账务/考勤核心（17）

| # | 文件 | 变更性质判断（代码层推断） |
|---|---|---|
| 1 | `src/lib/attendance-balance.ts` | **新增**：报名级课时入账（累计模式）与扣减（预付模式）封装，条件更新 + 重试 |
| 2 | `src/lib/attendance-hour-posting.ts` | 重构：考勤入账/退费，事务内调余额库 + 同步学员快照 |
| 3 | `src/lib/attendance-hours.ts` | 微调：计费模式（MONTHLY/PER_HOUR）与扣课时计算纯函数 |
| 4 | `src/lib/attendance-status.ts` | 微调：考勤状态归一化/严格解析纯函数 |
| 5 | `src/lib/intensive-review.ts` | 重构：强化课审核通过事务（入账/扣课时/工资/快照同步） |
| 6 | `src/lib/intensive-settlement.ts` | 微调：强化课结算口径 |
| 7 | `src/lib/hour-snapshot-audit.ts` | **新增**：Student 快照 vs Enrollment 台账只读对账纯函数 |
| 8 | `src/lib/student-hour-snapshot.ts` | 快照同步（被 1/5/2 调用；不在快照新增清单，属既有依赖，复核其口径） |
| 9 | `src/lib/hours.ts` | 微调：`roundHours`(8 位) / `minutesToHours` 精度工具 |
| 10 | `src/lib/lesson-units.ts` | 微调：剩余课时↔节/课时展示换算 |
| 11 | `src/lib/format.ts` | 微调：课时/百分比展示格式化纯函数 |
| 12 | `src/lib/meal-attendance-sync.ts` | 重构：餐考勤自动/手动隔离写入 |
| 13 | `src/lib/meal-attendance-append.ts` | 微调：晚到学员追加就餐，不改课时/考勤 |
| 14 | `src/lib/future-lesson-roster-backfill.ts` | **新增**：未来课次名单回填计划（只读 dry-run，CLI 消费） |
| 15 | `src/lib/teacher-intensive-scheduling.ts` | 微调：强化课排期解析 |
| 16 | `src/lib/teacher-lesson-navigation.ts` | 微调：教师课次导航解析 |
| 17 | `src/lib/teacher-dashboard.ts` | 微调：教师看板聚合读模型 |

#### B. 家长端权限/课时详情/档案（6）

| # | 文件 | 变更性质判断 |
|---|---|---|
| 18 | `src/lib/parent-account-validity.ts` | **新增**：家长账号"是否仍有在册子女"判定（解绑/停用闸门） |
| 19 | `src/lib/parent-lesson-detail.ts` | **新增**：家长课时详情服务端回查 where + 呈现值解析 |
| 20 | `src/lib/business-visibility.ts` | 微调：各角色可见性 where（家长在读/历史口径） |
| 21 | `src/lib/student-profile.ts` | 重构：学员档案聚合（反馈/动态/考勤/阶段总结/掌握度） |
| 22 | `src/lib/login-accounts.ts` | 微调：登录账号解析/绑定 |
| 23 | `src/lib/parent-activation.ts` 等被引用库 | 仅作依赖核对，不在改动清单 |

#### C. 反馈权限/已读/PDF（5）

| # | 文件 | 变更性质判断 |
|---|---|---|
| 24 | `src/lib/classroom-feedback/access.ts` | 重构：可见性/取图权限/家长字段脱敏（三分支） |
| 25 | `src/lib/classroom-feedback/read-state.ts` | 微调：家长已读回执合并口径 |
| 26 | `src/lib/classroom-feedback/parent-pdf.ts` | 微调：家长反馈 PDF 渲染（图片加载兜底） |
| 27 | `src/lib/classroom-feedback/create.ts` 等被引用库 | 依赖核对 |
| 28 | `src/lib/upload-access.ts` 被引用库 | 依赖核对（第二授权路径） |

#### D. 存储/上传（4）

| # | 文件 | 变更性质判断 |
|---|---|---|
| 29 | `src/lib/storage/index.ts` | 重构：本地/OSS 双驱动读写、签名 URL、可用性探测 |
| 30 | `src/lib/storage/oss-put-options.ts` | 微调：OSS 上传 policy（大小/MIME/过期） |
| 31 | `src/lib/upload-url.ts` | 微调：上传路径归一化（防穿越）、私有资源回 `/api/uploads` |
| 32 | `src/lib/data-admin/health.ts` | **新增**：管理端数据健康检查（只读 $queryRaw/findMany/count） |

#### E. 限流/IP/词库（10）

| # | 文件 | 变更性质判断 |
|---|---|---|
| 33 | `src/lib/rate-limit.ts` | **新增**：Redis（原子 Lua）/进程内 Map 双驱动限流，按 IP+路由前缀 |
| 34 | `src/lib/request-ip.ts` | **新增**：仅信任反代写入的 `x-real-ip`，生产缺头 fail-closed |
| 35 | `src/lib/vocab-bank.ts` | 微调：词库单元分组纯函数 |
| 36 | `src/lib/vocab-catalog.ts` | 微调：词库目录读取 |
| 37 | `src/lib/vocab-database-target.ts` | **新增**：本地回环库连接串白名单校验（防误写生产） |
| 38 | `src/lib/normalization-mode.ts` | **新增**：CLI `--apply/--dry-run` 模式解析 |
| 39 | `src/lib/classroom-interaction-roll.ts` | 微调：点名动效节奏纯函数 |
| 40 | `src/lib/classroom-interaction-lesson.ts` | 微调：课堂互动课次/名单解析（复用考勤口径） |

#### F. 中间件（2）

| # | 文件 | 变更性质判断 |
|---|---|---|
| 41 | `src/proxy.ts` | 重构：公开白名单 + 会话/停用/踢人校验 + 页面角色重定向 + 旧上传链接改写 |
| 42 | `src/proxy.test.ts` | 测试：cron 放行、上传链接改写等 |

#### G. 配套 `.test.ts`（24，快照清单内）

`attendance-hour-posting.test.ts`、`attendance-hours.test.ts`、`attendance-status.test.ts`、`business-visibility.test.ts`、`classroom-interaction-roll.test.ts`、`future-lesson-roster-backfill.test.ts`、`hour-snapshot-audit.test.ts`、`intensive-review.test.ts`、`intensive-settlement.test.ts`、`lesson-units.test.ts`、`login-accounts.test.ts`、`meal-attendance-append.test.ts`、`meal-attendance-sync.test.ts`、`normalization-mode.test.ts`、`parent-lesson-detail.test.ts`、`rate-limit.test.ts`、`request-ip.test.ts`、`teacher-intensive-scheduling.test.ts`、`teacher-lesson-navigation.test.ts`、`upload-policy.test.ts`、`upload-url.test.ts`、`vocab-bank.test.ts`、`vocab-catalog.test.ts`、`vocab-database-target.test.ts`、`classroom-feedback/access.test.ts`、`classroom-feedback/read-state.test.ts`、`data-admin/health.test.ts`、`storage/oss-put-options.test.ts`。

### 1.2 重点问题初判

- **未发现 P0**：本分片内未确认到错账、可被未授权访问的越权面、丢数据或整事务必失败的路径。
- **账务双口径代码层已收口、历史数据未回填**：新写路径在同一事务内把 Enrollment 台账写对并回写 Student 快照；但库内 **136/191** 名学员快照与台账仍不一致，变更集内**无回填脚本/迁移**（详见 §3.1）。
- **家长有效性闸门在部分读接口上未挂**：`hasCurrentParentStudent` 只在登录与 `guards.validateSessionMark` 被调用；`unread-counts`、`vocab`、`notifications/unread-count` 走 `getCurrentUser()`/`auth()` 直连，未做学期在册复核（§3.2）。
- **反馈权限第二授权路径残留**：`access.ts` 的 `canViewFeedback` 已补 `status/deletedAt` 校验；但 `auth/guards.ts` 的 `assertCanAccessFeedback`（FileAsset 关联校验通道）仍未过滤（§3.3）。

---

## 2. 问题总表

| 严重度 | 文件:行 | 问题 | 影响端 | 证据片段 | 取证方式 | 修复建议 |
|---|---|---|---|---|---|---|
| P1 | `src/lib/attendance-balance.ts:28-101`；`src/lib/attendance-hour-posting.ts:119-130`；`src/lib/student-hour-snapshot.ts:20-43`；`scripts/normalize-hours.ts:51-104` | **历史快照双口径分裂运行时仍在**：新写路径事务内 `syncStudentHourSnapshot` 对账，但变更集无历史回填；`normalize-hours` 只对快照自身做 8 位取整，不按台账重算。库实测 136/191 学员快照≠报名台账汇总 | 家长端 / 管理端 / 教师端 | DB：Student(未删) 191，快照-台账不一致 **136**；活跃预付报名 145，remainHours=0 **31**；账内等式不平 0；负课时 0 | **已用库抽样验证**（balance_probe.mjs，SELECT）+ 代码层推断 | 出幂等 dry-run 对账脚本：按活跃 Enrollment 汇总重算 Student.remainHours/totalHours，先出差异清单人工复核后 `--apply`；新写路径维持现状 |
| P1 | `src/lib/parent-account-validity.ts:11-38`；`src/lib/auth/guards.ts:72`；`src/app/api/parent/unread-counts/route.ts:17-18`；`src/app/api/parent/vocab/route.ts:23,40-42`；`src/app/api/parent/notifications/unread-count/route.ts:11` | **部分家长读接口未挂学期在册闸门**：有效性判定只在登录（credential-auth）与 `validateSessionMark` 内调用；上述三条读路由未走守卫，解绑/停用在册子女后仍可读（归属 where 把可见面限到本人子女，但闸门目的被绕过） | 家长端 | 代码：unread-counts 仅 `getCurrentUser()`；vocab 仅 `auth()`+`findParentChild`；unread-count 仅 `auth()`，无 `hasCurrentParentStudent` | 代码层推断 + 全仓 grep 调用方 | 这三条端点改走 `requireParentUser`（内含 `validateSessionMark`→`hasCurrentParentStudent`），或在 handler 内显式复核在册子女；无在册子女返回 403 |
| P1 | `src/lib/auth/guards.ts:273-293`；`src/lib/upload-access.ts:163` | **反馈授权第二路径未过滤 status/deletedAt**：`canViewFeedback`（access.ts）已校验归档/撤销/软删；`assertCanAccessFeedback` 教师分支 `where:{id,teacherId:tid}`、家长分支 `where:{id,studentIds hasSome}` 均不带 `status/deletedAt`，已撤销/归档/软删反馈经 FileAsset 关联校验通道仍可命中 | 教师端 / 家长端 | 代码：guards.ts:277 `where:{id:feedbackId,teacherId:tid}`；:287-288 无状态条件；对比 access.ts:174-175 已带 `deletedAt:null` 与 ARCHIVED/REVOKED/DELETED | 代码层推断（库内未抽样该通道越权实例） | 两分支 where 补 `deletedAt:null` 与 `status:{notIn:['ARCHIVED','REVOKED','DELETED']}`；家长分支再限 `status:'PUBLISHED'`，与 `canViewFeedback` 对齐 |
| P2 | `src/lib/classroom-feedback/access.ts:499-521` | **家长脱敏字段不完整**：`redactFeedbackForParent` 先 `...feedback` 再清洗学生身份字段；`teacherId`、`teacher` 关系、`feedbackGroupId`、`termId`、内部 `status` 等仍随整包下发（页面 `lesson-detail/page.tsx:184-189` 整包 redact 后返回） | 家长端 | 代码：`{ ...feedback, studentIds: visible, studentRatings: ..., students: ... }`；未剥离 teacherId/feedbackGroupId/termId | 代码层推断 | 显式列白名单返回字段，剔除内部 id/关系/状态；或在序列化层统一裁剪 |
| P2 | `src/lib/intensive-review.ts:449-455` | **直写课时余额缺条件保护**：审批通过循环内 `tx.enrollment.update({data:{usedHours:{increment},remainHours:{decrement}}})`，未走 `deductEnrollmentHours` 的条件 `updateMany` + epsilon 归零；扣减额基于循环前读到的 `remainHours`，跨课次并发同一名单时存在超限扣减窗口；`afterHours`(:463) 用读前快照推算，未回读 | 教师端 / 管理端 / 账务 | 代码：:449-455 无条件 update；:402 读取 enroll.remainHours；对比 attendance-balance.ts:75-81 用 `updateMany` 条件 `remainHours:{gte}` | 代码层推断（库内账内不平 0，现网未触发） | 改调 `deductEnrollmentHours` 条件扣减；扣减后回读 remainHours 写流水；或对报名行加行锁 |
| P2 | `src/lib/storage/index.ts:158,234` | **删除失败静默吞掉**：本地 `unlink` 与 OSS `delete` 的 `catch{}` 无日志无上报；库内记录已删而对象残留（或反之）时无感知，后续孤儿对象清理缺信号 | 管理端 / 存储 | 代码：:158 `try{await unlink}catch{/*文件可能已删除*/}`；:234 `try{await client.delete(key)}catch{/*忽略*/}` | 代码层推断 | 区分"已不存在"与真实删除错误；真实错误记日志/进入重试队列，不要静默 |
| P2 | `src/proxy.ts:177-188,19-36` | **读请求 DB 异常前 2 次 fail-open；会话缓存 5s TTL**：mutation 与第 3 次错误才 503，前 2 次 GET/HEAD 错误落到 `next()` 放行；停用/踢人结果受 5 秒缓存延迟传播 | 全角色 | 代码：:181-186 `isMutation \|\| failCount>=3` 才 fail-closed；:20 `SESSION_CACHE_TTL=5_000` | 代码层推断 | 读路径 DB 异常也按 fail-closed（或缩短缓存/对停用态单独短缓存）；评估缩短 TTL |
| P2 | `src/lib/rate-limit.ts:22-33,69-103` | **限流覆盖与驱动局限**：规则表未特化 `/api/parent/notifications/*`、`/api/parent/vocab/*`，落通用 200rpm；内存驱动重启清零、计数非原子、无用户维度 key；Redis 为原子 Lua（已测） | 全角色 | 代码：RULES 前缀匹配；:69-103 Map bucket；key=`${ip}:${segment}` | 代码层推断 + 测试复核 | 为高频家长端点补规则；生产强制 Redis（现状 auto 在生产无 REDIS_URL 会抛错，已 fail-closed）；评估账号级 key |
| P2 | `src/lib/request-ip.ts:24-45` | **IP 解析依赖反代覆盖头**：只认 `x-real-ip`（不读 `x-forwarded-for`，防伪造，正确）；但 dev 缺头返回 `'unknown'`，所有开发流量共享一个桶；生产缺头/非法 fail-closed 抛错。若应用被直连（不经反代），客户端可自设 `x-real-ip` | 全角色 | 代码：:25 仅取 `x-real-ip`；:31-32 dev→'unknown'；:37-45 正则校验 | 代码层推断 + 测试复核（request-ip.test.ts 三例覆盖） | 部署层确认反代必覆盖 `x-real-ip` 且丢弃客户端传入；dev 桶可加端口/会话维度 |
| P2 | `src/lib/parent-lesson-detail.ts:42-83`；`src/app/parent/lesson-detail/page.tsx:60,91-111,141-177` | **详情回查主体已修，残留兜底**：服务端 `findFirst` 走 `parentVisibleLessonWhere`（含 `deletedAt:null`、状态/课程可见），查不到 `notFound()`；但 ① `ParentLessonPresentation` 模型不含教师字段，教师靠页面另查；② 无 `lessonId` 的旧链接仍用 URL 参数兜底；③ 反馈兜底逐级放宽到"同日/同学段最新反馈"，可能串到别节课 | 家长端 | 代码：page.tsx:43-59 回查；:60 空→notFound；:91-111 teacherParam 查名；:141-177 宽松兜底 | 代码层推断 | 无 lessonId 链接建议重定向回课表；反馈兜底增加课次/学生强约束，避免跨课匹配 |
| P2 | `src/lib/student-profile.ts:75-100,122-136` | **档案聚合仍未接 MasteryRecord**：`PerformancePost`(:75-79)、`StageSummary`(:89-100) 已接入；掌握度只从试卷 `paper.questions` 统计(:122-136)，教师按知识点录入的 `MasteryRecord` 未进档案（前轮"三类进不来"修复一半） | 教师端 / 家长端 / 管理端 | 代码：无 `prisma.masteryRecord` 查询；schema `MasteryRecord` 含 knowledgePoint/level；对照 teacher/mastery 路由单独读取 | 代码层推断 + schema 对照 | 档案掌握度并入 MasteryRecord 教师录入值，与试卷掌握度合并口径（注意已知 `MasteryRecord.termId` 库列缺口，见 §6.2） |
| P2 | `src/lib/student-hour-snapshot.ts:25-42`；`src/lib/hour-snapshot-audit.ts:32-33` | **快照/台账求和用 JS 浮点直接累加**，未逐笔 `roundHours`，多次累加存在 ULP 漂移空间；健康检查按 8 位容忍比对，边界值可能误报/漏报 | 管理端 / 账务 | 代码：`reduce((sum,item)=>sum+finiteNumber(...),0)` 无 round；对比 `hours.ts:3` `roundHours` | 代码层推断 | 求和后 `roundHours` 一次，或课时改 Decimal/分单位整数存储 |
| P3 | `src/lib/parent-account-validity.ts:16-17` | **双字段 OR 匹配，不判不一致**：`OR:[{parentId:userId},{parentUserId:userId}]`，当同一学员 `parentId≠parentUserId` 时按任一命中即视为在册；不识别"双字段分裂"这一异常态 | 管理端 / 家长端 | 代码：where OR 两列；现网双归属 0 例（R2 抽样） | 代码层推断 + 库抽样对照 | 命中时可记录双字段不一致告警；归属判定优先 `parentId`，`parentUserId` 仅作历史兼容 |
| P3 | `src/app/api/parent/vocab/route.ts:35-39` 等 | 词库路由 `catch` 一律通用 503；P2022/P2021 未在库层区分（属路由层，R2 已部分记录，本片仅标注库侧无兜底） | 家长端 | 代码：`catch{ return NextResponse.json({error:'服务暂不可用'},{status:503}) }` | 代码层推断 | 路由层按 P2022/P2021 转结构化提示（路由分片跟进） |

---

## 3. P0/P1 逐条展开

### 3.1 [P1] 历史快照双口径分裂：代码层已收口，136 人运行时仍不一致

**口径结论**：`attendance-balance.ts` 只写 **Enrollment 报名级台账**（`remainHours/usedHours`），不直接改 `Student` 快照；快照由调用方在同一事务内 `syncStudentHourSnapshot` 从活跃 Enrollment 汇总回写。**权威口径是报名级台账，Student 快照是派生值**。

`src/lib/attendance-hour-posting.ts:119-130`
```ts
// 入账/退费后，同一事务内回写学员快照
await syncStudentHourSnapshot(tx, attendance.studentId)
```

`src/lib/student-hour-snapshot.ts:25-42`
```ts
const enrollments = await tx.enrollment.findMany({
  where: { studentId, status: 'ACTIVE', deletedAt: null },
  select: { remainHours: true, totalHours: true },
})
const totalHours = enrollments.reduce((s, e) => s + Number(e.totalHours || 0), 0)
const remainHours = enrollments.reduce((s, e) => s + Number(e.remainHours || 0), 0)
await tx.student.update({ where: { id: studentId }, data: { totalHours, remainHours: roundHours(remainHours) } })
```

**正确性核查**
- 扣减路径 `deductEnrollmentHours`（attendance-balance.ts:55-101）用条件 `updateMany`（`remainHours:{gte: safeDeduct}` 或锁定当前值）+ 3 次重试，防止超扣；预付模式扣到 0 时走 `consumesRoundedBalance` 归零。
- 入账路径 `accrueEnrollmentHours`（:28-52）累计模式只增 `usedHours`。
- **读路径不触发写**：两个函数都要求传入 `tx`，仅被事务内调用；库内无独立的"读快照时顺带写"路径。
- 幂等性：台账级条件更新到位；但**重复结算是否二次扣减取决于调用方是否按考勤/流水唯一键防重**（本片未在库内加流水幂等键，依赖路由侧 posting 记录存在性判断，见 §6.1）。

**库抽样**（balance_probe.mjs，仅 SELECT；过滤 `deletedAt:null`）：

| 指标 | 值 | 说明 |
|---|---|---|
| Student（未删） | 191 | 与 R2 口径差异：R2 计 194 含软删 |
| 快照≠活跃报名台账汇总 | **136** | 即前轮"136 人"分裂，本轮运行时**仍存在** |
| 活跃预付报名（totalHours>0） | 145 | 累计模式（totalHours=0）未计入 |
| 预付 remainHours=0 | **31** | 前轮"37 人报名级为 0"，本轮 31 |
| 报名账内等式不平（remainHours ≠ totalHours-usedHours） | 0 | 台账自身一致 |
| 负课时快照 | 0 | 无越扣 |

零课时预付样本（前 2 条）：`134.4/134.4`、`117.6/117.6`（usedHours≈totalHours），属**真实已耗尽**，非卡在 0 的脏账。

**为什么没消除分裂**：新写路径只对"之后产生的考勤/结算"对账；变更集内没有把存量 136 人快照按台账重算的回填脚本。`scripts/normalize-hours.ts:51-104` 仅把快照自身数值 `roundHours` 取整，`studentWarnings`(:59-66) 对 diff>0.2 只打印人工确认，**不回写台账口径**。`hour-snapshot-audit.ts` 是只读对账纯函数，消费方为 `scripts/audit-hour-snapshots.ts`（CLI 只读报告）。

**影响**：家长端/教师端若读 `Student.remainHours` 快照展示剩余课时，这 136 人仍可能与报名台账不符；管理端健康检查（data-admin/health.ts:173-181）能把差异查出来，但不自动修复。
**取证**：已用库抽样验证 + 代码层推断。
**建议**：补幂等 dry-run 对账脚本（先出 136 人差异清单 → 人工复核 → `--apply` 按活跃报名汇总回写快照）；回填前明确快照/台账哪个为最终展示口径。

### 3.2 [P1] 家长有效性闸门：新增库被登录/守卫调用，但部分读接口未挂

`src/lib/parent-account-validity.ts:11-38`
```ts
export async function hasCurrentParentStudent(prisma, parentUserId, division) {
  const linked = await prisma.student.count({
    where: {
      division, deletedAt: null,
      OR: [{ parentId: parentUserId }, { parentUserId }],   // 双字段 OR
      status: { not: 'INACTIVE' },
      ...(awaitingTerm ? { termMemberships: { some: { status: 'ACTIVE' } } } : {}),
    },
  })
  return linked > 0
}
```

**调用方连通性（全仓 grep）**
- 登录闸门：`src/lib/auth/credential-auth.ts:60`（登录时校验，无在册子女 → `PARENT_TERM_EXPIRED`）。
- 会话闸门：`src/lib/auth/guards.ts:72`（`validateSessionMark` 内，被 `requireParentUser/requireAuthenticatedUser/requireTeacherUser/requireAdminUser` 复用）。
- **未挂该闸门的家长读接口**（本片跨片核对，路由归属 R2）：
  - `src/app/api/parent/unread-counts/route.ts:17-18`：`getCurrentUser()` + role 判 parent，**未** `validateSessionMark`/在册复核。
  - `src/app/api/parent/vocab/route.ts:23,40-42`：`auth()` + `findParentChild` 归属校验，**未**在册复核。
  - `src/app/api/parent/notifications/unread-count/route.ts:11`：`auth()` 直连，无 role、无在册复核（R2 P3 已记 role 缺口）。

**判定**：`getCurrentUser()`（get-user.ts:18-33）会 fail-closed 校验 `sessionMark` 与账号 `status`（停用/踢人可拦），但**不做** `hasCurrentParentStudent` 学期在册判定。因此：家长账号本身未停用、但名下子女已解绑/退班/INACTIVE 时，上述三条读路径仍放行；数据归属 where 把可见面限到本人子女（可能是已退班子女），不构成跨家长越权，但"无在册子女即应阻断"的闸门目的被绕过。

**双字段不一致**：where 用 OR 同时匹配 `parentId/parentUserId`，不识别两列分裂（现网双归属 0 例，R2 抽样）。
**取证**：代码层推断 + 全仓 grep；库内无"在册子女为空仍可读取"的现网实例抽样。
**建议**：三条端点改走 `requireParentUser`；或在 handler 显式调 `hasCurrentParentStudent`，无在册子女返回 403；通知/留言/档案等其他家长读路径一并排查是否复用同一闸门。

### 3.3 [P1] 反馈授权第二路径未过滤 status/deletedAt（access.ts 已修，guards.ts 残留）

前轮问题："`canViewFeedback` 教师分支不校验 `status/deletedAt` → 撤销后原上传教师仍可取图"。

**已修部分** — `src/lib/classroom-feedback/access.ts:166-186`
```ts
const unavailable = feedback.deletedAt != null ||
  FEEDBACK_INVISIBLE_STATUSES.has(feedback.status)   // ARCHIVED/REVOKED/DELETED
if (unavailable) return false
if (actor.role === 'teacher' && actor.teacherId) {
  if (feedback.teacherId === actor.teacherId || feedback.classLesson?.teacherId === actor.teacherId) return true
}
```
教师/家长/上传者三分支均在 unavailable 判定之后；家长分支再限 `status==='PUBLISHED'`。下载主通道 `/api/uploads/[filename]/route.ts:70-87` 走 `canAccessFeedbackImage → canViewFeedback`，已带上软删/归档校验。

**残留部分** — `src/lib/auth/guards.ts:273-293`（FileAsset 关联校验通道，被 `upload-access.ts:163` `validateUploadAssociations` 调用）
```ts
if (ctx.role === 'teacher') {
  const f = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, teacherId: tid },   // ← 无 status / deletedAt
    select: { id: true },
  })
  if (!f) throw new AuthError('无权访问该反馈数据')
  return
}
if (ctx.role === 'parent') {
  const f = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, studentIds: { hasSome: ... } },  // ← 无 PUBLISHED / deletedAt
    select: { id: true },
  })
  ...
}
```

**影响面**：该通道用于上传/签名时的关联资源校验，以及非反馈主图的 FileAsset 访问兜底；与 access.ts 下载主通道是两条独立授权路径。已撤销/归档/软删的反馈，在这条路径上仍可按教师本人或家长归属命中。
**取证**：代码层推断（未在登录态下端到端取图实测，见 §6.1）。
**建议**：两分支 where 补齐 `deletedAt:null`、`status:{notIn:['ARCHIVED','REVOKED','DELETED']}`，家长分支限 `PUBLISHED`；与 `canViewFeedback` 抽成同一套可见条件，避免双口径漂移。

---

## 4. 连通性复核表（写点 → 读点，四档：真连通 / 部分连通 / 孤岛 / 假控件）

### 4.1 课时/账务

| 库导出 | 调用方（path:line） | 读点/消费方 | 判定 |
|---|---|---|---|
| `accrueEnrollmentHours` / `deductEnrollmentHours`（attendance-balance.ts） | `attendance-hour-posting.ts:111-117`；`intensive-review.ts:409` | 台账 Enrollment；流水 `hourTransaction`；快照经 `syncStudentHourSnapshot` | **真连通**（新写路径对账到位；历史 136 人未回填，见 3.1） |
| `syncStudentHourSnapshot`（student-hour-snapshot.ts） | `attendance-hour-posting.ts:119`；`intensive-review.ts:482-484`；`intensive-history.ts`（既有，不在本片） | Student.remainHours/totalHours | **真连通**（仅新写触发；存量需回填） |
| `auditHourSnapshots`（hour-snapshot-audit.ts） | `scripts/audit-hour-snapshots.ts:25`（CLI 只读） | 管理端健康检查读 `data-admin/health.ts` 的 SQL 结果，未直接调此纯函数 | **真连通（离线 CLI）**；运行时 HTTP 不消费 |
| `planFutureLessonRosterBackfill`（future-lesson-roster-backfill.ts） | `scripts/backfill-empty-future-lesson-rosters.ts:82,93` | CLI dry-run/`--apply` | **真连通（离线 CLI）** |
| `getNormalizationMode`（normalization-mode.ts） | `scripts/normalize-hours.ts:6` | CLI 参数解析 | **真连通（离线 CLI）** |
| 餐考勤 `syncAutomaticMealAttendance`（meal-attendance-sync.ts） | admin/teacher/intensive-review 路由（R2/教师分片） | StudentMealAttendance 表 | **真连通**；与课时扣减 **0 重叠**：只写餐表，不碰 Enrollment/Attendance 课时（复核新改动未破坏隔离） |
| `appendTeacherMealAttendance`（meal-attendance-append.ts） | 教师餐追加上报路由 | StudentMealAttendance（`skipDuplicates` + 仅 AUTO 行可翻转） | **真连通**；MANUAL 决策保留 |
| `runDataHealthCheck`（data-admin/health.ts） | `/api/admin/data-health` 路由 | 管理端健康面板 | **真连通**；纯只读（$queryRaw SELECT / findMany / count），无 purge/删除 |

### 4.2 家长/档案/反馈

| 库导出 | 调用方（path:line） | 判定 |
|---|---|---|
| `hasCurrentParentStudent`（parent-account-validity.ts） | `auth/guards.ts:72`；`auth/credential-auth.ts:60`；解绑/状态路由常量引用 | **部分连通**：登录+守卫路径已挂；unread-counts/vocab/unread-count 读接口未挂（3.2） |
| `buildParentLessonDetailWhere` / `resolveParentLessonPresentation` / `buildParentLessonDetailHref`（parent-lesson-detail.ts） | `app/parent/lesson-detail/page.tsx:43-59,68`；`ParentTodayPanel`；`schedule/client` | **真连通**：服务端回查已接页面；残留兜底见 P2-10 |
| `getStudentProfile`（student-profile.ts） | admin/teacher/parent 档案路由 + archive 路由（R2 链路） | **真连通**；MasteryRecord 未接入（P2-11） |
| `canViewFeedback` / `canAccessFeedbackImage` / `redactFeedbackForParent`（access.ts） | `/api/uploads/[filename]:70-87`；feedback 路由；lesson-detail/page.tsx:184 | **真连通**；脱敏字段不全（P2-4）；第二授权路径残留（3.3） |
| `resolveParentFeedbackReadAt` / `projectParentFeedbackReadState`（read-state.ts） | feedback 列表/详情读侧（R2 链路） | **真连通**；legacy 回执分叉由 R2 3.1 跟踪，本片不重复结论 |
| `loadInteractionLesson`（classroom-interaction-lesson.ts） | `api/teacher/interaction/route.ts:76,149`；`interaction/pick/route.ts:44,203,230` | **真连通**；名单复用考勤 ClassLessonStudent 快照口径 |

### 4.3 存储/限流/词库

| 库导出 | 调用方（path:line） | 判定 |
|---|---|---|
| `readStoredBuffer`/`getUrl`/`putBuffer`/签名 URL（storage/index.ts） | `/api/uploads/[filename]`、`/api/uploads/sign`、upload 路由、各图片解析库 | **真连通**；私有资源经 `protectedUploadFallback` 回 `/api/uploads` 鉴权代理，未直出 OSS 公链 |
| `normalizeUploadRequestPath` / `extractUploadStorageKey`（upload-url.ts） | `/api/uploads/[filename]/route.ts:60`；`/api/uploads/sign/route.ts:37` | **真连通**；`..`/null byte 在路由层拦截 |
| `checkRateLimit` / `checkRateLimitSync`（rate-limit.ts） | `api-handler.ts` 中央限流；若干直连路由 | **真连通**；规则覆盖与驱动局限见 P2-8 |
| `getTrustedClientIp`（request-ip.ts） | `api-handler.ts`、auth、各路由 | **真连通**；dev 未知 IP 共享桶（P2-9） |
| `loadVocabEntries` / `listVocabUnits`（vocab-catalog/bank.ts） | `parent/vocab/route.ts:49,91`；`vocab/session:68`；`vocab/deck:54` | **真连通（家长侧自用）**；教师/管理端 0 读点的孤岛结论沿用 R2 P2，本片不推翻 |
| `parseLocalEduManageTarget`（vocab-database-target.ts） | 词库导入脚本/路由 | **真连通**；仅允许 `127.0.0.1:5432/edu_manage` 回环白名单 |

### 4.4 越权第一道门（proxy.ts）复核

| 检查项 | 结论 | 证据 |
|---|---|---|
| 新增家长路由是否被公开白名单放行 | **未放行**：`/api/parent/notifications/*`、`/api/parent/unread-counts/*`、`/api/parent/vocab/*` 均不在白名单（proxy.ts:84-117），未登录 → 128 行 401 | 白名单仅 `/api/auth`、`/api/setup`、回调、`/api/ai/public-assistant`、`/api/cron/*`、`/api/volunteer/schools` 等 |
| matcher 是否漏 `[id]` 动态段 | **不漏**：matcher（:222）只排除静态资源前缀，所有 `/api/**` 动态段都进入中间件 | 正则排除项均为静态目录/文件 |
| API 角色守卫在哪一层 | proxy 只做**认证**（登录态/停用/踢人），**API 角色与归属校验在 handler**（:200 注释明示）；页面角色重定向在 :202-216 | 与 R2 越权复核一致：本片未发现"吃前端 id、服务端不复核"的新接口 |
| 公开前缀下是否有敏感路由误入 | `/api/auth/*` 整段放行，需确认无敏感写操作挂在该前缀下（本片未逐路由清点，列入 §6.1） | — |

---

## 5. 前轮结论失效清单

| 前轮结论（出处） | 本轮复核 | 状态 |
|---|---|---|
| 余额双口径分裂：136 人快照与台账不符、37 人报名级为 0（前五轮账务核查） | 代码层新写路径已在事务内对账（3.1）；但库实测 **136 人仍不一致**、预付 0 课时 **31** 人；变更集无回填脚本。台账自身账内不平 0、无负课时 | **代码层部分失效，运行时结论仍成立**：新写已收口，存量分裂未消除；需回填后才可推翻 |
| `canViewFeedback` 教师分支不校验 `status/deletedAt`，撤销后原上传教师仍可取图（前轮反馈权限核查） | access.ts:174-175 已补 `deletedAt` 与 ARCHIVED/REVOKED/DELETED，下载主通道受控；但 guards.ts `assertCanAccessFeedback` 第二路径未补（3.3） | **部分失效**：主通道已修，FileAsset 关联校验通道残留 |
| `lesson-detail` 不回查 ClassLesson，时间/教师/教室来自 URL 参数，管理端改课后家长看旧值（上一轮 P3 硬断点） | parent-lesson-detail.ts + page.tsx:43-59 已服务端 `findFirst` 回查，where 含 `deletedAt:null`/状态/课程可见；查不到 `notFound()`。残留：无 lessonId 旧链接兜底、反馈宽松兜底串课、教师字段不在 presentation 模型 | **主体失效（已修）**；残留兜底问题见 P2-10 |
| 档案聚合接不进 `MasteryRecord`/`PerformancePost`/`StageSummary` 三类（前轮学情核查） | `PerformancePost`(student-profile.ts:75-79)、`StageSummary`(:89-100) 已接入；`MasteryRecord` 仍未查询，掌握度仅来自试卷题目 | **部分失效**：两类已接，MasteryRecord 缺口仍在（P2-11） |
| 餐考勤只写 StudentMealAttendance、与课时扣减 0 重叠（上一轮已验） | 复核 meal-attendance-sync/append：仍只写餐表，未引入 Enrollment/Attendance 课时写入；MANUAL 决策保留 | **仍成立（隔离未被破坏）** |
| 上传直链应走鉴权代理、签名 URL 需过期控制（前几轮存储核查） | `protectedUploadFallback` 私有资源回 `/api/uploads`；签名 URL TTL 默认 300s；路径穿越在 `normalizeUploadRequestPath` 拦截；本地读取有根目录包含校验 | **部分失效（已修）**；删除失败静默吞错为新记 P2-6 |
| 限流可被伪造 IP 绕过（前几轮） | `request-ip.ts` 只认 `x-real-ip`，不解析 `x-forwarded-for`；生产缺头 fail-closed；Redis 原子 Lua | **部分失效（伪造 XFF 路径已堵）**；依赖反代覆盖头、内存驱动局限见 P2-8/9 |
| 背单词孤岛：教师/管理/周报/档案 0 读点（R2 P2） | 本片库侧复核：vocab 三读点仍只在家长 vocab 路由；档案聚合未引入 VocabProgress/Session | **仍成立**，未失效 |
| FileAsset 外键全空、历史未回填（R2 3.2） | 本片存储库不写业务外键；回填缺口归属上传路由分片，本片不复核 | **沿用 R2 结论**，不在本片推翻 |

---

## 6. 未覆盖与需运行时验证

### 6.1 本片未深入
- 29 个 `.test.ts` 仅核对存在性、断言结构与覆盖方向；本轮**未执行 `vitest`**（避免触碰 dev 环境）。`rate-limit.test.ts` 覆盖了 fail-closed、Redis 原子脚本、动态前缀分组；`request-ip.test.ts` 覆盖只认 `x-real-ip`、dev unknown、生产 fail-closed；内存驱动的并发计数/淘汰、账号级 key 未测。
- 大文件 `teacher-dashboard.ts`(672)、`login-accounts.ts`(525)、`parent-pdf.ts`(968)、`intensive-review.ts`(509)、`access.ts`(654) 按风险模式（事务/余额写/catch/状态过滤）扫描与关键段精读，未逐行通读所有展示型分支。
- `/api/auth/*` 整段公开前缀下是否挂了不应公开的敏感路由，本片未逐路由清点（路由分片复核）。
- 库内未抽样"已解绑/退班家长仍读未读/词库"的现网实例；3.2 为代码层推断。
- `data-correction/trash.ts`（回收站/purge 级联）**不在本轮变更集**（属 `src/lib/data-correction/`，快照未列）；任务书所称"data-admin/ trash purge"实际对应 `data-admin/health.ts`（只读健康检查，无 purge）。purge 级联是否漏处理，需在 data-correction 分片另行复核。

### 6.2 需运行时/改数据验证（代码层结论 ≠ 已生效）
1. **136 人快照回填**：需先跑只读对账清单（`hour-snapshot-audit` / `audit-hour-snapshots.ts`），人工复核差异方向后再 dry-run → `--apply`；回填属改数据，需备份。
2. **MasteryRecord 接入档案**：已知库缺 `MasteryRecord.termId` 列（R0 schema-check 记录），接入前需先确认该列在现网库是否存在，避免 P2022。
3. **反馈第二授权路径实测**：撤销/归档一条反馈后，用原上传教师账号经 FileAsset 通道取图，复现 3.3 残留口子。
4. **Redis 限流生产形态**：现网 `.env` 无 `REDIS_URL`；生产 `auto` 驱动在缺 URL 时会抛错（fail-closed），上线前需确认 Redis 已配置，否则生产限流整体不可用。
5. **会话失效延迟**：5 秒 `sessionCache` TTL 内，停用/踢人/改密旧会话仍可能通过代理校验；未做双会话登录态实测。

### 6.3 环境与边界声明
- 全程仅 SELECT；探针脚本跑完即从仓库删除，未留临时文件。
- 未重启/未 kill 3000 端口 dev（PID 31700）；未 migrate、未改源码与依赖、未做 git 操作。
- 本片库口径快照（本轮实测，过滤软删）：Student 191（快照-台账不一致 136）；活跃预付报名 145（remainHours=0 31，账内不平 0，负课时 0）。
