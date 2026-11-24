# 通路5 排课变更→考勤残留、通路11 反馈图片权限回收（ID: H）

> 只读审计。未改源码、未改库、未跑 migrate / db push / generate、未重启服务。
> 本地抽样仅 SELECT（库 `edu_manage` @ 127.0.0.1:5432），结果标注 `[已核实·本地库]`。
> 复用前轮结论：Attendance `@@unique([lessonId, studentId])`（`prisma/schema.prisma:545`）、`lessonId` 可空、FK 到 ClassLesson 为 SET NULL；工资表 `lessonId/feedbackId` 只有索引无外键；本地库孤儿考勤行 0、同课同人重复 0。
> 范围：课次软删/改期/改分组/换老师/回收站恢复对考勤的处理；反馈图片鉴权判据、软删/撤销后权限是否回收、存储形态。工资金额规则、扣减链结论不重复展开。

## 一、通路结论表

| # | 通路 | 写方(file:line) | 读方(file:line) | 中间转换层 | 结论 | 风险等级 | 失效时用户看到什么 |
|---|------|----------------|----------------|-----------|------|---------|--------------------|
| 5-1 | 课次软删 → 考勤残留 | `src/lib/data-correction/trash.ts:187`（课次）、`:152`（班级） | 考勤列表/学员考勤历史（按 lesson 反查处各自过滤） | 无；考勤行原地保留 | 部分连通 | 中 | 已删课次下仍挂 39 条考勤行 `[已核实·本地库]`；按课次过滤的列表看不到课次，按学员维度查历史可能看到"幽灵课次"考勤 |
| 5-2 | 改期/重新生成课表 → 考勤 | `src/app/api/class-lessons/postpone-all/route.ts:154-163`；`src/app/api/class-groups/[id]/generate-lessons/route.ts:376-387` | 课表生成、考勤提交锁 | 无 | 连通 | 低 | 有考勤的旧课次被条件保护不会被取消（`:383`）；顺延只改日期，考勤行随课次保留 |
| 5-3 | 课次分组归属 → 考勤 enrollmentId | 考勤提交：`src/app/api/teacher/attendance/route.ts:492-520`、`src/app/api/admin/attendance/submit/route.ts:142,179-198`；课时更正：`src/app/api/admin/attendance/adjust/route.ts:95,100,129,142,149` | 扣减/退款 `src/lib/attendance-hour-posting.ts:38,61` | enrollment 实时解析（提交时）；更正时读快照 | 部分连通 | 中 | 更正退款/补扣找不到报名时报 `ENROLLMENT_NOT_FOUND`；1181 条考勤挂 WITHDRAWN 报名、39 条挂已删报名 `[已核实·本地库]` |
| 5-4 | 换老师 → 课时费归属 | 换老师：`src/app/api/class-groups/[id]/replace-teacher/route.ts:156-163`、`src/app/api/teachers/[id]/route.ts:248`；课时费：`src/lib/teacher-salary.ts:136-147,176-183` | 教师工资条/结算（前轮 D 分片） | 无；流水 teacherId 为创建时快照 | 部分连通 | 中 | 生成本课后换老师：旧老师工资条保留该节课时费，新老师工资条看不到；唯一键阻止重复计薪，但新老师也拿不到；无事后改派流水 |
| 5-5 | 回收站恢复 → 考勤半恢复 | 恢复：`trash.ts:256-284`（班级）、`:294-301`（课次）；批次恢复 `src/lib/data-correction/cleanup.ts:99-101` | 回收站页面、考勤列表 | 无 | 连通 | 低 | 课次恢复不要求考勤一起恢复（考勤从未被软删）；cleanup 批次内的考勤随批次一并恢复；不存在"课次回来了、考勤还在回收站"的半恢复 |
| 5-6 | 课次硬删 → 考勤物理清除 | `trash.ts:317-325`（purgeLessonTree） | 无（清除后无读方） | 无 | 连通 | 低 | 保留期过后物理删除考勤、补课申请、课时流水；删除前由回收站预览计数告知管理员 |
| 11-1 | 反馈图片鉴权主链路 | 上传：`src/app/api/upload/route.ts:177-199`；鉴权 `src/lib/classroom-feedback/access.ts:543-714` | 代理流 `/api/uploads/[filename]`、`/api/files/[id]`、`/api/files/view`、签名 `/api/uploads/sign` | `upload-access.ts` 通用资产策略兜底 | 连通 | 中 | 无权限用户访问代理路由返回 403 并记审计日志（`uploads/[filename]/route.ts:91-93`） |
| 11-2 | 反馈软删/撤销 → 图片权限回收 | 撤销：`src/app/api/admin/feedback/revoke/route.ts:39-46`；归档：`trash.ts:158,189` | 同 11-1 读方 | 无 | 部分连通 | 中 | 家长被拒绝（反馈匹配失败→forbidden）；**原上传教师仍可经代理路由看图**；FileAsset 行与对象不随反馈撤销回收；872 条反馈资产无任何现存反馈/晚托记录引用 `[已核实·本地库]` |
| 11-3 | 存储形态与直链绕过风险 | OSS 驱动 `src/lib/storage/index.ts:274-277`；本地驱动 `:179-181`；前端 `src/hooks/useSignedUrls.ts:73-85,108` | 浏览器 `<img>` | 签名 URL 换取层 `/api/uploads/sign` | 部分连通 | 中 | 存库 url 为 OSS 直链（5611 条直链、0 条代理路径 `[已核实·本地库]`）；私有桶下未签名直链应由 OSS 拒绝，若桶 ACL 为 public-read 则应用鉴权被绕过——桶 ACL 待控制台核实 |
| 11-4 | 导出令牌旁路 | 签发 `src/lib/classroom-feedback/export-image-url.ts:21-46`；校验 `:48-66`；旁路 `src/app/api/files/view/route.ts:16-22,42-55` | 反馈导出 PDF/分享图 | HMAC 签名 + 7 天 TTL | 部分连通 | 中 | 反馈撤销/归档后，撤销前签发的导出链接在 7 天 TTL 内仍可看图；令牌不嵌反馈状态 |

