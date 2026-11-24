# A-点名写入（ID: A）

> 范围：教师端课堂互动「点名 → Attendance 写入」一段。仅覆盖点名/抽人/课堂互动侧及其直接对齐的考勤读取侧；课时扣减、工资入账、反馈落库等链路由其他分片负责，本分片不下结论。
> 审计方式：只读 Grep + 局部 Read，未改源码、未碰数据库、未重启服务。确定性标注：`[已核实]` / `[推断]` / `[待验证]`。

## 一、结论速览

| # | 链路节点 | 结论 | 风险等级 | 一句话证据 |
|---|---------|------|---------|-----------|
| 1 | 点名写入 → Attendance 同表同记录对齐 | 连通 | 低 | `prisma/schema.prisma:545` 复合唯一键 `[lessonId, studentId]`，点名 upsert 用同一键 `src/app/api/teacher/interaction/route.ts:246-250` |
| 2 | 提交态 gate：先提交考勤再点名 | 连通 | 低 | 服务端 gate `src/app/api/teacher/interaction/route.ts:148-153`，命中即 409 拒绝，不静默丢弃、不覆盖 |
| 3 | 约束遵守：点名侧只写 status / rollCallStatus，不碰 hoursDeducted、不碰工资 | 连通 | 低 | 点名侧 4 个写操作枚举见「节点8」全量清单，均无 `hoursDeducted` / `HourTransaction` / `TeacherSalaryTransaction` 字段 |
| 4 | LEAVE（请假）分支：点名不可改写请假事实 | 连通 | 低 | 状态白名单 `src/lib/classroom-interaction.ts:25,38-40` 不含 LEAVE；请假行整批拦截 `src/app/api/teacher/interaction/route.ts:211-226` |
| 5 | pick（随机抽人）落库与考勤的关联 | 连通 | 低 | 抽人只写 `classroomPick`，考勤仅被读取用于剔除缺勤/请假 `src/app/api/teacher/interaction/pick/route.ts:62-71,105-114`，靠 `lessonId` 关联 |
| 6 | 全仓其他 Attendance 写入点（非点名侧） | 部分连通 | 中 | 考勤提交/管理更正/突击班结算/补课/数据重置共 13 处写入点已枚举隔离，点名侧未误入；详见「节点8」 |

**本段总判断：点名与考勤数据联通。** 点名写入的就是考勤页/管理端读取的同一条 Attendance 记录，对齐键为 `lessonId + studentId` 复合唯一约束；考勤一旦提交，点名在服务端被 409 锁定；点名侧全部写入点均未触碰 `hoursDeducted` 与工资账务。

## 二、详细证据

### 节点1：点名写入与考勤读取对齐到同一条记录

- 写入方：`src/app/api/teacher/interaction/route.ts:245-266` — 主提交事务内按复合唯一键 upsert Attendance。
- 读取方（教师考勤页）：`src/app/api/teacher/attendance/route.ts:144`（按 `studentId` 在 `lesson.attendances` 内匹配）、`:171`（`attendances: { where: { deletedAt: null }, select: { id, status, studentId } }`）。
- 读取方（点名页）：`src/app/api/teacher/interaction/route.ts:81-84`（`attendance.findMany({ where: { lessonId, deletedAt: null } })`）。
- 对齐字段：`lessonId + studentId`，DB 层复合唯一约束兜底。
- 关键代码：
```ts
// prisma/schema.prisma:545
@@unique([lessonId, studentId], name: "attendance_lesson_student_unique")
```
```ts
// src/app/api/teacher/interaction/route.ts:245-250
return prisma.attendance.upsert({
  where: {
    attendance_lesson_student_unique: {
      lessonId: body.lessonId!,
      studentId: record.studentId,
    },
  },
```
- 判定：连通。点名 upsert 与考勤提交 upsert（`src/app/api/teacher/attendance/route.ts:496-501`）使用同一个唯一键名 `attendance_lesson_student_unique`，不存在第二张考勤表或影子记录。
- 确定性：[已核实]

### 节点2：提交态 gate 时序（先提交考勤 → 再点名）

