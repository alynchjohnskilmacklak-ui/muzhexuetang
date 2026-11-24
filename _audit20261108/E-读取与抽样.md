# E · 读取一致性与数据库真实数据抽样（ID: E）

> 范围：家长端 / 教师端**读取侧**一致性核查 + 数据库真实数据只读抽样验证。
> 写入逻辑由其他分片核查，本分片只做"抽样证实 / 证伪"，不重做写入侧结论。
> 环境：本地 PostgreSQL `edu_manage`（127.0.0.1:5432），Prisma 5.22 + Node v22.23.2；全部查询仅 `SELECT`，未执行任何写操作 / DDL / migrate。
> 抽样脚本（只读）：`_audit20261108/e_sample.js`、`e_sample2.js`、`e_sample3.js`、`e_sample4.js`；原始结果：`e_sample_results.json`、`e_sample2_results.json`、`e_sample3_results.json`、`e_sample4_results.json`。

## 一、结论速览

| # | 链路节点 | 结论 | 风险等级 | 一句话证据 |
|---|---------|------|---------|-----------|
| 1 | 点名写入 → 家长端状态展示（G1） | 部分连通 | 中 | 家长端只读 `Attendance.status`，`rollCallStatus` 不下发；迟到事实不会出现在家长视图 `src/app/api/parent/today/route.ts:196-199` |
| 2 | 考勤状态双字段一致性（G1） | 连通（当前数据无反例） | 低 | S2 矛盾组合 0/0/0；库内 25204 行 `rollCallStatus` 全为 NULL |
| 3 | 考勤提交 → 课时扣减（S3） | 部分连通 | 中 | 已提交课次下 213 行 `hoursDeducted=0`，其中常规班 6 例疑似漏扣；185 课次缺 `hoursDeductedAt`（179 突击已审核、4 突击驳回、2 条种子数据，常规非种子 0 例） |
| 4 | 课时余额汇总口径（G3） | 部分连通 | 高 | 家长端 / 教师端展示余额同读 `Enrollment.remainHours`；后台管理端读 `Student.remainHours`；库内 191 名活跃学生中 136 人两口径不一致，37 人学生级为正、报名级为 0 |
| 5 | 前端 / SSR 本地计算（G2） | 部分连通 | 中 | 多处 `reduce` 重算课时 / 汇总金额，家长端"已上课时"存在按 status+分钟重算而非直读 `hoursDeducted` 的路径 `src/app/parent/intensive/page.tsx:80-83` |
| 6 | 反馈落库 → 家长端读取 | 连通 | 低 | 家长端反馈只取 `status='PUBLISHED'` 且 `deletedAt=null`，已读标记走 `parentReadAt` `src/lib/business-visibility.ts:61-63` |
| 7 | 工资入账 → 教师端展示 | 连通 | 低 | 2007 条 `LESSON_PAY` 的 `lessonId`/`termId` 全部非空；同课同师重复课时工资 0 组；`lessonPayKey` 重复 0 |
| 8 | 工资记录 → 学期归属 | 连通 | 低 | `termId` 为空 0/7194；教师工资页按当前学期 `termId` 过滤 `src/app/api/teacher/salary/route.ts:24` |
| 9 | 考勤行参照完整性（S6） | 连通 | 低 | 孤儿考勤行 0；同课次同学生重复行 0（唯一约束 `attendance_lesson_student_unique` 生效） |

**总判断**：家长端与教师端在"考勤状态主字段（`status`）"和"课时余额主口径（`Enrollment.remainHours`）"上同源；**断裂点集中在三处**：① `rollCallStatus`（迟到）字段只在教师点名页可见，家长端无任何读取；② 余额存在 `Student` 级 / `Enrollment` 级双口径，库内已出现 136 人不一致；③ 突击班已审核课次的扣减时间戳/行级扣减与常规班路径不同，需写侧分片确认是否为设计内分流。

## 二、详细证据

### 节点1：点名写入 → 家长端状态展示（问题 G1）

- 写入方（教师点名）：`src/app/api/teacher/interaction/route.ts:11-16` — 点名状态到考勤状态的映射表，`LATE → PRESENT`。
- 教师端读取方（点名页）：`src/app/api/teacher/interaction/route.ts:81-83,114-119` — 同时 select 并回传 `status` 与 `rollCallStatus`；`src/app/teacher/interaction/_components/shell.tsx:524-527` 界面优先按 `rollCallStatus` 判定迟到 / 到课 / 缺勤。
- 家长端读取方：`src/app/api/parent/today/route.ts:196-199` — 只映射 `status`，不带 `rollCallStatus`；`src/app/parent/schedule/page.tsx:176-185` 考勤 select 仅 `status/actualMinutes/hoursDeducted`；`src/app/parent/schedule/client.tsx:677` 标签只识别 `PRESENT/LEAVE/ABSENT/MAKEUP`，无 `LATE` 分支。
- 对齐字段：同一张 `Attendance` 表；教师点名页读双字段，家长端只读 `status`。
- 关键代码：

```ts
// src/app/api/teacher/interaction/route.ts:11-16
/** 点名状态 -> 考勤状态映射：迟到仍算到课，只把课堂事实记录在 rollCallStatus */
const ROLL_TO_ATTENDANCE: Record<string, 'PRESENT' | 'ABSENT'> = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'PRESENT',
}
```

```ts
// src/app/api/parent/today/route.ts:196-199
attendance: attendance.map((item) => ({
  status: item.status,
  createdAt: item.createdAt.toISOString(),
})),
```

```tsx
// src/app/parent/schedule/client.tsx:677
<span>考勤：{attendance?.status === 'PRESENT' ? '出勤' : attendance?.status === 'LEAVE' ? '请假' : attendance?.status === 'ABSENT' ? '缺勤' : attendance?.status === 'MAKEUP' ? '补课' : '待确认'}</span>
```