## 二、逐条证据

### 通路 5-1：课次软删后考勤行原地残留

- 写方（课次软删）：`trash.ts:187` 仅把课次置 `deletedAt + deletionBatchId + status=CANCELLED`；事务内同批处理了试卷、反馈、动态、资料（`:188-191`），**没有任何 `tx.attendance.updateMany`**。
- 写方（班级软删）：`trash.ts:152` 取消班内课次、`:153` 撤回报名、`:157-160` 软删试卷/反馈/动态/资料；Attendance 同样不在处理清单。
- 读方现状：考勤行 `deletedAt` 仍为 null，`lessonId` 仍指向被软删的课次。
- 口径分裂：有——按课次聚合的查询带 `lesson.deletedAt: null` 时看不到残留考勤；按学员维度直查 Attendance 的入口若不带课次过滤，会读出这些行。
- 关键代码：

```ts
// src/lib/data-correction/trash.ts:187-191
await tx.classLesson.update({ where: { id: entityId },
  data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'CANCELLED', cancelReason: '课次已删除并进入回收站' } })
await tx.examPaper.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { ... status: 'DELETED' } })
await tx.classroomFeedback.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { deletedAt, deletionBatchId, status: 'ARCHIVED' } })
// 事务内无 attendance 写入
```

- 本地库抽样 `[已核实·本地库]`：`Attendance` 非删除行中，39 行 `lessonId` 指向已软删课次；0 行 enrollmentId 孤儿（指向不存在报名）。
- 判定：**部分连通**。软删窗口内考勤未被同步隔离，是否可见取决于各读方是否联表过滤课次 `deletedAt`。
- 失效现象：教师/家长端课表看不到该课次；学员考勤历史、导出报表若不过滤课次删除状态，会出现挂在已删课次上的考勤记录；课时更正入口对这些行操作时会走 5-3 的报名校验。
- 确定性：[已核实] 代码路径 + 本地库计数。