- gate 位置：`src/app/api/teacher/interaction/route.ts:143-153`。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:143-153
const lesson = await prisma.classLesson.findUnique({
  where: { id: body.lessonId },
  select: { attendanceSubmittedAt: true, hoursDeductedAt: true, groupId: true, rollCallSubmittedAt: true },
})
if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
if (lesson.attendanceSubmittedAt || lesson.hoursDeductedAt) {
  return NextResponse.json(
    { error: '本节课考勤已提交，点名已锁定。如需修改请到考勤调整。' },
    { status: 409 },
  )
}
```
- 覆盖分支：该 gate 位于三个写分支之前 —— reset（`:156-161`）、late（`:165-184`）、主提交（`:187` 起）—— 任一分支到达写操作前都先过这道 gate。
- 判定：**拒绝（HTTP 409）**，不是静默丢弃，也不是覆盖已提交结果。触发条件：`ClassLesson.attendanceSubmittedAt` 非空，或 `ClassLesson.hoursDeductedAt` 非空。
- 反向时序（先点名 → 后提交考勤）：考勤提交 upsert 的 update 数据为 `{ status, enrollmentId, actualMinutes, deletedAt, deletionBatchId: null }`（`src/app/api/teacher/attendance/route.ts:503`），**未包含** `rollCallStatus / rollCallMarkedAt / hoursDeducted`，点名事实与已扣课时在考勤提交后保留不被清空。
- 确定性：[已核实]

### 节点3：迟到补记（LATE）写入点

- 写入方：`src/app/api/teacher/interaction/route.ts:180-183`（action=`late`，提交后学员才到，把缺勤补记为迟到）。
- 前置条件：`lesson.rollCallSubmittedAt` 非空（`:166-168`，未提交点名直接 409）；目标记录必须是缺勤（`:177-179`，`rollCallStatus !== 'ABSENT' && status !== 'ABSENT'` 时 409）；先过节点2 的考勤提交 gate（`:148`）。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:180-183
await prisma.attendance.update({
  where: { id: target.id },
  data: { status: 'PRESENT', rollCallStatus: 'LATE', rollCallMarkedAt: new Date() },
})
```
- 改动字段：`status`（→PRESENT）、`rollCallStatus`（→LATE）、`rollCallMarkedAt`。未触碰 `hoursDeducted`、`actualMinutes`、`MakeupRequest`、任何工资/课时流水表。
- 确定性：[已核实]

### 节点4：主提交（PRESENT / LATE / ABSENT）写入点

- 写入方：`src/app/api/teacher/interaction/route.ts:241-273`，单事务内逐人 upsert + 写 `ClassLesson.rollCallSubmittedAt`。
- 状态映射：`src/app/api/teacher/interaction/route.ts:12-16`，迟到仍算到课（`LATE → PRESENT`），仅课堂事实落在 `rollCallStatus`。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:252-265
create: {
  lessonId: body.lessonId!,
  studentId: record.studentId,
  enrollmentId,
  status: attendanceStatus,
  rollCallStatus: record.rollStatus,
  rollCallMarkedAt: markedAt,
},
update: {
  status: attendanceStatus,
  rollCallStatus: record.rollStatus,
  rollCallMarkedAt: markedAt,
  ...(enrollmentId ? { enrollmentId } : {}),
},
```
- 前置条件：节点2 gate（`:148`）；点名已提交则 409（`:187-192`）；名单必须属于本课应到学员（`:200-203`）；状态合法性白名单（`:204-206`）；请假行整批拦截（节点5）。
- 改动字段：`status`、`rollCallStatus`、`rollCallMarkedAt`、`enrollmentId`（可空补写）。未触碰 `hoursDeducted`、`actualMinutes`、`deletedAt`、`MakeupRequest`、工资流水。
- 确定性：[已核实]

### 节点5：LEAVE（请假）保护 —— 点名侧不可写请假

- 状态白名单：`src/lib/classroom-interaction.ts:25,38-40`，点名三态仅 `PRESENT / ABSENT / LATE`，**不含 LEAVE**；服务端 `isRollCallStatus` 校验不通过即抛 `ValidationError('点名状态不合法')`（`route.ts:204-206`）。
- 请假行拦截：`src/app/api/teacher/interaction/route.ts:211-226`，已存在 `status='LEAVE' 且 rollCallStatus=null` 的记录时，整批 409，不改动考勤。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:211-226
const leaveRows = await prisma.attendance.findMany({
  where: {
    lessonId: body.lessonId,
    deletedAt: null,
    status: 'LEAVE',
    rollCallStatus: null,
    studentId: { in: records.map((record) => record.studentId) },
  },
  select: { studentId: true },
})
if (leaveRows.length > 0) {
  return NextResponse.json(
    { error: '名单中包含已请假的学员，点名不改动考勤；实际到课请到考勤页调整' },
    { status: 409 },
  )
}
```
- 补充：请假审批接口 `src/app/api/leave-requests/[id]/route.ts:44-91` 本身只写 `LeaveRequest` 状态与通知/日志，**不直接写 Attendance**；Attendance 的 `LEAVE` 状态由考勤提交流程（教师/管理员）在提交记录时落库，或在考勤页读取侧按生效请假单兜底展示（`src/app/api/teacher/attendance/route.ts:145`）。
- 确定性：[已核实]

