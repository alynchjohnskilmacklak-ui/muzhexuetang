# D · 学期归属（termId 回填）与数据库层约束兜底（ID: D）

> 只读审计。未改源码、未改数据库、未跑 migrate / db push / generate、未重启服务。
> 本地抽样仅执行 SELECT（库 `edu_manage` @ 127.0.0.1:5432），抽样结果标注为 `[已核实·本地库]`。
> 范围：termId 三条回填路径、结算查询的 termId 过滤、Feedback/Attendance 归属字段、相关表外键/onDelete/唯一键、迁移历史缺约束痕迹。工资金额规则、课时扣减链不在本分片范围。

## 一、结论速览

| # | 链路节点 | 结论 | 风险等级 | 一句话证据 |
|---|---------|------|---------|-----------|
| 1 | 学期归属 · lessonId 路径（课时费/集训课时费/调整） | 部分连通 | 中 | `src/lib/teacher-salary.ts:179` 直接取 `lesson.group.termId`，链路断到班级时落 NULL，写库无日期兜底 |
| 2 | 学期归属 · feedbackId 路径（反馈奖励） | 部分连通 | 中 | `src/lib/teacher-salary.ts:539-541,616` 三级回退后仍可能 `termId: null` |
| 3 | 学期归属 · lessonDate 路径（按日期回填） | 部分连通 | 中 | 仅存在于离线 repair SQL `src/lib/academic-term.ts:126-145`，写入流程不按日期算 termId |
| 4 | 工资入账 · 学期结算查询 | 断开（对 NULL termId 流水） | 高 | `src/lib/salary-settlement.ts:40,54` 强 `where termId = options.termId`，NULL 流水被静默排除，无兜底期 |
| 5 | 反馈落库 · termId 归属字段 | 部分连通 | 低 | `prisma/schema.prisma:920` ClassroomFeedback 有可空 termId；`src/lib/classroom-feedback/access.ts:256` 单次反馈刻意置 null |
| 6 | 考勤提交 · termId 归属字段 | 部分连通 | 中 | `prisma/schema.prisma:523-552` Attendance **无 termId 字段**，只能经 Lesson→Group→Term 反查 |
| 7 | 数据库约束 · 工资表外键 | 部分连通 | 高 | `prisma/migrations/20260603000000_add_teacher_salary/migration.sql:38,41,47`：lessonId/feedbackId 只有索引无外键，本地库实测 40 条悬空引用 |
| 8 | 数据库约束 · 考勤/反馈/报名外键与唯一键 | 连通 | 低 | `prisma/schema.prisma:545,484,921` 及迁移 20261028130000:33-51 外键+唯一键齐全 |
| 9 | 新功能（点名/互动/背单词/晚托/集训）学期归属 | 部分连通 | 中 | 背单词两表无 termId/无外键（`schema.prisma:2340-2371`）；晚托 termId 非空受限（`:1838,1853`）；点名记录 Attendance/ClassroomPick 无 termId |
| 10 | 历史课补录的学期归属 | 部分连通 | 中 | 建班绑定当前 ACTIVE 批次、不看开课日期（`src/app/api/class-groups/route.ts:183-197`）；本地库 14 条课时费日期越界 |

## 二、详细证据

### 节点1：学期归属 · lessonId 路径（LESSON_PAY / LESSON_PAY_ADJUSTMENT / 集训）

- 写入方：`src/lib/teacher-salary.ts:176-183` — 普通班课时费在调用方事务内创建流水，termId 取自 `lesson.group.termId`。
- 写入方（集训）：`src/lib/intensive-settlement.ts:88-99` 与 `:147-158` — 集训课时费与调整单同样取 `context.lesson.group.termId`。
- 读取方：`src/lib/salary-settlement.ts:39-42` 结算时按 `termId` 精确过滤（见节点4）。
- 对齐字段 / 判定依据：`TeacherSalaryTransaction.lessonId` → `ClassLesson.groupId` → `ClassGroup.termId`；流水自身只存 `lessonDate`，**写库时不用 lessonDate 反推 termId**。

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

```ts
// src/lib/intensive-settlement.ts:88-99（另 :147-158 调整单同构）
const salary = await tx.teacherSalaryTransaction.create({
  data: {
    teacherId: context.teacherId,
    type: 'LESSON_PAY',
    amount: context.amount,
    termId: context.lesson.group.termId,
    lessonId,
    lessonPayKey: lessonId,
    lessonDate: context.lesson.lessonDate,
```

- 空值场景：当 `ClassGroup.termId` 为 NULL（历史遗留班、批次切换/归档后未回填、repair 未覆盖的班）时，流水 `termId` 直接落 NULL。链路中间任何一环缺失（课次被软删、班级 termId 为空）都不会在写库时报错。
- 判定：**部分连通**。路径存在且常规链路（班→课→流水）可对齐，但无写库兜底、无非空约束，断链时静默落 NULL。
- 确定性：[已核实]

