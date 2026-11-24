# F-互动与练习（ID: F）

> 范围：面 A 通路 2「课堂互动答题 / 抽人（ClassroomPick）」与通路 3「练习 / 题库与掌握度（PracticeAttempt / PracticeResult / mastery）」。点名→Attendance 一段已在 `A-点名写入.md` 闭环，本分片直接引用其已核实结论，不重复验证；课时扣减、工资、反馈落库、请假餐食等链路由其他分片负责，本分片不越界下结论。
> 审计方式：只读 Grep + 局部 Read，未改源码、未碰数据库、未跑 migrate、未重启服务。确定性标注：`[已核实]` / `[推断]` / `[待验证]`。
> 结论三档：连通 / 部分连通 / 孤岛；风险三档：高 / 中 / 低。

## 一、通路结论表

| # | 通路 | 写方(file:line) | 读方(file:line) | 中间转换层 | 结论 | 风险等级 | 失效时用户看到什么 |
|---|------|----------------|----------------|-----------|------|---------|------------------|
| 2a | ClassroomPick 抽人记录落库 → 当节课 / 家长端读取 | `src/app/api/teacher/interaction/pick/route.ts:105`（create）、`:159`（notifiedAt）、`:202`（delete）、`:233-240`（PATCH result/comment/questionLabel） | 教师互动页同课次 `src/app/api/teacher/interaction/route.ts:85-98,121-122`；家长互动 30 天窗口 `src/app/api/parent/interaction/route.ts:39-68`；家长反馈详情按课次并入 `src/app/parent/class-feedback/[id]/page.tsx:98-108` | 无跨课次聚合层；`src/lib/classroom-interaction.ts` 仅做抽人权重与单次汇总 | 部分连通 | 中 | 记录只在「当节课互动页 + 家长端 30 天窗口 + 当节反馈详情」可见；超出 30 天或换课次后，任何档案 / 报表都查不到该生被抽过几次、答对几次 |
| 2b | 参与度汇总 `summarizeParticipation` → 档案 / 报表 / 家长端消费 | 汇总由 `src/lib/classroom-interaction.ts:179-198` 纯函数产出，无独立写表 | 生产调用方仅 `src/app/api/parent/interaction/route.ts:92`（单孩才给 summary，`:89-95`）；另见单测 `classroom-interaction.test.ts:121-135` | 无；lib 内无累计参与度聚合 | 部分连通 | 中 | 教师端学生档案、成长报告、管理端报表不消费参与度；家长端多孩时 summary 直接为 `null`（`:89`），看不到汇总数字 |
| 2c | 课堂答题结果（NEEDS_WORK 等）→ 薄弱点表 WeaknessRecord | **无写方**：全仓无 pick→weakness 桥接写入 | WeaknessRecord 读方：`src/app/api/teacher/weaknesses/route.ts:18`、`src/app/api/teacher/students/[id]/context/route.ts:44`、`src/app/api/exam-papers/stats/route.ts:47`、`src/app/api/reports/paper-stats/route.ts:42`、`src/lib/student-archive.ts:5`、`src/lib/student-profile.ts:49` | 无 | 孤岛 | 高 | 老师课堂把某生点答「需订正 / NEEDS_WORK」，该知识点不会出现在学生薄弱点清单、家长档案、成长报告里；薄弱点只来自试卷批改与教师手动录入 |
| 2d | 抽人次数 / 正确率 / 薄弱点在教师端 · 家长端学情档案展示 | 同 2a 写方 | 家长端：`src/app/parent/interaction/page.tsx:31-32,149`（correctCount 等汇总）、`src/app/parent/class-feedback/[id]/client.tsx:475-477`（答对/部分对/需订正次数）；教师端档案 / 成长报告：**0 处**消费 ClassroomPick（`src/lib/` Grep `classroomPick|pickCount|pickedCount|questionCount` 命中 0） | 无 | 部分连通 | 中 | 教师打开学生档案 / 成长报告，看不到该生课堂被提问频次与答题正确率；只能回到当节课互动页逐节翻 |
| 2e | ClassroomPick ↔ ClassroomFeedback 互相引用 | pick 通知时反查反馈 `src/app/api/teacher/interaction/pick/route.ts:132-141`；反馈详情反查 picks `src/app/parent/class-feedback/[id]/page.tsx:98-103` | 同上 | 无外键关联，靠共享 `lessonId(+studentId)` 查询时拼合 | 部分连通 | 低 | 两表之间不存持久引用：反馈被删 / 改课后，旧 pick 的跳转链接与并入记录可能对不上；pick 上不记录 feedbackId，无法从反馈反向追溯具体哪次提问 |
| 3a | 练习作答落表（Attempt 历史 + Result 最新汇总） | `src/app/api/parent/practice-results/route.ts:261`（PracticeAttempt.createMany）、`:271-288`（PracticeResult.upsert） | 家长自助：`src/app/parent/practice/page.tsx:95,100-103`、`src/app/parent/materials/PracticeBank.tsx:172`（summaryOnly 目录角标）；管理端：`src/app/api/admin/practice-stats/route.ts:46`、`src/app/api/admin/practice-stats/[studentId]/route.ts:88-103`，页面 `src/app/(main)/grades/page.tsx:378,408`；档案完整度 `src/app/api/admin/profile-completeness/route.ts:59-63` | `src/lib/practice-bank.ts:49-66` `mergePracticeProgress`（覆盖进度合并）、`:98-122` 判分、`:141-144` 选题 | 连通 | 低 | 作答可留档、可回看、管理端可统计；题库本身来自静态 TS 数据（非 DB 题目表），题目增删走代码发布 |
| 3b | mastery / 掌握度计算层及其调用方 | 三套口径并存（见二、通路3b）：①试卷题目档位 `PaperQuestion.mastery`；②教师手动 `MasteryRecord`；③反馈内 `masteryLevel/studentMastery` 自由文本 | ①消费 `src/lib/student-profile.ts:120-147`、`src/lib/student-growth/personalized-evidence.ts:56-131`、报表 / 档案 / PDF；②读方 `src/app/api/teacher/students/[id]/context/route.ts:34-38`；③随反馈快照落库展示 | ①有聚合层 `student-profile.ts:121-143`；②③无计算层 | 部分连通 | 高 | 三套「掌握度」口径在档案页并列时容易被混称；练习链路本身不产出 mastery 档位；`MasteryRecord` 前端有录入面板但服务端写路由缺失（详见孤岛 #2） |
| 3c | 练习数据被家长 / 教师档案、学情报告消费 | 同 3a 写方 | 家长档案 / 成长报告：**0 处**读 PracticeAttempt/PracticeResult（`src/app/parent/` 仅 practice 页与 PracticeBank 组件调用 practice-results）；教师端：**0 处**（`src/app/teacher/` Grep 练习表命中 0）；管理端仅统计页 + 完整度布尔标记 | 无档案级转换层 | 部分连通 | 中 | 教师在学生档案、成长报告、薄弱点清单里看不到刷题量 / 正确率 / 错题；管理端学情统计可见，但教师日常跟进页面拿不到；家长端也只能在练习模块内回看，不进成长档案 |
| 3d | 练习错题 → 薄弱点 / 掌握度回流 | **无写方**：PracticeResult.wrongIds 只在练习链路内部使用（`practice-results/route.ts:241-246` 校验错题重练范围），不晋升 WeaknessRecord / MasteryRecord | 同 2c 薄弱点读方；练习表读方同 3a | 无 | 孤岛 | 高 | 学生在题库反复做错的题，不会沉淀为档案薄弱点，也不会进入教师手动掌握度清单；错题只停留在该题组的「错题重练」池内 |