### 通路 5-2：改期与重新生成课表对考勤的保护

- 改期：`postpone-all/route.ts:154-163` 只更新 `lessonDate`，前置条件 `status notIn ['COMPLETED','CANCELLED','POSTPONED']` 且 `deletedAt: null`；考勤行不改动。
- 重新生成课表：`generate-lessons/route.ts:376-387` 取消旧课次时，where 条件显式要求 `attendances: { none: { deletedAt: null } }` 与 `classroomFeedbacks: { none: { deletedAt: null } }`；有考勤/反馈的旧课次不会被静默取消。
- 关键代码：

```ts
// src/app/api/class-groups/[id]/generate-lessons/route.ts:376-387
const replaced = await tx.classLesson.updateMany({
  where: { id: { in: oldIds }, status: 'SCHEDULED', deletedAt: null,
    attendanceSubmittedAt: null, hoursDeductedAt: null,
    attendances: { none: { deletedAt: null } },
    classroomFeedbacks: { none: { deletedAt: null } } },
  data: { status: 'CANCELLED', cancelReason: '重新生成课表，原安排已保留供查询' },
})
if (replaced.count !== oldIds.length) throw new ScheduleGenerationError('原课表状态已变化，请刷新后重试')
```

- 判定：**连通**。课表重建对已提交考勤的课次有显式保护条件。
- 失效现象：保护条件不满足时整批抛出 `ScheduleGenerationError`，管理员看到"原课表状态已变化"提示，需逐节处理，不会静默丢考勤。
- 确定性：[已核实]

### 通路 5-3：分组归属与 enrollmentId 口径（含"考勤挂旧报名"核查）

- 前置事实：全仓不存在"把已有课次 `groupId` 改到另一个班"的写入点。`schedules/[id]/route.ts:207-218` 的 `lessonData` 只含 teacherId/status/note/lessonDate/startTime/endTime/plannedMinutes，不含 groupId；其余 `groupId` 均为 create 时写入。因此"课次被搬到新分组、考勤挂旧分组"的链路在代码中不成立。
- 提交考勤时 enrollmentId 实时解析：
  - 教师端：`teacher/attendance/route.ts:492-505` 按 `studentId + groupId: group.id + status ACTIVE + deletedAt null` 查报名；查不到抛 `ATTENDANCE_ROSTER_CHANGED`（`:505`）；upsert 时把 `enrollmentId: enrollment.id` 写回考勤行（`:519-520`）。
  - 管理端：`admin/attendance/submit/route.ts:142` 从 `lesson.group.enrollments` 建 `studentId → enrollment` 映射，`:179-180` 查不到即抛 `ATTENDANCE_ROSTER_CHANGED`；`:197-198` 写回 enrollmentId。
- 扣减读同一 enrollmentId：`postAttendanceHours` 入参 `enrollmentId`（`attendance-hour-posting.ts:7`），累计/扣课时都作用于该报名（`:38,61`）；教师端调用 `teacher/attendance/route.ts:540-549`、管理端 `admin/attendance/submit/route.ts:211-220`。
- 口径分裂点（更正路径）：`admin/attendance/adjust/route.ts` 退款/补扣读的是考勤行快照 `attendance.enrollmentId`（`:95,100,129,142,149`），**不实时重查当前班 active 报名**；报名已撤回/删除时抛 `ENROLLMENT_NOT_FOUND`（`:98`）。

```ts
// src/app/api/admin/attendance/adjust/route.ts:93-100
if (oldDeducted > 0 && newShouldDeduct <= 0) {
  const enrollment = await tx.enrollment.findUnique({
    where: { id: attendance.enrollmentId || undefined },
    select: { remainHours: true, usedHours: true, totalHours: true },
  })
  if (!enrollment || !attendance.enrollmentId) throw new Error('ENROLLMENT_NOT_FOUND')
  const enrollmentPk = attendance.enrollmentId
```

