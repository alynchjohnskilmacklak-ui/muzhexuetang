# 工资交易入账 + 反馈联动审计（ID: C）

> 范围：`TeacherSalaryTransaction` 全量写入点、反馈→工资联动、反馈/考勤互相依赖、点名/课堂互动/背单词是否旁路落工资。
> 方法：只读 Grep 定位 + 局部 Read；未改源码、未改数据库、未跑 migrate、未重启服务。仓库根：`edu-manage/`。
> 确定性标注：`[已核实]` 读到代码/配置；`[推断]` 基于命名/调用链；`[待验证]` 需运行态/数据库确认。

## 一、结论速览

| # | 链路节点 | 结论 | 风险等级 | 一句话证据 |
|---|---------|------|---------|-----------|
| 1 | 考勤提交 → 课时费入账（普通班） | 连通 | 低 | `src/lib/teacher-salary.ts:176`，唯一键 `lessonPayKey=lessonId` 去重 |
| 2 | 集训审核/历史补录/结算调整 → 课时费 | 连通 | 低 | `src/lib/intensive-settlement.ts:88,147`，统一经库函数写入 |
| 3 | 反馈落库 → 反馈奖金 | 部分连通 | 高 | `src/lib/teacher-salary.ts:613` 仅 PUBLISHED 触发；撤销反馈不冲销奖金 `src/app/api/admin/feedback/revoke/route.ts:38-57` |
| 4 | 晚托（作业班）考勤/作业登记 → 工资 | 连通（预置未提及的旁路通道） | 低 | `src/lib/study-hall/rewards.ts:56,79`，两类独立流水，唯一键去重 |
| 5 | 点名/课堂互动/背单词 → 工资 | 断开 | 低 | 互动/背单词目录无工资库 import、无 `teacherSalaryTransaction` 写操作 |
| 6 | 反馈 ↔ 考勤互相依赖 | 部分连通（单向） | 低 | 发布反馈要求考勤已提交 `src/lib/classroom-feedback/access.ts:323-329`；考勤提交不要求反馈 |
| 7 | 待结算流水汇总 → 月结 | 部分连通 | 中 | `src/lib/salary-settlement.ts:39-40` 仅按 `deletedAt:null` 过滤，不关联反馈撤销状态 |
| 8 | 管理员手动调整流水 | 连通（缺幂等） | 中 | `src/app/api/admin/salary/route.ts:244`，无请求编号/重复提交防护 |

## 二、详细证据

### 节点1：考勤提交 → 课时费（LESSON_PAY，普通班）

- 写入方：`src/lib/teacher-salary.ts:176` — `createLessonPayInTransaction` 在调用方事务内创建 `LESSON_PAY`。
- 触发入口（2 个，均为考勤提交事务内调用）：
  - 教师端考勤提交：`src/app/api/teacher/attendance/route.ts:643`
  - 管理端考勤直接登记：`src/app/api/admin/attendance/submit/route.ts:267`
- 金额依据：`calcLessonPay`，按课程类型/年级/分钟数 × 工资配置单价（`teacher-salary.ts:107-123,162-170`）。
- 幂等/去重键：`lessonPayKey = lessonId`，DB 唯一约束（`prisma/schema.prisma:2081`）；写入前 `findUnique` 预检 + 行锁 `FOR UPDATE` + P2002 兜底。
- 关键代码：

```ts
// src/lib/teacher-salary.ts:132-151
await tx.$queryRaw`SELECT "id" FROM "ClassLesson" WHERE "id" = ${lessonId} FOR UPDATE`
const lesson = await tx.classLesson.findUnique({ ... })
const existing = await tx.teacherSalaryTransaction.findUnique({
  where: { lessonPayKey: lessonId }, select: { id: true },
})
if (existing) return { success: true, skipped: true }
if (!hasAttendingStudent(lesson.attendances)) {
  return { success: false, error: '本次课没有实际出勤学员，不能计入课时工资' }
}
```

```ts
// src/lib/teacher-salary.ts:176-183
const salaryTx = await tx.teacherSalaryTransaction.create({
  data: {
    teacherId, type: 'LESSON_PAY', amount, lessonId, lessonPayKey: lessonId,
    termId: lesson.group.termId,
    lessonDate: lesson.lessonDate,
    description: `${lesson.group.name}（${salaryMinutes}分钟 x ${rateLabel}）`,
  },
})
```

- 入口调用（教师端，事务内，非集训才计课时费）：

```ts
// src/app/api/teacher/attendance/route.ts:642-645
if (!isIntensive) {
  const lessonPay = await createLessonPayInTransaction(tx, lessonId)
  if (!lessonPay.success) throw new Error(lessonPay.error || 'LESSON_PAY_FAILED')
}
```