### 节点2：学期归属 · feedbackId 路径（FEEDBACK_BONUS）

- 写入方：`src/lib/teacher-salary.ts:539-541,613-621` — 三级回退：反馈自带 termId → 课次所属班 termId → 反馈班 feedbackGroupId 所属班 termId；三级皆空则 `termId: null`。
- 反馈落库时的 termId 来源：
  - 教师端课次路径：`src/lib/classroom-feedback/access.ts:347` `termId = lesson.group.termId`。
  - 教师端班级路径：`access.ts:386` `termId = group.termId`。
  - 单次课程反馈：`access.ts:256` `termId = null`（刻意不归属批次）。
  - 仅选学生的兜底：`access.ts:456-479` 取当前 ACTIVE 批次下某班的 termId，取不到为 null。
  - 通用反馈路由班回退：`src/app/api/feedback/route.ts:372-377` 用 feedbackGroupId 查班 termId。
  - 管理端代发：`src/app/api/admin/classroom-feedback/route.ts:217-225` 课次班 termId → ACTIVE 批次 id → null；但 `source='admin'` 反馈不计薪资（`teacher-salary.ts:528-531`）。

```ts
// src/lib/teacher-salary.ts:537-541
const teacherId = feedback.teacherId
const lesson = feedback.classLesson
const feedbackTermId = feedback.termId || lesson?.group.termId || (feedback.feedbackGroupId
  ? (await prisma.classGroup.findUnique({ where: { id: feedback.feedbackGroupId }, select: { termId: true } }))?.termId
  : null)
```

```ts
// src/lib/teacher-salary.ts:613-621
await tx.teacherSalaryTransaction.create({
  data: {
    teacherId, type: 'FEEDBACK_BONUS', amount: finalAmount, feedbackId,
    termId: feedbackTermId || null,
    lessonId: lesson?.id ?? null,
    lessonDate: lesson?.lessonDate ?? new Date(),
```

- 空值场景：① 单次课程反馈（无课次、无班）；② 学生维度反馈且兜底班 termId 为空；③ 反馈班 termId 为 NULL。该反馈若通过 `isPayableFeedback` 校验（`teacher-salary.ts:532`，要求 PUBLISHED + 有内容 + 有学生），奖励流水就会带 NULL termId 入账。
- 判定：**部分连通**。回退链覆盖课次/班级两类常规场景，但单次反馈与遗留空批次场景必然或可能落 NULL。
- 确定性：[已核实] 代码路径；单次反馈是否产生奖励流水取决于 `isPayableFeedback` 运行态结果，[待验证]。

### 节点3：学期归属 · lessonDate 路径（离线 repair，非写库链路）

- 唯一按日期匹配 termId 的代码在 `src/lib/academic-term.ts:126-145`（工资）与 `:76-105`（反馈），均为 `$executeRaw` UPDATE，只修 `termId IS NULL` 的行。
- 触发时机：仅 `activateAcademicTerm` 内调用 `repairLegacyAcademicTermScope`（`academic-term.ts:166-167`），即批次激活时跑一遍；**任何写入流程（课时费、反馈奖励、晚托奖励、手工调整）都没有用 lessonDate/createdAt 反推 termId 的分支**。
- 匹配规则：`COALESCE(lessonDate, createdAt)::date BETWEEN terms.startDate AND terms.endDate`，且 `NOT EXISTS` 另一个同批次区间重叠的学期；多学期重叠或无匹配 → 保持 NULL。

```sql
-- src/lib/academic-term.ts:126-145
UPDATE "TeacherSalaryTransaction" AS salary
SET "termId" = ${input.termId}
FROM "AcademicTerm" AS terms, "Teacher" AS teachers
WHERE terms."id" = ${input.termId}
  AND terms."division" = ${input.division}
  AND teachers."id" = salary."teacherId"
  AND teachers."division" = terms."division"
  AND salary."termId" IS NULL
  AND COALESCE(salary."lessonDate", salary."createdAt")::date
      BETWEEN terms."startDate" AND terms."endDate"
  AND NOT EXISTS (
      SELECT 1 FROM "AcademicTerm" AS other
      WHERE other."division" = terms."division"
        AND other."id" <> terms."id"
        AND COALESCE(salary."lessonDate", salary."createdAt")::date
            BETWEEN other."startDate" AND other."endDate"
  )
```

