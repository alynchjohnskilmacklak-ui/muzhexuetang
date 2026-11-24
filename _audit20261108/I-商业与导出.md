# I · 商业链路：报名续费 / 费用收款 / 导出取数（ID: I）

> 第二轮面 A 通路 6、7、12 只读审计。仓库根 `D:\01muzhexuetang\muzhexuetang\coding\edu-manage`；数据库 `postgresql://postgres:edu_manage_test@127.0.0.1:5432/edu_manage`（单库，`isDualDbEnabled()` 关闭）。
> 只读声明：本片全部数据库操作仅 `$queryRawUnsafe` 的 SELECT，脚本 `e_sample12.js` / `e_sample13.js` / `e_probe.js` 位于 `_audit20261108\`；未执行任何 create/update/delete/executeRaw/migrate/db push/generate，未重启服务。
> 引用关系：余额双口径、快照漂移规模、漏扣/双真相结论沿用 E 分片（`E-读取与抽样.md`），本片不重做归因；写侧 Enrollment 各路径的逐条逻辑由对应写侧分片负责，本片只做连通性核查与抽样验证。

## 一、通路结论表

| # | 通路 | 写方(file:line) | 读方(file:line) | 中间转换层 | 结论 | 风险等级 | 失效时用户看到什么 |
|---|---|---|---|---|---|---|---|
| 6 | 报名 / 续费 → Enrollment 台账 | `api/class-groups/[id]/enrollments/route.ts:189-197`（报名/复班）、`:296-299`（退班）；`api/admin/data-admin/[entity]/[id]/route.ts:230-231`；`api/class-groups/[id]/sync-hours/route.ts:119-125`；其余 8 个写入口见二·通路6 | 家长端/教师端读 `Enrollment.remainHours`（E 分片节点4）；续费跟进 `api/renewals/route.ts:44,:55` 读 `Student.remainHours` 快照 | `lib/student-hour-snapshot.ts:5-18`（汇总 ACTIVE 报名回写 Student 快照） | **连通**（台账层闭环；快照漂移为 E 分片已登记的历史问题） | 中 | 若某历史路径漏跑 snapshot，后台学员档案余额与家长端/教师端报名口径对不上；当前库 131/160 可见学生快照不一致（沿用 E 分片） |
| 7 | 费用 fees / 收款 → 台账耦合 | `api/fees/route.ts:235`（create）、`api/fees/[id]/route.ts:82`（update）、`:117`（软删）、`lib/overdue-fee-alerts.ts:49-51`（updateMany 提醒位）、`lib/data-correction/trash.ts:373`（purge）、`api/admin/data-admin/reset/route.ts:190`（deleteMany） | `api/fees/route.ts:45-52,:67-72`；`api/fees/students/route.ts:14-29`；`parent/fees/page.tsx:27-31`；`api/settings/export/finance/route.ts:20-24`；`api/reports/export/[chartKey]/route.ts:124-128` | 无（Fee 独立收费台账，不参与课时/工资流水计算） | **连通（定向隔离）**——收款表与 Enrollment / TeacherSalaryTransaction / HourTransaction 无误耦合；但 Fee.hours 与报名课时无库级约束 | 低（耦合方向）/ 中（约束方向，见四·2） | 收款不会误改课时余额或工资；反向风险：收费课时录错（Fee.hours ≠ Enrollment.totalHours）数据库无法拦截，对账只能靠业务层人工核对 |
| 12 | 导出 export 取数口径 | 导出路由即读方：`api/settings/export/students/route.ts:19-33`、`api/settings/export/finance/route.ts:20-32`、`api/attendance/export/route.ts:53-71`、`api/reports/export/[chartKey]/route.ts:72-155` | 管理员下载 XLSX/CSV；`(main)/fees/client.tsx:301-325` 浏览器端 CSV | 无 | **部分连通**——三处口径分裂：学员导出读快照而非台账；学员/报表导出未排除软删与 INACTIVE；考勤导出丢弃 `rollCallStatus` | 中 | 运营拿导出表对账：剩余课时列与家长端对不上；名单多出页面不可见学员；迟到与准时在考勤导出里同为"出勤"；漏斗/留存计数含已停用学员 |

## 二、逐条证据

### 通路 6：报名与续费 → Enrollment

#### 6.1 写方：Enrollment 课时字段的全部写入口（逐条核对事务边界与 snapshot 挂载）

**(1) 报名 / 复班（同一事务，复活旧报名或新建）** — `src/app/api/class-groups/[id]/enrollments/route.ts:188-203`

```ts
const created = currentEnrollment
  ? await tx.enrollment.update({
      where: { id: currentEnrollment.id },
      data: { status: 'ACTIVE', totalHours: hours, remainHours: hours, usedHours: 0, subjects: requestedSubjects },
      include: { student: true },
    })
  : await tx.enrollment.create({
      data: { studentId, groupId: id, totalHours: hours, remainHours: hours, usedHours: 0, subjects: requestedSubjects },
      include: { student: true },
    })