- 判定：**连通**。课时费只在考勤提交事务内生成，有唯一键 + 预检 + 行锁三重去重；无出勤学员不计费。
- 确定性：[已核实]

### 节点2：集训（INTENSIVE）审核/补录/调整 → 课时费

- 写入方 A：`src/lib/intensive-settlement.ts:88` — `createIntensiveLessonPayInTransaction`，`LESSON_PAY`。
  - 触发入口：
    - 管理端考勤直接登记并审核：`src/app/api/admin/attendance/submit/route.ts:295`
    - 集训课时审核通过：`src/lib/intensive-review.ts:451` ← `src/app/api/admin/intensive-reviews/[id]/route.ts:33`（`reviewIntensiveLesson`）
    - 集训历史补录：`src/lib/intensive-history.ts:261` ← `src/app/api/admin/intensive-history/route.ts:143`（`createIntensiveHistoryRecord`）
- 写入方 B：`src/lib/intensive-settlement.ts:147` — `LESSON_PAY_ADJUSTMENT`，`createIntensiveLessonPayAdjustmentInTransaction`。
  - 触发入口：`src/app/api/admin/intensive-settlement/adjust/route.ts:25`（`adjustIntensiveSettlement`）。
- 金额依据：`payable ? calcLessonPay(ONE_ON_ONE, actualMinutes) : 0`（`intensive-settlement.ts:54-69`）；调整额 = 新总额 − 旧总额（`:138-140`）。
- 幂等/去重键：`lessonId + type=LESSON_PAY` 预检（`:82-86`），`lessonPayKey` 唯一；调整流⽔ `adjustmentId` 唯一（`schema.prisma:2083`）；并发抢占用 `updateMany` 乐观断言 `count===1`（`:196-204`）。
- 门槛：`status=COMPLETED` 且 `intensiveReviewStatus=APPROVED` 且 `shouldGenerateIntensiveLessonPay(...)`（`:55-57,142-143`）。
- 关键代码：

```ts
// src/lib/intensive-settlement.ts:82-99
const existing = await tx.teacherSalaryTransaction.findFirst({
  where: { lessonId, type: 'LESSON_PAY' }, select: { id: true, amount: true },
})
if (existing) return { skipped: true, amount: existing.amount }
const salary = await tx.teacherSalaryTransaction.create({
  data: {
    teacherId: context.teacherId, type: 'LESSON_PAY', amount: context.amount,
    termId: context.lesson.group.termId, lessonId, lessonPayKey: lessonId,
    lessonDate: context.lesson.lessonDate,
    description: `${context.lesson.group.name}（${context.minutes}分钟 × ￥${context.hourlyRate}/小时）`,
  },
})
```

```ts
// src/lib/intensive-settlement.ts:138-159
const oldAmount = roundMoney(transactions.reduce((t, x) => t + x.amount, 0))
const newAmount = context.amount
const adjustmentAmount = roundMoney(newAmount - oldAmount)
if (context.payable && !original) throw new Error('INTENSIVE_BASE_SALARY_MISSING')
if (adjustmentAmount !== 0) {
  await tx.teacherSalaryTransaction.create({
    data: { teacherId: context.teacherId, type: 'LESSON_PAY_ADJUSTMENT',
      amount: adjustmentAmount, termId: ..., lessonId, adjustmentId, ... },
  })
}
```

- 判定：**连通**。集训课时费/调整全部收敛在 `intensive-settlement.ts` 两个库函数内，三条入口均经同一函数，无旁路直写。
- 确定性：[已核实]

### 节点3：反馈落库 → 反馈奖金（FEEDBACK_BONUS）

- 写入方：`src/lib/teacher-salary.ts:613` — `triggerFeedbackBonus`。
- 触发入口（3 个）：
  - `src/app/api/feedback/route.ts:439`（教师/管理员通用反馈提交）
  - `src/app/api/teacher/classroom-feedback/route.ts:288`（教师端课堂反馈）
  - `src/app/api/admin/classroom-feedback/route.ts:270`（管理端代发；库内二次拒绝，见下）
