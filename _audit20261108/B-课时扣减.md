# 课时扣减与余额汇总（ID: B）

> 范围：考勤提交 → 课时扣减 → 余额汇总。工资金额规则不在本段，仅核对工资函数在扣减事务内的调用边界。
> 审计方式：只读代码核查，未改源码、未写库、未跑 migrate、未重启服务。本地无 psql / psycopg2，未做数据库抽样，涉及库内实际数据一致性的项标注 [待验证]。

## 一、结论速览

| # | 链路节点 | 结论 | 风险等级 | 一句话证据 |
|---|---------|------|---------|-----------|
| 1 | 点名写入 | 连通 | 低 | 点名只写 `Attendance.status / rollCallStatus`，不碰 `hoursDeducted`、不锁考勤：`src/app/api/teacher/interaction/route.ts:22-24` |
| 2 | 考勤提交 | 连通 | 中 | 事务内 `updateMany` 条件占位 + 单条 `hoursDeducted` 守卫防双扣：`src/app/api/admin/attendance/submit/route.ts:157-167,210` |
| 3 | 课时扣减 | 部分连通 | 高 | `ENROLLMENT_BALANCE_CONFLICT` 全仓无 catch，冒到 apiHandler 返回 500 并整体回滚：`src/lib/attendance-balance.ts:87`，`src/lib/api-handler.ts:123-140` |
| 4 | 余额汇总 | 部分连通 | 中 | Enrollment 为台账真相，Student.remainHours 为快照；快照只汇总 remainHours，不含 usedHours：`src/lib/student-hour-snapshot.ts:5-18`，`prisma/schema.prisma:87-88` |
| 5 | 工资入账（边界） | 连通 | 低 | 工资函数同事务调用，但只读 `attendances.status` 做出勤守卫，不写课时余额：`src/lib/teacher-salary.ts:136-151` |
| 6 | 前端读取 | 部分连通 | 中 | 读者分裂：教师学员列表实时求和 Enrollment，续费预警等读 Student 快照：`src/app/api/teacher/students/route.ts:167`，`src/app/api/renewals/route.ts:55` |

**总判断**：扣减链存在**一套台账口径**（Enrollment），但叠加了 Student 快照口径与 status/rollCallStatus 双状态字段；主链路（提交→扣减→台账→快照）事务内闭合，最严重问题是余额冲突异常无业务化处理。

## 二、详细证据

### 节点1：点名写入