### 节点6：撤销点名（reset）写入点

- 写入方：`src/app/api/teacher/interaction/route.ts:156-161`（action=`reset`）。
- 关键代码：
```ts
// src/app/api/teacher/interaction/route.ts:155-161
// 撤销提交：只解锁点名，不动已经写入的出勤事实
if (isReset) {
  await prisma.classLesson.update({
    where: { id: body.lessonId },
    data: { rollCallSubmittedAt: null },
  })
  return NextResponse.json({ ok: true, rollCallSubmitted: false, rollCallSubmittedAt: null })
}
```
- 改动字段：仅 `ClassLesson.rollCallSubmittedAt = null`；**不删、不改**任何 Attendance 行，不动 `hoursDeducted`、工资流水。前置条件同节点2 gate（`:148`，考勤已提交则 409）。
- 前端对应：`src/app/teacher/interaction/_components/shell.tsx:236-255`，撤销只清本地 `rollCallSubmitted` 标记，提示「已经写入的出勤记录不会删除，重新提交会覆盖」（`roll-call/page.tsx:148-153`）。
- 确定性：[已核实]

### 节点7：pick（随机抽人）落库与考勤关联

- 写入方：`src/app/api/teacher/interaction/pick/route.ts:105-114`（create）、`:159-162`（写 `notifiedAt`）、`:202`（delete）、`:233-240`（PATCH result/comment/questionLabel）—— 全部只操作 `classroomPick` 表。
- 对 Attendance 的操作仅为**读取**：`:62-71`，剔除 `ABSENT / LEAVE` 学员出候选池；`:80-82`，手动指定缺勤/请假学员时 409。
- 关键代码：
```ts
// src/app/api/teacher/interaction/pick/route.ts:62-71
const attendance = await prisma.attendance.findMany({
  where: { lessonId: body.lessonId, deletedAt: null },
  select: { studentId: true, status: true },
})
const skippedIds = new Set(
  attendance
    .filter((row) => row.status === 'ABSENT' || row.status === 'LEAVE')
    .map((row) => row.studentId),
)
```
- 关联方式：`classroomPick.lessonId` 外键关联课次，再经课次下的 Attendance 对齐学员；抽人记录本身不复制、不落考勤状态。
- 边界：pick 接口**没有**考勤提交态 gate（不像点名 route 在 `:148` 锁定），但因其不写 Attendance，提交后继续抽人/点评不会污染考勤或课时。
- 确定性：[已核实]

### 节点8：全仓 Attendance 写入点清单（B 题全量表）

枚举口径：Grep `attendance.(create|update|upsert|deleteMany|updateMany|upsertMany|createMany)` 全仓 `src/`，命中 17 处（排除 `.test.ts` 断言）。「点名侧」= 课堂互动接口；其余为非点名链路，列出用于证明隔离，其内部正确性由对应分片复核。