- 金额依据：**`最终金额 = 获奖人数 × 单价`**（`teacher-salary.ts:605`）；单价按集训/一对一/小班与工资配置（`:429`）；获奖人数来自按「教师 + 学科键 + 当日 + 学生」的首次反馈台账 `FeedbackRewardRecord`（`:431-451,587-603`），台账缺失时回退查当日已发奖金流水去重（`:452-483`）。
- **`feedbackId` 的角色（E1 核心结论）**：
  1. **参与去重**：DB 唯一约束 `@@unique([feedbackId, type])`（`schema.prisma:2093`）；写入前按 `feedbackId + type=FEEDBACK_BONUS` 预检（`teacher-salary.ts:543-546`），事务内二次预检（`:578-581`），P2002 兜底（`:651`）。
  2. **溯源/学期归属**：流水行存 `feedbackId`（`:615`），活动日志 metadata 记录 `feedbackId`（`:629`）；学期归属修复按 `feedbackId` 回填 `termId`（`src/lib/academic-term.ts:117-124`）。
  3. **不参与金额公式**：金额只取「eligibleCount × rate」，`feedbackId` 不进单价、不进人数计算。
- 关键代码（金额 + 写入）：

```ts
// src/lib/teacher-salary.ts:584-606
let awardedCount = preview.eligibleCount
const rewardModel = preview.rewardLedgerAvailable ? feedbackRewardModel(tx) : null
if (rewardModel) {
  const inserted = await rewardModel.createMany({ data: preview.eligibleStudentIds.map(...), skipDuplicates: true })
  awardedCount = inserted.count
}
const finalAmount = Number((awardedCount * preview.rate).toFixed(4))
if (finalAmount <= 0) return { success: true, awardedCount: 0, amount: 0 }
```

```ts
// src/lib/teacher-salary.ts:613-621
await tx.teacherSalaryTransaction.create({
  data: {
    teacherId, type: 'FEEDBACK_BONUS', amount: finalAmount, feedbackId,
    termId: feedbackTermId || null,
    lessonId: lesson?.id ?? null,
    lessonDate: lesson?.lessonDate ?? new Date(),
    description: descParts.join(''),
  },
})
```

- 第一道 gate（路由层，仅 PUBLISHED 才调用奖金）：

```ts
// src/app/api/feedback/route.ts:437-443
let bonus: Awaited<ReturnType<typeof triggerFeedbackBonus>> | null = null
if (status === 'PUBLISHED' && !isAdmin && !isSingleSession && !feedbackResult.replayed) {
  bonus = await triggerFeedbackBonus(feedback.id)
  if (!bonus.success) {
    console.warn('[feedback] triggerFeedbackBonus failed:', feedback.id, bonus.error)
  }
}
```

```ts
// src/app/api/teacher/classroom-feedback/route.ts:287-289
const bonus = status === 'PUBLISHED' && !isSingleSession && !feedbackResult.replayed
  ? await triggerFeedbackBonus(feedback.id)
  : null
```

- 第二道 gate（库内，兜底拒绝）：

```ts
// src/lib/teacher-salary.ts:528-535
if (feedback && feedback.source === 'admin') {
  console.warn('[salary] 管理端代发不计薪资', feedbackId)
  return { success: false, error: '管理端代发反馈不计入薪资' }
}
if (!feedback || !isPayableFeedback(feedback)) {
  console.warn('[salary] triggerFeedbackBonus: feedback not payable', feedbackId, feedback?.status)
  return { success: false, error: '反馈不可发放奖励' }
}
```

```ts
// src/lib/teacher-salary.ts:79-88（isPayableFeedback）
return feedback.status === 'PUBLISHED'
  && feedback.studentIds.length > 0
  && ( Boolean((feedback.overallComment || '').trim()) || ... || hwArr.length > 0 )
```

- 判定：**部分连通**。奖金生成链路本身成立、去重完备；但「反馈被撤销后已发奖金不冲销」（见风险 R1），导致反馈侧事实变化时工资链不会反向回滚。
- 确定性：[已核实]

### 节点4：晚托/作业班奖励（STUDY_HALL_ATTENDANCE / STUDY_HALL_BONUS，预置未提及的通道）

- 写入方：`src/lib/study-hall/rewards.ts`，两条独立通道。
  - `:56` `STUDY_HALL_ATTENDANCE`，40 元/班/日；入口 `src/app/api/study-hall/route.ts:355`。
  - `:79` `STUDY_HALL_BONUS`，0.5 元/人/作业登记；入口 `src/app/api/study-hall/route.ts:299`。
- 金额依据：常量 `STUDY_HALL_REWARD = { fullAttendance: 40, homeworkEntry: 0.5 }`（`rewards.ts:1-4`）。
- 幂等/去重键：
  - 考勤奖励：`lessonPayKey = STUDY_HALL_ATTENDANCE:${classId}:${studyDate}`（`rewards.ts:13-15,54,62`），唯一约束兜底，P2002 → 返回 `false` 不重复发（`:69`）。
  - 作业奖励：`feedbackId = entryId`，走 `@@unique([feedbackId, type])`（`schema.prisma:2093`），P2002 → `false`（`rewards.ts:92`）。