**本片总判断：课堂互动与练习两条链路各自在「家长自助 + 管理端统计」范围内闭环，但向教师学情档案 / 成长报告 / 薄弱点沉淀的下游基本断开。** 最关键的两处断链：课堂答题结果不沉淀薄弱点（2c）、练习错题不回流掌握度 / 薄弱点（3d）；另有一处「设计了没接」：`MasteryRecord` 录入面板已上线，但服务端写路由不存在（孤岛 #2）。

## 二、逐条证据

### 通路 2a：ClassroomPick 记录落库与读取

- **写方**：`src/app/api/teacher/interaction/pick/route.ts` — 4 个写操作，字段均限于互动记录本身，不碰考勤 / 工资 / 薄弱点。
  - create（`:105-114`）：`lessonId / studentId / teacherId / round / source / questionLabel`，无 result（先抽人后点评）。
  - notifiedAt 更新（`:159-162`）：仅写 `notifiedAt`。
  - delete（`:202`）：按 id 删除单条 pick。
  - PATCH（`:233-240`）：`result / comment / questionLabel`。
- **读方**：
  - 教师互动页同课次：`src/app/api/teacher/interaction/route.ts:85-98` 按 `lessonId` 取 picks，`:121-122` 派生 `questionCount: picks.length`、`pickedCount`（去重学生数）。
  - 家长互动 30 天窗口：`src/app/api/parent/interaction/route.ts:39-68`，`parentVisible: true`、`createdAt >= since`（`LOOKBACK_DAYS=30`、`MAX_RECORDS=50`，`:9-10`），join lesson 取课次信息。
  - 家长反馈详情按课次并入：`src/app/parent/class-feedback/[id]/page.tsx:98-103`，`lessonId + studentId + parentVisible`。