- 关键限制：① 只填空、**不纠错**——已挂到错误学期的非 NULL termId 不会被日期规则改写；② 只在批次激活时执行一次，激活之后新产生的 NULL 行要等下一次激活；③ 日期跨多学期、学员无学期会员记录（反馈规则 `:86-104` 要求存在 StudentTermMembership）时保持 NULL。
- 判定：**部分连通**。日期回填是事后补救网，不是写入时归属器；新功能记录在写入瞬间不享受日期归属。
- 确定性：[已核实]

### 节点4：工资入账 · 学期结算查询（F2 核心证据）

- 结算主查询：`src/lib/salary-settlement.ts:39-42` — `where` 同时带 `teacherId`、`termId: options.termId`、`deletedAt: null`、时间区间。
- 结算认领二次过滤：`:53-56` `updateMany` 再次要求同 `termId`，防止并发跨批次认领。
- 结算批次流水自身也写 `termId: options.termId`（`:59`）。
- `options.termId` 来源：`src/app/api/admin/salary/settle/route.ts:37` 传入 `selectedTerm.id`；`selectedTerm` 由 `resolveAdminTermScope` 解析（`src/lib/admin-term-scope.ts:21-47`），无选中/无 ACTIVE 批次时返回 `null`，路由在 `:16-18` 直接 409 拦截，不会传 NULL 进结算。

```ts
// src/lib/salary-settlement.ts:38-42
const rows = await tx.teacherSalaryTransaction.findMany({
  where: { teacherId: options.teacherId, termId: options.termId, deletedAt: null, createdAt: { gte: options.since, lte: options.through } },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
})
```

```ts
// src/lib/salary-settlement.ts:53-56
const claimed = await tx.teacherSalaryTransaction.updateMany({
  where: { id: { in: ids }, teacherId: options.teacherId, termId: options.termId, deletedAt: null, settledAt: null, settlementBatchId: null },
  data: { settledAt: now, settlementBatchId: batchId },
})
```

- NULL termId 处置判定：Prisma `termId: '<id>'` 生成 SQL `termId = '<id>'`；`NULL = '<id>'` 结果为 unknown，**不命中任何行**。全仓工资相关读取方均未出现 `OR termId: null`、`termId: { not: ... }` 或"未归属/兜底期"分支：
  - 管理端工资列表：`src/app/api/admin/salary/route.ts:30-36`，`termId: selectedTerm?.id || '__NO_SELECTED_TERM__'`（哨兵字符串，永远匹配不到 NULL）。
  - 教师端工资条：`src/app/api/teacher/salary/route.ts:20-27`，`termId: activeTerm?.id || '__NO_ACTIVE_TERM__'`。
  - 工资导出：`src/app/api/admin/salary/export/route.ts:71-74`，`termId: selectedTerm.id`。
  - 管理端删除/调整校验：`src/app/api/admin/salary/route.ts:281` `transaction.termId !== selectedTerm.id` 即 409。
- 反例（不按 termId 过滤的读取方）：教师仪表盘 6 个月趋势 `src/lib/teacher-dashboard.ts:582-585` 与 `src/app/api/teacher/trends/route.ts:33-36` 只按 teacherId + createdAt 过滤——NULL termId 流水**仍会出现在趋势图**，但不进工资条、不进结算、不进导出。
- 本地库抽样 `[已核实·本地库]`：非删除工资流水 7194 条（LESSON_PAY 2007 / FEEDBACK_BONUS 5090 / manual_adjust 88 / SALARY_SETTLEMENT 4 / STUDY_HALL_BONUS 3 / STUDY_HALL_ATTENDANCE 2），当前 `termId IS NULL` 为 **0 条**；即当前存量没有悬空归属流水，但这是历史 repair + 当前建班规则共同作用的结果，代码路径上 NULL 仍可再次产生。
- 判定：**断开（针对 NULL termId 流水）**。NULL 流水被结算、工资条、导出三条链路静默排除，不进入任何兜底期；唯一补救是下次批次激活时的 repair（节点3），且补救能否命中取决于日期/会员关系是否唯一可判。
- 确定性：[已核实] 代码与本地库；生产库是否存在 NULL 行 [待验证]。

### 节点5：反馈落库 · termId 归属字段（F3 反馈侧）

- 字段事实：`prisma/schema.prisma:918-921` ClassroomFeedback 有 `termId String?`，外键 → AcademicTerm，`onDelete: SetNull`；索引 `:969` `@@index([termId, status, createdAt])`。
- 关系缺口：`feedbackGroupId` 只是 `String?`（`:932`），schema 中**没有到 ClassGroup 的 relation 字段**，迁移 `20260620000000_add_feedback_course_context/migration.sql:2,4` 只加列加索引，未加外键；`studentIds String[]`（`:935`）无任何参照完整性。