- 触发门槛：
  - 作业：`salaryTeacherId && updatesHomework && homeworkStatus !== 'NOT_RECORDED'`（`study-hall/route.ts:298`）。
  - 考勤：应到学员 + 应到场次全部有完成态（PRESENT/PERSONAL_LEAVE/ABSENT）记录后才发全班奖励（`study-hall/route.ts:336-352`）。
- 关键代码：

```ts
// src/lib/study-hall/rewards.ts:50-72
export async function createStudyHallAttendanceReward(client, input) {
  const lessonPayKey = studyHallAttendanceRewardKey(input.classId, input.studyDate)
  try {
    await client.teacherSalaryTransaction.create({
      data: { teacherId: input.teacherId, termId: input.termId,
        type: 'STUDY_HALL_ATTENDANCE', amount: STUDY_HALL_REWARD.fullAttendance,
        lessonPayKey, lessonDate: input.lessonDate, description: `晚托作业班考勤奖励：...` },
    })
    return true
  } catch (error) {
    if (isUniqueConstraintError(error)) return false
    throw error
  }
}
```

- 判定：**连通**。两条通道均有唯一键去重，金额为固定常量；与课时费/反馈奖金并列在工资列表与结算汇总中（`src/app/api/teacher/salary/route.ts:72-73`、`src/app/api/admin/salary/route.ts:131`）。
- 确定性：[已核实]

### 节点5：点名 / 课堂互动 / 背单词 是否旁路落工资（D2 核心结论）

- Grep 证据 1（工资库 import 全清单）：全仓 `from '@/lib/(teacher-salary|intensive-settlement|salary-settlement|study-hall/rewards)'` 共 19 处命中，**全部落在考勤、反馈、集训、晚托、工资查询/结算/配置路由内**；`src/app/teacher/interaction/**`、`src/app/api/teacher/interaction/**`、`src/app/api/parent/vocab/**` 无一处 import 工资库。
- Grep 证据 2（模型写操作）：`teacherSalaryTransaction.(create|upsert|update|delete|deleteMany|updateMany|createMany)` 命中清单见节点 8/9；互动、pick、vocab 路由均不在其中。
- 互动点名路由实际写入面（止于 Attendance / ClassLesson / classroomPick）：

```ts
// src/app/api/teacher/interaction/route.ts:19-27（文件头设计约束注释）
// 点名只写 Attendance 的 status / rollCallStatus，绝不写 hoursDeducted、
// 不创建 MakeupRequest、不设置 ClassLesson.attendanceSubmittedAt / hoursDeductedAt。
// 课时扣减仍然只由考勤提交那一次事务完成，因此点名不会造成重复扣课时。
```

```ts
// src/app/api/teacher/interaction/route.ts:241-272
await prisma.$transaction([
  ...records.map((record) => prisma.attendance.upsert({
    where: { attendance_lesson_student_unique: { lessonId: body.lessonId!, studentId: record.studentId } },
    create: { lessonId, studentId, enrollmentId, status: attendanceStatus, rollCallStatus: ... },
    update: { status: attendanceStatus, rollCallStatus: ... },
  })),
  prisma.classLesson.update({ where: { id: body.lessonId! }, data: { rollCallSubmittedAt: markedAt } }),
])
```

- 随机抽人：`src/app/api/teacher/interaction/pick/route.ts:105,159,202,233` 仅写 `classroomPick`，`:132` 只读 `classroomFeedback` 做去重提示，无工资写。
- 背单词：`src/app/api/parent/vocab/session/route.ts`、`deck/route.ts`、`route.ts` Grep `salary|Salary|teacherSalary|triggerLessonPay|triggerFeedbackBonus` 命中 **0**。
- 判定：**断开（即互动/点名/背单词不会绕开考勤直接写工资）**。调用链止于 `Attendance`、`ClassLesson.rollCallSubmittedAt`、`classroomPick`、vocab 进度表；工资链在这些模块内不存在调用点。
- 确定性：[已核实]（静态调用链层面）；运行态是否有动态字符串拼接调模型，未在动态 `modelFor` 类代码中发现互动侧用法 [待验证]。

### 节点6：反馈 ↔ 考勤互相依赖（E3）

- 方向 A：**发布反馈要求先有考勤**（课次关联、PUBLISHED 时）。

```ts
// src/app/api/feedback/route.ts:291-293
requireLesson: !isSingleSession && status === 'PUBLISHED',
requireTodayLesson: Boolean(classLessonId),
requireAttendanceSubmitted: !isSingleSession && status === 'PUBLISHED',
```