- 判定：**部分连通**。两端读的是同一张 `Attendance` 表，但字段暴露不一致：教师点名页能看到 `LATE`，家长端永远只看到映射后的 `PRESENT`。即"老师看到迟到、家长看到准时"在代码结构上成立；只是当前库里还没有任何 `LATE` 写入（见节点2 与附录 S7），现存数据未出现两端分歧。
- 确定性：[已核实] 代码读取路径已逐文件核对；"家长端是否应看到迟到"属产品口径判断，本分片不做结论。

### 节点2：考勤状态双字段一致性（问题 G1，库内证伪）

- 读取方：教师考勤提交页 `src/app/api/teacher/attendance/route.ts:144-145` 读 `attendance.status`；点名页读 `rollCallStatus`。
- 对齐字段：`Attendance.status`（枚举 `PRESENT/LEAVE/ABSENT/MAKEUP`）与 `Attendance.rollCallStatus`（可空字符串 `PRESENT/ABSENT/LATE`）。
- 库内抽样：附录 S2a/S2b/S2c 三类矛盾组合命中均为 **0**；`status='LATE'` 行数 **0**（DB 枚举 `AttStatus` 不含 `LATE`，写入即被枚举约束拒绝）。
- 判定：**连通**，当前数据无"双真相"反例。
- 确定性：[已核实] 抽样见附录 S2。

### 节点3：考勤提交 → 课时扣减（问题 S3）

- 读取方（教师考勤）：`src/app/api/teacher/attendance/route.ts:134-147` 回传 `enrollment.remainHours` 与考勤 `status`。
- 对齐字段：`ClassLesson.attendanceSubmittedAt`（提交标记）、`ClassLesson.hoursDeductedAt`（扣减时间戳）、`Attendance.hoursDeducted`（行级扣减课时）。
- 库内抽样：附录 S3。已提交课次下考勤行 25165，其中 `hoursDeducted` 为 0/空 213 行（空值 0）；已提交课次 1973，缺 `hoursDeductedAt` 185 个。
- 拆解后结论：
  - 210 行 PRESENT 零扣减中：**203 行属 INTENSIVE/APPROVED**（突击班，扣减走审核/结算路径，行级 `hoursDeducted` 可能本就留 0）、**6 行常规班 NORMAL**、1 行 INTENSIVE/REJECTED。
  - 185 个缺 `hoursDeductedAt` 的课次：**179 个 INTENSIVE/APPROVED、4 个 INTENSIVE/REJECTED、2 个 NORMAL 种子课（`local-demo-*`）**；常规班非种子课次 **0 例**缺扣减时间戳；185 个课次下所有考勤行扣减均为 0（`some_row_deducted=0`）。
- 关键代码（家长端课时记录直读 `hoursDeducted` 的路径）：

```ts
// src/app/api/parent/hour-records/route.ts:117-127
...attendances.map((attendance) => ({
  ...attendance,
  isIntensiveApproved: attendance.lesson?.group?.intensiveMode === 'INTENSIVE'
    && attendance.lesson?.intensiveReviewStatus === 'APPROVED',
  approvedTeachingHours: attendance.lesson?.group?.intensiveMode === 'INTENSIVE'
    && attendance.lesson?.intensiveReviewStatus === 'APPROVED'
    ? calculateIntensiveDeductHours(...) : 0,
})),
```

- 判定：**部分连通**。常规班考勤提交链路未发现漏扣（非种子常规课次 0 例缺扣减时间戳）；疑点集中在突击班：其扣减不回写 `ClassLesson.hoursDeductedAt`、行级 `hoursDeducted` 留 0，需写侧分片确认这是突击审核路径的设计内分流还是漏写。另有 6 行常规班 PRESENT 零扣减需写侧复核（可能为半课时 / 调课口径）。
- 确定性：[已核实] 计数与拆解来自附录 S3 / P1 / P3 / Q1 / Q2；突击路径是否设计如此属 [待验证]，需写侧分片对照 `src/lib/intensive-review.ts`、`src/lib/intensive-settlement.ts`。

### 节点4：课时余额汇总口径（问题 G3）

- 教师端读取方：
  - 考勤页：`src/app/api/teacher/attendance/route.ts:141` — `remainHours: enrollment?.remainHours || 0`（报名级）。
  - 学生列表：`src/app/api/teacher/students/route.ts:167` — `activeEnrollments.reduce((sum, e) => sum + Number(e.remainHours || 0), 0)`（报名级求和）。
  - 学生详情：`src/app/teacher/students/[id]/page.tsx:116` — `visibleEnrollments.reduce((sum, e) => sum + Number(e.remainHours ?? 0), 0)`（报名级求和）。
- 家长端读取方：
  - 突击班 / 课表 / 归档课程行：`src/app/parent/vip/page.tsx:46`、`src/app/parent/schedule/page.tsx:78-79`、`src/lib/student-archive.ts:256` 均读 `Enrollment.remainHours`。
  - 成长报告概览"剩余课时"：`src/lib/student-growth/archive.ts:287` — 按预付报名 `reduce` 汇总 `Enrollment.remainHours`（报名级）。
  - 学生级 `Student.remainHours` 在家长链路中的暴露情况：`src/lib/student-profile.ts:27` select 了该字段但 `identity/overview` 只回传 `totalHours`（358-364 行），未回传余额；`src/lib/student-archive.ts:230` 在 `studentBasic` 中回传 `Student.remainHours`，但全仓无客户端消费 `studentBasic`（仅该文件 105/145 行定义与返回），属未上屏的冗余字段。
- 后台管理端：`src/app/(main)/students/[id]/page.tsx:261`、`src/app/(main)/grades/page.tsx:613`、`src/app/(main)/renewals/page.tsx:28`、`src/app/(main)/schedule/intensive/page.tsx:1117,1147` 读 `Student.remainHours`；后台内部同样存在混合读取（如 `courses/[id]/page.tsx:479`、`workbench.tsx:395` 读 `Enrollment.remainHours`），不在家长 / 教师口径范围内展开。
- 关键代码：