```prisma
// prisma/schema.prisma:918-935
model ClassroomFeedback {
  id                 String        @id @default(cuid())
  termId             String?
  term               AcademicTerm? @relation(fields: [termId], references: [id], onDelete: SetNull)
  teacherId          String
  teacher            Teacher       @relation(fields: [teacherId], references: [id])
  classLessonId      String?
  classLesson        ClassLesson?  @relation(fields: [classLessonId], references: [id])
  ...
  feedbackGroupId    String?
  studentIds         String[]
```

- 外键实际行为（迁移）：teacherId RESTRICT（`20260519171000_add_classroom_feedback/migration.sql:25`）；classLessonId SET NULL（`:26`）；termId SET NULL（`20260811233000_repair_legacy_term_scope/migration.sql:131-134`）。
- 本地库抽样 `[已核实·本地库]`：反馈 5370 条，termId NULL 0 条；无课次 4752 条、无反馈班 632 条（单次/学生维度反馈），这些行的 termId 来自班回退或 repair。
- 判定：**部分连通**。反馈表自带 termId 字段与外键，但 feedbackGroupId、studentIds 无 DB 兜底，单次反馈按设计不归属批次。
- 确定性：[已核实]

### 节点6：考勤提交 · termId 归属字段（F3 考勤侧）

- 字段事实：`prisma/schema.prisma:523-552` Attendance **没有 termId 字段**，也没有 feedbackGroupId 之类的批次锚点；归属只能 `Attendance.lessonId → ClassLesson.groupId → ClassGroup.termId` 反查。
- 字段清单：lessonId?、studentId、enrollmentId?、status、actualMinutes、hoursDeducted、rollCallStatus、rollCallMarkedAt、createdAt、deletedAt、deletionBatchId。

```prisma
// prisma/schema.prisma:523-552
model Attendance {
  id              String       @id @default(cuid())
  lessonId        String?
  lesson          ClassLesson? @relation(fields: [lessonId], references: [id])
  studentId       String
  student         Student      @relation(fields: [studentId], references: [id])
  enrollmentId    String?
  enrollment      Enrollment?  @relation(fields: [enrollmentId], references: [id])
  status          AttStatus    @default(PRESENT)
  ...
  rollCallStatus   String?
  rollCallMarkedAt DateTime?
  @@unique([lessonId, studentId], name: "attendance_lesson_student_unique")
```

- 点名（课堂互动）记录 ClassroomPick 同样无 termId：`schema.prisma:434-456`，仅挂 lessonId。
- 本地库抽样 `[已核实·本地库]`：Attendance 25204 条，lessonId NULL 0 条，enrollmentId NULL 3 条。
- 含义：任何按批次统计考勤/出勤的页面都必须经班级/课次反查；若课次或班级被软删、termId 为空，该考勤记录在批次视图中即不可见，DB 无法直接指出"这条考勤属于哪个学期"。
- 判定：**部分连通**。考勤事实通过 lesson 挂到班级链路，模型层无独立批次锚点。
- 确定性：[已核实]

### 节点7：数据库约束清单（H1）

> onDelete 行为以最新迁移 SQL 为准（schema 未显式声明处，以 reconcile 迁移 20261028130000 补齐后的实际约束为准）。