| # | 写入点 file:line | 改动字段 | 是否触碰 hoursDeducted | 是否触碰 TeacherSalaryTransaction / 工资 | 是否被提交态 gate | 归属链路 |
|---|------------------|---------|----------------------|------------------------------------------|------------------|---------|
| 1 | `src/app/api/teacher/interaction/route.ts:180-183`（late 补记） | `status`, `rollCallStatus`, `rollCallMarkedAt` | 否 | 否 | 是：`route.ts:148`（考勤提交/结算锁定）+ `:166`（点名已提交）+ `:177`（仅缺勤可补） | **点名侧** |
| 2 | `src/app/api/teacher/interaction/route.ts:245-266`（主提交 upsert） | `status`, `rollCallStatus`, `rollCallMarkedAt`, `enrollmentId` | 否 | 否 | 是：`route.ts:148` + `:187`（点名已提交）+ `:211-226`（请假拦截）+ 名单/状态校验 `:200-208` | **点名侧** |
| 3 | `src/app/api/teacher/interaction/route.ts:157-160`（reset 撤销） | 仅 `ClassLesson.rollCallSubmittedAt`；不写 Attendance | 否 | 否 | 是：`route.ts:148` | **点名侧**（元数据解锁） |
| 4 | `src/app/api/teacher/interaction/route.ts:269-272`（事务内写提交时间） | 仅 `ClassLesson.rollCallSubmittedAt` | 否 | 否 | 与 #2 同事务，前置 gate 同上 | **点名侧**（元数据锁定） |
| 5 | `src/app/api/teacher/attendance/route.ts:496-505`（教师考勤提交 upsert） | `status`, `enrollmentId`, `actualMinutes`, `deletedAt`, `deletionBatchId` | 间接：经 `postAttendanceHours`（`:524-533`）写 `hoursDeducted` 并生成 `HourTransaction` | **是（间接）**：同事务 `:642-645` 调 `createLessonPayInTransaction` 入账 `LESSON_PAY`（非突击班） | 是：`:346-353`（已提交/已结算/已扣课时 409）+ `:452-462`（updateMany 乐观锁 claim） | 考勤提交（他片） |
| 6 | `src/app/api/admin/attendance/submit/route.ts:190-199`（管理员整课提交 upsert） | `status`, `enrollmentId`, `actualMinutes`, `deletedAt`, `deletionBatchId` | 间接：经 `postAttendanceHours`（`:211-220`） | **是（间接）**：`:266-269` 普通班 `LESSON_PAY`；`:295` 突击班课时工资 | 是：`:65-75`（已提交/COMPLETED/已扣课时 409） | 考勤提交（他片） |
| 7 | `src/app/api/admin/attendance/adjust/route.ts:122-125`（管理更正：退还课时） | `hoursDeducted: 0`；补扣分支 `:142-158` 经 `postAttendanceHours` 重写 `hoursDeducted` | **是**（清零/补扣） | 否（写 `HourTransaction` 退款流水 `:126-138`，非教师工资表） | 设计上为提交后更正通道，无提交态锁定（这是唯一允许改已提交考勤的入口） | 考勤更正（他片） |
| 8 | `src/app/api/admin/attendance/adjust/route.ts:161-164`（管理更正：改状态） | `status` | 否（本 update 不含） | 否 | 同上，管理更正通道 | 考勤更正（他片） |
| 9 | `src/lib/attendance-hour-posting.ts:40-43`（累计模式入账） | `hoursDeducted: accrual.accrued` | **是** | 否（写 `HourTransaction` `:44-56` + 学生课时快照） | 由 #5/#6/#7 事务内调用，前置 gate 随调用方 | 课时入账（他片） |
| 10 | `src/lib/attendance-hour-posting.ts:63-66`（预付费扣款入账） | `hoursDeducted: deduction.deducted` | **是** | 否（写 `HourTransaction` `:67-79` + 快照） | 同 #9 | 课时入账（他片） |
| 11 | `src/lib/intensive-history.ts:223-232`（突击班历史补录 create） | `status`, `actualMinutes`, `hoursDeducted` | **是**（补录时直接带课时） | **是（间接）**：同事务 `:261` 调 `createIntensiveLessonPayInTransaction` 入账；另 `:242` 写 `HourTransaction` | 补录流程自身把课次标记为已提交/已结算 `:205-210` | 突击班补录（他片） |
| 12 | `src/lib/intensive-review.ts:190-213`（突击班审核 upsert） | `enrollmentId`, `status`, `actualMinutes`, `hoursDeducted: 0` | 是（显式置 0） | 否（本写入点）；同流程审核通过后 `:451` 经 helper 间接入账 | 突击班审核流程内，前置状态校验在函数前段 | 突击班审核（他片） |
| 13 | `src/lib/intensive-review.ts:394-400`（审核通过结算 update） | `actualMinutes`, `hoursDeducted: safeDeduct` | **是** | 否（本写入点）；流程内 `:451` 经 helper 入账 | 审核通过流程内 | 突击班结算（他片） |
| 14 | `src/lib/intensive-settlement.ts:220-223`（突击班课时调整 update） | `actualMinutes`, `hoursDeducted: change.newDeductedHours` | **是** | **是**：同函数 `:88`、`:147` 创建 `teacherSalaryTransaction` | 结算流程内（已结算课次） | 突击班结算 + 工资入账（他片） |
| 15 | `src/app/api/makeup-requests/[id]/route.ts:31-39`（安排补课 create） | `status: 'MAKEUP'`, `enrollmentId`, `hoursDeducted: 0` | 否（显式 0） | 否 | 补课工单流程内 | 补课（他片） |
| 16 | `src/app/api/admin/data-admin/reset/route.ts:40-42`（数据重置 deleteMany） | 整行删除 | —（删除） | 否（仅考勤表，关联工资流水在他处清理） | 管理员数据重置工具 | 数据运维（他片） |
| 17 | `src/lib/data-correction/trash.ts:325`、`:346`（回收站 purge deleteMany） | 整行删除 | —（删除） | 否（`:319-322` 工资流水由该函数另行清理） | 管理员回收站清理 | 数据运维（他片） |