```ts
// src/app/teacher/students/[id]/page.tsx:116
const remainHours = visibleEnrollments.reduce((sum, e) => sum + (Number(e.remainHours ?? 0)), 0)
```

```ts
// src/lib/student-growth/archive.ts:287（家长成长报告概览：报名级 reduce）
const remainingHours = roundHours(prepaidEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0))
```

```ts
// src/lib/student-archive.ts:248-257（归档课程行：报名级）
const classGroups = enrollments.map(e => ({
  ...
  remainHours: e.remainHours,
  totalHours: e.totalHours,
}))
```

- 库内抽样：附录 G3。活跃学生 191 人，`Student.remainHours` 与活跃报名 `remainHours` 之和不一致 **136 人**；其中 **37 人**学生级余额为正、报名级汇总为 0；报名内部 `remainHours = totalHours - usedHours` 不一致 **0/163**（报名表自身自洽）。
- 判定：**部分连通**。**家长端与教师端展示余额同源（均 `Enrollment.remainHours`），两端不会互相打架**；分歧存在于"家长/教师端"与"后台管理端"两套口径之间——后台读 `Student.remainHours`，库内已有 136 人两套数字对不上，37 人会出现"家长 / 教师看到 0 课时、后台看到 134.4 课时"的显示错位。
- 确定性：[已核实] 代码字段来源 + 库内计数；历史遗留数据为何两套并存需写侧 / 数据迁移分片确认。

### 节点5：前端 / SSR 本地计算（问题 G2）

逐条点名"拿到列表后自己算"的位置，以及最坏后果：

| # | 文件:行号 | 本地计算内容 | 是否推算余额 / 扣减 | 最坏后果 |
|---|----------|-------------|------------------|---------|
| G2-1 | `src/app/parent/intensive/page.tsx:80-83` | `approvedAttendances.reduce(...)` 按 `status + actualMinutes` 调 `calculateIntensiveDeductHours` 重算"已审核课时" | 是，重算课时（未直读 `hoursDeducted`） | 若实际扣减做过下限钳制 / 审核修订，重算值与入账课时不一致，家长端"已上课时"偏大或偏小 |
| G2-2 | `src/app/api/parent/hour-records/route.ts:121-127` | 突击已审核行 `approvedTeachingHours` 同样按 status+分钟服务端重算 | 是，重算课时 | 同上；流水页展示的课时与 `HourTransaction` / `Enrollment` 扣减可能不一致 |
| G2-3 | `src/app/parent/vip/client.tsx:193-195` | 客户端 `reduce` 汇总 `approvedHours / pendingCount / bookedCount` | 汇总计数，不推算余额 | 仅分组求和；若后端 summary 缺项，前端补不出缺失值，风险低 |
| G2-4 | `src/app/teacher/students/[id]/page.tsx:116` | 跨活跃报名 `reduce` 求 `remainHours` 总和 | 余额跨课程相加（口径内聚合） | 若某报名状态被误纳 / 漏纳，总和与单报名余额不符；口径见节点4 |
| G2-5 | `src/app/api/teacher/students/route.ts:167-168` | 服务端 `reduce` 汇总 `remainHours / totalHours` | 同上，报名级聚合 | 同上 |
| G2-6 | `src/app/teacher/salary/page.tsx:72-76,222-223` | 客户端按日 `reduce` 流水 `amount` 汇总当日 / 当日小计 | 金额流水汇总，不推算工资规则 | 金额直读后端 `amount`；仅分组聚合，风险低 |
| G2-7 | `src/app/parent/fees/page.tsx:45-46` | SSR `reduce` 已缴 / 待缴金额 | 费用金额汇总 | 金额直读 `Fee.amount`，风险低 |
| G2-8 | `src/app/teacher/dashboard/page.tsx:576-580` | 客户端 `reduce` 周课时 / 周薪资 | 趋势汇总 | 汇总后端周报数据，风险低 |

- 关键代码：

```ts
// src/app/parent/intensive/page.tsx:80-83
const approvedHours = approvedAttendances.reduce(
  (sum, a) => sum + calculateIntensiveDeductHours(a.status, Number(a.actualMinutes || a.lesson?.actualMinutes || 0)),
  0,
)
```

- 判定：**部分连通**。真正"自己推算课时"的是 G2-1 / G2-2（突击班已审核课时按 status+分钟重算）；其余为列表聚合或金额求和，不反推余额。重算路径与入账路径的差异在库内未能直接比对（缺逐行重算基线），列入待验证。
- 确定性：[已核实] 计算位置与代码；重算值与库内扣减是否实际发生偏差为 [待验证]。

### 节点6：反馈落库 → 家长端读取

- 写入方（教师反馈）：`ClassroomFeedback`（schema `src/.../schema.prisma:918`），状态 `status`、已读 `parentReadAt`。
- 读取方：`src/lib/business-visibility.ts:61-63` 统一家长可见性 `status: 'PUBLISHED', deletedAt: null`；`src/app/parent/class-feedback/page.tsx:55-89` 列表 / 高亮详情均走该 where；`src/app/parent/class-feedback/client.tsx:143,225` 已读判断 `!parentReadAt && status==='PUBLISHED'`。
- 对齐字段：`feedbackId`（工资侧 `TeacherSalaryTransaction.feedbackId`，附录 S4 Q3 显示 4643 条无 lessonId 的反馈奖金全部带 `feedbackId`，无空引用）。
- 判定：**连通**。家长端只见已发布反馈，已读回执字段对齐。
- 确定性：[已核实]。

### 节点7：工资入账 → 教师端展示

