# 请假同源性与餐食自动考勤（ID: G）

> 范围：通路 4（LeaveRequest ↔ Attendance 请假同源）、通路 8（StudentMealAttendance 餐食自动行是否反向扣课时）。
> 只读审计：未改源码、未改库、未跑 migrate、未重启服务。扣减规则与余额链沿用 B 分片已核实结论，本片不重复验证。

## 一、通路结论表

| # | 通路 | 写方(file:line) | 读方(file:line) | 中间转换层 | 结论 | 风险等级 | 失效时用户看到什么 |
|---|------|----------------|----------------|-----------|------|---------|-------------------|
| 4 | 请假 LeaveRequest → 考勤 LEAVE | 请假单：`src/app/api/parent/leave/route.ts:122-135`；审批：`src/app/api/leave-requests/[id]/route.ts:45-53`；考勤 LEAVE：`src/app/api/admin/attendance/submit/route.ts:190-199` | 请假列表/家长今日周报：`src/app/api/parent/today/route.ts:112-120`、`src/app/api/parent/weekly-report/route.ts:98-105`；出勤统计：`src/app/api/reports/attendance-stats/route.ts:58-61` | 无自动转换；仅反馈准入做跨表兜底合并 `src/lib/classroom-feedback/lesson-eligibility.ts:68-74` | 部分连通 | 中 | 请假单已批但考勤记 PRESENT：教师端/报表出勤统计按 PRESENT 算，家长端请假记录仍挂着；反之手工 LEAVE 不计入请假单统计 |
| 8a | 餐食自动行写入与来源标记 | `src/lib/meal-attendance-sync.ts:53-71`（写 StudentMealAttendance）；人工：`src/app/api/admin/meal-attendance/route.ts:119-137` | 餐食台账/报表：`src/app/api/admin/meal-attendance/route.ts:62-74`、`src/app/api/meals/summary/route.ts:33-50` | 无 | 连通 | 低 | 餐食与考勤分表，互不污染；Attendance 侧无来源字段可区分自动/人工 |
| 8b | 餐食行是否进入扣减循环 | 扣减遍历提交 records：`src/app/api/admin/attendance/submit/route.ts:177`、`src/app/api/teacher/attendance/route.ts:489` | 扣减入账：`src/lib/attendance-hour-posting.ts:61-81` | 无 | 连通（隔离成立） | 低 | 餐食登记不会导致课时多扣；扣减只认提交的考勤 records |
| 8c | 餐食行是否计入到课守卫/工资守卫 | 到课守卫：`src/app/api/admin/attendance/submit/route.ts:133,226-228`；工资守卫：`src/lib/teacher-salary.ts:149` | 工资入账（边界，金额规则归其他分片） | 无 | 连通（隔离成立） | 低 | 不吃餐的学员不会被误判为到课，餐食不影响课时工资判断 |
| 8d | 餐食自动行覆盖/幂等规则 | `src/lib/meal-attendance-sync.ts:45-50`（MANUAL 保留 eating）、`:53-71`（AUTO/新行 upsert） | 教师端展示：`src/app/api/teacher/attendance/route.ts:105-109`；今日列表：`src/app/api/attendance/today/route.ts:137-144` | 无 | 部分连通 | 中 | 后续提交未勾选就餐的 AUTO 学员被重置为"不吃"；MANUAL 行被保护；ParentMealChoice 不进入同步 |

## 二、逐条证据

### 通路 4：请假 leave

#### ① 请假单与考勤是两套并行记录，无事务联动

- **写方 A（请假单 LeaveRequest）**：`src/app/api/parent/leave/route.ts:122-135` — 家长提交只创建 `status='pending'` 请假单 + 通知 + 日志；`src/app/api/leave-requests/[id]/route.ts:45-53` — 审批事务内只 `updateMany` 请假单状态，随后发通知、写日志。
- **写方 B（考勤 Attendance.status）**：`src/app/api/admin/attendance/submit/route.ts:190-199` — 考勤提交按 records upsert 考勤行；`src/app/api/teacher/attendance/route.ts:512-521` 同构；手工更正走 `src/app/api/admin/attendance/adjust/route.ts:161-164`。
- **读方**：请假口径读 LeaveRequest；出勤口径读 Attendance（见下"口径分裂"）。
- **转换层**：**无**。审批事务内不存在任何 `tx.attendance.*` 写入（`leave-requests/[id]/route.ts:44-92` 全段仅 leaveRequest / notification / activityLog）。
- 关键代码（审批只动请假单）：
```ts
// src/app/api/leave-requests/[id]/route.ts:44-53
const updated = await prisma.$transaction(async (tx) => {
  const claimed = await tx.leaveRequest.updateMany({
    where: { id: target.id, deletedAt: null, status: 'pending', ...teacherScope },
    data: {
      status,
      replyNote: replyNote || null,
      repliedAt: new Date(),
      repliedBy: userId,
    },
  })
```
- 关键代码（请假单模型字段，与考勤无外键回写关系）：
```prisma
// prisma/schema.prisma:1624-1640
model LeaveRequest {
  id              String    @id @default(cuid())
  studentId       String
  lessonId        String?
  reason          String
  leaveDate       DateTime
  status          String    @default("pending")
  replyNote       String?
  repliedAt       DateTime?
  repliedBy       String?
  ...
  lesson  ClassLesson? @relation(fields: [lessonId], references: [id], onDelete: SetNull)
}
```
- 判定：**部分连通**。两套表靠人工（教师录入考勤时选择 LEAVE）对齐，代码层面无自动同步、无对账任务。
- 确定性：[已核实]