**隔离性核验**：点名侧接口 `src/app/api/teacher/interaction/route.ts` 的 import 仅 7 行（`route.ts:1-7`：`next/server`、`api-handler`、`api-validate`、`teacher-portal`、`date/local-day`、`classroom-interaction-lesson`、`classroom-interaction`），未引入任何课时入账（`attendance-hour-posting`）、课时流水（`hourTransaction`）、工资（`teacherSalaryTransaction`）模块；全仓 `teacherSalaryTransaction.create` 直接调用仅出现在 `src/lib/salary-settlement.ts:58`、`src/lib/teacher-salary.ts:176,613`、`src/lib/intensive-settlement.ts:88,147`、`src/app/api/admin/salary/route.ts:244`、`src/lib/study-hall/rewards.ts:56,79`；经 helper 间接入账的调用点为 `src/app/api/teacher/attendance/route.ts:643`、`src/app/api/admin/attendance/submit/route.ts:267,295`、`src/lib/intensive-history.ts:261`、`src/lib/intensive-review.ts:451`——以上均不在点名调用链上。[已核实]

**背单词等新功能排查**：`src/app/api/parent/vocab`、`src/app/parent/vocab` 两个目录 Grep `attendance|Attendance` 命中 0 处；全仓 `attendance.create/update/upsert` 清单中亦无背单词相关路由。[已核实]

### 节点9：前端调用链与读取口径

- 列表/详情读取：`src/app/teacher/interaction/_components/shell.tsx:132`（`GET /api/teacher/interaction?date=`）、`:139`（`GET /api/teacher/interaction?lessonId=`）。
- 提交点名：`shell.tsx:189-193`（`POST /api/teacher/interaction`，body `{ lessonId, records }`）。
- 撤销提交：`shell.tsx:245-249`（`POST`，body `{ lessonId, action: 'reset' }`）。
- 补记迟到：`src/app/teacher/interaction/roll-call/page.tsx:82-86`（`POST`，body `{ lessonId, action: 'late', studentId }`）。
- 前端预锁：`roll-call/page.tsx:37` `locked = attendanceSubmitted || rollCallSubmitted`；`shell.tsx:175-182,239-242` 提交/撤销前先按本地状态拦截。前端预锁不替代服务端 gate（节点2），仅体验层。
- 点名页行数据来自同一份 `data.records`（`roll-call/page.tsx:22-31`），与考勤页读取同表同键。
- 计时器页 `src/app/teacher/interaction/timer/page.tsx` 为纯本地状态，无任何落库调用。[已核实]