- **转换层**：无跨课次聚合。`src/lib/classroom-interaction.ts` 只提供抽人权重（`:64-72`）、候选上下文（`:75-94`）、单次汇总（`:179-198`）；`src/lib/` 下 Grep `classroomPick|ClassroomPick|pickCount|pickedCount|questionCount` 命中 **0**，不存在累计参与度 / 按学生跨课次统计的转换层。
- **口径分裂**：教师互动页按「课次」读全量 picks；家长互动按「30 天 + 50 条上限」读；反馈详情只并入已评 CORRECT/PARTIAL/NEEDS_WORK，NO_ANSWER 与未评隐藏（`page.tsx:105-108`）。三处过滤口径不同。
- **关键代码**：
```ts
// src/app/api/teacher/interaction/pick/route.ts:105-114
created = await prisma.classroomPick.create({
  data: {
    lessonId: body.lessonId,
    studentId: targetStudentId,
    teacherId: teacher.id,
    round: existing.length + 1,
    source: manualStudentId ? 'MANUAL' : 'RANDOM',
    questionLabel: cleanText(body.questionLabel, MAX_QUESTION_LABEL),
  },
})
```
```ts
// src/app/parent/interaction/route.ts:39-46
const picks = await prisma.classroomPick.findMany({
  where: {
    studentId: { in: targetIds },
    parentVisible: true,
    createdAt: { gte: since },
  },
  orderBy: { createdAt: 'desc' },
  take: MAX_RECORDS,
```
- **判定**：部分连通。写方→三处读方闭环，但读方全部是「同课次 / 30 天窗口」场景，无跨课次累计，教师档案不消费。
- **失效现象**：家长端超过 30 天的提问记录不再出现在互动页；教师无法在学生档案看到历史累计被提问次数与正确率。
- **确定性**：[已核实]

### 通路 2b：参与度汇总 `summarizeParticipation` 的消费方

- **写方**：无独立落库；汇总由纯函数 `src/lib/classroom-interaction.ts:179-198` 从 picks 现场计算，输出 `totalPicks / correctCount / needsWorkCount / lastPickedAt`。
- **读方**：生产调用方仅 `src/app/api/parent/interaction/route.ts:92`；`targetIds.length === 1` 才给 summary（`:89-95`），多孩家庭返回 `summary: null`。另有单测 `src/lib/classroom-interaction.test.ts:121-135`，非生产消费。
- **转换层**：无。函数注释明确「家长端所用的汇总口径：只统计自己的孩子，不与他人比较」（`:178`）。
- **口径分裂**：汇总只数 CORRECT 与 NEEDS_WORK，PARTIAL 不计入 correctCount 也不计入 needsWorkCount（`:186-187`）；教师互动页的 `pickedCount/questionCount` 是另一套课次内口径（见 2a）。
- **关键代码**：
```ts
// src/lib/classroom-interaction.ts:179-198
export function summarizeParticipation(
  records: Array<{ result?: string | null; createdAt: Date }>,
): ParticipationSummary {
  let correctCount = 0
  let needsWorkCount = 0
  let lastPickedAt: Date | null = null
  for (const record of records) {
    if (record.result === 'CORRECT') correctCount += 1
    if (record.result === 'NEEDS_WORK') needsWorkCount += 1
```
```ts
// src/app/api/parent/interaction/route.ts:89-95
summary: targetIds.length === 1
  ? {
      studentId: targetIds[0],
      ...summarizeParticipation(picks.map((pick) => ({ result: pick.result, createdAt: pick.createdAt }))),
      todayCount: picks.filter((pick) => pick.createdAt >= todayStart).length,
    }
  : null,
```
- **判定**：部分连通。汇总只被家长互动页单孩场景消费；教师端档案、成长报告、管理端报表均无调用。
- **失效现象**：多孩家长看不到参与度汇总；教师 / 管理端任何学情视图都拿不到参与度指标。
- **确定性**：[已核实]

### 通路 2c：课堂答题结果 → WeaknessRecord 薄弱点沉淀（孤岛）

- **写方（WeaknessRecord 全量，已枚举）**：
  - 教师从试卷沉淀 / 手动录入：`src/app/api/teacher/weaknesses/route.ts:68-87`（upsert 累加 `mistakeCount`，`:70` update / `:78` create）、`:107-114`（手动 create）、`:139`（手动 delete）。
  - 试卷批改导入：`src/app/api/exam-papers/[id]/questions/route.ts:46`（按 paperId 清空重建）、`:54`（createMany，来源为 `mastery === 'NEEDS_PRACTICE'` 的试卷题，`:44`）。
  - 数据重置 / 回收站清理（housekeeping，非业务写入）：`src/app/api/admin/data-admin/reset/route.ts:135`、`src/lib/data-correction/trash.ts:333,367,459`。
  - **ClassroomPick 侧：0 个写入点。** 全仓 Grep `weakness` / `WeaknessRecord` / `NEEDS_WORK`，互动链路只把 NEEDS_WORK 用于抽人权重加权（`src/lib/classroom-interaction.ts:46 NEEDS_WORK_BONUS=50`、`:70` 加权、`:187` 计数），不沉淀薄弱点。