- 本地库抽样 `[已核实·本地库]`：非删除考勤中，enrollmentId 指向不存在报名 0 条；指向 WITHDRAWN 报名 1181 条；指向已软删报名 39 条。
- 判定：**部分连通**。提交链路实时对齐当前班报名；事后更正链路依赖历史快照，报名状态变化后可能对不上。
- 失效现象：管理员更正一条旧考勤（退课/转班后）时退款/补扣报 `ENROLLMENT_NOT_FOUND`，课时无法回退；学员课时快照与历史考勤口径可能不一致。
- 确定性：[已核实] 代码路径；1181 条 WITHDRAWN 历史考勤是否影响当期课时快照，[待验证]。

### 通路 5-4：换老师后课时费归属与幂等

- 换老师写入点：
  - 班级换老师：`replace-teacher/route.ts:156-163`，仅更新 `status notIn ['COMPLETED','CANCELLED','POSTPONED']` 的未完成课次 `teacherId`。
  - 教师转岗/移除：`teachers/[id]/route.ts:248` 同样只改未完成课次；`:309` 把未完成课次 teacherId 置空。
- 课时费生成：`teacher-salary.ts:136-141` 取 `lesson.teacherId || lesson.group.teacherId`，取不到返回失败；`:143-147` 先按 `lessonPayKey = lessonId` 查重，存在即跳过；`:176-183` 创建流水，`lessonPayKey: lessonId`。
- 生成时机：考勤提交事务内调用 `createLessonPayInTransaction`（`teacher/attendance/route.ts:659`、`admin/attendance/submit/route.ts:267`）。

```ts
// src/lib/teacher-salary.ts:134-147,176-178
await tx.$queryRaw`SELECT "id" FROM "ClassLesson" WHERE "id" = ${lessonId} FOR UPDATE`
const lesson = await tx.classLesson.findUnique({ where: { id: lessonId }, include: { group: { ... }, attendances: { ... } } })
const teacherId = lesson?.teacherId || lesson?.group.teacherId
if (!lesson || !teacherId) return { success: false, error: '课次或教师不存在' }
const existing = await tx.teacherSalaryTransaction.findUnique({ where: { lessonPayKey: lessonId }, select: { id: true } })
if (existing) return { success: true, skipped: true }
// ...
data: { teacherId, type: 'LESSON_PAY', amount, lessonId, lessonPayKey: lessonId, ... }
```

- 判定：**部分连通**。唯一性保证一课次一条课时费、不会重复计给两个人；但流水 teacherId 是生成时快照，生成后换老师不会事后改派，新老师拿不到这节课课时费。
- 失效现象：原老师工资条/结算里保留该节课时费；新老师工资条缺这节；管理员在工资台账看到课时费挂在已转岗/离职教师名下（本地库工资流水无孤儿教师，0 条 `[已核实·本地库]`）。
- 确定性：[已核实]；生产库是否存在"付费后换老师"的历史单据 [待验证]。

### 通路 5-5：回收站恢复是否产生考勤半恢复

- 课次恢复：`trash.ts:294-301` 恢复课次状态与试卷/反馈/资料/动态；Attendance 未被纳入恢复清单——但它在软删阶段也未被软删（见 5-1），因此不存在"课次恢复了、考勤还卡在回收站"的半恢复状态。
- 班级恢复：`trash.ts:256-284` 按快照恢复课次、报名、试卷、反馈、资料；报名恢复后 `syncStudentHourSnapshot` 重算课时快照（`:277-280`）。
- 定向清理批次恢复：`cleanup.ts:99-101` 按类别 `updateMany` 清 `deletedAt/deletionBatchId`，attendance 类别在列（`cleanup.ts:8`），与其他记录同批恢复。
- 判定：**连通**。两条恢复路径都不存在考勤半恢复缺口；硬删（`purgeLessonTree`）才物理清除考勤（`trash.ts:317-325`）。
- 确定性：[已核实]