## 三、风险与修复建议（只写建议，不实施）

| # | 风险描述 | 触发条件 | 影响面 | 等级 | 建议（一句话方向，不写代码） |
|---|---------|---------|-------|------|---------------------------|
| 1 | 点名 upsert 的 `update` 分支未重置 `deletedAt / deletionBatchId`（对比考勤提交 `teacher/attendance/route.ts:503` 会清软删标记）；若某行处于软删态被唯一键命中，更新后状态写回但记录仍被 `deletedAt: null` 过滤，前台不可见、后台易误以为未点 | 数据运维软删某考勤行后，教师再次提交点名（当前正常流程下软删行不会出现在名单，属边界场景） | 单条考勤记录状态与可见性不一致 | 低 | upsert update 分支补上 `deletedAt: null, deletionBatchId: null`，与考勤提交口径对齐 |
| 2 | 点名 gate（`route.ts:148`）与 `rollCallSubmittedAt` 二次校验（`:187`）在事务之外读取，两个并发 POST 可能同时穿过 gate 后各自写库；主提交事务内也未对 `ClassLesson` 做 `updateMany` 乐观锁 claim（考勤提交侧 `teacher/attendance/route.ts:452-462` 有） | 同课次两名教师/双标签页并发提交点名或同时撤销+提交 | 极端并发下提交标记或迟到补记顺序错乱 | 低 | 事务内改用带 `rollCallSubmittedAt: null` 条件的 `updateMany` claim，失败即抛锁冲突错误 |
| 3 | pick 接口无考勤提交态 gate；提交考勤后仍可继续抽人、改点评。因只写 `classroomPick` 不污染考勤，影响限于互动记录时间线 | 考勤提交后教师继续在互动页抽人 | 无考勤/课时影响，仅记录口径问题 | 低 | 如需口径一致，可在 pick PATCH/DELETE 前复用考勤提交态判断；当前可接受 |
| 4 | 请假拦截仅匹配 `rollCallStatus = null` 的 LEAVE 行；历史上先点名、后被管理更正为 LEAVE 的行不在拦截范围内，理论上点名主提交可把该生 LEAVE 覆盖回 PRESENT/ABSENT | 管理更正把已点名学员改为请假，随后考勤尚未提交、教师又撤销点名重提 | 单条请假事实被覆盖 | 低 | 拦截条件放宽为「status=LEAVE 即拦截」，或点名 update 分支跳过 LEAVE 行 |

## 四、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|-------|-------------------------------|
| 1 | 点名与考勤是同一张 Attendance 表、同一条记录 | 点名 upsert 键 `attendance_lesson_student_unique`（`interaction/route.ts:246-250`）与考勤提交 upsert 键同名（`teacher/attendance/route.ts:497-501`）；DB 复合唯一约束 `schema.prisma:545`；教师考勤页按 `lesson.attendances` + `studentId` 匹配（`teacher/attendance/route.ts:144,171`） |
| 2 | 点名侧不写 `hoursDeducted` | 点名侧 4 个写操作（`interaction/route.ts:157,180,245,269`）的 data 字段逐一核对，无 `hoursDeducted`；`hoursDeducted` 仅由入账库 `attendance-hour-posting.ts:42,65` 与结算/补录流程写入 |
| 3 | 点名侧不触碰教师工资 | 点名路由 import 无工资/流水模块（`interaction/route.ts:1-7`）；`teacherSalaryTransaction.create` 全仓仅 5 个非点名文件调用（节点8 隔离性核验） |
| 4 | 考勤先提交后，点名不能改写已提交事实 | 服务端 409 gate `interaction/route.ts:148-153` 覆盖 reset/late/主提交三分支；前端另有预锁 `roll-call/page.tsx:37,71-74,202` |
| 5 | 点名先提交后，考勤提交不清空点名事实 | 考勤提交 update 数据不含 `rollCallStatus / rollCallMarkedAt`（`teacher/attendance/route.ts:503`）；schema 中两字段独立于 `status`（`schema.prisma:537-538`） |
| 6 | 请假事实不被点名越过 | 白名单无 LEAVE（`classroom-interaction.ts:25,38-40`）；请假行整批 409（`interaction/route.ts:211-226`）；前端请假学员不可点（`roll-call/page.tsx:39-43,99,110,192,203`） |
| 7 | 抽人不产生考勤副作用 | pick 全部写操作仅 `classroomPick`（`pick/route.ts:105,159,202,233`）；Attendance 只读取剔除缺勤/请假（`pick/route.ts:62-71`） |
| 8 | 点名提交与锁定时间同事务落库 | 主事务内先逐人 upsert、再写 `rollCallSubmittedAt`（`interaction/route.ts:241-273`），不存在写一半先锁上的中间态 |