```ts
// src/lib/classroom-feedback/access.ts:323-329
if (input.requireAttendanceSubmitted && !hasSubmittedLessonAttendance({
  attendanceSubmittedAt: lesson.attendanceSubmittedAt,
  status: lesson.status,
  attendances: lesson.attendances,
  expectedStudentIds: [...eligibleStudentIds],
})) {
  return { allowed: false, reason: 'attendance-required', students: [], ... }
}
```

  被拦截时返回 409「本节课考勤尚未提交，完成考勤后才能发布反馈」（`feedback/route.ts:307-309`）。
  豁免：单次课程反馈（`isSingleSession`）、DRAFT 保存不强制考勤。

- 方向 B：**考勤提交不要求先有反馈**。教师端考勤路由只读取反馈阻塞原因用于名单展示：

```ts
// src/app/api/teacher/attendance/route.ts:77,88,145
const feedbackBlockReasonsByLesson = await loadLessonFeedbackBlockReasons(prisma, [{...}])
const feedbackBlockReasons = feedbackBlockReasonsByLesson.get(lesson.id) || {}
... || (feedbackBlockReasons[student.id] === 'LEAVE' ? 'LEAVE' : 'PRESENT')
```

  全文件无「反馈必须存在/已发布」的阻断条件；考勤提交成功后即按节点 1/2 生成课时费，与反馈是否已发无关。
- 判定：**部分连通（单向依赖）**。反馈被考勤前置；考勤不被反馈前置。缺反馈不阻断课时费入账，缺考勤会阻断反馈发布。
- 确定性：[已核实]

### 节点7：待结算流水汇总 → 月结收据

- 写入方：`src/lib/salary-settlement.ts:58` 创建 `SALARY_SETTLEMENT` 汇总行；`:53` `updateMany` 把待结算流水标记 `settledAt / settlementBatchId`。
- 触发入口：`src/app/api/admin/salary/settle/route.ts:37`（`settleSalaryLedger`）。
- 金额依据：范围内未结算流水 `amount` 求和（`salary-settlement.ts:45`）；`expectedTotal` 偏差 >0.005 拒绝结算（`:47-48`）；Serializable 隔离 + 乐观断言 `claimed.count === ids.length`（`:53-57`）。
- 过滤口径（注意）：仅按 `deletedAt: null` 与未结算标记过滤，**不关联反馈是否被撤销**：

```ts
// src/lib/salary-settlement.ts:39-43
const rows = await tx.teacherSalaryTransaction.findMany({
  where: { teacherId: options.teacherId, termId: options.termId, deletedAt: null,
    createdAt: { gte: options.since, lte: options.through } },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
})
const pending = pendingSalaryTransactions(rows)
```

- 判定：**部分连通**。汇总机制本身幂等、有金额预检；但被撤销反馈对应的奖金流水仍在待结算口径内（见 R1）。
- 确定性：[已核实]

### 节点8：全量写入点清单（D1 主表）

> 表内「写入类型」：CREATE=新增流水 / UPDATE=状态·归属变更 / DELETE=硬删除。金额依据指该笔流水的金额来源。路径相对 `edu-manage/`。