### 通路 11-1：反馈图片鉴权主链路

- 鉴权函数：`access.ts:543` `canAccessFeedbackImage(prisma, actor, values)`，返回 `Map<value, { allowed, reason }>`。
- 判据分层：
  1. admin 直通（`:551-553`）。
  2. FileAsset 按 `storageKey/url/previewUrl/thumbnailUrl` 匹配，且资产 `deletedAt: null`（`:557-577`）。
  3. ClassroomFeedback 按 `id in feedbackIds` 或 `imageUrls hasSome` 匹配，反馈 `deletedAt: null`（`:593-610`）。
  4. 关系校验 `canViewFeedback`（`:672-679`）：教师要求反馈 teacherId 或课次教师匹配（`:175-177`）；家长要求 `status === 'PUBLISHED'` 且学员在自己孩子集合内（`:181`）。
  5. 晚托作业图片反查 `StudyHallHomeworkEntry`（`:614-643,684-701`）：家长按学员匹配，教师按记录人或晚托班教师匹配。
  6. 未关联到反馈/晚托记录的资产：仅当 `ownerType='feedback'` 且 `uploadedById === actor.id` 时放行（`:703-707`），其余 `forbidden`（`:712`）。
- 读方路由：
  - 代理流：`src/app/api/uploads/[filename]/route.ts:63-94`，先 `requireAuthenticatedUser`（`:64`），再 `canAccessFeedbackImage`（`:77-81`），失败后 `assertCanAccessStoredFileAsset` 兜底（`:85`），仍拒绝返回 403 并 `console.warn`（`:91-93`）。
  - 元数据：`src/app/api/files/[id]/route.ts:30-45`，反馈类资产走 `canAccessFeedbackImage`，非反馈类走 `assertCanAccessFileAsset`。
  - 签名：`src/app/api/uploads/sign/route.ts:38-59`，同一套鉴权后才换 OSS 签名 URL。
- 通用资产策略兜底：`upload-access.ts:41-110`；反馈类资产在 `assertCanAccessStoredFileAsset` 中直接拒绝走通用策略（`:146-147`），强制回到反馈关系校验。
- 判定：**连通**。登录态 + 反馈/晚托关系校验闭环；代理流强制鉴权，无匿名公开入口。
- 确定性：[已核实]

### 通路 11-2：反馈软删/撤销后图片权限是否立即回收

- 撤销路由：`admin/feedback/revoke/route.ts:38-57` 事务内：反馈置 `deletedAt + status=REVOKED`（`:39-42`），奖励记录置 `isActive:false`（`:43-46`），写操作日志；**未触碰 FileAsset，未删除对象存储文件**。
- 归档/软删：`trash.ts:158,189` 反馈置 `deletedAt + status=ARCHIVED`；FileAsset 同样不在清单（对照 `trash.ts:187-191`）。
- 鉴权侧回收逻辑：
  - 反馈查询 `deletedAt: null`（`access.ts:595`）→ 撤销/归档反馈不再进入 `matchingFeedbacks`。
  - 家长：无反馈匹配、无晚托匹配 → 落到 `forbidden`（`:712`），通用兜底 `assertCanAccessStoredFileAsset` 对反馈类资产直接抛 `AuthError`（`upload-access.ts:146-147`）。
  - 原上传教师：`ownsUnattachedFeedbackAsset` 分支 `uploadedById === actor.id` 仍放行（`access.ts:703-707`）。
  - 其他教师/其他家长：拒绝。