## 五、未能确认 / 需要运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|----|-------|-----------|
| 1 | 并发提交/撤销的实际竞态 | 静态代码只能看到 gate 在事务外；需两个并发请求压测才能确认是否出现交错写 | 同课次双标签页同时点「提交点名」与「撤销提交」，观察 `rollCallSubmittedAt` 与 Attendance 各行 `rollCallStatus` 是否一致 |
| 2 | 数据库层是否有触发器/视图额外约束 `hoursDeducted` 与点名字段 | 本次只读了 `schema.prisma`，未查数据库实例内的 trigger、generated column 或视图（规范禁止写库，SELECT 结构查询另议） | 由 DBA/运维侧 `\d "Attendance"` 查看是否有触发器或列默认值联动 |
| 3 | 已提交考勤后，管理更正流程回写的 `status` 与 `rollCallStatus` 在点名页/考勤页的最终展示一致性 | 更正链路属他片范围，本分片未读更正后的前端渲染分支 | 走一次管理员单人更正（ABSENT→PRESENT），核对点名页 `rollCallStatus` 角标与考勤页 `status` 是否分别按预期展示 |
| 4 | 软删（`deletedAt`）行被点名 upsert 命中的真实概率 | 依赖数据运维是否会软删单条 Attendance 而非整课删除 | 生产库 SELECT 抽样：`SELECT lesson_id, student_id, status, roll_call_status, deleted_at FROM "Attendance" WHERE deleted_at IS NOT NULL LIMIT 20`，看是否存在单条软删 |

## 六、与预置事实不符

| 预置说法 | 实际情况 | 证据 |
|---------|---------|------|
| `route.ts:11` 附近注释「迟到仍算到课，只把课堂事实记录在 rollCallStatus」 | 吻合，注释在 `:11`，映射表 `:12-16`（`LATE → PRESENT`） | `interaction/route.ts:11-16` |
| `route.ts:22` 附近注释「点名只写 Attendance 的 status / rollCallStatus，绝不写 hoursDeducted」 | 吻合，注释在 `:22-23`；实际代码与注释一致（节点8 #1-#4 无 `hoursDeducted`） | `interaction/route.ts:21-27` |
| `Lesson.rollCallSubmittedAt`（:350 附近）、`attendanceSubmittedAt`、`hoursDeductedAt`；`Attendance.rollCallStatus`（:537 附近）、`rollCallMarkedAt`（:538 附近）、`status`、`hoursDeducted` | 行号全部吻合：`hoursDeductedAt:347`、`attendanceSubmittedAt:348`、`rollCallSubmittedAt:350`、`status:531`、`hoursDeducted:533`、`rollCallStatus:537`、`rollCallMarkedAt:538` | `schema.prisma:347-350,531-538` |
| `src/lib/classroom-interaction.ts` 存在 | 存在；另同目录有 `classroom-interaction-lesson.ts`（名单解析，复用考勤链路同一套 `resolveSubjectLessonStudentIds`，见该文件 `:3,98-106`） | `src/lib/classroom-interaction.ts`、`src/lib/classroom-interaction-lesson.ts` |
| 预置未给出 Attendance 唯一键名称 | 补充核实：键名 `attendance_lesson_student_unique`，复合 `[lessonId, studentId]` | `schema.prisma:545`；点名/考勤两处 upsert 均按此键名引用 |
| 「课堂互动、背单词等新功能可能顺带落库」 | 背单词（vocab）两个目录对 Attendance 零引用；除点名/pick 外未发现其他新功能写 Attendance | Grep `src/app/api/parent/vocab`、`src/app/parent/vocab` 命中 0；节点8 全量清单无 vocab 路由 |