| 关系 | 外键是否存在 | onDelete | 唯一键 / 索引 | 兜得住什么断链 | 证据 |
|------|------------|----------|--------------|--------------|------|
| Attendance → ClassLesson | 是 | SET NULL | `@@unique([lessonId, studentId])`；索引 `(lessonId,status)`、`(studentId,lessonId)` | 课次删除时考勤行保留、lessonId 置空；同课次同学员不可重复建考勤 | `schema.prisma:526,545-548`；`20261028130000_reconcile_runtime_schema_drift/migration.sql:33-36,61-63` |
| Attendance → Student | 是 | RESTRICT | 无独立唯一键 | 学员存在考勤记录时禁止删除学员 | `20260517062914_add_course_attendance_grade/migration.sql:182`（后续 reconcile 未改动此约束） |
| Attendance → Enrollment | 是 | SET NULL | 索引 `(enrollmentId)` | 报名记录删除时考勤行保留、enrollmentId 置空 | `20261028130000:38-41`；`schema.prisma:530,547` |
| TeacherSalaryTransaction → Teacher | 是 | CASCADE | 索引 `(teacherId, createdAt)` | 教师删除时流水级联删除（不会留下指向死教师的流水） | `20260603000000_add_teacher_salary/migration.sql:47`；`schema.prisma:2075` |
| TeacherSalaryTransaction → AcademicTerm | 是 | SET NULL | 索引 `(termId, teacherId, createdAt)` | 学期删除时流水保留、termId 置空 | `20260811190000_scope_salary_by_academic_term/migration.sql:20-23`；`schema.prisma:2077,2095` |
| TeacherSalaryTransaction → ClassLesson | **否**（仅索引 `lessonId`、`lessonId,type`） | — | `lessonPayKey @unique`（一课次一条课时费幂等键）；`adjustmentId @unique` | **兜不住**：课次被删后流水 lessonId 悬空；DB 不报错 | `20260603000000:38`；`schema.prisma:2080-2083,2097-2098`；唯一键见 `20260823183000_harden_lesson_pay_idempotency/migration.sql:21-22` |
| TeacherSalaryTransaction → ClassroomFeedback | **否**（仅索引 `feedbackId`） | — | `@@unique([feedbackId, type])`（一反馈一类型一条奖励） | **兜不住**：反馈被删后流水 feedbackId 悬空；DB 不报错 | `20260603000000:41`；`schema.prisma:2082,2093,2099`；唯一键见 `20261028130000:70-71` |
| TeacherSalaryTransaction → LessonSettlementAdjustment | 是 | RESTRICT | `adjustmentId @unique` | 调整单被流水引用时禁止删调整单 | `schema.prisma:2084`；`20260719190000_add_intensive_salary_adjustment_audit/migration.sql:20` |
| ClassroomFeedback → Teacher | 是 | RESTRICT | 索引 `(teacherId, createdAt)` 等 | 教师存在反馈时禁止删除 | `20260519171000:25`；`schema.prisma:923,968` |
| ClassroomFeedback → ClassLesson | 是 | SET NULL | 索引 `(classLessonId)` | 课次删除时反馈保留、classLessonId 置空 | `20260519171000:26`；`schema.prisma:925,971` |
| ClassroomFeedback → ClassGroup（feedbackGroupId） | **否**（仅索引 `feedbackGroupId`） | — | 无 | **兜不住**：班级被删后 feedbackGroupId 悬空 | `20260620000000:2,4`；`schema.prisma:932,972` |
| ClassroomFeedback → Student | **否**（`studentIds String[]` 数组） | — | 无 | **兜不住**：学员删除后 studentIds 残留死引用 | `schema.prisma:935` |
| Enrollment → Student | 是 | CASCADE | `@@unique([studentId, groupId])`；多个状态/余额索引 | 学员删除时报名级联删除；同学员同班不可重复报名 | `schema.prisma:468,484`；`20261028130000:43-46` |
| Enrollment → ClassGroup | 是 | CASCADE | 同上唯一键；索引 `(groupId,status)` | 班级删除时报名级联删除 | `schema.prisma:470`；`20261028130000:48-51` |
| Enrollment → Course | 无直接关系（Course 挂在 ClassGroup 上） | — | — | 经 ClassGroup 间接对齐 | `schema.prisma:256-257` |
| ClassGroup → AcademicTerm | 是 | SET NULL | 索引 `(termId, status)` | 学期删除时班级保留、termId 置空 | `schema.prisma:272-273,292` |
| StudyHallClass → AcademicTerm | 是 | RESTRICT | termId 非空（`String`）；索引 `(termId, status)` | 晚托班必须归属有效学期；学期存在晚托班时禁止删学期 | `schema.prisma:1838,1853,1860` |
| ClassroomPick → ClassLesson | 是 | CASCADE | `@@unique([lessonId, studentId, round])` | 课次删除时点名记录级联清除；同课次同学员同轮不重复 | `schema.prisma:437,452`；`20261105130000_add_classroom_interaction/migration.sql:28-29,23` |
| ClassroomPick → Student / Teacher | **否** | — | 索引 `(studentId,createdAt)`、`(teacherId,createdAt)` | **兜不住**：学员/教师删除后死引用 | `schema.prisma:438-439,454-455` |
| VocabProgress → Student | **否** | — | `@@unique([studentId, wordId])`；索引 `(studentId,status)` | **兜不住**：学员删除后进度残留 | `schema.prisma:2342,2352-2353`；`20261106000000_add_vocab_progress_sessions/migration.sql:2-14,35-36` |
| VocabSession → Student | **否** | — | 索引 `(studentId, finishedAt desc)`；**无唯一键** | **兜不住**：学员删除后练习留档残留；同学员同次练习重复写入无 DB 拦截 | `schema.prisma:2359,2370`；`20261106000000:16-30,38-39` |
| FeedbackRewardRecord → Feedback/Student/Teacher | **否**（三列均无 relation） | — | 仅普通索引 | **兜不住**：反馈/学员/教师删除后奖励台账残留 | `schema.prisma:2107-2119,2121-2124`；`20260721113000_feedback_reward_daily/migration.sql` 全文无 ADD CONSTRAINT |

### 节点8：DB 完全兜不住、只能靠代码自觉的断链（H2）