#### ② "请假单已批准、Attendance 仍是 PRESENT" 的路径存在

- 路径 1：审批不回写考勤（① 已核实），教师提交考勤时若未把该生标 LEAVE，考勤行即 PRESENT。教师端考勤 GET 不加载 LeaveRequest 预填状态（`src/app/api/teacher/attendance/route.ts` 全文 grep `leaveRequest` 0 匹配）。
- 路径 2：请假后课次才生成 / 课次被重排。`LeaveRequest.lessonId` 可空、按 `leaveDate` 日期匹配（`parent/leave/route.ts:110-118`、`schema.prisma:1627`）；重排后的新课次与旧请假单无关联，新课次考勤行不会继承 LEAVE。
- 路径 3：批量历史补录只按传入 records 写考勤，不读请假单：`src/lib/intensive-history.ts:223-232`（`status: record.status, hoursDeducted: hours`）。
- 路径 4：无对账 cron。`src/app/api/cron/` 下仅有 weekly-digest / retry-notifications / daily-ops-report / check-alerts，无 leave→attendance 同步任务（全仓 grep `syncLeave|reconcile.*leave` 无匹配）。
- 失效现象：家长端请假记录显示"已批准"，但教师端考勤/出勤统计按 PRESENT 计；该生 PRESENT 会照常扣整节课时（LEAVE 规则另算，见 B 分片）。
- 确定性：[已核实] 代码路径；库内实际是否存在此类不一致行 [待验证]（本地无 DB 驱动抽样）。

#### ③ 反向：Attendance 被改成 LEAVE 但无请假单（老师手工改）

- 写方：`adjust/route.ts:161-164` 直接改考勤 status，不校验/不生成 LeaveRequest。
- 读方分裂：
  - 出勤统计读 Attendance：`src/app/api/reports/attendance-stats/route.ts:59`（`status: 'LEAVE'` 计数）、`src/app/api/reports/summary/route.ts:117`、`src/lib/attendance-analysis.ts:22`。
  - 请假统计读 LeaveRequest：`src/lib/teacher-dashboard.ts:177`（pending 请假单）、`parent/today/route.ts:112-120`、`parent/weekly-report/route.ts:98-105`、`src/lib/student-archive.ts:307`。
- 口径分裂：**有**。同一名学员的"请假"在两张表各算各的，代码无交叉校验；手工 LEAVE 会计入出勤报表请假数，但不出现在请假工单列表/家长请假回执里。
- 判定：**部分连通**。
- 确定性：[已核实]

#### ④ 请假/缺勤触发补课单 MakeupRequest，及其与课时扣减的关系

- 判据（转换层）：`src/lib/attendance-hours.ts:28-37`
```ts
export function shouldCreateMakeupRequest(params: {
  status: string; courseType?: CourseType | string | null
  intensiveMode?: string | null
}) {
  const normalized = String(params.status || '').toUpperCase()
  if (normalized !== 'LEAVE' && normalized !== 'ABSENT') return false
  return params.courseType === 'ONE_ON_ONE' || params.intensiveMode === 'INTENSIVE'
}
```
- 创建点：`src/app/api/teacher/attendance/route.ts:522,572,582`；`src/app/api/admin/attendance/adjust/route.ts:167-170`；`src/lib/intensive-review.ts:401-411`。
- 安排补课时生成新考勤行：`src/app/api/makeup-requests/[id]/route.ts:28-40`
```ts
if (targetLessonId) {
  const att = await tx.attendance.findUnique({ where: { id: existing.attendanceId } })
  if (att) {
    await tx.attendance.create({
      data: {
        lessonId: targetLessonId, studentId: existing.studentId,
        enrollmentId: att.enrollmentId, status: 'MAKEUP', hoursDeducted: 0,
      },
    })
  }
}
```
- 与扣减关系：`MAKEUP` 扣 0（`attendance-hours.ts:25` 兜底 false）；补课工单本身不参与余额计算，原请假/缺勤课次仍按原状态规则扣减。补课完成数单独统计：`reports/attendance-stats/route.ts:62`（`makeupRequest.status='COMPLETED'`）。
- 判定：**连通**（工单 → 补课考勤行 → 统计闭环）；补课行不反向改原课次扣减。
- 确定性：[已核实]