- **读方**：`src/app/api/teacher/weaknesses/route.ts:18`、`src/app/api/teacher/students/[id]/context/route.ts:44`、`src/app/api/exam-papers/stats/route.ts:47`、`src/app/api/reports/paper-stats/route.ts:42`、`src/lib/student-archive.ts:5`、`src/lib/student-profile.ts:49`。
- **转换层**：无 pick→weakness 桥接。
- **口径分裂**：WeaknessRecord 挂 `paperId`（`prisma/schema.prisma:1536-1537`），无 lessonId / setId / questionId 字段，结构上也不承接课堂提问或题库错题。
- **关键代码**：
```ts
// src/app/api/teacher/weaknesses/route.ts:78-86（试卷/手动路径，唯一 create 形态之一）
saved.push(await tx.weaknessRecord.create({
  data: {
    studentId,
    paperId: fromPaperId,
    topic,
    mistakeCount: count,
    suggestion: '建议针对该知识点进行专项练习。',
  },
}))
```
```ts
// prisma/schema.prisma:1532-1541
model WeaknessRecord {
  id           String     @id @default(cuid())
  studentId    String
  student      Student    @relation(fields: [studentId], references: [id])
  paperId      String?
  paper        ExamPaper? @relation(fields: [paperId], references: [id])
  topic        String
  mistakeCount Int        @default(1)
```
- **判定**：孤岛。课堂答题结果有自己的落表（ClassroomPick），但到薄弱点表的下游写入完全缺失；薄弱点读方全部来自试卷 / 手动路径。
- **失效现象**：课堂点答「需订正」不会在学生档案薄弱点清单、家长档案、成长报告中留下该知识点；老师只能靠试卷批改或手动录入补薄弱点。
- **确定性**：[已核实]（代码侧无桥接写入）；运行时是否存在其他旁路脚本写 WeaknessRecord，本片未连库验证，见第六节。

### 通路 2d：抽人次数 / 正确率 / 薄弱点在档案与报告中的展示

- **写方**：同 2a。
- **读方（家长端，已核实）**：
  - `src/app/parent/interaction/page.tsx:31-32,149`：渲染 totalPicks / correctCount / needsWorkCount 等汇总。
  - `src/app/parent/class-feedback/[id]/client.tsx:475-477`：展示答对 / 部分对 / 需订正次数。
- **读方（教师端 / 档案 / 成长报告）**：**0 处**。`src/lib/` 下 Grep `classroomPick|ClassroomPick|pickCount|pickedCount|questionCount` 命中 0；`src/app/teacher/` 下无练习表 / 抽人记录消费（见 3c 同次 Grep）。档案聚合层 `src/lib/student-profile.ts:21` 的数据源枚举为 `studentRows, papers, grades, weaknesses, goals, badges, feedbacks, posts, attendances, stageSummary`，不含 picks。
- **转换层**：无。
- **口径分裂**：家长端看到的是「30 天窗口内已评记录」；教师端档案若未来接入，需要跨课次累计口径，目前无此层。
- **关键代码**：
```ts
// src/lib/student-profile.ts:21-22（档案数据源枚举，无 picks / practice）
const [studentRows, papers, grades, weaknesses, goals, badges, feedbacks, posts, attendances, stageSummary] =
  await Promise.all([
```
- **判定**：部分连通。家长端两处可见；教师端档案 / 成长报告不展示抽人次数与正确率；薄弱点维度见 2c 孤岛。
- **失效现象**：教师跟进学生时，档案页无课堂互动痕迹；互动表现只能逐节课回查。
- **确定性**：[已核实]

### 通路 2e：ClassroomPick 与 ClassroomFeedback 是否互相引用

- **持久外键**：无。`prisma/schema.prisma:434-456` ClassroomPick 字段为 `id / lessonId / studentId / teacherId / round / source / questionLabel / result / comment / parentVisible / notifiedAt / createdAt`，唯一键 `[lessonId, studentId, round]`，**无 feedbackId 字段**；ClassroomFeedback 侧也无 pickId 列表字段（关联靠 `studentIds` 数组 + `classLessonId`）。
- **运行时关联（两次反查，不持久化）**：
  - 通知时：`src/app/api/teacher/interaction/pick/route.ts:132-141` 反查该课次 PUBLISHED 反馈取 id 拼跳转 href，`:143-145` 无反馈则回退 `/parent/interaction`。
  - 反馈详情：`src/app/parent/class-feedback/[id]/page.tsx:98-103` 按 `lessonId + studentId` 反查 picks 并入展示。
- **关键代码**：
```ts
// src/app/api/teacher/interaction/pick/route.ts:132-141
const lessonFeedback = await prisma.classroomFeedback.findFirst({
  where: {
    classLessonId: body.lessonId,
    status: 'PUBLISHED',
    deletedAt: null,
    studentIds: { has: targetStudentId },
  },
  orderBy: { createdAt: 'desc' },
  select: { id: true },
})
```
- **判定**：部分连通。点评时能带出反馈入口、反馈详情能并入提问记录，但关联是查询时拼合，不是持久引用。
- **失效现象**：反馈被删除 / 课次被改绑后，旧 pick 的跳转与并入可能落空；无法从某条反馈反向定位到具体哪次抽人。
- **确定性**：[已核实]

### 通路 3a：练习结果落表（Attempt 历史 + Result 最新汇总）