- status 口径：`canViewFeedback` 教师分支不查 status（`access.ts:175-177`），草稿/归档反馈图片对归属教师仍可见；家长分支强制 PUBLISHED（`:181`）。
- 本地库抽样 `[已核实·本地库]`：反馈类 FileAsset 5618 条，其中 872 条的 key/url 未被任何现存 `ClassroomFeedback.imageUrls` 或晚托作业图片字段引用（孤儿资产；DB 行 + OSS 对象残留）。现存反馈 5335 PUBLISHED / 32 DRAFT / 5 ARCHIVED / 2 已删。
- 判定：**部分连通**。家长侧回收到位；原上传教师侧未回收；资产实体（DB 行 + 存储对象）不随反馈撤销回收。
- 失效现象：家长用撤销前保存的链接走代理路由 → 403；原上传教师仍能打开图片；已离职/转岗教师若账号仍有效，其历史上传图经代理路由仍可访问。
- 确定性：[已核实] 代码与本地库；872 条孤儿资产对应历史撤销/归档/清理批次的具体成因 [待验证]。

### 通路 11-3：存储形态与直链绕过风险

- 本地驱动：`storage/index.ts:179-181` `getUrl` 返回 `/api/uploads/<key>` 代理路径。
- OSS 驱动：`:274-277` `getUrl` 返回 `https://<base>/<key>` 直链；`putBuffer` 落库 url 同为直链（`:220-225`）。
- 落库：`upload/route.ts:184` 仅 parent-message / admin-practice-reply 强制 `/api/uploads/` 路径，其余类型（含 feedback）存 `result.url`。
- 前端换取层：`useSignedUrls.ts:73-85` 批量调 `/api/uploads/sign` 拿签名 URL，失败/缺失回落 `protectedUploadFallback` 代理路径（`:108`）；`sign/route.ts:78` 生成 1 小时签名，签名失败回落代理（`:85`）。
- 环境：`.env.local` `STORAGE_DRIVER=local`，`ALIYUN_OSS_PRIVATE_BUCKET=true`，`ALIYUN_OSS_PUBLIC_BASE_URL=https://muzhe-uploads.oss-cn-hangzhou.aliyuncs.com`。本地库 5611 条 OSS 资产 url 为直链、0 条代理路径；7 条本地驱动为代理路径 `[已核实·本地库]`。
- 关键代码：