- 写入方：`src/app/api/teacher/interaction/route.ts:245-266` — 点名提交 upsert Attendance，同时写映射后的 `status` 与原始 `rollCallStatus`。
- 读取方：扣减链**不读** `rollCallStatus`（见节点2）；点名页/互动页展示优先读 `rollCallStatus`，回退 `status`。
- 对齐字段 / 判定依据：同一行 `Attendance`，唯一键 `@@unique([lessonId, studentId])`（`prisma/schema.prisma:545`）。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:12-16
/** 点名状态 -> 考勤状态映射：迟到仍算到课，只把课堂事实记录在 rollCallStatus */
const ROLL_TO_ATTENDANCE: Record<string, 'PRESENT' | 'ABSENT'> = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'PRESENT',
}
```
```ts
// src/app/api/teacher/interaction/route.ts:21-24
// 1. 点名只写 Attendance 的 status / rollCallStatus，绝不写 hoursDeducted、
//    不创建 MakeupRequest、不设置 ClassLesson.attendanceSubmittedAt / hoursDeductedAt。
//    课时扣减仍然只由考勤提交那一次事务完成，因此点名不会造成重复扣课时。
```
```ts
// src/app/api/teacher/interaction/route.ts:252-263
create: {
  lessonId: body.lessonId!, studentId: record.studentId, enrollmentId,
  status: attendanceStatus, rollCallStatus: record.rollStatus,
  rollCallMarkedAt: markedAt,
},
update: {
  status: attendanceStatus, rollCallStatus: record.rollStatus,
  rollCallMarkedAt: markedAt, ...(enrollmentId ? { enrollmentId } : {}),
},
```
- 保护措施：已提交考勤的课次点名只读（`interaction/route.ts:148-153`）；LEAVE 行点名不可改成到课（`:211-226`）；缺勤补记迟到会同时把 `status` 置 PRESENT、`rollCallStatus` 置 LATE（`:180-183`）。
- 判定：**连通**。点名与扣减解耦：点名不产生课时账务，扣减只在考勤提交事务内发生。
- 确定性：[已核实]

### 节点2：考勤提交（含扣减唯一数据来源 C1、双状态 C3、幂等 C4）

#### C1：扣减唯一数据来源是 `Attendance.status`，不是 Lesson 冗余字段

- 写入方：提交入口解析记录状态 `src/app/api/admin/attendance/submit/route.ts:182`；教师端入口 `src/app/api/teacher/attendance/route.ts:475`（`const status = rec.status`）。
- 读取方：扣减计算 `submit/route.ts:202-209`、`teacher/attendance/route.ts:514-521`，入参均为 `status`。
- 对齐字段 / 判定依据：`Attendance.status`（枚举 `AttStatus`，非空默认 PRESENT）。`ClassLesson` 上**不存在**出勤人数/实到汇总等冗余字段（`prisma/schema.prisma:332-379` 全段仅课时、状态、时间戳、结算标记）；Lesson 级的 `attendanceSubmittedAt / hoursDeductedAt` 只作锁定标记，不作为扣减依据。
- 关键代码：
```ts
// src/app/api/admin/attendance/submit/route.ts:182-185
const status = parseAttendanceRecordStatus(record.status)
if (!status) {
  throw new Error(`INVALID_ATTENDANCE_STATUS_${String(record.status)}`)
}
```
```ts
// src/app/api/admin/attendance/submit/route.ts:201-209
if (!alreadyDeducted) {
  const hoursDeducted = calculateAttendanceDeductHours({
    status,
    courseType: lesson.group.course.type,
    lessonMinutes: lesson.group.lessonMinutes,
    actualMinutes,
    intensiveMode: lesson.group.intensiveMode,
    billingMode: termKindToBillingMode(lesson.group.term?.kind),
  })
```
```prisma
// prisma/schema.prisma:531-538
status          AttStatus    @default(PRESENT)
actualMinutes   Int?
hoursDeducted   Float        @default(0)
notifySent      Boolean      @default(false)
/// 课堂点名状态：PRESENT / ABSENT / LATE。迟到仍计为出勤，仅作课堂事实记录；
rollCallStatus  String?
rollCallMarkedAt DateTime?
```
- 判定：**连通**。两处口径若不一致，扣减一律以 `Attendance.status` 为准；Lesson 无第二套汇总口径可读。
- 确定性：[已核实]

#### C2：status → 扣减规则全枚举映射

**普通班（非 INTENSIVE）**，计费模式由学期 kind 决定：`WEEKEND → PER_HOUR`，其余（SUMMER/REGULAR/WINTER/OTHER/null）→ `MONTHLY`（`src/lib/attendance-hours.ts:13-15`）。

| AttStatus 枚举 | PER_HOUR（周末学期，没来不扣） | MONTHLY（按月/默认，来不来都算） | 依据行号 |
|---|---|---|---|
| `PRESENT` | 扣 | 扣 | `attendance-hours.ts:19` `if (normalized === 'PRESENT') return true` |
| `ABSENT` | **不扣** | **扣** | `attendance-hours.ts:21` `if (normalized === 'ABSENT') return billingMode === 'MONTHLY'` |
| `LEAVE` | 扣 | 扣 | `attendance-hours.ts:23` `if (normalized === 'LEAVE') return true` |
| `MAKEUP` | 不扣 | 不扣 | `attendance-hours.ts:25` 兜底 `return false` |
| `LATE`（枚举外） | 入口严格解析返回 null，拒绝提交（400 INVALID_STATUS），不进入扣减 | 同左 | `attendance-status.ts:18-21`；`attendance-submission.ts:42-43`；DB 枚举无 LATE（`schema.prisma:516-521`） |
| `NULL` / 空串 / 非法值 | 入口拒绝（400 INVALID_STATUS）；DB 列非空、默认 PRESENT | 同左 | `attendance-submission.ts:42-43`；`schema.prisma:531` |

- 扣减时长口径：一对一按 `actualMinutes || lessonMinutes` 折算，小班按 `lessonMinutes` 折算（`attendance-hours.ts:55-59`）；分钟→小时保留 1 位小数（`src/lib/hours.ts:6-8`）。

**突击班（INTENSIVE）**：`attendance-hours.ts:49-51` 优先走 `calculateIntensiveDeductHours`，不看 PER_HOUR/MONTHLY 计费模式。

| 状态 | 是否扣 | 依据行号 |
|---|---|---|
| `PRESENT` | 扣（按 actualMinutes 折小时） | `intensive-class.ts:40-41` |
| `ABSENT` | **扣**（与普通班 PER_HOUR 口径不同） | `intensive-class.ts:40` `if (normalized !== 'PRESENT' && normalized !== 'ABSENT') return 0` |
| `LEAVE` | 不扣 | `intensive-class.ts:39` |
| `MAKEUP` | 不扣 | `intensive-class.ts:39` |
| `CANCELLED`（枚举外） | 不扣 | `intensive-class.ts:39` |
| 其他 / 未知 / 空 | 不扣 | `intensive-class.ts:40` |

```ts
// src/lib/intensive-class.ts:37-42
export function calculateIntensiveDeductHours(status: string, actualMinutes: number) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'LEAVE' || normalized === 'MAKEUP' || normalized === 'CANCELLED') return 0
  if (normalized !== 'PRESENT' && normalized !== 'ABSENT') return 0
  return minutesToHours(actualMinutes)
}
```

**调整路径（管理员单人更正）口径差异**：
```ts
// src/app/api/admin/attendance/adjust/route.ts:75-84
// 新状态该不该扣课时；ABSENT 一律不扣（学生没来不应扣课时）
const newShouldDeduct = newStatus === 'ABSENT'
  ? 0
  : calculateAttendanceDeductHours({
      status: newStatus, courseType: group.course?.type,
      lessonMinutes: group.lessonMinutes, actualMinutes: attendance.actualMinutes,
      intensiveMode: group.intensiveMode,
    })