1. **流水 → 课次悬空**：`TeacherSalaryTransaction.lessonId` 无外键。课次被软删/硬删后，流水仍保留 lessonId；结算/工资条经 lessonId 反查班级班型（`admin/salary/route.ts:72-77`）时查不到课次，班型归类退化为 description 猜测。本地库实测 `[已核实·本地库]`：40 条流水引用了不存在的课次/反馈——其中 LESSON_PAY 33 条、FEEDBACK_BONUS 7 条（lessonId 悬空），另有 feedbackId 悬空 10 条。
2. **流水 → 反馈悬空**：`feedbackId` 无外键。反馈删除后奖励流水悬空，反馈奖励的班型/学科归类（`admin/salary/route.ts:79-101`）取不到反馈快照。
3. **反馈 → 班级悬空**：`feedbackGroupId` 无外键；**反馈 → 学员悬空**：`studentIds` 为数组，无参照校验。
4. **学期归属正确性**：DB 不校验 `lessonDate` 是否落在所属 term 的 `[startDate, endDate]` 内，也不校验反馈学员是否属于该 term 的 StudentTermMembership；归属对错完全由写库代码与事后 repair 负责。
5. **考勤课次锚点可空**：Attendance.lessonId 为可空外键（SET NULL），NULL 课次的考勤在批次反查中无锚点，DB 不阻止这种行存在（PostgreSQL 唯一索引中 NULL 互不相同，同一学员可有多条 lessonId NULL 考勤）。
6. **背单词 / 奖励台账的学员锚点**：VocabSession、VocabProgress、FeedbackRewardRecord 的 studentId/teacherId/feedbackId 均无外键，主体删除后残留只能靠代码清理脚本。
7. **晚托奖励 termId**：写入侧 `createStudyHallAttendanceReward` / `createStudyHallHomeworkReward` 直接透传 `input.termId`（`src/lib/study-hall/rewards.ts:59,82`），调用方取 `studyClass.termId`（`src/app/api/study-hall/route.ts:301,357`）；因 StudyHallClass.termId 非空且 RESTRICT，DB 兜得住空批次，但兜不住"晚托班挂 A 批次、作业日期属 B 批次"的归属错位。

### 节点9：迁移历史中"加字段/加表但没加约束、没加索引"的痕迹（H3）

| 迁移 | 新增内容 | 缺的约束/索引 | 证据 |
|------|---------|--------------|------|
| `20261105130000_add_classroom_interaction` | Attendance 加 `rollCallStatus`、`rollCallMarkedAt`；ClassLesson 加 `rollCallSubmittedAt` | rollCallStatus 无索引、无 CHECK；点名防重复只靠 `ClassLesson.rollCallSubmittedAt` 代码锁定，DB 层没有第二道闸（Attendance 唯一键仍是 `(lessonId, studentId)`，不含点名状态/轮次） | `migration.sql:2-4,32-33`；`schema.prisma:350,537-538` |
| `20261106000000_add_vocab_progress_sessions` | VocabProgress、VocabSession 两表 | studentId 均无外键；VocabSession 无任何唯一键；两表均无 termId/lessonId 锚点 | `migration.sql:1-46`；`schema.prisma:2340-2371` |
| `20260620000000_add_feedback_course_context` | ClassroomFeedback 加 `feedbackGroupId` | 只加普通索引，未加 ClassGroup 外键 | `migration.sql:2,4` |
| `20260603000000_add_teacher_salary` | TeacherSalaryTransaction 建表 | lessonId、feedbackId 只建索引未建外键；后续所有迁移均未补 | `migration.sql:22-23,38,41,47` |
| `20260721113000_feedback_reward_daily` | FeedbackRewardRecord 台账 | feedbackId/studentId/teacherId 三列全无外键，仅普通索引 | `schema.prisma:2105-2125`；迁移 SQL 无 `ADD CONSTRAINT` |
| `20261028130000_reconcile_runtime_schema_drift` | 补对齐历史库 | 主动将 Attendance.lessonId/enrollmentId 改为可空以支持 SET NULL；说明早期这两列是 NOT NULL + RESTRICT，现网约束与早期基线不同 | `migration.sql:29-41` |
| `20261105213000_gradebook_absence_flow` | Assessment 加 `absentStudentIds`、`notifiedAbsentStudentIds` 数组 | 数组字段无学员参照校验 | `migration.sql:4-6` |

### 节点10：历史课补录是否会被建成当前学期（F4）

- 建班归属规则：`src/app/api/class-groups/route.ts:183-197` — 先按 `requestedTermId`（要求 ACTIVE）或当前 ACTIVE 批次取 term，`termId = term.id`；**不使用表单里的 `startDate` 做日期归属判断**。
- 一对一约课建班：`src/app/api/schedules/one-on-one/route.ts:105,125` 直接 `termId: activeTerm.id`。
- 课表复制建班：`src/app/api/class-groups/[id]/copy/route.ts:194` `termId: term.id`（选中/当前批次）。
- 课次本身不存 termId，继承班级；课时费流水再继承班级 termId（节点1）。repair 的日期规则只填空、不改写已有非 NULL 值（节点3）。