- 读取方：`src/app/api/teacher/salary/route.ts:20-28` 查 `TeacherSalaryTransaction`；`src/app/api/teacher/trends/route.ts:33-35,72-80` 月度汇总 `amount`。
- 对齐字段：`teacherId + createdAt + termId + lessonId + feedbackId`。
- 库内抽样：附录 S4 / S5。`LESSON_PAY` 2007 条 `lessonId`、`termId` 全非空；同课同师出现多条记录的 20 个组里，**重复 `LESSON_PAY` 的组为 0**（每组课时工资恰 1 条，其余为多条反馈奖金）；`lessonPayKey` 重复 0。
- 判定：**连通**。未发现重复课时工资；多条记录为"一课多条反馈奖金 + 一条课时工资"的正常组合。
- 确定性：[已核实]。

### 节点8：工资记录 → 学期归属

- 读取方：`src/app/api/teacher/salary/route.ts:24` — `termId: activeTerm?.id || '__NO_ACTIVE_TERM__'`，即当前学期工资视图严格按学期过滤；`src/app/api/teacher/salary/route.ts:30-31` 再按 `lessonId / feedbackId` 反查课次与反馈。
- 库内抽样：附录 S4。`termId` 为空 **0/7194**；`lessonId` 为空 4740 条，按类型拆解：反馈奖金 4643（均带 `feedbackId`）、手动调整 88、结算汇总 4、作业班奖金 3、作业班考勤 2——这些类型本就无单节课次，属预期空值。
- 判定：**连通**。所有工资记录都落进了学期；无学期归属的记录不会漏出结算。
- 确定性：[已核实]。注意：历史学期切换后，旧学期工资不在当前学期视图内展示，属过滤设计而非断链。

### 节点9：考勤行参照完整性（S6）

- 库内抽样：附录 S6。`lessonId` 指向不存在课次的孤儿行 **0**；`lessonId + studentId` 重复组 **0**（唯一约束 `attendance_lesson_student_unique`，schema.prisma:545 生效）。
- 判定：**连通**。
- 确定性：[已核实]。

## 三、风险与修复建议（只写建议，不实施）

| # | 风险描述 | 触发条件 | 影响面 | 等级 | 建议（一句话方向，不写代码） |
|---|---------|---------|-------|------|---------------------------|
| R1 | 课时余额双口径（数据错位）：`Student.remainHours` 与 `Enrollment.remainHours` 136/191 人不一致，37 人学生级为正、报名级为 0 | 后台管理端与家长 / 教师端切换视图时 | 学员剩余课时跨视图显示错位（一侧 0、一侧 134.4），可能误导续费 / 排课判断 | 高 | 统一各端余额主口径，或在 `Student.remainHours` 与报名汇总间建立同步 / 校验任务，先盘点 37 名"学生级正、报名级 0"的历史数据来源 |
| R2 | 突击班已审核课次不回写 `ClassLesson.hoursDeductedAt`、行级 `hoursDeducted` 留 0（179 课次） | 突击班审核通过后的扣减分流 | 常规班统计 / 审计工具按 `hoursDeductedAt` 过滤时会漏掉突击班扣减 | 中 | 写侧分片确认突击扣减是否应回写课次时间戳与行级扣减；若为设计内分流，在统计口径中显式标注 |
| R3 | 6 行常规班 PRESENT 考勤 `hoursDeducted=0`（已提交、非种子） | 常规课到课但未扣课时 | 个别学员课时余额偏高 | 中 | 写侧分片逐行核对这 6 行是否半课时 / 调课 / 漏扣，对照 `HourTransaction` 流水 |
| R4 | 家长端不可见迟到（`rollCallStatus` 不下发），教师端标 LATE 后家长只见"出勤" | 教师点名标记迟到后 | 家校信息不对称；若产品要求家长知晓迟到，当前链路不支持 | 中 | 产品确认家长端是否需要展示迟到；若需要，在家长考勤接口 / 标签映射中补 `rollCallStatus` 透传 |
| R5 | 出勤率口径不一致：月报 / 教师列表只算 `PRESENT`，周报 / 教师详情把 `MAKEUP` 也算到课 | 同一学员在不同页面看出勤率 | 页面间百分比对不上 | 低 | 统一"到课"状态集合（是否含 `MAKEUP`），收敛到一个 lib 函数供各端复用 |
| R6 | 突击班"已审核课时"由前端 / SSR 按 status+分钟重算，未直读入账扣减 | 审核修订或钳制扣减后 | 展示课时与入账课时可能存在偏差 | 低 | 评估改为直读 `hoursDeducted` / 审核后入账值，减少二次计算 |
| R7 | 请假 / 缺勤行仍带 `hoursDeducted`（918 行 LEAVE、9 行 ABSENT 行级扣减 >0，样本 0.70） | 非到课状态的扣减规则 | 若规则应为"请假 / 缺勤不扣"则课时被扣错 | 低 | 写侧分片确认 LEAVE/ABSENT 的扣减规则（半课时？固定比例？），与读取侧展示口径对齐 |

## 四、已确认正常

| # | 检查项 | 为什么安全（含证据 `file:line`） |
|---|-------|-------------------------------|
| N1 | 点名与考勤是否写到同一张表 | 是。教师点名 `src/app/api/teacher/interaction/route.ts:182` 写 `Attendance`；考勤提交 `src/app/api/teacher/attendance/route.ts:503-504` 更新 / 创建同一 `Attendance` 行，靠 `lessonId+studentId` 对齐 |
| N2 | 是否存在 status 与 rollCallStatus 互相矛盾的双真相 | 抽样 0 例：ABSENT 但点名到课 0、PRESENT 但点名缺勤 0、LEAVE 但被点名 0（附录 S2） |
| N3 | 点名阶段是否提前写了课时扣减 | 抽样 0 例：有点名痕迹但考勤未提交且已扣课时的行 0（附录 S1b）；与 `interaction/route.ts:22-24` 注释的设计约束一致 |
| N4 | 工资是否重复入账课时费 | 同课同师重复 `LESSON_PAY` 0 组；`lessonPayKey` 唯一约束无重复（附录 S5c/S5b） |
| N5 | 工资记录是否都挂得上学期 | `termId` 空 0/7194（附录 S4）；工资页按学期过滤有值可依 |
| N6 | 考勤行是否有孤儿 / 重复 | 孤儿 0、重复 0，DB 唯一约束 `attendance_lesson_student_unique` 生效（附录 S6；schema.prisma:545） |
| N7 | 报名表内部余额是否自洽 | 活跃报名 163 条，`remainHours = totalHours - usedHours` 不一致 0（附录 G3b） |
| N8 | 家长端反馈可见性 | 统一 `PUBLISHED + deletedAt null` 过滤，已读走 `parentReadAt`（`src/lib/business-visibility.ts:61-63`；`src/app/parent/class-feedback/client.tsx:143`） |
| N9 | 无 lessonId 的反馈奖金是否悬空 | 4643 条 `FEEDBACK_BONUS` 无 `lessonId` 者全部带 `feedbackId`，`feedbackId` 空 0（附录 Q3） |