- **写方**：`src/app/api/parent/practice-results/route.ts`，事务内两步落库：
  - `:261` `PracticeAttempt.createMany`（每次提交单独留档，主键即客户端生成的 submissionId，`:251`）。
  - `:271-288` `PracticeResult.upsert`（`studentId + setId` 唯一键，保存该生该题组最新覆盖进度）。
- **表结构**：
```prisma
// prisma/schema.prisma:2306-2320
model PracticeResult {
  id         String   @id @default(cuid())
  studentId  String
  setId      String
  score      Int
  total      Int
  wrongIds   String[]
  answers    Json?    @map("answers")
  finishedAt DateTime @default(now())
  @@unique([studentId, setId])
  @@index([studentId])
}
```
```prisma
// prisma/schema.prisma:2323-2337
model PracticeAttempt {
  id               String   @id @default(cuid())
  studentId        String
  setId            String
  score            Int
  total            Int
  wrongIds         String[]
  answers          Json?
  questionSnapshot Json?
  finishedAt       DateTime @default(now())
  @@index([studentId, finishedAt(sort: Desc)])
  @@index([studentId, setId, finishedAt(sort: Desc)])
}
```
- **读方**：
  - 家长练习页：`src/app/parent/practice/page.tsx:95` 拉全量 results + attemptStats + attempts 历史，`:100-103` 落状态。
  - 家长题库目录：`src/app/parent/materials/PracticeBank.tsx:172` `summaryOnly=1` 读 PracticeResult 最新进度做目录角标；`:216` 拉题组目录。
  - 管理端统计：`src/app/api/admin/practice-stats/route.ts:46-49`（列表，只读 Attempt）、`src/app/api/admin/practice-stats/[studentId]/route.ts:88-103`（个人详情 + 聚合 + 14 天趋势 `:137-160`）；页面 `src/app/(main)/grades/page.tsx:378`（列表）、`:408`（个人详情）。
  - 档案完整度：`src/app/api/admin/profile-completeness/route.ts:59-63` 仅取 `distinct studentId`，产出 `hasPractice` 布尔（`:69,73,83`）。
- **转换层**：`src/lib/practice-bank.ts` — `mergePracticeProgress:49-66`（覆盖合并：子集练习不清空其他错题）、`isPracticeAnswerCorrect:98-122`（判分）、`selectPracticeQuestions:141-144`（challenge 模式剔除 EASY）、`snapshotPracticeQuestions:25-41`（题目快照不可变留档）。客户端会话层 `src/lib/practice-session-client.ts:102-131`（提交凭证 + 断线重试核对）。
- **题库来源**：静态 TS 数据，非 DB 题目表。`src/data/published-practice-bank.ts`（PUBLISHED_PRACTICE_SETS）、`src/data/parent-practice-bank.ts`（PARENT_PRACTICE_SETS 目录元数据）、`src/data/practice-sets/`（题目 TS）、`src/data/obsidian-question-bank/`（4 个 JSON）；接口 `src/app/api/parent/practice-bank/route.ts:12,52-59` 从这些 Map 读目录与题目。
- **口径分裂（双表）**：PracticeResult = 每生每题组最新覆盖进度（家长目录角标、错题重练范围用）；PracticeAttempt = 每次提交留档（管理端统计、历史回看用）。管理端统计只读 Attempt，家长目录角标只读 Result，两端分母 / 分子口径不同。
- **关键代码**：
```ts
// src/app/api/parent/practice-results/route.ts:261,271-288
const inserted = await tx.practiceAttempt.createMany({ data: [attemptData], skipDuplicates: true })
// ...
await tx.practiceResult.upsert({
  where: { studentId_setId: { studentId: child.id, setId } },
  update: { ...progress, finishedAt },
  create: { studentId: child.id, setId, ...progress, finishedAt },
})
```
- **判定**：连通。写方→lib 判分 / 合并层→家长自助与管理端统计读方闭环；双表分工在代码注释中明确（`schema.prisma:2322`「每次提交都单独留档；PracticeResult 继续保存每个学生/题组的最新汇总」）。
- **失效现象**：若迁移未落地（P2021/P2022），接口返回 503 `SCHEMA_NOT_READY`，作答保留不清除（`route.ts:41-44`）；题库题目更新后旧作答按 revision 拦截（`:65-67`），不会被当成新题判分。
- **确定性**：[已核实]

### 通路 3b：mastery / 掌握度计算层与三套口径

> 本片把「掌握度」拆成三套独立口径分别核查，避免混为一谈。