```ts
// src/app/api/class-groups/route.ts:183-197
const term = await prisma.academicTerm.findFirst({
  where: requestedTermId
    ? { id: requestedTermId, division, status: 'ACTIVE' }
    : { division, status: 'ACTIVE' },
  orderBy: { startDate: 'desc' },
  select: { id: true, status: true },
})
if (!term) { return NextResponse.json({ ... }, { status: 400 }) }
const termId = term.id
```

- 本地库抽样 `[已核实·本地库]`：14 条 LESSON_PAY 的 `lessonDate` 落在所挂学期区间之外（2 条早于 startDate、12 条晚于 endDate）；反馈 2 条 createdAt 越界。说明"历史日期 + 当前批次"的错位在存量中真实存在，只是数量不大。
- 判定：**部分连通**。补录历史课若在当前工作区下新建班/约课，会被计入当前学期工资；DB 无日期-学期一致性约束兜底。是否存在业务上需要按历史学期结算的补录流程，[待验证]。
- 确定性：[已核实] 代码规则 + 本地库越界计数；生产库越界规模 [待验证]。

## 三、风险与修复建议（只写建议，不实施）

| # | 风险描述 | 触发条件 | 影响面 | 等级 | 建议（一句话方向，不写代码） |
|---|---------|---------|--------|------|------------------------------|
| R1 | NULL termId 工资流水被结算/工资条/导出静默排除，且不进任何兜底期 | 班级 termId 为空、单次/学生维度反馈三级回退皆空、repair 未覆盖 | 教师应发工资漏结算，台账与结算对不上 | 高 | 结算与工资条查询增加"未归属批次"视图/告警；写入侧在 termId 落 NULL 时显式告警或阻断；repair 覆盖到每次新流水产生后可触发 |
| R2 | 流水 lessonId/feedbackId 无外键，主体删除后悬空引用长期残留 | 课次/反馈被删除或走回收站清理 | 班型归类、明细反查、结算对账失真；本地库已见 40+10 条悬空 | 高 | 评估补外键（先清洗悬空数据）或在删除课次/反馈时同步软清理或回填流水引用；增加孤儿引用健康巡检 |
| R3 | 历史课补录计入当前学期 | 在当前 ACTIVE 工作区下补录过去日期的班/课；日期与批次区间不匹配 | 跨学期课时费错算进本期工资 | 中 | 建班/约课时按 startDate/lessonDate 校验所属批次，越界时提示切换工作区；结算前按 lessonDate 与 term 区间做一致性核对 |
| R4 | Attendance 无 termId 锚点，批次统计全靠 lesson 反查 | 课次/班级被软删或 termId 为空 | 考勤在批次视图丢失，且无法直接按批次巡检 | 中 | 巡检脚本按 lesson→group 链路找出无锚点考勤；评估是否在考勤提交时冗余落 termId 快照 |
| R5 | 新功能表（VocabSession/VocabProgress/FeedbackRewardRecord/ClassroomPick 学员教师列）无外键 | 学员/教师/反馈主体删除 | 学习记录与奖励台账残留死引用 | 中 | 主体删除流程级联清理或补参照约束；VocabSession 评估加学员+时间窗幂等键 |
| R6 | rollCallStatus 等点名字段无 DB 约束/索引 | 并发重复点名提交 | 状态一致性只靠应用层提交锁，缺第二道防线 | 低 | 按查询模式补索引；评估点名状态迁移条件约束 |