#### 跨表合并的唯一例外：反馈准入

- `src/lib/classroom-feedback/lesson-eligibility.ts:60-74`：Attendance 有明确 LEAVE/ABSENT 优先用考勤；考勤无记录时，用 `pending/approved` 的活跃请假单兜底拦截反馈。
```ts
// src/lib/classroom-feedback/lesson-eligibility.ts:68-74
const hasActiveLeaveRequest = input.leaveRequests.some((request) => {
  if (request.studentId !== studentId || request.deletedAt != null) return false
  if (!['pending', 'approved'].includes(request.status.toLowerCase())) return false
  if (request.lessonId === input.lessonId) return true
  return request.lessonId == null && localDateKey(request.leaveDate) === lessonDay
})
if (hasActiveLeaveRequest) blockReasons[studentId] = 'LEAVE'
```
- 说明：这是全仓唯一把两张表按学员+课次/日期合并读取的转换层；但它只用于"是否允许写反馈"，不回写考勤、不参与扣减。
- 确定性：[已核实]

### 通路 8：餐食 meals

#### 8a. 自动同步写哪张表、有没有来源标记

- **写方**：`src/lib/meal-attendance-sync.ts:53-71` — 只 upsert `tx.studentMealAttendance`，**不写 Attendance**。
```ts
// src/lib/meal-attendance-sync.ts:53-71
await tx.studentMealAttendance.upsert({
  where: { studentId_mealDate: { studentId, mealDate: input.mealDate } },
  create: {
    studentId, mealDate: input.mealDate, recordedBy: input.recordedBy,
    eating: eatingStudentIds.has(studentId), source: 'AUTO',
    notes: input.notes || '教师首节课考勤同步上报', ...context,
  },
  update: {
    recordedBy: input.recordedBy, eating: eatingStudentIds.has(studentId),
    source: 'AUTO', notes: input.notes || '教师首节课考勤同步上报', ...context,
  },
})
```
- 餐食表模型（含来源字段）：`prisma/schema.prisma:1318-1343`
```prisma
model StudentMealAttendance {
  id          String   @id @default(cuid())
  studentId   String
  mealDate    DateTime @db.Date
  division    String   @default("JUNIOR")
  recordedBy  String
  eating      Boolean  @default(true)
  source      String   @default("MANUAL")   // AUTO / MANUAL
  groupId     String?
  lessonId    String?
  teacherId   String?
  teacherName String?
  ...
  @@unique([studentId, mealDate])
}
```
- **Attendance 侧无来源字段**：`prisma/schema.prisma:523-541` Attendance 模型只有 status / actualMinutes / hoursDeducted / rollCallStatus 等，**没有 createdBy/source 之类标记**，无法从考勤行区分"老师提交"还是"系统自动生成"。但本片核实：餐食同步根本不生成考勤行，因此该缺口不影响扣减。
- 判定：**连通**（餐食独立成表，来源在餐食表自身 `source` 字段区分）。
- 确定性：[已核实]

#### 8b. 自动行会不会被当成"到课"扣课时

- 扣减循环来源是**本次提交的 records**，不是 Attendance 表全量行，也不是餐食表：
```ts
// src/app/api/admin/attendance/submit/route.ts:177
for (const record of validRecords) {
```
```ts
// src/app/api/teacher/attendance/route.ts:489
for (const rec of eligibleRecords) {
```
- 餐食同步不写考勤表：`submit/route.ts:229-249`；`teacher/attendance/route.ts:421-438`（突击班分支，独立事务）、`:606-619`（常规事务内，扣减循环之后）。
- 全仓 `attendance.create/upsert/update` 调用方（B 分片已 grep）中无餐食同步入口；餐食表与课时余额无任何字段通路。
- 判定：**连通（隔离成立）**。餐食登记不会造成课时多扣；扣减唯一依据仍是提交 records 的 `status`（沿用 B 分片 C1 结论）。
- 确定性：[已核实]