**口径①：试卷题目档位 `PaperQuestion.mastery`（MASTERED / NEEDS_REVIEW / NEEDS_PRACTICE）**
- 写方：试卷识别 / 批改路径写入，`src/app/api/exam-papers/recognize/route.ts:146`、`src/app/api/exam-papers/[id]/questions/route.ts:35`。
- 计算 / 聚合层：`src/lib/student-profile.ts:120-147`（`masteryCount` + `topicMastery` 聚合，`:129-133` 按档位计数，`:143` 输出 needsPracticeCount）。
- 消费方：`src/lib/student-growth/personalized-evidence.ts:56-131`、`src/app/parent/archive/[id]/client.tsx:95-96`、`src/app/parent/archive/client.tsx:476-483,1150-1424`、`src/app/api/reports/summary/route.ts:84-106,178`、`src/app/api/reports/export/[chartKey]/route.ts:83-85`、`src/lib/classroom-feedback/parent-pdf.ts:161-164`、`src/app/api/teacher/stage-summary/route.ts:17-40`、`src/app/api/teacher/ai-feedback/route.ts:554`。
- 判定：**连通**（试卷批改→聚合层→档案 / 报表 / PDF 闭环）。[已核实]

**口径②：教师手动 `MasteryRecord`（知识点 + level + note）**
- 表结构：`prisma/schema.prisma:2280-2290`（`studentId / teacherId / knowledgePoint / level / note / createdAt`）。
- 读方：`src/app/api/teacher/students/[id]/context/route.ts:34-38`（按学期取最近 5 条，`.catch(() => [])` 容错）。
- 写方：**代码侧缺失**。全仓 Grep `masteryRecord.create|upsert|update` 命中 0；`src/app` 下无任何 `mastery` 命名的 route.ts（PowerShell 递归过滤 `route.ts` 文件名含 mastery，返回空）。
- 前端调用：两个教师面板向不存在的端点发请求——`src/app/teacher/students/[id]/client.tsx:429`（GET）、`:486`（POST 保存）、`:488`（GET 刷新）；`src/app/teacher/student/[id]/client.tsx:107`（GET）、`:191`（POST）、`:193`（GET 刷新）。
- 判定：**孤岛（设计了没接）**，详见孤岛清单 #2。[已核实] 代码侧无写路由；运行时端点返回 404/405 属 [待验证]。

**口径③：反馈内 `masteryLevel / studentMastery` 自由文本档位**
- 写方：反馈草稿 / AI 反馈链路随反馈快照落库，`src/app/api/teacher/ai-feedback/route.ts:388`（截取 30 字）、`:473`（拼入反馈正文）、`:499`（结构上下文）；`src/app/api/teacher/ai-feedback/chat/route.ts:163-191`。
- 消费：随 ClassroomFeedback 快照展示，无独立计算层、不回写试卷题目档位或 MasteryRecord。
- 判定：**部分连通**（仅反馈单页内闭环）。[已核实]

**练习链路是否产出 mastery**：否。`mergePracticeProgress`（`practice-bank.ts:49-66`）只算 `answers / wrongIds / total / score`；PracticeResult / PracticeAttempt schema 无 mastery 字段；练习作答不写 PaperQuestion.mastery、不写 MasteryRecord、不写 WeaknessRecord（见 3d）。

- **口径分裂提示**：档案页「掌握度」字样可能同时来自①试卷题目档位（百分比 + 知识点分布）、②MasteryRecord（教师手动档位，当前空表）、③反馈自由文本，三者不互通、不可互相折算。
- **确定性**：①[已核实]；②[已核实] 代码无写路由，运行时状态 [待验证]；③[已核实]。

### 通路 3c：练习数据被家长 / 教师档案、学情报告消费

- **写方**：同 3a。
- **家长端消费（仅练习模块内）**：`src/app/parent/practice/page.tsx:95`、`src/app/parent/materials/PracticeBank.tsx:172,216,310`。家长档案 / 成长报告页不调用 practice-results（`src/app/parent/` Grep `/api/parent/practice` 仅命中上述两文件）。
- **教师端消费**：**0 处**。`src/app/teacher/` Grep `practice|Practice|练习|做题|正确率`，命中仅 AI 页文案（`teacher/ai/page.tsx:15,17,39,41`）、资料上传题库类型选项（`teacher/materials/upload/page.tsx:116`）、资料页空态文案（`teacher/materials/page.tsx:201`），无任何练习表读取。
- **管理端消费**：practice-stats 统计页（3a）+ profile-completeness 布尔标记（3a）。
- **转换层**：无档案级聚合。`src/lib/student-profile.ts:21`、`src/lib/student-archive.ts:5` 数据源枚举均不含练习表。
- **关键代码**：
```ts
// src/app/api/admin/profile-completeness/route.ts:59-63,73,83（仅布尔，不带分数/错题）
prisma.practiceAttempt.findMany({
  where: { studentId: { in: studentIds }, finishedAt: { gte: from, lte: to } },
  select: { studentId: true },
  distinct: ['studentId'],
}),
// ...
const hasPractice = practiceStudentIds.has(student.id)
```
- **判定**：部分连通。练习数据在家长自助回看与管理端统计可见；教师端学生档案、成长报告、薄弱点清单均不接入；家长成长档案也不接入。
- **失效现象**：教师跟进学生时看不到刷题量 / 正确率 / 错题分布；管理端统计与教师日常跟进两套视图数据不通。
- **确定性**：[已核实]