## 四、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|--------|--------------------------------|
| N1 | 课时费一课次一条，DB 幂等键兜底 | `lessonPayKey @unique`，迁移前有重复数据预检；`schema.prisma:2081`、`20260823183000_harden_lesson_pay_idempotency/migration.sql:4-22`；代码并发路径 `teacher-salary.ts:143-147` 先查唯一键 |
| N2 | 一反馈一类型奖励，DB 幂等键兜底 | `@@unique([feedbackId, type])`，建唯一索引前有重复对预检；`schema.prisma:2093`、`20261028130000:16-24,70-71`；代码 `teacher-salary.ts:543-550` 先查重 |
| N3 | 考勤同课次同学员唯一 | `@@unique([lessonId, studentId])`；`schema.prisma:545`、`20261028130000:61-63`；本地库无重复对（健康巡检 `src/lib/data-admin/health.ts:23` 亦覆盖该检查） |
| N4 | 报名同学员同班唯一 | `@@unique([studentId, groupId])`；`schema.prisma:484` |
| N5 | 晚托班必须归属有效学期 | StudyHallClass.termId 非空 + RESTRICT 外键；`schema.prisma:1838,1853`；晚托奖励流水透传该 termId（`study-hall/rewards.ts:59,82`），不会落 NULL |
| N6 | 学期删除时关联表不被破坏 | 工资/反馈/班级 termId 外键均 ON DELETE SET NULL，学期删除后业务行保留；`20260811190000:20-23`、`20260811233000:131-134`、`schema.prisma:273,921,2077` |
| N7 | 教师删除时工资流水级联清除，不留死教师流水 | `TeacherSalaryTransaction.teacherId` FK CASCADE；`20260603000000:47`、`schema.prisma:2075` |
| N8 | 背单词模块不进工资/学期结算链路 | VocabSession/VocabProgress 无 teacherId、无 feedbackId、无 lessonId、无 termId，`schema.prisma:2340-2371`；工资写入方清单（`teacher-salary.ts`、`intensive-settlement.ts`、`study-hall/rewards.ts`、`admin/salary/route.ts:244`）均不引用 vocab 表——该模块与工资链路断开属于设计隔离，不是断链事故 |
| N9 | 管理端代发反馈不计薪资 | `teacher-salary.ts:528-531` source='admin' 直接返回不计薪，避免管理端反馈奖励错误入账 |
| N10 | 本地存量无 NULL termId 工资/反馈 | `[已核实·本地库]` 工资 7194 条 NULL=0，反馈 5370 条 NULL=0，班级 NULL termId=0，课次挂空批次班=0 |

## 五、未能确认 / 需要运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|----|--------|-----------|
| V1 | 生产库是否存在 termId 为 NULL 的工资流水/反馈 | 本分片只连本地 127.0.0.1 库；生产库未连接 | 生产只读 SELECT：`SELECT type, COUNT(*) FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NULL AND "termId" IS NULL GROUP BY type`；反馈同查 |
| V2 | 单次课程反馈（isSingleSession）是否会产生 FEEDBACK_BONUS 流水 | 取决于 `isPayableFeedback` 运行态校验与奖励触发入口是否对单次反馈开放，代码调用链未全量展开 | 构造一条 PUBLISHED 单次反馈走 `triggerFeedbackBonus`，观察流水 termId 是否为 NULL |
| V3 | 生产库越界归属规模（lessonDate/createdAt 落在 term 区间外） | 本地库 14+2 条，生产数据量未知 | 生产只读按节点10 的 JOIN 条件统计越界行数与教师分布 |
| V4 | 回收站/数据纠正流程删除课次、反馈后，流水悬空引用是否被同步清理 | 删除侧代码不在本分片范围；仅确认 DB 无外键兜底 | 跟踪 `src/lib/data-correction/trash.ts` 调用链，核对删除课次/反馈时是否处理 salary.lessonId/feedbackId |
| V5 | Attendance 3 条 enrollmentId NULL 的成因（退课级联置空 / 历史遗留） | 未逐行查看学生与报名状态 | 只读 `SELECT id, "lessonId", "studentId", "enrollmentId" FROM "Attendance" WHERE "enrollmentId" IS NULL` 核对 |
| V6 | ENROLLMENT_BALANCE_CONFLICT 无 catch 的影响面 | 预置事实称 `attendance-balance.ts:87` 抛出但全仓无 catch；本行号已复核一致（`attendance-balance.ts:87` 确为 `throw new Error('ENROLLMENT_BALANCE_CONFLICT')`），但调用方错误处理归属其他分片 | 由考勤/余额分片核对路由层是否兜底返回 409 |

## 六、与预置事实不符

1. **预置说法**："salary 按 lessonId / feedbackId / lessonDate 回填 termId"（三条并列路径）。
   **实际**：写入流程只有 lessonId 路径（`teacher-salary.ts:179`、`intensive-settlement.ts:93,152`）与 feedbackId 路径（`teacher-salary.ts:539-541,616`）；**lessonDate 路径仅存在于 `academic-term.ts:126-145` 的离线 repair UPDATE**，不在任何 create 流水的写入分支中。三条路径不是同构的运行时回填链。
2. **预置行号复核**：Lesson.rollCallSubmittedAt 在 `schema.prisma:350`、attendanceSubmittedAt `:348`、hoursDeductedAt `:347`；Attendance.rollCallStatus `:537`、rollCallMarkedAt `:538`——与预置一致。
3. **预置缺陷引用**：`attendance-balance.ts:87` 抛 `ENROLLMENT_BALANCE_CONFLICT` 一行已复核存在；全仓是否无 catch 未在本分片展开（见 V6）。
4. **补充发现（预置未提及）**：工资表 lessonId/feedbackId 自 20260603 建表起就无外键，后续迁移从未补齐；本地库实测已有悬空引用（R2）。