| # | 写入点 `file:line` | 触发入口（API/页面） | 流水类型 / 金额依据 | 幂等 / 去重键 | 类别 |
|---|---|---|---|---|---|
| 1 | `src/lib/teacher-salary.ts:176` | 教师考勤提交 `api/teacher/attendance/route.ts:643`；管理端考勤登记 `api/admin/attendance/submit/route.ts:267` | CREATE `LESSON_PAY`；课程类型/年级/分钟 × 单价配置 | `lessonPayKey=lessonId` 唯一 + 预检 + FOR UPDATE + P2002 | 考勤路径 |
| 2 | `src/lib/intensive-settlement.ts:88` | 管理端考勤直审 `admin/attendance/submit/route.ts:295`；审核通过 `intensive-review.ts:451`←`admin/intensive-reviews/[id]/route.ts:33`；历史补录 `intensive-history.ts:261`←`admin/intensive-history/route.ts:143` | CREATE `LESSON_PAY`（集训）；`calcLessonPay(ONE_ON_ONE, actualMinutes)`，不可计费则 0 | `lessonId+type` 预检；`lessonPayKey` 唯一 | 考勤/审核路径 |
| 3 | `src/lib/intensive-settlement.ts:147` | 集训结算调整 `admin/intensive-settlement/adjust/route.ts:25` | CREATE `LESSON_PAY_ADJUSTMENT`；新总额−旧总额 | `adjustmentId` 唯一；`updateMany` 乐观断言 count=1；差额为 0 不写 | 审核/调整路径 |
| 4 | `src/lib/teacher-salary.ts:613` | 反馈提交 `api/feedback/route.ts:439`；教师反馈 `api/teacher/classroom-feedback/route.ts:288`；管理端反馈 `api/admin/classroom-feedback/route.ts:270`（库内拒 admin 源） | CREATE `FEEDBACK_BONUS`；获奖人数 × 单价 | `@@unique([feedbackId,type])` + 两次预检 + P2002；学生级台账 `FeedbackRewardRecord` | 反馈路径 |
| 5 | `src/lib/study-hall/rewards.ts:56` | 晚托考勤全到 `api/study-hall/route.ts:355` | CREATE `STUDY_HALL_ATTENDANCE`；固定 40 元/班/日 | `lessonPayKey=STUDY_HALL_ATTENDANCE:classId:date` 唯一 + P2002 | 晚托路径 |
| 6 | `src/lib/study-hall/rewards.ts:79` | 晚托作业登记 `api/study-hall/route.ts:299` | CREATE `STUDY_HALL_BONUS`；固定 0.5 元/人 | `feedbackId=entryId` + `@@unique([feedbackId,type])` + P2002 | 晚托路径 |
| 7 | `src/lib/salary-settlement.ts:58` | 月结 `admin/salary/settle/route.ts:37` | CREATE `SALARY_SETTLEMENT`；待结算流水求和（收据，非新增收入） | Serializable 事务 + `updateMany` 抢占断言 + expectedTotal 预检 | 结算路径 |
| 8 | `src/app/api/admin/salary/route.ts:244` | 管理端手动调整 POST `/api/admin/salary` | CREATE `manual_adjust`；客户端传入非 0 金额，必填原因 | **无幂等键/请求编号**；仅允许当前 ACTIVE 学期 | 人工路径 |
| 9 | `src/lib/salary-settlement.ts:53` | 同 #7 | UPDATE 标记 `settledAt/settlementBatchId` | `where id in ids + settledAt null + batchId null` 抢占 | 结算路径 |
| 10 | `src/app/api/admin/salary/route.ts:290` | 管理端删除手动调整 DELETE `/api/admin/salary` | UPDATE 软删 `deletedAt/deletionBatchId`；仅 `manual_adjust` 可删 | 学期归属 + 类型校验 | 人工路径 |
| 11 | `src/lib/academic-term.ts:108,118,127` | 学期归属修复（`repairLegacyAcademicTermScope`） | UPDATE 回填 `termId`（不改金额） | 仅 `termId IS NULL` 行 | 归属修复 |
| 12 | `src/lib/data-correction/cleanup.ts:85` | 管理端数据清理（动态 `modelFor(tx, category)`） | UPDATE 软删 `deletedAt/deletionBatchId` | 按分类 + 学部/学期/日期/班级范围 | 数据修正 |
| 13 | `src/lib/data-correction/trash.ts:319,322` | 回收站 purge 课次树 | DELETE 硬删（按 lessonId / adjustmentId） | 随课次树级联 | 数据修正 |
| 14 | `src/lib/data-correction/trash.ts:343` | 回收站按批次 purge | DELETE 硬删（按 deletionBatchId） | 批次隔离 | 数据修正 |
| 15 | `src/lib/data-correction/trash.ts:348` | 回收站 purge 反馈 | DELETE 硬删（按关联 feedbackId 集合） | 随反馈级联 | 数据修正 |
| 16 | `src/app/api/admin/data-admin/reset/route.ts:27` | 管理端数据重置 | DELETE 硬删（按学部） | 管理员工具通道 | 数据修正 |

**只读出现点（不写库，排除旁路嫌疑）**：`src/lib/teacher-dashboard.ts:582`、`src/app/api/teacher/trends/route.ts:33`、`src/app/api/admin/salary/export/route.ts:71`、`src/lib/cancel-class-lesson.ts:50`（count 阻断校验）、`src/app/api/teacher/salary/route.ts:20`、`src/app/api/admin/salary/route.ts` GET 分支、`src/app/api/feedback/bonus-preview/route.ts`（预览，不写）。

### 节点9：Schema 约束与字段语义

```prisma
// prisma/schema.prisma:2072-2101
model TeacherSalaryTransaction {
  id                String  @id @default(cuid())
  teacherId         String
  termId            String?
  type              String
  amount            Float
  lessonId          String?
  lessonPayKey      String?                     @unique
  feedbackId        String?
  adjustmentId      String?                     @unique
  ...
  @@unique([feedbackId, type])
  @@index([feedbackId])
  @@index([deletedAt])
}
```

```prisma
// prisma/schema.prisma:918,955（反馈状态枚举落库为字符串）
model ClassroomFeedback {
  ...
  status             String        @default("DRAFT")
  ...
}
// prisma/schema.prisma:981-987（独立草稿表，与工资表无关联）
model TeacherFeedbackDraft {
  teacherId String @id
  payload   Json
  ...
}
```