#### 8c. 自动行会不会计入 `hasAttendingStudent`（到课守卫 / 工资守卫）

- 提交前到课守卫基于提交 records：`submit/route.ts:133`（`hasAttendingStudent(validRecords)`）；事务内再校验 `counts.PRESENT === 0`：`submit/route.ts:226-228`；教师端预提交 `teacher/attendance/route.ts:398`，事务内 `:602-604`。
- 工资守卫读的是 Attendance 表状态：`src/lib/teacher-salary.ts:149`
```ts
if (!hasAttendingStudent(lesson.attendances)) {
  return { success: false, error: '本次课没有实际出勤学员，不能计入课时工资' }
}
```
- `hasAttendingStudent` 只判断记录 status 是否 PRESENT/LATE（`src/lib/attendance-submission.ts:95-102`），入参从不包含餐食表数据。餐食行不在 Attendance 表，不可能被计入到课判断。
- 判定：**连通（隔离成立）**。不吃餐不影响到课判定，餐食不影响课时工资。
- 确定性：[已核实]

#### 8d. 时间窗、覆盖规则与幂等

- **时间窗**：
  - 仅系统第一课节随考勤同步：`submit/route.ts:84-90`（非首节课返回 400）；教师端 `teacher/attendance/route.ts:100-103,606`。
  - 人工餐食登记限暑期教学日：`src/app/api/admin/meal-attendance/route.ts:104-110`；教学日集合硬编码在 `src/lib/meal-attendance-period.ts:9-26`（`SUMMER_MEAL_PERIOD = 2026-07-09 ~ 2026-08-08`）。
- **覆盖规则**（`meal-attendance-sync.ts:43-51`）：
```ts
const current = existingByStudent.get(studentId)
if (current?.source === 'MANUAL') {
  await tx.studentMealAttendance.update({
    where: { id: current.id }, data: context,
  })
  continue
}
```
  - MANUAL 行：只更新班级/教师等上下文字段，**保留人工 eating 标记**，不被自动同步覆盖。
  - AUTO 行 / 新行：按本次 `eatingStudentIds` 重写 eating（`:53-71`）。
- **反向覆盖问题**：老师把考勤改成 ABSENT/LEAVE 不会回写餐食行；下一次考勤提交若携带 `mealStudentIds`，未被勾选的 AUTO 学员会被置 `eating=false`；MANUAL 行受保护。家长餐食选择表 `ParentMealChoice` **不进入** sync 入参（sync 只收 `eatingStudentIds`，`meal-attendance-sync.ts:21-27`），二者在报表层并列展示、不自动互写。
- 判定：**部分连通**。AUTO 行幂等于"同一学员同一日期唯一行"（`@@unique([studentId, mealDate])`），但 eating 语义跟随每次提交勾选，存在被后续提交重置的可能。
- 确定性：[已核实]

#### 8e. 失效现象（具体到用户可见）

- **课时侧**：不会因餐食多扣/少扣（8b/8c 隔离成立）。
- **餐食侧可能出现的不一致**：
  1. 教师端/家长端今日列表看到的就餐标记与考勤状态对不上——餐食按本次 `mealStudentIds` 勾选写入，考勤按 records 状态写入，两套入参互不校验（展示读取：`teacher/attendance/route.ts:105-109`、`attendance/today/route.ts:137-144`）。
  2. AUTO 学员在后续某节课提交时未勾选就餐，其历史就餐记录被重置为"不吃"（8d）；MANUAL 登记不受影响。
  3. 报表合并口径：`meals/summary/route.ts:58-66` 以 StudentMealAttendance 优先，缺失时回退旧版 MealReport 明细；`ParentMealChoice` 只做家长选择统计，不参与就餐人数计算（`:47-50,73-74`）。
- 确定性：[已核实]

## 三、孤岛清单（本片范围内）