## 五、未能确认 / 需要运行时验证

| # | 项 | 卡在哪 | 建议怎么验 |
|---|----|-------|-----------|
| V1 | 突击班 179 课次缺 `hoursDeductedAt` 是设计分流还是漏写 | 本分片不核查写侧事务；需对照 `src/lib/intensive-review.ts`、`src/lib/intensive-settlement.ts` 的扣减落库路径 | 写侧分片确认突击扣减写入哪些字段；必要时在测试库走一遍突击审核全流程观察课次时间戳变化 |
| V2 | 6 行常规班 PRESENT 零扣减的成因 | 无逐行 `HourTransaction` 对照基线，无法判断是半课时口径还是漏扣 | 按附录 S3e 样本 ID 查对应 `HourTransaction` 与报名 `usedHours/remainHours` 变化 |
| V3 | 136 名两口径余额不一致学生的历史成因 | 库内只看到结果值，看不到迁移 / 调整流水 | 结合 `HourTransaction.beforeHours/afterHours` 与学生创建批次，区分"历史快照未同步"与"近期漏更" |
| V4 | 重算课时（G2-1/G2-2）与入账课时是否实际有偏差 | 缺逐行重算基线，未对 `calculateIntensiveDeductHours` 输出与 `hoursDeducted` 做全量比对 | 离线脚本对突击已审核行同时算两套值，输出差异清单 |
| V5 | 新点名链路的真实运行态表现 | 当前库内 `rollCallStatus / rollCallMarkedAt` 全空，未见新点名写入痕迹 | 在运行中的 dev 环境实际点一次名 + 提交考勤，观察两端字段与展示（本审计未重启服务、未造数据） |
| V6 | LEAVE/ABSENT 行带扣减是否符合业务规则 | 读取侧无法判定规则对错 | 写侧分片确认非到课状态的扣减策略（比例 / 是否扣） |

## 六、与预置事实不符

| 预置说法 | 实际情况 | 证据 |
|---------|---------|------|
| `Attendance.status` 可能出现 `LATE` | DB 枚举 `AttStatus` 仅 `PRESENT/LEAVE/ABSENT/MAKEUP`，`status='LATE'` 查询被枚举约束拒绝（22P02）；库内 `status=LATE` 0 行。`LATE` 只存于 `rollCallStatus` 文本字段 | schema.prisma:516-521；附录 S2d；脚本首次运行报错 `invalid input value for enum "AttStatus": "LATE"` |
| 点名会写 `rollCallMarkedAt`，可据此统计"点名了但没提交" | 25204 行 `rollCallMarkedAt` 全为 NULL，S7 有点名痕迹 0 行；新点名链路在本地库尚无写入样本 | 附录 S7；`0c_rollcall_dist` |
| 课时扣减只发生在考勤提交 | 常规班成立（非种子常规课次 0 例缺扣减）；突击班已审核课次的扣减时间戳未回写到课次，是否同属"提交时扣减"待写侧确认 | 附录 S3b / Q1 / Q2 |
| 工资只由考勤提交 / 审核写入 | 库内工资类型含 `manual_adjust`（88）、`SALARY_SETTLEMENT`（4）等非考勤直接生成类型；这些记录 `lessonId` 为空属预期 | 附录 S4b |

---

## 附录：数据库只读抽样

> 全部语句为 `SELECT`，可原样复现；连接串取自 repo 根 `.env` 的 `DATABASE_URL="postgresql://postgres:edu_manage_test@127.0.0.1:5432/edu_manage"`。姓名一律脱敏为 `姓**`；未输出任何手机号 / 身份证 / 地址。`deletedAt IS NULL` 为有效行口径。

### 0. 总览

```sql
-- 0a 考勤行总数（有效）
SELECT count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL;
-- 命中：25204

-- 0b status 分布
SELECT status, count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL GROUP BY status ORDER BY n DESC;
-- 命中：PRESENT 24270 / LEAVE 925 / ABSENT 9 / MAKEUP 0

-- 0c rollCallStatus 分布
SELECT "rollCallStatus", count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL GROUP BY "rollCallStatus" ORDER BY n DESC NULLS FIRST;
-- 命中：NULL 25204（无 PRESENT/ABSENT/LATE 记录）

-- 0d/0e 课次总数 / 已提交考勤课次数
SELECT count(*)::int AS n FROM "ClassLesson" WHERE "deletedAt" IS NULL;            -- 2738
SELECT count(*)::int AS n FROM "ClassLesson" WHERE "deletedAt" IS NULL AND "attendanceSubmittedAt" IS NOT NULL; -- 1973
```

### S1. `status='LATE'` 但 `hoursDeducted > 0`（验证"迟到仍算到课、点名不写扣减"）