- 判定：课时级去重靠 `lessonPayKey`，反馈级去重靠 `[feedbackId, type]`，调整级去重靠 `adjustmentId`；三套键分工明确。
- 确定性：[已核实]（schema 文本）；**线上 DB 是否实际存在同名唯一约束未连库校验** [待验证]。

## 三、风险与修复建议（只写建议，不实施）

| # | 风险描述 | 触发条件 | 影响面 | 等级 | 建议（一句话方向，不写代码） |
|---|---|---|---|---|---|
| R1 | 管理端撤销反馈只软删反馈 + 停用学生级奖励台账，**不冲销对应 `FEEDBACK_BONUS` 工资流水**；结算口径不关联反馈撤销状态，已发/待发奖金仍计入应发 | 教师对未到课学员发反馈后，管理员在月结前撤销该反馈 | 该教师反馈奖金多计，结算时按错误金额发放；结算后撤销更难追回 | 高 | 撤销事务内对该 `feedbackId+type=FEEDBACK_BONUS` 流水做软删/负向冲销，或在结算与工资查询口径中排除已撤销反馈的奖金 |
| R2 | 回收站恢复课次/反馈时不恢复对应工资流水（restore 分支无 `teacherSalaryTransaction` 写回）；purge 却是硬删 | 课次/反馈被软删或硬删后又走恢复 | 源数据回来了但工资流水缺失，或反之，课时费与反馈奖金对不上 | 中 | 恢复流程补齐工资流水的反向恢复，或在恢复校验中显式列出未恢复的工资条数并告警 |
| R3 | 管理员手动调整流水 `manual_adjust` 无幂等键/请求编号，重复 POST（双击、重试）可产生两笔同金额调整 | 管理端网络重试或重复点击提交 | 月结多计一笔人工调整 | 中 | 为手动调整增加客户端请求编号或短时间窗口内同教师同学期同金额同原因的重复校验 |
| R4 | 晚托作业奖励 append-only：作业状态被改回 `NOT_RECORDED` 后已发 0.5 元不回溯扣回（注释明示为产品规则 A1） | 作业登记后被修改/更正 | 作业奖励与最终作业事实不一致 | 低 | 确认产品上是否接受该口径；若需对齐，在作业状态变更时补发反向调整流水 |
| R5 | `ClassroomFeedback` 可残留 DRAFT 行；无 DRAFT→PUBLISHED 的状态转换端点，草稿不会误发奖金（安全），但历史草稿行可能出现在部分列表/统计口径 | 教师保存草稿后未发布 | 统计口径噪音，不直接影响金额 | 低 | 梳理列表/统计查询是否需要按 `status` 显式过滤草稿 |

## 四、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|---|---|
| N1 | 课时费是否只由考勤提交/审核路径产生 | 普通班仅 `teacher-salary.ts:176` 一处 CREATE LESSON_PAY，入口仅两个考勤提交路由（`teacher/attendance/route.ts:643`、`admin/attendance/submit/route.ts:267`）；集训仅 `intensive-settlement.ts:88`，入口为审核通过/历史补录/直审；Grep 全仓无第三处 LESSON_PAY 写入 |
| N2 | 点名（rollCall）不会重复扣课时/重复计工资 | 互动路由文件头注释明示只写 `status/rollCallStatus`，不写 `hoursDeducted`、不设 `attendanceSubmittedAt`（`interaction/route.ts:19-27`）；提交后点名转只读（`:148-153`）；全目录无工资库 import、无工资表写操作 |
| N3 | 课堂互动/背单词未旁路落工资 | 工资库 import 清单中无 `interaction/**`、`parent/vocab/**`；pick 路由仅写 `classroomPick`；vocab 三路由 Grep 工资关键词 0 命中 |
| N4 | 草稿/未提交反馈不会误生成奖金 | 三层防护：①路由层仅 `status==='PUBLISHED'` 才调奖金（`feedback/route.ts:438`、`teacher/classroom-feedback/route.ts:287`）；②库内 `isPayableFeedback` 要求 PUBLISHED + 有学员 + 有内容（`teacher-salary.ts:79-88,532`）；③独立草稿表 `TeacherFeedbackDraft`（`schema.prisma:981-987`；`feedback-draft/route.ts:108`）与工资表无关联 |
| N5 | 同一笔反馈不会重复发奖金 | DB 唯一约束 `@@unique([feedbackId,type])`（`schema.prisma:2093`）+ 写入前预检（`teacher-salary.ts:543-546`）+ 事务内二次预检（`:578-581`）+ P2002 并发兜底（`:651`）；学生级首次反馈另有 `FeedbackRewardRecord` 台账 + `skipDuplicates`（`:587-603`） |
| N6 | 同一节课不会重复计课时费 | `lessonPayKey=lessonId` 唯一（`schema.prisma:2081`）+ `findUnique` 预检（`teacher-salary.ts:143-147`）+ `FOR UPDATE` 行锁（`:134`）+ P2002 兜底（`:205-207`）；集训另有 `lessonId+type` 预检（`intensive-settlement.ts:82-86`） |
| N7 | 管理端代发反馈不计教师薪资 | 库内校验 `source==='admin'` 直接拒绝（`teacher-salary.ts:528-531`）；管理端反馈行 `source='admin'`（`admin/classroom-feedback/route.ts:201`；`feedback/route.ts:399`） |
| N8 | 无出勤学员不计课时费 | `hasAttendingStudent` 要求存在 PRESENT/LATE（`attendance-submission.ts:95-101`），否则返回失败并中断事务（`teacher-salary.ts:149-151`） |
| N9 | 反馈与考勤的学科/学员范围在服务端二次解析 | 不信任客户端传入的学员/班级/课次，统一走 `resolveTeacherFeedbackCreationScope` 解析（`feedback/route.ts:278-296`；`access.ts:311-342`） |