### 通路 3d：练习错题 → 薄弱点 / 掌握度回流（孤岛）

- **写方（回流侧）**：**无**。PracticeResult.wrongIds 仅在练习链路内部使用——`src/app/api/parent/practice-results/route.ts:241-246` 读取上次 Result 校验「错题重练」范围，`:270` 合并进度；不晋升 WeaknessRecord、不写 MasteryRecord、不改 PaperQuestion.mastery。
- **读方**：同 2c 薄弱点读方；同 3b 掌握度读方。
- **转换层**：无题库错题→薄弱点映射层；题库题目挂 `setId`（静态数据 id），WeaknessRecord 只认 `paperId`（见 2c schema 片段），两侧键空间不互通。
- **关键代码**：
```ts
// src/app/api/parent/practice-results/route.ts:241-246（wrongIds 仅用于错题重练校验）
const previous = await tx.practiceResult.findFirst({
  where: { studentId: { in: child.recordIds }, setId }, orderBy: { finishedAt: 'desc' },
})
if (grade.mode === 'wrong' && (!previous || questionSnapshot.some((question) => !previous.wrongIds.includes(question.id)))) {
  return { kind: 'invalid' as const, error: '错题记录已经变化...', code: 'WRONG_SCOPE_CHANGED' }
}
```
- **判定**：孤岛。错题只停留在该题组错题重练池，不进入档案薄弱点或掌握度体系。
- **失效现象**：学生反复做错的知识点不会被教师 / 家长在档案中看到；薄弱点清单与练习错题两张皮。
- **确定性**：[已核实]（代码侧无回流写入）；运行时是否存在统计脚本旁路，见第六节。

## 三、孤岛清单（本片范围内）

| # | 表 / 功能 | 谁写 | 有没有下游消费方 | 是不是「设计了但没接」 | 建议（仅记录，不改代码） |
|---|----------|------|----------------|----------------------|------------------------|
| 1 | 课堂答题结果 → WeaknessRecord（2c） | 课堂侧无写方；WeaknessRecord 仅试卷 / 手动路径写 | 薄弱点读方齐全（context、学生档案、试卷统计、报表、PDF），但不接课堂 pick | 部分痕迹：NEEDS_WORK 档位在抽人权重中被消费（`classroom-interaction.ts:70`），说明设计时考虑过答题质量，但未接薄弱点沉淀 | 若业务需要，需补 pick→weakness 桥接，并给 WeaknessRecord 增加 lessonId/来源类型字段；当前 schema 只挂 paperId |
| 2 | MasteryRecord 表（3b 口径②） | **代码侧无写方**；前端两个面板 POST `/api/teacher/mastery`（`students/[id]/client.tsx:486`、`student/[id]/client.tsx:191`）但无对应 route 文件 | 有读方：`teacher/students/[id]/context/route.ts:34-38`；教师面板 GET 同端点（`students/[id]/client.tsx:429`、`student/[id]/client.tsx:107`） | **是，典型设计了没接**：表、读接口、前端录入面板都在，独缺服务端 POST/GET 路由；面板 catch 静默吞掉失败（`.catch(() => {})`），无报错提示 | 需补 `/api/teacher/mastery` GET/POST 路由（鉴权 + 学期归属 + 与 context 读口径对齐）；上线前先确认表内是否已有历史脏数据 |
| 3 | 练习错题 → WeaknessRecord / MasteryRecord（3d） | 练习侧无回流写方 | 薄弱点 / 掌握度读方齐全，但不接题库 wrongIds | 部分痕迹：practice-bank 已维护 wrongIds 与题目快照，错题重练闭环；缺的是晋升到档案体系的一步 | 若业务需要，需建立 setId/questionId→topic/knowledgePoint 映射，并决定错题晋升阈值 |
| 4 | PracticeAttempt / PracticeResult（3a） | 家长提交接口写 | **非孤岛**：家长练习页、题库目录、管理端统计页、完整度布尔均在读 | 否 | 仅建议明确双表口径（Attempt=历史留档，Result=最新进度），避免管理端统计与家长角标被误读为同一指标 |
| 5 | VocabProgress（背单词，边界观察，非本片主通路） | `src/app/api/parent/vocab/session/route.ts:92,103`（update/create） | 仅家长 vocab 模块自读：`src/app/api/parent/vocab/route.ts:40`、`src/app/api/parent/vocab/deck/route.ts:33`；档案 / 报表 / 教师端 0 消费 | 疑似孤岛，待 vocab 分片确认 | 本片不展开；提示背单词进度同样未接入成长档案 |

## 四、需要用户拍板的业务口径问题

1. **课堂答题「需订正」要不要沉淀为薄弱点？**
   - 口径 A（现状）：课堂表现只进互动记录，薄弱点以试卷批改为准 → 档案薄弱点偏保守，但课堂即时反馈不进档案。
   - 口径 B：NEEDS_WORK 按知识点 / 题目标记晋升 WeaknessRecord → 档案更及时，但需定义晋升阈值（几次 NEEDS_WORK 算薄弱）、是否允许教师撤销，以及 WeaknessRecord 表结构是否扩来源类型。