await tx.student.update({ where: { id: studentId }, data: { status: 'ACTIVE', mainTeacherId: group.teacherId } })
await syncStudentHourSnapshot(tx, studentId)
```

- 复活旧报名走 `update`（:189-193），新建走 `create`（:194-197），`totalHours` 与 `remainHours` 在**同一条写入语句**里一起赋值，`usedHours=0`；同事务内 `syncStudentHourSnapshot`（:203）。无异步补 remain 的代码路径。

**(2) 退班** — 同文件 `:295-331`

```ts
const updated = await prisma.$transaction(async (tx) => {
  const result = await tx.enrollment.update({
    where: { id: enrollmentId },
    data: { status: 'WITHDRAWN', remainHours: 0 },
  })
  // ... 移除当天及以后未考勤课次名单
  const activeClassCount = await tx.enrollment.count({ where: { studentId: enrollment.studentId, status: 'ACTIVE', group: { ... } } })
  await syncStudentHourSnapshot(tx, enrollment.studentId)
  if (activeClassCount === 0) {
    await tx.student.update({ where: { id: enrollment.studentId }, data: { status: 'TRIAL', remainHours: 0, totalHours: 0, mainTeacherId: null } })
  }
```

- 退班先置 `WITHDRAWN, remainHours=0`（:296-299），跑 snapshot（:326）；仅当无活跃班时才把 Student 快照清零（:327-331）——该分支在 snapshot 之后，汇总结果本就是 0，与 snapshot 一致，不构成绕过快照。

**(3) 后台手动加减课时** — `src/app/api/admin/data-admin/[entity]/[id]/route.ts:229-237`

```ts
data: {
  remainHours: { increment: amount },
  totalHours: { increment: amount },
},
// ...
await syncStudentHourSnapshot(tx, studentId)
```

- `remainHours` 与 `totalHours` 同一 `increment` 同事务变动（:230-231），snapshot :237。

**(4) 插班按剩余课次校准** — `src/app/api/class-groups/[id]/sync-hours/route.ts:119-141`

```ts
await tx.enrollment.update({
  where: { id: enrollment.id },
  data: { remainHours: targetHours, totalHours: roundHours(Number(enrollment.usedHours || 0) + targetHours) },
})
// HourTransaction: ADMIN_ADJUSTMENT
for (const studentId of [...new Set(...)]) { await syncStudentHourSnapshot(tx, studentId) }
```

- `remain=target`、`total=used+target` 同语句（:122-123），snapshot :141。

**(5) 其余 Enrollment 课时写入口（均在同一事务内并挂载 snapshot，行号引自写侧分片，本片复核到调用点存在）**

| 路径 | Enrollment 写入行 | snapshot 行 |
|---|---|---|
| `api/schedules/route.ts`（排课建报名 0/0） | :230-239 | :250 |
| `api/schedules/[id]/route.ts`（upsert） | :232 / :254 | :272 |
| `api/schedules/one-on-one/route.ts` | :130 / :149 | :140 |
| `lib/attendance-hour-posting.ts`（累计 / 扣减） | :38-57 / :61-80 | :57 / :80 |
| `api/admin/attendance/adjust/route.ts`（退款/更正） | :105-117 | :186（条件 `refunded>0 \|\| deductedNow>0`；二者皆 0 时 Enrollment 未变，无需快照） |
| `lib/intensive-review.ts`（突击审核入账） | :414-420 | :448 |
| `lib/intensive-settlement.ts` | :226-230 | :249 |
| `lib/intensive-history.ts` | :235-239 | :258 |
| `api/students/[id]/status/route.ts`（停用批量退班） | :42-45 | :46 |
| `lib/data-correction/trash.ts`（回收站恢复/ purge） | :153 / :167 / :276 / :287 | :155 / :168 / :279 / :288 |

#### 6.2 读方

- 家长端 / 教师端展示余额读 `Enrollment.remainHours`（E 分片节点4 已核实，本片不重复展开）。
- 续费跟进列表 `src/app/api/renewals/route.ts:42-55`：学员选择 `student: { select: { id, name, grade, remainHours, division } }`，低课时判定 `membership.student.remainHours <= lowHoursWarn` —— 此处读 **Student 快照口径**，与家长/教师端台账口径不同。

```ts
db.studentTermMembership.findMany({
  where: { termId: term.id, status: 'ACTIVE', student: { status: 'ACTIVE', deletedAt: null, division } },
  include: { student: { select: { id: true, name: true, grade: true, remainHours: true, division: true } } },
})
// :55  const lowHours = lowHoursWarn > 0 && membership.student.remainHours <= lowHoursWarn
```

#### 6.3 转换层

`src/lib/student-hour-snapshot.ts:5-18`：汇总该生全部 ACTIVE 报名的 `remainHours / totalHours` 求和回写 Student。这是快照的唯一正常写入口（E 分片已核实）。

#### 6.4 口径分裂

有，沿用 E 分片已知结论：`Enrollment.remainHours`（台账）vs `Student.remainHours`（快照）。本片补充核实：**通路 6 所有写入口在代码层面都是同事务内先改 Enrollment、再调 snapshot，不存在"先改 totalHours 再异步补 remainHours"的分支**。

#### 6.5 逐条回答本轮问题

**a. 续费成功后 `totalHours` 与 `remainHours` 是否同一事务一起增加？**
是。报名/复班 :191 / :195 同语句写 `totalHours=remainHours=hours`；手动调课 :230-231 同 `increment`；插班校准 :122-123 同语句。三个加课入口均无异步/延迟补 remain。**[已核实]**

**b. 有没有"只改 Student.remainHours 不改 Enrollment"或"只改 Enrollment 不跑 snapshot"的分支？**

- `Student.remainHours / totalHours` 的直接写点全仓仅以下几处，均为初始化或清零语义，不是业务调余额：
  - `lib/student-hour-snapshot.ts:13-16`（快照正常汇总回写）；
  - `api/students/route.ts:440`（新建学员 `remainHours: 0`；update 分支 :446-457 不含 remainHours，保留旧快照）；
  - `api/class-groups/[id]/enrollments/route.ts:330`（无活跃班清零，snapshot 之后）；
  - `api/class-groups/[id]/route.ts:293`；
  - `api/teacher/classroom-feedback/single-session/route.ts:178-179`（单次反馈建 Trial 档案 0/0，无报名、不产生考勤扣减）。
- 排查过但**不碰课时**的 `student.update / updateMany`：`lib/academic-term.ts:190-193`（只改 grade）；`api/admin/student-identities/merge/route.ts:92-95`（只改 identityId）；`api/settings/accounts/route.ts:305,:479,:489`（只改 parent 绑定）；`class-groups/[id]/route.ts:212,:280`；`replace-teacher:266`；`students/[id]/parent`；`link-parent`。
- 直接改学员余额被 400 拒绝：`api/students/[id]/route.ts:236-238`。
- 未发现"改了 Enrollment 但漏跑 snapshot"的分支（6.1 表内 12 个写入口逐条核对均挂 snapshot；`attendance/adjust:186` 的条件快照在无金额变动时不触发，此时台账未变，不构成漂移来源）。**[已核实]**
- 131/136 名快照漂移学生的具体漏调路径归因属写侧分片范围，本片只引用 E 分片结论，不逐条重排。

**c. 续费是否影响已有考勤行的 `enrollmentId`？**

- 续费/复班复用同一条 Enrollment 记录（:189-193 `update` 旧行，id 不变），历史 `Attendance.enrollmentId` 仍指向同一 id，不悬空、不迁移。
- 跨新班报名走新建 :195，旧班历史考勤留在旧 Enrollment 行，属教学档案保留（设计内）。
- `Attendance.enrollmentId` 的写入来源共 3 处：`api/teacher/interaction/route.ts:255`（create）/`:264`（update）；`api/teacher/attendance/route.ts:503`；`api/admin/attendance/submit/route.ts:197`。代码中不存在"续费后批量回刷历史考勤 enrollmentId"的路径。**[已核实]**

**d. 数据库抽样（近 30 天改课时报名对照）** — 见附录 P6-1 / P6-2 / P6-3：
- 163 条活跃报名内部一致性：预付 145、累计 18，`total-used=remain` 不一致 **0** 条；
- 近 30 天有课时流水的 15 条报名，台账内部 gap>0.05 为 **0**，快照与台账不一致 **0**（近期台账变更路径一致）；
- 全量可见学生 160 人，remain 快照不一致 131、total 不一致 1（历史漂移，规模同 E 分片）。

**e. 失效现象（家长续 40 课时后两端各显示多少）**

代码路径下：同事务 Enrollment.total/remain 一起 +40，snapshot 同事务回写 Student → 家长端/教师端（Enrollment 口径）与后台档案（Student 快照）理论一致。若某历史路径漏跑 snapshot，后台档案停留在旧余额，家长端已显示新余额；当前库 131/160 可见学生即此分裂的现存规模。

- **判定：连通。** 理由：写方 → snapshot 转换层 → 家长/教师端台账读方闭环，抽样 P6-1/P6-3 证明台账内部与近期快照一致；快照层历史漂移是 E 分片已登记问题，不阻断本通路判定。
- **确定性：[已核实]**（代码事务边界 + 抽样 P6-1/P6-2/P6-3）。

---

### 通路 7：费用 fees / 收款 → 台账耦合核查

#### 7.1 写方：Fee 表全部写入点（全仓 Grep `tx.fee. / db.fee. / prisma.fee.` 逐条列出）

| # | 写入点 | 操作 | 同事务内触碰的其他表 |
|---|---|---|---|
| 1 | `api/fees/route.ts:235` | `fee.create` | 仅 `activityLog`（:252-260） |
| 2 | `api/fees/[id]/route.ts:82` | `fee.update` | 仅 `activityLog`（:83-91） |
| 3 | `api/fees/[id]/route.ts:117` | `fee.update` 软删 `deletedAt + deletionBatchId` | `deletedRecord` + `activityLog`（:118 起） |
| 4 | `lib/overdue-fee-alerts.ts:49-51` | `fee.updateMany`，仅置 `overdueNotifiedAt` | `notification`（:55 起，提醒推送） |
| 5 | `lib/data-correction/trash.ts:373` | `fee.deleteMany`（回收站 purge，按 deletionBatchId） | 同批次其他软删表 |
| 6 | `api/admin/data-admin/reset/route.ts:190` | `fee.deleteMany`（按 division 重置） | 无台账联动 |

#### 7.2 耦合核查证据（"没有误耦合"是正向结论，同样给证据）

- 在 `src/app/api/fees/` 目录内 Grep `enrollment|teacherSalary|hourTransaction|remainHours|totalHours|usedHours|syncStudentHourSnapshot`，仅命中 5 处 `fee.hours` 的金额聚合：`fees/route.ts:66`（聚合声明）、`:82`（汇总返回）、`:110`（双学部相加）、`:145`（reduce 求和）、`:151`（汇总返回）。此处 `totalHours` 变量名指向 `Fee.hours` 求和，**与 Enrollment / Student 课时字段无关**。
- Fee 创建事务 `fees/route.ts:234-262` 内只有 `tx.fee.create` 与 `tx.activityLog.create`，没有任何 `tx.enrollment / tx.student` 课时字段写入、没有 `tx.teacherSalaryTransaction`、没有 `tx.hourTransaction`。
- 工资入账与课时流水的写入方在考勤提交/审核/反馈链路（C、B 分片范围），Fee 路由未 import 任何课时/工资 lib（`attendance-hour-posting`、`intensive-review`、`salary` 等均不在 fee 目录依赖内）。

#### 7.3 模型与约束（schema.prisma:651-679）

```prisma
model Fee {
  id              String    @id @default(cuid())
  termId          String?
  division        String    @default("JUNIOR")
  studentId       String
  courseId        String?
  amount          Float
  type            String
  status          String    @default("pending")
  paidAt          DateTime?
  dueDate         DateTime?
  hours           Float? // 课时数(资料费等可为空/0)
  // ... deletedAt / deletionBatchId / overdueNotifiedAt
  student Student       @relation(fields: [studentId], references: [id])
  course  Course?       @relation(fields: [courseId], references: [id])
  term    AcademicTerm? @relation(fields: [termId], references: [id], onDelete: SetNull)
  @@index([status, paidAt])
  @@index([studentId, createdAt])
  @@index([deletedAt])
  @@index([createdAt])
  @@index([division])
}
```

- FK 仅 3 个：`studentId → Student`（必填）、`courseId? → Course`、`termId? → AcademicTerm(SetNull)`。**无 `enrollmentId` 列**；**无"学生 + 课程 + 学期"唯一约束**，只有普通索引 :676-680。
- `Fee.hours`（:662）是自由登记课时数，与 `Enrollment.totalHours` 之间无 FK、无触发器、无应用层对账校验。

#### 7.4 读方

- 后台列表 + 聚合：`api/fees/route.ts:45-52`（findMany）、`:67-72`（amount / hours 聚合）。
- 收费选学生：`api/fees/students/route.ts:14-29`。
- 家长端：`parent/fees/page.tsx:27-31`，`where: { deletedAt: null, student: studentWhere, ... }`。
- 逾期提醒：`lib/overdue-fee-alerts.ts:17`。
- 财务导出：`api/settings/export/finance/route.ts:20-24`。
- 报表收入：`api/reports/export/[chartKey]/route.ts:124-128`；后台汇总 `api/reports/summary/route.ts:129`。

#### 7.5 数据库抽样

见附录 P7-1 / P7-2 / P7-3：本地库 `Fee` 表 **0 行**、`FeeType` 2 行；孤儿学生 0 行；`hours>0` 的收费对照样本 0 行。运行时"收款 ↔ 报名课时"对账在当前库内无数据可验证（见六）。

- **判定：连通（定向隔离）。** 理由：Fee 写方闭环于自身台账 + 日志/通知，6 个写入点无一触碰 Enrollment、Student 课时、TeacherSalaryTransaction、HourTransaction；读方均从 Fee 自身取数。隔离方向正确。约束缺口（Fee.hours 与 Enrollment 无库级对账）单列四·2，不计为耦合错误。
- **确定性：耦合方向 [已核实]**（代码 Grep + 事务体核对）；**数据侧 [待验证]**（Fee 空表，待有收费记录后按 P7-3 口径复核）。

---

### 通路 12：导出 export 取数口径

#### 12-a 学员数据导出 — `src/app/api/settings/export/students/route.ts:19-33`

```ts
const students = await prisma.student.findMany({
  where: { division },
  include: { enrollments: { include: { group: { include: { course: true } } } }, fees: true },
  orderBy: { createdAt: 'desc' },
})

const rows = students.map((s) => {
  const courses = s.enrollments.map((e) => e.group.course.name).join('、')
  const totalFees = s.fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
  return [ s.name, s.gender || '', s.grade || '', s.school || '',
    s.remainHours, s.totalHours, s.status, courses || '未报名', totalFees, ... ]
})
```

- **余额口径**：:30 导出列 `s.remainHours, s.totalHours` 读 **Student 快照**，不是 `Enrollment.remainHours`。与家长端/教师端台账口径分裂（E 分片节点4）。
- **软删 / 状态过滤**：:20 `where` 只有 `division`，**无 `deletedAt: null`、无 `status` 排除**；:21 `enrollments`、`fees` 的 include 同样无 where，WITHDRAWN 报名课程名、软删收费都会被带入。
- **缴费总额**：:27 前端 JS 仅按 `status==='paid'` 过滤，未过滤 `deletedAt`。
- 抽样 P12-1 / P12-4：导出口径包含 **194** 人，其中软删 **3**、INACTIVE **34**、页面可见 **160**；remain 快照与报名汇总不一致 **136**；3 名软删学生课时合计 0。

#### 12-b 财务报表导出 — `src/app/api/settings/export/finance/route.ts:20-32`

```ts
const fees = await prisma.fee.findMany({
  where: { createdAt: { gte: ..., lt: ... }, division, deletedAt: null },
  include: { student: { select: { name: true } } },
  orderBy: { createdAt: 'desc' },
})
// 列：学员 / 类型 / 金额 / 状态 / 支付日期 / 创建日期 / 备注
```

- `deletedAt: null` 已过滤（:21）；不带课时余额列；不带 `rollCallStatus`（本表本无考勤字段）。**[已核实]**

#### 12-c 考勤记录导出 — `src/app/api/attendance/export/route.ts:42-71`

```ts
const where: Record<string, unknown> = {
  lesson: { group: groupScope },
  student: { ...visibleStudentWhere, division },
}
const records = await prisma.attendance.findMany({ where, include: { student: ..., lesson: ... }, orderBy: ... })

const statusMap: Record<string, string> = { PRESENT: '出勤', LEAVE: '请假', ABSENT: '旷课', MAKEUP: '补课' }
const rows = records.filter((r) => r.lesson).map((r) => ({
  '班级': r.lesson!.group.name, '日期': ..., '学员': r.student.name,
  '状态': statusMap[r.status] || r.status, '扣课时': r.hoursDeducted,
}))
```

- 学生走 `visibleStudentWhere`（`lib/business-visibility.ts:3-6`：`status != INACTIVE` 且 `deletedAt: null`）；班级走 `visibleClassGroupWhere`（:19-23）。
- **Attendance 行本身未显式过滤 `deletedAt`**（:53-59 的 where 只限定 lesson 与 student 两个关联侧）。抽样 P12-3：库内软删考勤 **0** 行，当前无现存数据触发该缺口。
- **字段口径**：:62 / :69 状态列只映射 `r.status`，**不带 `rollCallStatus`**；:70 带 `hoursDeducted`。迟到标记（`rollCallStatus=LATE`）不会出现在导出表。
- 与页面口径对照：家长端不下发 `rollCallStatus`、教师端双字段都读（E 分片节点1）；考勤导出与家长端展示同源（status），但比教师端少了迟到维度。

#### 12-d 报表图表导出 — `src/app/api/reports/export/[chartKey]/route.ts:72-155`

```ts
const studentWhere = { division, termMemberships: { some: { termId } } }
const feeWhere = { division, termId, deletedAt: null }
```

- 学员口径：`studentWhere`（:72）**无 `deletedAt`、无 `status` 过滤**。funnel（:77 groupBy status）、retention（:95-96 count）、parent-engagement（:109 count）三条计数都会把 INACTIVE / 软删学员算进去。
- 收费口径：`feeWhere`（:73）带 `deletedAt: null` ✓，finance 分支 :124-128。
- 考勤口径：attendance 分支 :142 `groupBy status`，where 仅 `createdAt` 区间 + lesson group termId，**未过滤 Attendance.deletedAt**（与 12-c 同一缺口）。

#### 12-e 相邻导出对照（本片范围内顺带核实）

- 成绩导出 `api/grade-records/export/route.ts:22`（报名 `status:'ACTIVE', deletedAt:null`）、`:25`（成绩 `deletedAt:null`）✓。
- 工资导出 `api/admin/salary/export/route.ts:72`（交易 `deletedAt:null`）✓；不导出课时余额、不带 `rollCallStatus`。
- 收费台账 CSV `(main)/fees/client.tsx:301-325`：浏览器端 Blob 生成，字段来自 fees API 的 `fee.hours / fee.amount`（:312/:313），不读 Enrollment 台账。

#### 12-f 口径分裂与失效现象

- **分裂 1（余额口径）**：学员导出用 Student 快照，家长/教师端用 Enrollment 台账；运营对账时同一学员导出表"剩余课时"与端上显示对不上（现存 136/194 不一致）。
- **分裂 2（名单范围）**：学员导出、报表漏斗/留存/互动计数未排除软删与 INACTIVE；导出/计数会多出 37 个页面不可见学员（3 软删 + 34 INACTIVE）。当前这些学员课时余额均为 0，不产生金额差，但名单人数与页面不一致。
- **分裂 3（迟到维度丢失）**：考勤导出只有 `status`，`rollCallStatus`（迟到）被丢弃；导出表无法区分准时与迟到。
- **判定：部分连通。** 理由：导出路由均能从库内取到数（有读方），但学员/报表两条链路在余额口径与名单范围上与页面口径不一致，考勤链路丢迟到字段；财务/成绩/工资导出口径与页面一致。
- **确定性：[已核实]**（代码 where/列定义 + 抽样 P12-1/P12-3/P12-4/P12-6）。

## 三、孤岛清单（本片范围内）

| # | 表/功能 | 谁写 | 有没有下游消费方 | 是不是"设计了但没接" | 建议 |
|---|---|---|---|---|---|
| 1 | `RenewalFollowUp`（续费跟进记录） | `api/renewals/route.ts:95-113` upsert | 续费跟进列表 `renewals/route.ts:49-58` 合并展示；跟进状态页面 | 否 | 无需处理；注意它只做 CRM 跟进，不写课时（通路6 已证） |
| 2 | `FeeType`（收费类型字典） | `api/settings/fee-types/[id]` 等 | fees 表单类型选项；`fee-types/[id]:34` 按类型计数在用 | 否 | 无需处理 |
| 3 | `Fee.hours`（收费登记课时） | `fees/route.ts:245` | fees 聚合 `:71`、CSV `client.tsx:312`、财务汇总 `:145` | 否（收费台账内部有读方），但**未与 Enrollment.totalHours 做任何对账** | 列入四·2 拍板；若要做收费↔报名课时核对，需在业务层补校验或导出对照列 |

本片范围内无"写了没人读"的孤岛。

## 四、需要用户拍板的业务口径问题

1. **学员导出的余额口径用哪一套？**
   - 方案 A（保留现状 Student 快照）：导出与后台学员档案一致，但与家长端/教师端 Enrollment 台账对不上（现存 136/194 漂移）。
   - 方案 B（改读 Enrollment 汇总）：与三端页面一致，但与后台档案数字不同，且需先处理快照历史漂移。
   - 另需决定：导出是否需要同时带"报名台账余额"一列做双口径并列。

2. **Fee.hours 与 Enrollment.totalHours 是否需要库级/业务级对账？**
   - 现状：无 FK、无唯一约束、无应用层校验，收费课时录错数据库不拦截。
   - 若需要：可在 Fee 创建/编辑事务内校验该生当前 ACTIVE 报名课时是否覆盖，或在导出表增加"收费课时 vs 报名课时"对照列；若收费本就允许资料费/杂费（hours 可空），则需明确 hours 仅为统计口径、不做课时承诺。

3. **导出/报表名单是否排除软删与 INACTIVE 学员？**
   - 现状：学员导出、报表 funnel/retention/engagement 含不可见学员（37/194）；财务/成绩/工资导出已排除。
   - 方案 A：补 `deletedAt: null + status 排除 INACTIVE/ARCHIVED`，与页面名单一致；
   - 方案 B：保留全量历史名单，但在导出表头/文件名标注"含已停用、已软删学员"，避免运营误把导出人数当在册人数。

4. **考勤导出是否补 `rollCallStatus`（迟到列）？**
   - 现状：只带 `status`，迟到与准时同为"出勤"。
   - 若运营需要按迟到统计，需在 12-c 行结构中补一列点名状态；是否与家长端保持"不下发迟到"口径一致，需产品确认。

## 五、已确认正常

1. 报名/复班/退班/手动调课时/插班校准均在同一 `$transaction` 内写 Enrollment 并调用 `syncStudentHourSnapshot`，无异步补 remain（6.1 各条 + snapshot.ts:5-18）。
2. Fee 全部 6 个写入点不触碰 Enrollment、Student 课时、TeacherSalaryTransaction、HourTransaction（7.2 正向 Grep + 事务体证据）。
3. 财务导出（finance:21）、成绩导出（grade-records:22/:25）、工资导出（salary:72）、家长端收费页（parent/fees:28）均已过滤 `deletedAt: null`。
4. 近 30 天有课时流水的 15 条报名，台账内部 `total-used=remain` 全部满足，快照与台账一致（P6-3，0 条 gap、0 条快照不一致）。
5. 库内软删考勤行 0（P12-3），考勤/报表导出未过滤软删考勤的缺口当前无现存数据触发。
6. 续费复活复用同一 enrollment id，历史考勤 `enrollmentId` 不悬空；跨班历史考勤留旧报名属档案保留设计。
7. Fee 学生外键无孤儿行（P7-2，0 条；空表前提下）。

## 六、未能确认 / 需运行时验证

1. **Fee 表本地库 0 行**，收款 ↔ 报名课时的运行时对账（收费课时是否等于报名课时、收款是否覆盖报名、是否存在收费后未报名/报名后未收费）无法用库内数据验证；待有收费记录后按附录 P7-3 SQL 复核。
2. 131/136 名快照漂移学生的具体漏调 snapshot 路径，属写侧分片归因范围；本片仅引用 E 分片结论。
3. 双学部库（`DATABASE_URL_JUNIOR / SENIOR`）当前未配置（`.env` 仅单库 `DATABASE_URL`；`prisma.ts:87` `isDualDbEnabled()` 关闭）；双库开启后，Fee/Enrollment 隔离结论需按两个库分别复核。
4. 报表导出 attendance groupBy（reports/export:142）未过滤软删考勤，与考勤导出同一缺口；库内软删考勤 0，规模待后续数据积累后复核。
5. 家长端收费页 `parent/fees/page.tsx:27-31` 的 `studentWhere` 限定当前在读子女；Fee 空表前提下，跨学员收费是否在家长端泄漏无法抽样验证。

## 附录：数据库只读抽样

- 执行环境：Node v22.23.2，仓库 `node_modules/@prisma/client`；脚本 `e_sample12.js`、`e_sample13.js`、`e_probe.js`（`_audit20261108\`），执行 cwd 为仓库根；结果 JSON `e_sample12_results.json`、`e_sample13_results.json`。
- 全程仅 SELECT（`$queryRawUnsafe`）；姓名脱敏为"姓**"；未输出手机号/身份证/地址。
- 表行数探针（`e_probe.js`，information_schema）：`Fee` 0、`FeeType` 2、`HourTransaction` 25364、`TeacherSalaryTransaction` 7194、`TeacherSalaryConfig` 8、`FeedbackRewardRecord` 6702、`ClassroomFeedback` 5372、`ClassroomFeedbackRequest` 9。

### P6-1 活跃报名台账内部一致性（预付制 / 累计制分开）

```sql
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE e."totalHours" > 0)::int AS prepaid,
       count(*) FILTER (WHERE e."totalHours" = 0)::int AS accrual,
       count(*) FILTER (WHERE e."totalHours" > 0
         AND ABS(ROUND(e."remainHours"::numeric,1) - ROUND((e."totalHours"-e."usedHours")::numeric,1)) > 0.05)::int AS prepaid_mismatch,
       count(*) FILTER (WHERE e."totalHours" = 0
         AND ABS(e."usedHours"::numeric - e."remainHours"::numeric) > 0.05)::int AS accrual_mismatch
FROM "Enrollment" e
WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL
```

命中：total **163**；prepaid **145**；accrual **18**；prepaid_mismatch **0**；accrual_mismatch **0**。
解读：全部活跃报名满足 `remainHours = totalHours - usedHours`（预付制）或 `remainHours = usedHours` 口径（累计制 total=0），台账层无内部矛盾。

### P6-2 快照 vs 活跃报名汇总（全量可见学生）

```sql
SELECT count(*)::int AS active_students,
       count(*) FILTER (WHERE ABS(s."remainHours"::numeric - COALESCE(enr.remain,0)::numeric) > 0.05)::int AS remain_mismatch,
       count(*) FILTER (WHERE ABS(s."totalHours"::numeric - COALESCE(enr.total,0)::numeric) > 0.05)::int AS total_mismatch
FROM "Student" s
LEFT JOIN (SELECT "studentId", SUM("remainHours") AS remain, SUM("totalHours") AS total
           FROM "Enrollment" WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY 1) enr
  ON enr."studentId"=s.id
WHERE s."deletedAt" IS NULL AND s.status NOT IN ('INACTIVE','ARCHIVED')
```

命中：active_students **160**；remain_mismatch **131**；total_mismatch **1**。
解读：快照漂移规模与 E 分片一致；本通路写入口近期未产生新的内部矛盾（对照 P6-3）。

### P6-3 近 30 天有课时流水的报名明细（台账内部 + 快照对照）

```sql
SELECT e.id, s.name, e."totalHours", e."usedHours", e."remainHours",
       s."remainHours" AS student_remain,
       max(h."createdAt")::text AS last_tx,
       ABS(ROUND(e."remainHours"::numeric,1)-ROUND((e."totalHours"-e."usedHours")::numeric,1))::float AS internal_gap
FROM "Enrollment" e JOIN "Student" s ON s.id=e."studentId"
LEFT JOIN "HourTransaction" h ON h."enrollmentId"=e.id AND h."deletedAt" IS NULL
WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL
GROUP BY e.id, s.name, e."totalHours", e."usedHours", e."remainHours", s."remainHours"
HAVING max(h."createdAt") >= now() - interval '30 days'
ORDER BY last_tx DESC LIMIT 30
```

命中 **15** 条；派生汇总：internal_gap>0.05 **0**；快照不一致 **0**。
代表性脱敏样本：

| 学生 | 最近流水 | totalHours | usedHours | remainHours | Student 快照 | internal_gap |
|---|---|---|---|---|---|---|
| 孙** | 2026-11-01 08:07:55 | 134.4 | 17.5 | 116.9 | 116.9 | 0 |
| 田** | 2026-11-01 08:07:55 | 123.2 | 6.3 | 116.9 | 116.9 | 0 |
| 马** | 2026-11-01 08:07:55 | 134.4 | 17.5 | 116.9 | 116.9 | 0 |
| 马** | 2026-11-01 08:07:55 | 134.4 | 16.1 | 118.3 | 118.3 | 0 |
| 刘** | 2026-11-01 08:07:55 | 134.4 | 14.7 | 119.7 | 119.7 | 0 |

解读：近期台账变更路径（扣减/入账）写入后 snapshot 同步一致，漂移来自更早历史路径，不在近 30 天窗口内。

### P7-1 收费记录总览

```sql
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE f.status='paid')::int AS paid,
       count(*) FILTER (WHERE f.status='pending')::int AS pending,
       count(*) FILTER (WHERE f."deletedAt" IS NOT NULL)::int AS soft_deleted,
       count(*) FILTER (WHERE f.hours IS NOT NULL)::int AS hours_recorded,
       COALESCE(SUM(f.amount) FILTER (WHERE f."deletedAt" IS NULL),0)::float AS amount_sum_active,
       COALESCE(SUM(f.hours) FILTER (WHERE f."deletedAt" IS NULL),0)::float AS hours_sum_active