## 五、未能确认 / 需要运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|---|---|---|
| V1 | 线上 PostgreSQL 中 `lessonPayKey`、`adjustmentId`、`[feedbackId,type]` 三个唯一约束是否真实存在 | 本次只读审计未连库查 `pg_constraint`；schema 文本已确认 | 对 `edu_manage` 执行只读 `SELECT conname, pg_get_constraintdef(...) FROM pg_constraint WHERE conrelid='TeacherSalaryTransaction'::regclass` |
| V2 | 被撤销反馈的奖金流水在历史月份是否已被月结发放、是否存在已发未冲销的存量数据 | 需查库中 `FEEDBACK_BONUS` 关联 `ClassroomFeedback.deletedAt IS NOT NULL` 的行及其 `settledAt/settlementBatchId` | 只读 SQL 关联统计：按教师/学期列出此类流水金额与结算状态 |
| V3 | 是否存在动态拼接模型名写入工资表的运行时路径（除 `cleanup.ts` 的 `modelFor` 外） | 静态 Grep 基于字面量；动态属性访问无法完全穷举 | 代码评审 `modelFor`/动态键映射的全部调用点，或在 DB 开 `pg_stat_statements` 观察 `TeacherSalaryTransaction` 的 INSERT 来源 |
| V4 | 晚托作业奖励改为 `NOT_RECORDED` 后，产品口径是否确认为不扣回 | 代码注释标注 A1 为有意设计，需产品侧确认 | 与负责人核对晚托奖励规则文档，确认 append-only 是否为最终口径 |

## 六、与预置事实不符

| 预置说法 | 实际情况 | 证据 |
|---|---|---|
| 工资链：`teacher-salary.ts` 的 `createLessonPayInTransaction`；Intensive 走 `intensive-settlement.ts` | 方向属实，但**预置遗漏两条独立收入通道**：晚托考勤奖励 `STUDY_HALL_ATTENDANCE`（`study-hall/rewards.ts:56`）与晚托作业奖励 `STUDY_HALL_BONUS`（`:79`），二者不经课时费/反馈奖金库函数 | `src/lib/study-hall/rewards.ts:50-95`；入口 `api/study-hall/route.ts:299,355` |
| 「TeacherSalaryTransaction 是否只由考勤提交/审核路径写入」待排查 | **不是只由考勤/审核写入**。另有：反馈奖金（反馈路径）、晚托两类奖励（晚托路径）、管理员手动调整（人工路径）、月结汇总收据（结算路径）；考勤/审核只覆盖 LESSON_PAY 与 LESSON_PAY_ADJUSTMENT | 见节点 8 全量清单 #1–#8 |
| `academic-term.ts` 里 feedbackId 关联 salary | 属实，但角色仅限**学期归属回填**：按 `feedbackId=ClassroomFeedback.id` UPDATE `termId`，不参与金额计算、不参与去重判定 | `src/lib/academic-term.ts:117-124`；金额公式见 `teacher-salary.ts:605` |
| 反馈、考勤、工资数据链路是否连通需确认 | 反馈→工资：部分连通（生成链路通，撤销不冲销）；考勤→工资：连通；反馈→考勤：单向（反馈需先考勤，考勤不需反馈）；点名/互动/背单词→工资：断开 | 见节点 1–7 |