| # | 表/功能 | 谁写 | 有没有下游消费方 | 是不是"设计了但没接" | 建议 |
|---|---------|------|----------------|-------------------|------|
| 1 | LeaveRequest | 家长提交 `parent/leave/route.ts:122`；审批 `leave-requests/[id]/route.ts:45` | 请假列表、家长今日/周报、教师待办、反馈准入、归档统计、取消课次校验 `cancel-class-lesson.ts:51` | 否，非孤岛 | 维持；缺口在"审批→考勤"无自动回写（见通路 4①） |
| 2 | StudentMealAttendance | 自动同步 `meal-attendance-sync.ts:53`；人工 `admin/meal-attendance/route.ts:119` | 管理台账、餐食报表/汇总、今日/教师端展示 | 否，非孤岛 | 维持分表隔离 |
| 3 | ParentMealChoice | 家长选择 `parent/meal-choice/route.ts:79` | 汇总页家长选择统计 `meals/summary/route.ts:47-50` | 否，非孤岛 | 明确其仅为意向统计，不落到就餐台账 |
| 4 | MakeupRequest | 考勤提交/调整/审核通过时创建；安排 `makeup-requests/[id]/route.ts:19` | 管理员工单列表 `makeup-requests/route.ts:13`；报表补课完成数 `reports/attendance-stats/route.ts:62` | 否，非孤岛 | 维持 |
| 5 | MealReport（旧版手工报表） | 历史写入；`meals/report/[id]/route.ts:6` 可改 | `meals/report/route.ts:32-37`、`meals/summary/route.ts:28-31` 合并读取 | 否，非孤岛（legacy 回退层） | 后续若下线需先确认报表回退口径 |

## 四、需要用户拍板的业务口径问题

1. **审批通过的请假，是否自动把对应课次考勤置为 LEAVE？**
   - 口径 A（自动回写）：消除"请假已批、考勤 PRESENT"漏标；风险是可能覆盖教师已录入的到课事实，且日期型请假（lessonId=null）与重排课次归属难判定。
   - 口径 B（维持现状人工对齐）：考勤事实以教师录入为准；风险是两张表长期不一致，统计各算各的。
2. **日期型请假（无课次 id）在课次重排后是否需要关联到新课次？** 当前 `LeaveRequest.lessonId` 随旧课次 SetNull（`schema.prisma:1640`），新课次考勤不继承请假事实。
3. **AUTO 餐食行在后续提交被重置为"不吃"是否符合预期？** 当前 MANUAL 保护、AUTO 跟随最新勾选；若希望首节课自动行锁定后不再被后续提交改写，需调整 sync 的 AUTO 分支。
4. **家长餐食选择（ParentMealChoice）是否需要落到当日就餐台账？** 当前只做意向统计，不生成 StudentMealAttendance 行。

## 五、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|--------|-------------------------------|
| N1 | 餐食自动同步不写考勤表，不会反向扣课时 | sync 仅 `studentMealAttendance.upsert`（`meal-attendance-sync.ts:53-71`）；扣减循环只遍历提交 records（`submit/route.ts:177`、`teacher/attendance/route.ts:489`） |
| N2 | 餐食不参与到课/工资守卫判断 | 守卫入参为 Attendance records / `lesson.attendances`（`submit/route.ts:133`、`teacher-salary.ts:149`），全链路无餐食表读取参与判断 |
| N3 | 餐食表同日期唯一行，幂等键 `[studentId, mealDate]` | `schema.prisma:1338` 唯一约束；upsert 按此键（`meal-attendance-sync.ts:54`、`admin/meal-attendance/route.ts:120`） |
| N4 | 人工餐食标记不被自动同步覆盖 | MANUAL 分支只更新上下文、保留 eating（`meal-attendance-sync.ts:45-50`） |
| N5 | 补课工单生成的 MAKEUP 考勤行扣 0 课时 | 新行 `hoursDeducted: 0`（`makeup-requests/[id]/route.ts:37`）；MAKEUP 扣减规则返回 false（`attendance-hours.ts:25`） |
| N6 | 请假/缺勤补课单创建条件明确，不覆盖非一对一/非突击班 | 判据限定 ONE_ON_ONE 或 INTENSIVE（`attendance-hours.ts:34-36`） |

## 六、未能确认 / 需运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|---|--------|-----------|
| U1 | 库内是否存在"请假单 approved 但考勤 PRESENT"的实际不一致行 | 本地无 psql/psycopg2，未跑只读 SELECT | 联表查询：LeaveRequest(approved, lessonId/leaveDate) LEFT JOIN Attendance(lessonId, studentId)，比对 status；日期型请假需按 leaveDate 匹配当日课次 |
| U2 | 反向"考勤 LEAVE 但无请假单"的历史规模 | 同上，未抽样 | 查询 Attendance.status='LEAVE' 且无对应 LeaveRequest 的行数，区分教师手工更正与早期历史数据 |
| U3 | ParentMealChoice 与 StudentMealAttendance 实际偏差人数 | 报表层并列展示，未跑库内比对 | 按 mealDate 联表比较 eating 意向与实际就餐台账 |
| U4 | 餐食 AUTO 行被后续提交重置为 eating=false 的历史发生次数 | 需结合 StudentMealAttendance.updatedAt 与 source 追溯 | 只读统计 source='AUTO' 且 updatedAt 晚于首次考勤提交的行 |