```
- 差异 1：调整路径 ABSENT **一律 0**，不区分 PER_HOUR / MONTHLY；而提交路径 MONTHLY 班 ABSENT 是要扣的（`attendance-hours.ts:21`）。
- 差异 2：调整路径调用 `calculateAttendanceDeductHours` **未传 `billingMode`**，函数默认 `MONTHLY`（`attendance-hours.ts:17`），周末班（PER_HOUR）在更正场景拿不到计费模式分支。
- 确定性：[已核实]

#### C3：双真相（status vs rollCallStatus）

- 同一行存在两套状态：`status`（`AttStatus` 枚举）与 `rollCallStatus`（自由字符串 `PRESENT/ABSENT/LATE`）。
- **扣减读 `status`**：见节点2 C1 证据；全仓未发现扣减计算读取 `rollCallStatus`。
- **展示读 `rollCallStatus` 优先、回退 `status`**：
```ts
// src/app/teacher/interaction/_components/shell.tsx:524-527
const isLate = record?.rollCallStatus === 'LATE'
const isPresent = record?.rollCallStatus === 'PRESENT'
  || (!record?.rollCallStatus && (record?.status === 'PRESENT' || record?.status === 'MAKEUP'))
const isAbsent = record?.rollCallStatus === 'ABSENT' || record?.status === 'ABSENT'
```
- 漂移路径：调整路由只改 `status`，不清 `rollCallStatus`（`adjust/route.ts:161-164`）。若 status 被改成 ABSENT 而 rollCallStatus 仍为 PRESENT，展示侧 `isAbsent` 有 status 兜底；但若 status 改成 PRESENT 而 rollCallStatus 仍为 ABSENT，`isAbsent` 仍会命中 rollCallStatus。
- DB 中是否已存在实际不一致行：**[待验证]**（本地无数据库驱动，未抽样）。
- 确定性：[已核实] 代码机制；[待验证] 库内实际数据。

#### C4：幂等性（重复提交会不会双扣）

三层防线，均为 [已核实]：

1. **前置守卫**（事务外，快速拒绝）：
```ts
// src/app/api/admin/attendance/submit/route.ts:65-75
if (
  lesson.attendanceSubmittedAt
  || lesson.status === 'COMPLETED'
  || lesson.hoursDeductedAt
  || lesson.attendances.some((attendance) => Number(attendance.hoursDeducted || 0) > 0)
) {
  return NextResponse.json(
    { error: '本节课考勤已经提交或结算，不能整课重提；请使用管理员的单人考勤更正流程' },
    { status: 409 },
  )
}
```
教师端同构：`teacher/attendance/route.ts:339-352`（`existingDeductedCount` + 三字段守卫）。

2. **事务级乐观占位**（防并发双击/双请求）：
```ts
// src/app/api/admin/attendance/submit/route.ts:157-167
const submissionClaim = await tx.classLesson.updateMany({
  where: {
    id: lessonId, deletedAt: null,
    status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
  },
  data: { attendanceSubmittedAt: now },
})
if (submissionClaim.count !== 1) throw new Error('ATTENDANCE_SUBMISSION_LOCKED')
```
教师端：`teacher/attendance/route.ts:452-462`。

3. **单条幂等键 = `Attendance.hoursDeducted`（数值，非时间戳）**：
```ts
// src/app/api/admin/attendance/submit/route.ts:210-223
if (hoursDeducted > 0 && (!attendance.hoursDeducted || attendance.hoursDeducted <= 0)) {
  const posting = await postAttendanceHours(tx, { ... })
  if (!posting.posted) continue
  deductedCount += 1
}
```
教师端同守卫：`teacher/attendance/route.ts:522-523`。

4. **余额条件更新防超扣**：`remainHours: { gte: safeDeduct }` 条件更新，失败重试 3 次（`src/lib/attendance-balance.ts:57-73`，见节点3）。

- 注意：`Attendance` 表上**没有** `hoursDeductedAt` 时间戳字段；课次级时间戳 `hoursDeductedAt` 在 `ClassLesson` 上（`schema.prisma:347`）。单条幂等靠 `hoursDeducted > 0` 这个数值标记。
- 判定：**连通（幂等成立）**。整课重提被第 1/2 层拦截；漏网的单条由第 3 层 `hoursDeducted` 守卫挡住，不会二次 posting。
- 确定性：[已核实]

### 节点3：课时扣减（posting → balance）

- 写入方：`src/lib/attendance-hour-posting.ts` 按 `enrollment.totalHours` 分流——`totalHours <= 0` 走累计制 `accrueEnrollmentHours`；否则走预付费 `deductEnrollmentHours`。
- 读取方：台账 Enrollment.remainHours / usedHours。
- 对齐字段 / 判定依据：`enrollmentId` + `lessonId` + `studentId`，流水落 `HourTransaction`。
- 关键代码（预付费扣减）：
```ts
// src/lib/attendance-balance.ts:57-85
for (let attempt = 0; attempt < 3; attempt += 1) {
  const current = await tx.enrollment.findUnique({
    where: { id: enrollmentId }, select: { remainHours: true },
  })
  const available = roundHours(Number(current?.remainHours || 0))
  const safeDeduct = roundHours(Math.min(requested, available))
  if (safeDeduct <= 0) return { deducted: 0, beforeHours: available, afterHours: available }

  const claimed = await tx.enrollment.updateMany({
    where: { id: enrollmentId, remainHours: { gte: safeDeduct } },
    data: { usedHours: { increment: safeDeduct }, remainHours: { decrement: safeDeduct } },
  })
  if (claimed.count !== 1) continue
  ...
}
throw new Error('ENROLLMENT_BALANCE_CONFLICT')
```
```ts
// src/lib/attendance-hour-posting.ts:61-80
const deduction = await deductEnrollmentHours(tx, input.enrollmentId, input.hours)
if (deduction.deducted <= 0) return { posted: false, ... }
await tx.attendance.update({ where: { id: input.attendanceId }, data: { hoursDeducted: deduction.deducted } })
await tx.hourTransaction.create({ data: { ..., type: 'ATTENDANCE_DEDUCT', ... } })
await syncStudentHourSnapshot(tx, input.studentId)
```
- 累计制（`totalHours === 0`）：只增 `usedHours`，`remainHours` 保持 0（`attendance-balance.ts:31-40`；posting.ts:37-58）。
- 判定：**部分连通**。扣减、考勤标记、流水、学生快照在同一事务内写入（posting.ts:40-57 / 63-80）；但冲突异常未被业务层捕获（详见 C5）。
- 确定性：[已核实]

#### C5：`ENROLLMENT_BALANCE_CONFLICT` 传播路径

- 抛出点：`src/lib/attendance-balance.ts:87`。全仓 grep `ENROLLMENT_BALANCE_CONFLICT` 仅 1 处匹配（即抛出点），**无任何 catch**。
- 提交路由 catch 只识别 4 个业务码，其余原样 rethrow：
```ts
// src/app/api/admin/attendance/submit/route.ts:309-323
} catch (error) {
  if (error instanceof Error && error.message === 'ATTENDANCE_SUBMISSION_LOCKED') { ... 409 }
  if (error instanceof Error && error.message === 'NO_ATTENDING_STUDENTS') { ... 400 }
  if (error instanceof Error && error.message === 'ATTENDANCE_ROSTER_CHANGED') { ... 409 }
  if (error instanceof Error && error.message === 'INTENSIVE_SETTLEMENT_LOCKED') { ... 409 }
  throw error
}
```
- 教师端同构：`teacher/attendance/route.ts:654-690`，未知错误 `:689 throw error`；调整路由 `adjust/route.ts:91` 事务无内层 catch。
- 最终兜底 apiHandler：
```ts
// src/lib/api-handler.ts:136-140
const isDev = process.env.NODE_ENV !== 'production'
const message = isDev && err instanceof Error ? err.message : '服务器错误，请稍后重试'
console.error('[API Error]', sanitizeUrlForLog(req?.url), safeError)
return NextResponse.json({ error: message }, { status: 500 })
```
- 传播后果（[已核实] 代码机制）：
  1. Prisma `$transaction` 内抛出 → **整课事务回滚**：已 upsert 的考勤行、已扣课时、已写流水、meal 同步、工资入账全部回滚，不会留下"部分扣减"。
  2. 生产环境只返回通用文案"服务器错误，请稍后重试"，**不带课时冲突语义**；只有 dev 才暴露 `ENROLLMENT_BALANCE_CONFLICT`。
  3. 触发条件：3 次条件更新 `remainHours gte safeDeduct` 全部失败——典型场景是同一学员的两门课次在同一时段并发提交扣减（read-committed 下余额被另一事务先行扣走）。概率低，但一旦触发，界面只看到通用 500，运营无法从文案判断是余额冲突。
- 确定性：[已核实] 代码路径；并发实际触发频率 [待验证]。

### 节点4：余额汇总（Enrollment 台账 vs Student 快照，C6）

- 台账真相：`Enrollment.totalHours / usedHours / remainHours`（`prisma/schema.prisma:472-474`）。
- 快照层：`Student.remainHours / totalHours`，由 active enrollment 求和回写；Student 表**无 usedHours 字段**（`schema.prisma:87-88`）。
```ts
// src/lib/student-hour-snapshot.ts:5-17
export async function syncStudentHourSnapshot(tx: Prisma.TransactionClient, studentId: string) {
  const activeEnrollments = await tx.enrollment.findMany({
    where: { ...activeEnrollmentWhere, studentId },
    select: { remainHours: true, totalHours: true },
  })
  const remainHours = activeEnrollments.reduce((sum, e) => sum + Number(e.remainHours || 0), 0)
  const totalHours = activeEnrollments.reduce((sum, e) => sum + Number(e.totalHours || 0), 0)
  await tx.student.update({ where: { id: studentId }, data: { remainHours, totalHours } })
  return { remainHours, totalHours }
}
```
- 快照同步时机（本段范围内）：扣减后 `posting.ts:80`；累计后 `posting.ts:57`；调整路由有退/补时 `adjust/route.ts:186`；突击班审核通过 `intensive-review.ts:447-448`；突击班结算调整 `intensive-settlement.ts:248-250`。范围外写路径（报名、退班、手工调课、撤销回收、schedule 生成等）经 grep 均调用 `syncStudentHourSnapshot`，清单见 `src/lib/student-hour-snapshot.ts` 调用方：enrollments、class-groups、schedules、data-admin、data-correction/trash、students/[id]/status、sync-hours。
- 快照口径过滤：`activeEnrollmentWhere = { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere, group: visibleClassGroupWhere }`（`src/lib/business-visibility.ts:74-79`）；退班/删除 enrollment 不计入快照。
- 读者分裂（[已核实]）：
  - 实时求和台账：`src/app/api/teacher/students/route.ts:167-168`（遍历 activeEnrollments 求和 remainHours/totalHours）。
  - 读 Student 快照：`src/app/api/renewals/route.ts:55`（`student.remainHours <= lowHoursWarn`）、`src/app/api/performance/route.ts:98`、`src/app/api/teacher/students/[id]/context/route.ts:27`、`src/app/api/settings/export/students/route.ts:30`。
- 判定：**部分连通**。扣减后快照在同事务内刷新，台账与快照在本段写路径上保持一致；但存在两套读取口径，且累计制学员的 usedHours 不上 Student 快照。
- 确定性：[已核实] 写路径同步与读者位置；前端各页面最终展示读哪套 [待验证]。

### 节点5：工资入账（仅调用边界，金额规则不属本段）

- 调用位置：提交事务内 `submit/route.ts:266-269`；教师端 `teacher/attendance/route.ts:642-645`。
- 边界核实：`createLessonPayInTransaction` 先 `FOR UPDATE` 锁课次，读 `attendances.status` 只做"是否有出勤学员"守卫，写 `TeacherSalaryTransaction`，**不触碰** Enrollment.remainHours / usedHours：
```ts
// src/lib/teacher-salary.ts:136-151
const lesson = await tx.classLesson.findUnique({
  where: { id: lessonId },
  include: { group: { include: { course: true } }, attendances: { select: { status: true } } },
})
...
if (!hasAttendingStudent(lesson.attendances)) {
  return { success: false, error: '本次课没有实际出勤学员，不能计入课时工资' }
}
```
- 工资失败会 `throw new Error(...)`（`submit/route.ts:268`），与课时扣减**同事务回滚**——即工资入账失败会连带撤销本次课时扣减。
- 判定：**连通（边界清晰）**。工资与课时账务共用事务、互不写对方台账；工资金额规则归其他审计分片。
- 确定性：[已核实]

### 节点6：前端读取（余额/状态展示侧）

- 考勤明细读取：`src/app/api/attendance/[lessonId]/route.ts:45-59` 返回 Attendance 全字段 + `enrollment.remainHours/usedHours`；展示侧状态口径见节点2 C3（rollCallStatus 优先）。
- 今日课次：`src/app/api/attendance/today/route.ts:187` 读 `enrollment.remainHours`。
- 判定：**部分连通**。后端接口同时暴露台账 enrollment 字段与 Student 快照字段；页面最终取用哪一套需前端代码复核（超出本段后端范围）。
- 确定性：[待验证]

## 三、风险与修复建议（只写建议，不实施）

| # | 风险描述 | 触发条件 | 影响面 | 等级 | 建议（一句话方向，不写代码） |
|---|---|---|---|---|---|
| R1 | `ENROLLMENT_BALANCE_CONFLICT` 无业务 catch，冒到 apiHandler 返回 500；生产文案为通用"服务器错误"，事务整体回滚，运营无法从提示判断是余额并发冲突 | 同一 enrollment 并发扣减，3 次条件更新均失败 | 本节整课考勤提交失败（含已扣课时/流水/meal/工资全部回滚），界面无业务化提示 | 高 | 在提交/调整路由 catch 该错误码并映射为 409/可重试的业务提示；冲突时保留已写考勤事实并提示稍后重试，或在 balance 层延长重试与退避 |
| R2 | 调整路径与提交路径 ABSENT 口径不一致：提交路径 MONTHLY 班 ABSENT 照扣，调整路径 ABSENT 一律退为 0；且调整路径未传 billingMode | MONTHLY/周末班学员被单人更正为 ABSENT 后，已扣课时的退还口径与原扣减口径对不上 | 个别学员课时多退/少退，台账与流水口径漂移 | 中 | 调整路径复用 `calculateAttendanceDeductHours` 的同一计费模式入参，ABSENT 规则与提交路径对齐，并补回归测试覆盖两种 billingMode |
| R3 | `status` 与 `rollCallStatus` 双字段在更正后可能漂移：adjust 只改 status | 管理员把缺勤改成出勤（或反向）后，rollCallStatus 残留旧值 | 点名/互动页展示与考勤事实不一致；扣减不受影响（只读 status） | 中 | 更正状态时同步重写或清空 rollCallStatus，或在展示侧统一以 status 为考勤事实口径 |
| R4 | Student 快照与 Enrollment 台账两套读取口径并存；快照不含 usedHours，累计制（totalHours=0）学员已上课时在 Student 侧恒为 0 | 页面读 Student.remainHours 展示累计制学员课时；或某范围外写路径漏调 snapshot | 不同页面课时数字打架；累计制学员已上课时展示缺失 | 中 | 统一前端取数口径（优先实时求和台账或明确快照为唯一来源），并梳理累计制学员 usedHours 的展示位置 |
| R5 | 课时按 1 位小数（6 分钟粒度）四舍五入，Float 累加；每次扣减重新 findUnique 读余额再算 | 多次短课时累加、退补交错 | 长周期尾差；当前有 roundHours 兜底，量级小 | 低 | 观察长周期 Float 尾差，必要时改定点分/整数分钟存储 |

## 四、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|---|---|
| N1 | 扣减唯一口径是 `Attendance.status`，Lesson 无冗余出勤汇总字段 | 扣减入参只取 `status`（`submit/route.ts:182,202-209`；`teacher/attendance/route.ts:475,514-521`）；`ClassLesson` 模型全段无 present/absent 计数字段（`schema.prisma:332-379`） |
| N2 | 整课重复提交不会双扣 | 事务内条件 `updateMany` 占位，`count !== 1` 即抛锁（`submit/route.ts:157-167`；`teacher/attendance/route.ts:452-462`）；前置 409 守卫（`submit/route.ts:65-75`） |
| N3 | 单条已扣记录不会二次 posting | 单条幂等键 `hoursDeducted > 0` 守卫（`submit/route.ts:210`；`teacher/attendance/route.ts:523`） |
| N4 | 并发超扣被条件更新拦住 | `updateMany where remainHours gte safeDeduct`，不满足则不计入本次扣减（`attendance-balance.ts:66-73`）；余额不足时 `deducted=0` 不写负余额（`:64`） |
| N5 | 考勤行、扣减标记、课时流水、学生快照同事务写入 | posting 内 `attendance.update` → `hourTransaction.create` → `syncStudentHourSnapshot` 顺序在同一 tx 内（`attendance-hour-posting.ts:40-57` 累计；`:63-80` 扣减） |
| N6 | 点名（课堂互动）不产生课时账务 | 点名 upsert 只写 status/rollCallStatus/rollCallMarkedAt，无 hoursDeducted/hourTransaction 写入（`interaction/route.ts:245-266`；约束注释 `:22-24`） |
| N7 | 工资入账不回写课时台账 | `createLessonPayInTransaction` 仅读 attendances.status 做出勤守卫，写 TeacherSalaryTransaction，无 enrollment 余额字段写入（`teacher-salary.ts:136-183`） |
| N8 | 调整退课课时有流水留痕 | 退还写 `HourTransaction type=ATTENDANCE_REFUND`，并把考勤 `hoursDeducted` 置 0（`adjust/route.ts:122-138`） |

## 五、未能确认 / 需要运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|---|---|---|
| U1 | 库内是否已存在 `status` 与 `rollCallStatus` 实际不一致的考勤行 | 本地无 psql / psycopg2，未跑只读 SELECT | 执行：`SELECT lesson_id, student_id, status, roll_call_status FROM "Attendance" WHERE deleted_at IS NULL AND roll_call_status IS NOT NULL AND status::text <> CASE roll_call_status WHEN 'LATE' THEN 'PRESENT' ELSE roll_call_status END;`（只读） |
| U2 | 家长端 / 教师端各课时卡片最终读 Student 快照还是 Enrollment 实时求和 | 属前端页面取数，超出本段后端接口梳理范围 | 逐页核对调用的 API：`teacher/students`（实时求和）vs `renewals / performance / context / export`（快照） |
| U3 | 累计制（totalHours=0）学员的已上课时在前端是否有展示位 | Student 无 usedHours 字段，快照不含累计课时 | 检查累计制学员详情页是否读取 Enrollment.usedHours（如 `attendance/[lessonId]:55`、`appointment-detail:28` 已暴露 usedHours） |
| U4 | `ENROLLMENT_BALANCE_CONFLICT` 在生产是否真实出现过、频率多少 | 需运行态日志 / Sentry 事件统计 | 在 Sentry 或服务日志按 `ENROLLMENT_BALANCE_CONFLICT` 检索近 30 天事件量 |
| U5 | 范围外写路径（报名/退班/调课/回收/撤销）是否全部调用了 `syncStudentHourSnapshot`，有无漏调导致快照漂移 | 本次仅按 grep 调用清单核对，未逐路径读实现 | 对每个写 Enrollment.remainHours/usedHours 的路由补一次"写后是否同步快照"的代码走查 |

## 六、与预置事实不符

| # | 预置说法 | 实际情况 | 证据 |
|---|---|---|---|
| D1 | 预置把 `hoursDeductedAt` 列为 Attendance 可能含有的幂等字段 | `Attendance` 模型只有 `hoursDeducted Float`，**无** `hoursDeductedAt` 时间戳；`hoursDeductedAt` 是 `ClassLesson` 字段。单条幂等键是 `hoursDeducted` 数值，课次级锁定靠 ClassLesson 的 `attendanceSubmittedAt / hoursDeductedAt` | `schema.prisma:531-538`（Attendance）；`schema.prisma:347-350`（ClassLesson）；`submit/route.ts:210` |
| D2 | 预置：`ENROLLMENT_BALANCE_CONFLICT` 在 `attendance-balance.ts:87` 抛出且全仓无 catch | 复核**属实**：全 src grep 仅抛出点 1 处匹配，无 catch | `attendance-balance.ts:87`；grep 结果仅此 1 条 |
| D3 | 预置：submit 路由引 teacher-salary | 属实（`submit/route.ts:6,267`）；但 `createLessonPayInTransaction` 不碰 enrollment 课时余额，只读 attendances.status 做出勤守卫 | `teacher-salary.ts:136-151` |
| D4 | 预置提到 `attendance-stats.ts` 的 `clampDeductHours` 参与扣减 | 该函数**无生产调用方**（仅定义与测试引用）；实际扣减封顶在 `attendance-balance.ts:63` `safeDeduct = min(requested, available)` 完成 | `attendance-stats.ts:6-10`；grep `clampDeductHours` 仅定义 + 测试 |
| D5 | 预置：adjust 目录下有审核、撤销、批量、补录等 route | 实际 `src/app/api/admin/attendance/` 下只有 `submit/route.ts` 与 `adjust/route.ts` 两个写路由；其余考勤读写在 `src/app/api/attendance/*`（GET 为主）与 `src/app/api/teacher/attendance/route.ts` | Glob 结果：`admin/attendance/` 仅 adjust、submit 两个目录 |