FROM "Fee" f
```

命中：total **0**；paid **0**；pending **0**；soft_deleted **0**；hours_recorded **0**；金额合计 **0**；课时合计 **0**。

### P7-2 收费学生孤儿核查

```sql
SELECT count(*)::int AS fee_rows,
       count(*) FILTER (WHERE st.id IS NULL)::int AS orphan_student
FROM "Fee" f LEFT JOIN "Student" st ON st.id=f."studentId"
```

命中：fee_rows **0**；orphan_student **0**。

### P7-3 收费登记课时 vs 报名台账对照样本

```sql
SELECT f.id, s.name, f.hours, f.amount, f.status,
       e."totalHours", e."remainHours", e.status AS enr_status, g.name AS group_name
FROM "Fee" f JOIN "Student" s ON s.id=f."studentId"
LEFT JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
LEFT JOIN "ClassGroup" g ON g.id=e."groupId"
WHERE f."deletedAt" IS NULL AND f.hours IS NOT NULL AND f.hours > 0
ORDER BY f."createdAt" DESC LIMIT 15
```

命中 **0** 行（空表）。待 Fee 有数据后重跑本查询，核对 `f.hours` 与 `e.totalHours / e.remainHours` 是否一致。

### P12-1 学员导出名单范围（where 仅 division）

```sql
SELECT count(*)::int AS export_includes,
       count(*) FILTER (WHERE s."deletedAt" IS NOT NULL)::int AS soft_deleted,
       count(*) FILTER (WHERE s.status='INACTIVE')::int AS inactive,
       count(*) FILTER (WHERE s."deletedAt" IS NULL AND s.status NOT IN ('INACTIVE','ARCHIVED'))::int AS visible