2. **练习错题要不要回流掌握度 / 薄弱点？**
   - 口径 A（现状）：错题只在题库内重练 → 题库闭环干净，不干扰试卷掌握度体系。
   - 口径 B：错题达阈值后晋升档案薄弱点或 MasteryRecord → 需要 questionId→知识点映射与阈值规则；否则两套练习（题库 / 试卷）会重复计薄弱点。
3. **`/api/teacher/mastery` 手动掌握度面板是要落地还是下线？**
   - 现状：面板可点开、保存请求打向不存在的路由，失败被静默 catch。
   - 口径 A：补路由落地（与学期归属、context 读口径对齐）。
   - 口径 B：下线面板，避免教师误以为已保存成功。
4. **参与度汇总是否要进教师端档案 / 管理端报表？**
   - 口径 A（现状）：仅家长端单孩 30 天窗口汇总 → 不做班级横向比较（与 `classroom-interaction.ts:178` 注释一致）。
   - 口径 B：补跨课次累计层 → 需先定累计窗口（本学期 / 近 30 天）与 PARTIAL 是否计入正确。
5. **三套「掌握度」口径在档案页是否合并展示？**
   - 现状：试卷题目档位、教师手动 MasteryRecord、反馈自由文本并列存在，名称都可能叫「掌握度」。
   - 口径 A：保留三套、页面分别标注来源；口径 B：合并为统一等级 → 需要先定义换算规则。

## 五、已确认正常

1. **练习作答落库闭环完整**[已核实]：提交→判分（`practice-bank.ts:98-122`）→事务内 Attempt 留档 + Result 汇总（`practice-results/route.ts:261,271-288`）→断线重试靠 submissionId 幂等（`:228-237`，Serializable 隔离 + P2034 重试 3 次，`:290-295`），不会重复记成绩。
2. **题目快照不可变留档**[已核实]：Attempt 存 `questionSnapshot`（`practice-results/route.ts:258`），题库更新后旧作答按 revision 拦截（`:65-67`），历史回看能还原当时题目（`admin/practice-stats/[studentId]/route.ts:42-66` 回放错题）。
3. **课堂 pick 不碰考勤 / 工资 / 课时**[已核实，引用 A 分片]：pick 4 个写点字段限于互动记录本身；点名与考勤同表同键、提交态 409 gate、点名侧不写 hoursDeducted / 工资，详见 `A-点名写入.md`。
4. **家长端权限边界清晰**[已核实]：家长读 pick / practice 均经 `findParentChild / getParentChildren` 校验孩子归属（`parent/interaction/route.ts`、`parent/practice-results/route.ts:108-112,219-223`）；练习目录按年级匹配拦截（`parent/practice-bank/route.ts:36-38`）。
5. **管理端练习统计口径自洽**[已核实]：列表与个人详情均只读 PracticeAttempt，按学科聚合 + 14 天趋势（`admin/practice-stats/route.ts:72-85`、`[studentId]/route.ts:111-160`），聚合分母分子一致（questions=total 累计，correct=score 累计）。
6. **反馈内练习回复（ClassroomFeedbackPracticeReply）与题库练习是两条独立链路**[已核实]：该表挂 feedbackId（`schema.prisma:1044-1058`），路由 `api/parent/classroom-feedback/[id]/practice-replies/route.ts:33-34` 按 feedbackId+studentId 读；不写 PracticeAttempt/Result，不与题库错题混表。

## 六、未能确认 / 需运行时验证

1. **`/api/teacher/mastery` 运行时返回码**[待验证]：代码侧无该 route 文件已核实；未在运行服务上发 GET/POST 请求确认是 404 还是被其他中间件兜底。建议用只读方式（GET）验证，不做 POST 写库。
2. **旁路脚本 / 定时任务是否写 WeaknessRecord / MasteryRecord / 练习表**[待验证]：本片 Grep 范围为 `src/` 下业务代码；未检查 `scripts/`、根目录工具脚本、数据库触发器。需连库只读核查这三张表是否存在代码外写入来源。
3. **生产库 PracticeAttempt / PracticeResult 实际数据量与空表比例**[待验证]：代码链路连通不等于线上有数据；未跑 SELECT 统计。若表为空，3a 的「连通」在运行时表现仍可能是全空页面。
4. **MasteryRecord 表内是否已有历史数据**[待验证]：读接口 `.catch(() => [])` 静默容错，无法从代码判断表内是否存在早期版本写入的记录；需只读 SELECT 确认。
5. **VocabProgress 是否接入档案**[待验证]：本片仅做边界观察，结论留待背单词专项分片。
6. **家长多孩时 summary=null 的前端表现**[待验证]：`parent/interaction/route.ts:89` 已核实多孩返回 null；前端是否有降级提示，未逐行核对 `parent/interaction/page.tsx` 渲染分支。