```sql
-- S1 迟到却已扣课时
SELECT a.id, s.name AS student, t.name AS teacher, l."lessonDate",
       a.status, a."rollCallStatus", a."hoursDeducted",
       a."rollCallMarkedAt", l."attendanceSubmittedAt", l."hoursDeductedAt"
FROM "Attendance" a
LEFT JOIN "Student" s ON s.id = a."studentId"
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
LEFT JOIN "Teacher" t ON t.id = l."teacherId"
WHERE a."deletedAt" IS NULL AND a.status::text = 'LATE' AND COALESCE(a."hoursDeducted",0) > 0
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行

-- S1b 补充：有点名痕迹但考勤未提交，却已写扣减（点名阶段被扣课时）
SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus",
       a."hoursDeducted", a."rollCallMarkedAt", l."attendanceSubmittedAt"
FROM "Attendance" a
LEFT JOIN "Student" s ON s.id = a."studentId"
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND a."rollCallMarkedAt" IS NOT NULL
  AND l."attendanceSubmittedAt" IS NULL AND COALESCE(a."hoursDeducted",0) > 0
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行
```

- 样本：无（抽全部有效行，非抽样上限）。
- 解读：**证实假设成立**——迟到 / 点名阶段没有写课时扣减。注意 `status` 枚举层就不允许 `LATE`，迟到事实只可能落在 `rollCallStatus`。

### S2. `status` 与 `rollCallStatus` 互相矛盾（验证是否存在双真相）

```sql
-- S2a 缺勤但点名到课 / 迟到
SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
FROM "Attendance" a
LEFT JOIN "Student" s ON s.id = a."studentId"
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND a.status = 'ABSENT' AND a."rollCallStatus" IN ('PRESENT','LATE')
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行

-- S2b 到课但点名缺勤
SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
FROM "Attendance" a
LEFT JOIN "Student" s ON s.id = a."studentId"
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND a.status = 'PRESENT' AND a."rollCallStatus" = 'ABSENT'
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行

-- S2c 请假但被点名到课 / 迟到 / 缺勤
SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
FROM "Attendance" a
LEFT JOIN "Student" s ON s.id = a."studentId"
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND a.status = 'LEAVE' AND a."rollCallStatus" IN ('PRESENT','LATE','ABSENT')
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行

-- S2d status=LATE 行数
SELECT count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL AND status::text = 'LATE';
-- 命中：0
```

- 样本：无。
- 解读：**当前数据无双真相**。但 `rollCallStatus` 全空（见 0c），该结论只对历史数据成立；新点名链路写入后需复测（V5）。

### S3. 已提交考勤课次下的漏扣核查

```sql
-- S3a 已提交课次下考勤行扣减情况
SELECT count(*)::int AS total_rows,
       count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0) = 0)::int AS zero_or_null_deduction,
       count(*) FILTER (WHERE a."hoursDeducted" IS NULL)::int AS null_deduction
FROM "Attendance" a
JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL;
-- 命中：total_rows 25165 / zero_or_null_deduction 213 / null_deduction 0

-- S3b 已提交但缺课次扣减时间戳
SELECT count(*)::int AS submitted_lessons,
       count(*) FILTER (WHERE l."hoursDeductedAt" IS NULL)::int AS missing_deducted_at
FROM "ClassLesson" l
WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL;
-- 命中：submitted_lessons 1973 / missing_deducted_at 185
```

按状态拆分（213 行零扣减构成）：

```sql
-- S3d 零扣减按 status 拆分
SELECT a.status::text, count(*)::int AS rows,
       count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0)=0)::int AS zero_deduct
FROM "Attendance" a
JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
GROUP BY a.status ORDER BY rows DESC;
-- 命中：PRESENT 24235（零扣 210）/ LEAVE 921（零扣 3）/ ABSENT 9（零扣 0）
```

PRESENT 零扣减按课次类型 / 审核状态拆分：

```sql
-- P1 PRESENT 零扣减拆分
SELECT l."intensiveReviewStatus"::text, g."intensiveMode"::text, count(*)::int AS n
FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
  AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
GROUP BY 1,2 ORDER BY n DESC;
-- 命中：INTENSIVE / APPROVED 203；NORMAL / NOT_REQUIRED 6；INTENSIVE / REJECTED 1

-- P4 常规班 PRESENT 零扣减（疑似漏扣候选）
SELECT count(*)::int AS regular_present_zero
FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
  AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
  AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE';
-- 命中：6
```

185 个缺 `hoursDeductedAt` 课次拆解：

```sql
-- Q1 缺扣减时间戳课次按类型 / 状态拆分
SELECT g."intensiveMode"::text, l."intensiveReviewStatus"::text,
       count(*)::int AS n,
       count(*) FILTER (WHERE l.id LIKE 'local-demo-%')::int AS seed_lessons
FROM "ClassLesson" l LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
GROUP BY 1,2 ORDER BY n DESC;
-- 命中：INTENSIVE/APPROVED 179（种子 0）；INTENSIVE/REJECTED 4（种子 0）；NORMAL/NOT_REQUIRED 2（种子 2）

-- Q2 常规非种子课次缺扣减时间戳
SELECT l.id, l."lessonDate", l.status::text, g."intensiveMode"::text,
       count(a.id)::int AS att_rows,
       count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0)>0)::int AS deducted_rows
FROM "ClassLesson" l
LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
LEFT JOIN "Attendance" a ON a."lessonId"=l.id AND a."deletedAt" IS NULL
WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
  AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE' AND l.id NOT LIKE 'local-demo-%'
GROUP BY l.id, l."lessonDate", l.status, g."intensiveMode"::text
ORDER BY l."lessonDate" DESC LIMIT 20;
-- 命中：0 行

-- P3 185 课次是否存在已扣减行
SELECT count(*)::int AS lessons,
       count(*) FILTER (WHERE COALESCE(maxded,0)=0)::int AS all_rows_zero,
       count(*) FILTER (WHERE COALESCE(maxded,0)>0)::int AS some_row_deducted
FROM (
  SELECT l.id, max(a."hoursDeducted") AS maxded
  FROM "ClassLesson" l
  LEFT JOIN "Attendance" a ON a."lessonId"=l.id AND a."deletedAt" IS NULL
  WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
  GROUP BY l.id
) x;
-- 命中：lessons 185 / all_rows_zero 185 / some_row_deducted 0
```