FROM "Student" s
```

命中：export_includes **194**；soft_deleted **3**；inactive **34**；visible **160**。
解读：导出会多出 37 个页面不可见学员（3 软删 + 34 INACTIVE）。

### P12-2 学员导出缴费总额口径（JS 仅过滤 paid，不过滤软删）

```sql
SELECT count(*)::int AS fee_rows,
       count(*) FILTER (WHERE f.status='paid')::int AS paid_all,
       count(*) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL)::int AS paid_active,
       COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid'),0)::float AS paid_sum_all,
       COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL),0)::float AS paid_sum_active
FROM "Fee" f
```

命中：fee_rows **0**；paid_all **0**；paid_active **0**；两口径合计均 **0**。空表前提下两种过滤口径无差额；代码缺口（:27 未过滤 deletedAt）待有收费数据后复核。

### P12-3 考勤导出软删行

```sql
SELECT count(*)::int AS soft_deleted_attendance FROM "Attendance" WHERE "deletedAt" IS NOT NULL
```

命中 **0** 行。

### P12-4 导出学员快照与报名汇总不一致规模

```sql
SELECT count(*)::int AS export_includes,
       count(*) FILTER (WHERE ABS(s."remainHours"::numeric - COALESCE(enr.remain,0)::numeric) > 0.05)::int AS remain_mismatch,
       count(*) FILTER (WHERE s."deletedAt" IS NOT NULL)::int AS soft_deleted,
       count(*) FILTER (WHERE s.status='INACTIVE')::int AS inactive,
       COALESCE(SUM(s."remainHours") FILTER (WHERE s."deletedAt" IS NOT NULL),0)::float AS soft_deleted_hours