```ts
// src/lib/storage/index.ts:274-277
getUrl(key: string): string {
  const baseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL || `https://${ossPostHost(process.env.ALIYUN_OSS_BUCKET || '')}`
  return `${baseUrl.replace(/\/+$/, '')}/${key}`
}
```

- 判定：**部分连通**。应用内链路经签名/代理；但存库 url 是未签名直链，一旦桶 ACL 为 public-read（或对象单独设了公共读），持有直链者可绕过 `canAccessFeedbackImage` 直接读对象。`PRIVATE_BUCKET=true` 是代码意图标记，不等于桶 ACL 已在 OSS 控制台配置为私有。
- 失效现象：若桶公共读，撤销反馈后家长/前员工凭旧直链仍能看图；若桶私有，未签名直链由 OSS 返回 403，应用鉴权不被绕过。
- 确定性：[已核实] 代码与本地库 url 形态；桶实际 ACL [待验证]（需 OSS 控制台/STS 只读检查）。

### 通路 11-4：导出令牌旁路

- 签发：`export-image-url.ts:21-46`，HMAC-SHA256 签名 `assetId:division:expires`，TTL 默认 7 天（`:3,37`）；无 `AUTH_SECRET` 时退化为不带令牌的普通链接（`:32-34`）。
- 校验：`export-image-url.ts:48-66`，校验 division、过期时间、`timingSafeEqual` 签名；**不校验反馈 status、deletedAt、学员归属**。
- 旁路：`files/view/route.ts:16-22`，令牌有效时 `user = null`，跳过 `requireAuthenticatedUser`；`:42` 条件 `!hasValidExportToken && user` 才走 `canAccessFeedbackImage`。

```ts
// src/app/api/files/view/route.ts:16-22,42-55
const hasValidExportToken = verifyFeedbackExportImageToken(id, division, expires, token)
const user = hasValidExportToken ? null : await requireAuthenticatedUser()
// ...
if (!hasValidExportToken && user) {
  const access = await canAccessFeedbackImage(prisma, { id: user.id, role: user.role, teacherId }, [asset.storageKey])
  if (!access.get(asset.storageKey)?.allowed) return NextResponse.json({ error: '无权访问该反馈图片' }, { status: 403 })
}
```

- 判定：**部分连通**。令牌旁路只服务导出 PDF/分享图场景，TTL 有限；但撤销/归档反馈不会作废已签发令牌，7 天内链接仍可读图。
- 失效现象：管理员撤销一条反馈后，此前导出/分享出去的链接在过期前仍能打开图片；令牌泄露期间无登录要求。
- 确定性：[已核实]

## 三、孤岛清单（本片范围内）

| # | 表/功能 | 谁写 | 有没有下游消费方 | 是不是"设计了但没接" | 建议 |
|---|---------|------|----------------|--------------------|------|
| H-1 | 反馈类孤儿 FileAsset（本地库 872 条 `[已核实·本地库]`） | `upload/route.ts:177-199` 上传时先建行，反馈提交后通过 imageUrls 关联 | 现存反馈/晚托记录均未引用；鉴权匹配不到，实际无读方 | 不是设计孤岛，是反馈撤销/归档/清理时未回收资产的残留 | 撤销/归档反馈时同步软删关联 FileAsset；定期清理未引用资产；对象存储随 DB 软删保留期一并清除 |
| H-2 | 晚托作业图片（before/after/lesson/imageUrls） | 晚托登记路由写入 | 有读方：`access.ts:614-643` 反查授权、家长端 `parent/study-hall/route.ts:45-48`、教师端工作区 | 连通，非孤岛 | 无需动作 |
| H-3 | 考勤行挂在已软删课次（本地库 39 条 `[已核实·本地库]`） | 考勤提交链路写入 | 读方按课次过滤时不可见；学员维度历史入口可能仍读到 | 非设计孤岛，软删阶段未同步隔离考勤 | 软删课次时同步给考勤打软删批次标记，或在读方统一联表过滤 `lesson.deletedAt` |

## 四、需要用户拍板的业务口径问题

1. **反馈撤销后，原上传教师是否应继续看图？**
   - 现状口径：仍可见（`access.ts:703-707` unattached-owner 放行）。
   - 口径 A（保持现状）：教师可回看自己上传的素材，便于复盘；风险是离职/转岗教师账号有效期间持续可见。
   - 口径 B（随反馈一并回收）：撤销/归档后教师也需通过反馈关系校验，资产行一并软删；风险是教师失去历史素材参考。
2. **导出链接 TTL 与反馈撤销的关系：撤销是否立即作废已签发链接？**
   - 现状：令牌只认过期时间，撤销不失效旧链接（7 天内可访问）。
   - 口径 A（保持 7 天）：导出 PDF 链接稳定，不会中途裂图；风险是撤销内容短期仍可被链接访问。
   - 口径 B（撤销即失效）：撤销后旧链接 403；需要在令牌校验时联表反馈状态，或引入令牌版本号/作废清单。
3. **课次软删时，残留考勤如何处置：同步软删隔离，还是保留为历史只读？**
   - 口径 A（同步隔离）：软删课次同批软删考勤，学员历史口径以保留期内回收站为准；风险是历史考勤需从回收站恢复。
   - 口径 B（保留只读）：考勤永久保留，读方统一过滤课次删除状态；风险是各读方过滤口径不一就会出现幽灵记录（现状 39 条）。
4. **退课/转班后的历史考勤，课时更正时是否允许按当前班报名重新匹配？**
   - 现状：更正路径读快照 enrollmentId，找不到报名即报错（`adjust/route.ts:98`）。
   - 口径 A（严格快照）：历史归属不变，报错提示人工处理；风险是旧报名撤回后无法线上更正。
   - 口径 B（实时重匹配）：更正时按学员+课次当前报名重查；风险是课时退到错误报名。

## 五、已确认正常

| # | 检查项 | 证据(file:line) |
|---|--------|------------------|
| N1 | 考勤提交有并发锁，重复提交不会产生重复考勤/重复扣费 | `teacher/attendance/route.ts:468-478`、`admin/attendance/submit/route.ts:157-167`：`attendanceSubmittedAt/hoursDeductedAt` 占位 + `updateMany` 占位校验，count≠1 抛 `ATTENDANCE_SUBMISSION_LOCKED` |
| N2 | 课时费一课次一条，DB 唯一键兜底，并发有行锁 | `teacher-salary.ts:134` `FOR UPDATE`；`:143-147` `lessonPayKey` 查重；`:178` `lessonPayKey: lessonId`；唯一键定义见前轮 D 分片 |
| N3 | 有考勤/反馈的课次不会被重新生成课表静默取消 | `generate-lessons/route.ts:383-384` 前置 `attendances/classroomFeedbacks: { none: { deletedAt: null } }`，不满足整批报错 |
| N4 | 家长访问反馈图片必须 PUBLISHED 且学员归属匹配 | `access.ts:179-181`；反馈列表读取同样 `status:'PUBLISHED', deletedAt: null`（`feedback/route.ts:62`） |
| N5 | 图片代理路由强制登录，拒绝有审计日志 | `uploads/[filename]/route.ts:64` `requireAuthenticatedUser`；`:91-93` 403 + `console.warn` |
| N6 | 通用文件策略不会把反馈类资产误判为公开 | `upload-access.ts:146-147`：ownerType=feedback 或带 feedbackId 的资产不走通用可见性放行 |
| N7 | 回收站恢复不产生考勤半恢复；定向清理批次考勤随批恢复 | `trash.ts:294-301`；`cleanup.ts:8,99-101` |
| N8 | 本地库工资流水无孤儿教师引用 | `[已核实·本地库]`：`TeacherSalaryTransaction` 非删除行中 teacherId 指向不存在教师 0 条 |

## 六、未能确认 / 需运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|----|--------|-----------|
| V1 | OSS 桶实际 ACL（私有 / public-read） | 代码只有 `ALIYUN_OSS_PRIVATE_BUCKET=true` 标记，桶策略在 OSS 控制台；本地环境驱动=local | 用只读 HEAD 取一个 OSS 直链不带签名访问，看返回 403 还是 200；或核对 OSS 桶 ACL 与对象元数据 |
| V2 | 872 条孤儿反馈资产的来源批次 | 需关联历史撤销/归档/清理批次与 `imageUrls` 变更记录，代码侧无回收日志可回溯 | 按 `FileAsset.createdAt` 分组，对照 `DeletedRecord` / 清理批次记录核对 |
| V3 | 39 条挂已软删课次考勤的成因（回收站删除课次残留 vs 课表重建残留） | 未逐行核对课次删除批次与考勤创建时间 | 只读联表 `Attendance → ClassLesson → DeletedRecord`，按 `deletionBatchId` 归类 |
| V4 | 1181 条挂 WITHDRAWN 报名的历史考勤是否影响学员课时快照 | `syncStudentHourSnapshot` 口径未在本片展开（属 B 分片范围） | 由考勤/课时扣减分片复核快照重算是否纳入 WITHDRAWN 报名历史考勤 |
| V5 | 生产库孤儿资产、挂删课次考勤、挂撤回报名考勤的规模 | 本片只连本地 127.0.0.1 库 | 生产只读按本片 SQL 口径抽样 |
| V6 | 导出令牌在无 `AUTH_SECRET` 时退化为裸链接的生产配置 | `export-image-url.ts:32-34` 依赖环境密钥是否注入 | 核对生产环境 `AUTH_SECRET/NEXTAUTH_SECRET` 是否配置 |