代表性样本（脱敏，零扣减行节选；前 3 行为突击 APPROVED，末行为种子课）：

| 考勤 ID | 学生 | 课次日期 | status | hoursDeducted | 实际上课分钟 | 审核状态 |
|--------|------|---------|--------|---------------|-------------|---------|
| cmssbxrnu… | 贾** | 2026-08-13 | PRESENT | 0 | 120 | APPROVED |
| cmsredpsz… | 贾** | 2026-08-12 | PRESENT | 0 | 120 | APPROVED |
| cmsouqznh… | 底** | 2026-08-10 | PRESENT | 0 | 90 | APPROVED |
| cmv1sp2wh… | 本** | 2026-10-10 | PRESENT | 0 | 90 | NOT_REQUIRED（种子课 `local-demo-*`） |

- 解读：常规班非种子课次无漏扣时间戳；疑点集中在突击班分流（R2）与 6 行常规 PRESENT 零扣减（R3）。LEAVE/ABSENT 行扣减见 R7 样本。

### S4. 工资记录 `lessonId` / `termId` 空值核查

```sql
-- S4 空引用总览
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_id_null,
       count(*) FILTER (WHERE "termId" IS NULL)::int AS term_id_null,
       count(*) FILTER (WHERE "lessonId" IS NULL AND "termId" IS NULL)::int AS both_null
FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NULL;
-- 命中：total 7194 / lesson_id_null 4740 / term_id_null 0 / both_null 0

-- S4b 按类型拆解
SELECT type, count(*)::int AS n,
       count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_null,
       count(*) FILTER (WHERE "termId" IS NULL)::int AS term_null
FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NULL
GROUP BY type ORDER BY n DESC;
-- 命中：
--   FEEDBACK_BONUS      5090（lesson_null 4643 / term_null 0）
--   LESSON_PAY          2007（lesson_null 0    / term_null 0）
--   manual_adjust         88（lesson_null 88   / term_null 0）
--   SALARY_SETTLEMENT      4（lesson_null 4    / term_null 0）
--   STUDY_HALL_BONUS       3（lesson_null 3    / term_null 0）
--   STUDY_HALL_ATTENDANCE  2（lesson_null 2    / term_null 0）

-- Q3 无 lessonId 的反馈奖金是否都有 feedbackId
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE "feedbackId" IS NULL)::int AS feedback_null
FROM "TeacherSalaryTransaction"
WHERE "deletedAt" IS NULL AND type='FEEDBACK_BONUS' AND "lessonId" IS NULL;
-- 命中：total 4643 / feedback_null 0

-- Q4 课时工资引用完整性
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_null,
       count(*) FILTER (WHERE "termId" IS NULL)::int AS term_null
FROM "TeacherSalaryTransaction"
WHERE "deletedAt" IS NULL AND type='LESSON_PAY';
-- 命中：total 2007 / lesson_null 0 / term_null 0
```

非反馈类无课次样本（脱敏）：

| 工资 ID | 教师 | 类型 | 金额 | 学期 ID | 课次日期 |
|--------|------|------|------|--------|---------|
| cmv3wnky… | 胡** | SALARY_SETTLEMENT | 22 | cmtiej14s… | — |
| cmv3wi63… | 范** | SALARY_SETTLEMENT | 320 | cmtiej14s… | — |
| cmuqxqyy… | 胡** | manual_adjust | 22 | cmtiej14s… | 2026-10-02 |
| cmtyhbdg… | 范** | manual_adjust | -60 | cmtiej14s… | 2026-09-12 |
| cmt9ya55… | 胡** | STUDY_HALL_ATTENDANCE | 40 | cmsorqmp… | 2026-08-26 |

- 解读：**学期归属连通**（`termId` 0 空）；`lessonId` 空值全部属于"本就无单节课次"的类型（反馈奖金 / 手动调整 / 结算汇总 / 作业班），反馈奖金均挂 `feedbackId`，无悬空引用。

### S5. 同一课次 + 教师重复入账嫌疑

```sql
-- S5 同课同师多条记录
SELECT "lessonId", "teacherId", count(*)::int AS n,
       array_agg(type) AS types, array_agg(amount) AS amounts
FROM "TeacherSalaryTransaction"
WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
GROUP BY "lessonId", "teacherId"
HAVING count(*) > 1
ORDER BY n DESC LIMIT 20;
-- 命中：20 组

-- S5c 同课同师多条 LESSON_PAY（真正重复课时工资嫌疑）
SELECT "lessonId", "teacherId", count(*)::int AS pay_rows,
       array_agg(amount) AS amounts, array_agg(x."createdAt") AS created
FROM "TeacherSalaryTransaction" x
WHERE x."deletedAt" IS NULL AND x."lessonId" IS NOT NULL AND type = 'LESSON_PAY'
GROUP BY "lessonId", "teacherId" HAVING count(*) > 1 ORDER BY pay_rows DESC LIMIT 20;
-- 命中：0 组

-- S5d 每组课时工资条数分布
SELECT pay_rows, count(*)::int AS groups FROM (
  SELECT "lessonId", "teacherId",
         count(*) FILTER (WHERE type='LESSON_PAY')::int AS pay_rows
  FROM "TeacherSalaryTransaction"
  WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
  GROUP BY "lessonId", "teacherId"
) g GROUP BY pay_rows ORDER BY pay_rows;
-- 命中：pay_rows 0 → 4 组（纯反馈奖金）；pay_rows 1 → 2007 组

-- S5b lessonPayKey 重复
SELECT "lessonPayKey", count(*)::int AS n
FROM "TeacherSalaryTransaction"
WHERE "deletedAt" IS NULL AND "lessonPayKey" IS NOT NULL
GROUP BY "lessonPayKey" HAVING count(*) > 1 LIMIT 20;
-- 命中：0
```