FROM "Student" s
LEFT JOIN (SELECT "studentId", SUM("remainHours") AS remain FROM "Enrollment"
            WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY 1) enr ON enr."studentId"=s.id
```

命中：export_includes **194**；remain_mismatch **136**；soft_deleted **3**；inactive **34**；soft_deleted_hours **0**。

### P12-5 不可见学员样本（脱敏）

```sql
SELECT s.name, s.status::text, s."deletedAt"::text, s."remainHours", s."totalHours",
       (SELECT count(*) FROM "Enrollment" e WHERE e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL)::int AS active_enrollments
FROM "Student" s
WHERE s."deletedAt" IS NOT NULL OR s.status='INACTIVE'
ORDER BY s."deletedAt" NULLS LAST, s.status LIMIT 15
```

代表性样本：

| 学生 | 状态 | deletedAt | remainHours | totalHours | 活跃报名数 |
|---|---|---|---|---|---|
| 李** | INACTIVE | 2026-09-15 07:58:59 | 0 | 0 | 0 |
| 冯** | INACTIVE | 2026-09-15 07:59:03 | 0 | 0 | 0 |
| 王** | INACTIVE | 2026-10-02 06:02:30 | 0 | 0 | 0 |
| 陶** | INACTIVE | NULL | 0 | 0 | 0 |
| 刘** | INACTIVE | NULL | 0 | 0 | 0 |

解读：当前不可见学员课时余额均为 0，导出名单人数与页面不一致，但未产生余额金额差。

### P12-6 财务导出软删收费核对（与 P12-2 同口径，独立复跑）

```sql
SELECT count(*)::int AS fee_rows,
       count(*) FILTER (WHERE f.status='paid')::int AS paid_rows,
       count(*) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NOT NULL)::int AS paid_soft_deleted,
       COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid'),0)::float AS paid_sum_js_filter,
       COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL),0)::float AS paid_sum_db_filter
FROM "Fee" f
```

命中：fee_rows **0**；paid_rows **0**；paid_soft_deleted **0**；两口径合计均 **0**。