代表性样本（20 组之一，多条反馈奖金 + 1 条课时工资）：

| lessonId | teacherId | 条数 | 类型构成 | 金额构成 |
|----------|-----------|------|---------|---------|
| cmrc1k1w… | cmp8f1dj… | 8 | FEEDBACK_BONUS ×7 + LESSON_PAY ×1 | 0.5 / 0.5 / 14.6667 / 1… |

- 解读：**无重复课时工资**。同课同师多条是"一课多条反馈奖金（按学生 / 按次）+ 一条课时工资"的正常组合；`lessonPayKey` 唯一约束生效。

### S6. 孤儿考勤行 / 同课同人重复行

```sql
-- S6a lessonId 指向不存在课次
SELECT count(*)::int AS n
FROM "Attendance" a
WHERE a."deletedAt" IS NULL AND a."lessonId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ClassLesson" l WHERE l.id = a."lessonId");
-- 命中：0

-- S6b 同课次同学生重复
SELECT "lessonId", "studentId", count(*)::int AS n
FROM "Attendance"
WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
GROUP BY "lessonId", "studentId"
HAVING count(*) > 1 LIMIT 20;
-- 命中：0
```

- 样本：无。
- 解读：**参照完整性连通**，DB 唯一约束 `attendance_lesson_student_unique` 有效。

### S7. 有点名痕迹但考勤未提交（悬空点名链路）

```sql
-- S7 点名痕迹与未提交对照
SELECT count(*) FILTER (WHERE a."rollCallMarkedAt" IS NOT NULL)::int AS rollmarked,
       count(*) FILTER (WHERE a."rollCallMarkedAt" IS NOT NULL AND l."attendanceSubmittedAt" IS NULL)::int AS rollmarked_not_submitted
FROM "Attendance" a
LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
WHERE a."deletedAt" IS NULL;
-- 命中：rollmarked 0 / rollmarked_not_submitted 0
```

- 样本：无。
- 解读：当前库内**没有任何点名写入痕迹**，无法在历史数据上观察"点名了但没提交"的悬空链路；新链路运行态需复测（V5）。

### 补充 G3. 两级课时余额一致性

```sql
-- G3d 学生级 vs 活跃报名级余额对照
SELECT count(*)::int AS active_students,
       count(*) FILTER (WHERE ABS(s."remainHours" - COALESCE(enr.sum,0)) > 0.05)::int AS mismatch,
       count(*) FILTER (WHERE s."remainHours" > 0 AND COALESCE(enr.sum,0) = 0)::int AS student_positive_enrollment_zero
FROM "Student" s
LEFT JOIN (SELECT "studentId", SUM("remainHours")::float AS sum FROM "Enrollment"
           WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY "studentId") enr
  ON enr."studentId" = s.id
WHERE s."deletedAt" IS NULL;
-- 命中：active_students 191 / mismatch 136 / student_positive_enrollment_zero 37

-- G3b 报名内部 remain = total - used 自洽性
SELECT count(*)::int AS total_active,
       count(*) FILTER (WHERE ABS(e."remainHours" - (e."totalHours" - e."usedHours")) > 0.05)::int AS mismatch
FROM "Enrollment" e WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL;
-- 命中：total_active 163 / mismatch 0
```

不一致样本（脱敏，节选"学生级为正、报名级为 0"类型）：

| 学生 | 学生级 remainHours | 学生级 totalHours | 活跃报名数 | 报名级 remainHours 汇总 |
|------|------------------|------------------|-----------|------------------------|
| 王** | 134.40 | 134.40 | 1 | 0 |
| 马** | 134.40 | 134.40 | 1 | 0 |
| 吕** | 134.40 | 134.40 | 1 | 0 |
| 赵** | 134.40 | 134.40 | 1 | 0 |

另一类样本（学生级与各报名级都有值但对不上）：

| 学生 | 学生级 remain | 报名状态 | 报名 totalHours | 报名 usedHours | 报名 remain | 班级 |
|------|-------------|---------|----------------|---------------|------------|------|
| 丁** | 78.40 | ACTIVE | 140 | 133.00 | 7.00 | 牧哲学堂初三（四班） |
| 何** | 134.40 | ACTIVE | 134.40 | 11.20 | 123.20 | 牧哲学堂初二周六冲刺… |
| 冯** | 128.80 | ACTIVE | 134.40 | 134.40 | 0 | 牧哲学堂初三（一班） |

- 解读：报名表自身自洽（0 不一致）；问题出在 `Student.remainHours` 与报名汇总之间的同步。家长端 / 教师端展示余额走报名级，后台管理端走学生级，两套数字在 136 人身上不同步（R1）。

### 补充 R7 样本：非到课状态行仍带扣减

```sql
-- P2 LEAVE / ABSENT 已扣课时样本
SELECT a.status::text, s.name AS student, l."lessonDate", a."hoursDeducted", a."actualMinutes",
       l."intensiveReviewStatus"::text, g."intensiveMode"::text
FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
LEFT JOIN "Student" s ON s.id=a."studentId"
WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
  AND a.status IN ('LEAVE','ABSENT') AND COALESCE(a."hoursDeducted",0)>0
ORDER BY a.status::text, l."lessonDate" DESC LIMIT 20;
-- 命中：20 行（ABSENT 0.70、LEAVE 0.70，均为 NORMAL 常规班）
```

- 样本：ABSENT 刘** 0.70 / 韩** 0.70（2026-08-04）；LEAVE 默** 0.70、马** 0.70、孙** 0.70（2026-10-05）。
- 解读：非到课状态在常规班也写了固定扣减（0.70）。是否符合"请假 / 缺勤扣减"业务规则需写侧确认（V6）。
