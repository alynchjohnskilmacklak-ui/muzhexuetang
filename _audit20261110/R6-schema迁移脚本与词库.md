# R6 schema / 迁移 / 脚本 / 词库数据 只读审查（第六轮）

- 仓库：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`
- 取证方式：只读代码审查 + 只读 `information_schema` / `pg_indexes` / `pg_type` 查询（脚本仅 SELECT，位于审计工作区，未入库仓库）
- 未碰：3000 端口 dev（PID 31700）、源码、库、迁移、任何写入脚本均未执行
- 快照对比：抽样核对 `schema.prisma / package.json / import-grade7a-vocab.ts / grade7a.ts` mtime 与快照一致；**但 `src/data/vocab-expansions/` 目录在审计期间被持续改动**（见 §6）

---

## 1. 本片覆盖清单（37 个文件）

| 类别 | 文件 | 变更性质 |
|---|---|---|
| schema | `prisma/schema.prisma`（2137 行，100 model） | 新增 `VocabWord/VocabProgress/VocabSession` 三模型、`MasteryRecord.termId`、Notification 企微推送族列 |
| 迁移 | `prisma/migrations/20261109090000_mastery_record_term_scope/migration.sql`（8 行） | 新增（但未登记） |
| 审计/规范化脚本 | `audit-hour-snapshots.ts`(45)、`backfill-empty-future-lesson-rosters.ts`(130)、`normalize-hours.ts`(102)、`security-check.mjs`(103) | 新增 |
| 词库导入脚本 | `import-grade7a-vocab.ts`(97) / `7b`(143) / `8a`(185) / `8b`(204) / `9a`(185) / `9b`(187) | 新增 |
| 环境脚本 | `init-docker-env.sh`(35) | 新增 |
| 词库数据 | `src/data/vocab-sets/**`（12 个）、`src/data/vocab-expansions/**`（快照内 11 个） | 新增/大改 |
| 依赖 | `package.json`(120) | 微调（新增 6 个 import:vocab 脚本 + audit/backfill/security/normalize 脚本） |

---

## 2. 问题总表

| 严重度 | 文件:行 | 问题 | 影响端 | 证据 | 取证 | 修复建议 |
|---|---|---|---|---|---|---|
| **P1** | `prisma/migrations/**`（全目录 97 个迁移） | `VocabWord` 表**在任何迁移 SQL 中都没有 CREATE TABLE**；`_prisma_migrations` 表在库中**根本不存在**（42P01）。新环境 `migrate deploy` 会缺 `VocabWord` 表与唯一索引 | 部署/新环境 | 对 `migrations/**/*.sql` grep `VocabWord` 0 命中；库 `pg_indexes` 显示唯一索引存在但无迁移来源 | 已用库验证 | 补一个 `CREATE TABLE "VocabWord"…` 的迁移；或在 deploy 前用 `prisma migrate diff --from-empty --to-schema-datamodel` 生成基线并 `migrate resolve --applied` |
| **P1** | `prisma/migrations/**` + 库 | 当前库是 `db push` 建的（无 `_prisma_migrations`），97 个迁移从未登记；在**当前库**跑 `migrate deploy` 会把 97 个迁移从头再演一遍 → 全部 `relation already exists` | 部署 | `SELECT … FROM "_prisma_migrations"` 报 42P01 | 已用库验证 | 选一条路：要么 `db push` 路线并放弃 migrate；要么 `migrate resolve --applied` 登记全部现有迁移后再用 migrate |
| P2 | `scripts/import-grade7a-vocab.ts`、`import-grade7b-vocab.ts` | 这两个脚本**没有 `--dry-run`**，`g8a/g8b/g9a/g9b` 有。行为不一致 | 操作安全 | grep `--dry-run` 仅后 4 个命中 | 代码层 | 给 g7a/g7b 补 dry-run 分支 |
| P2 | `scripts/normalize-hours.ts:79-104` | 三段 for 循环逐行 update，**没有事务**、没有备份；中断会留下半规范化数据 | 管理端课时 | 代码直读 | 代码层 | 包进 `$transaction`，写前导出旧值到日志表/文件 |
| P2 | `prisma/schema.prisma:2343-2358` | `VocabWord.phonetic` 在库中 2973/2973 全空。**不是脚本没写**（`vocab-catalog.ts:81` 写了 `entry.phonetic ?? null`），而是 23 个数据文件中 0 条带 `phonetic:` 字段 | 家长端背词卡片 | 对 `vocab-sets/` grep `phonetic:` 0 命中；对 `vocab-expansions/` grep `"phonetic"` 0 命中；库 `phonetic IS NULL` 2973 | 已用库验证 | 数据侧补音标；g7a.ts 头注释已自述"后续可在此基础上扩充音标" |
| P2 | `src/data/vocab-expansions/grade7b-unit2.json` | 审计期间**新出现**的文件（58 条，mtime 22:16:24），未在快照中、`index.ts` 未 import → 孤儿文件，不加载 | 家长端 g7b 拓展 | grep `grade7b-unit2` 在 src 中 0 引用 | 代码层 | 接入 index.ts 或移入工作目录 |
| P2 | `scripts/security-check.mjs` | 只做**静态正则断言**（proxy/setup/login-accounts/uploads/ai rate-limit/headers/env-security/danger-guard/.env 未被 git 跟踪），**不扫 .env 内容、不扫源码里硬编码密钥**；属回归门禁而非全量扫描 | 安全 | 代码直读 | 代码层 | 可接受，但勿当成全量 secret 扫描器 |
| P2 | `package.json:13` | `db:push` = `prisma db push`（无 `--force-reset`），安全；但与 97 个 migrate 文件并存即漂移根源 | 部署 | 直读 | 代码层 | 同 P1 路线决策 |
| 信息 | `scripts/init-docker-env.sh:10-13,16-18,40` | 已存在 `.env` 则保留退出；口令用 `openssl rand -hex` 随机生成；`chmod 600`；无明文口令 | 部署 | 直读 | 代码层 | 无问题 |
| 信息 | `scripts/audit-hour-snapshots.ts:11-27` | 全程 `findMany` + `console.log`，无任何 update/delete | 管理端 | 直读 | 代码层 | 真只读 |
| 信息 | `scripts/backfill-empty-future-lesson-rosters.ts` | dry-run 默认（无 `--apply` 不写）；`Serializable` 事务 + `createMany skipDuplicates`；候选条件含 `lessonStudents/none`、`attendances/none`、`attendanceSubmittedAt:null`、`hoursDeductedAt:null`、未来日期、group/course 未归档 | 教师端点名 | 直读 + `future-lesson-roster-backfill.ts` 复核 | 代码层 | 幂等安全 |

---

## 3. P1 逐条展开

### P1-1 迁移与库的真实状态（已用只读 SQL 核实）

```text
库中 _prisma_migrations        →  relation does not exist (42P01)
prisma/migrations/ 下迁移目录数 →  97 个
对 97 个 migration.sql grep VocabWord →  0 命中（无建表、无唯一索引）
对 97 个 migration.sql grep VocabProgress/VocabSession →  仅 20261106000000 一个文件
库 pg_indexes 中 VocabWord_grade_volume_unit_normalizedHeadword_key →  存在（由 db push 建）
```

含义：
1. **本机 dev 是 `prisma db push` 路线**。`package.json:6` 的 `predev` 钩子 `scripts/check-local-schema.mjs` 每次启动跑 `prisma migrate diff --from-schema-datasource --to-schema-datamodel --exit-code`，库与 schema 不一致就拒绝启动——这正是当前库列与 schema 1:1 对齐的原因（见 §4 差异表全空）。
2. **但 97 个迁移文件是"历史遗留"，从未被执行登记**。两条后果：
   - 在**当前这个已成型库**上跑 `migrate deploy`：Prisma 发现 `_prisma_migrations` 不存在 → 从第 1 个迁移开始执行 → `CREATE TABLE "User"` 等全部报 `already exists`。
   - 在**空库**上跑 `migrate deploy`：97 个迁移会建出大部分表，但 `VocabWord` 表与唯一索引**不会被建**（没有对应迁移），随后任何家长端背词 API 与 6 个导入脚本的 `ON CONFLICT ("grade","volume","unit","normalizedHeadword")` 都会因缺唯一索引而报错。
3. `20261109090000_mastery_record_term_scope/migration.sql` 8 行（ADD COLUMN termId + 索引 + FK）——库侧已实测列、索引、FK 都在，但同样未登记。

### P1-2 `normalize-hours.ts` 写数据路径（代码层）

```ts
// scripts/normalize-hours.ts:74-104
if (dryRun) { console.log('dry-run 模式未写入…'); return }   // 默认 dry-run，安全
for (const enrollment of enrollmentUpdates) await prisma.enrollment.update(...)
for (const attendance of attendanceUpdates) await prisma.attendance.update(...)
for (const student of studentUpdates) await prisma.student.update(...)
```
- `getNormalizationMode`：无 `--apply` 一律 dry-run；`--apply` 与 `--dry-run` 同传直接抛错。默认安全。
- 只做 `roundHours(x, 8)` 浮点噪声清理（`hours.ts:3` 注释明确 40 分=0.6667 而非 0.7），**不抹平** Student vs Enrollment 的 136/37 人分歧——分歧只 `console.log` 警告（行 70-72），不动数据。
- 风险点：三段循环不在一个事务里；中途失败会留下"已规范化 enrollment、未规范化 attendance"的中间态；无备份。P2。

---

## 4. schema ↔ 库列差异表（已用 information_schema 实测）

脚本：遍历 `schema.prisma` 全部 100 个 model，剔除 `@relation` 标量关系字段与 `Model[]` 反向数组后，与 `information_schema.columns` 比对。

| 方向 | 数量 | 明细 |
|---|---|---|
| A. schema 有 model、库缺表 | **0** | 100 model ↔ 100 base table，完全对齐 |
| B. schema 有列、库缺列 | **0 真漂移** | 仅 4 个误报（`Attendance.makeupRequest` / `LessonSettlementAdjustment.salaryTransaction` / `Teacher.feedbackDraft` / `Teacher.user`），均为无内联 `@relation` 的一对一关系字段，非列 |
| C. 库有表、schema 无 model | **0** | 无孤儿表 |
| D. 库有列、schema 无字段 | **0** | 无漂移列 |

重点模型逐列核对：

| 模型 | schema 列 | 库列 | 结果 |
|---|---|---|---|
| `VocabWord` (2343-2364) | id, grade, volume, unit, section, headword, normalizedHeadword, phonetic?, pos, note?, meanings[], phrase, bookPage?, sourcePage?, createdAt, updatedAt | 同名 16 列 | 一致 |
| `VocabProgress` (2367-2381) | id, studentId, wordId, status, correctCount, wrongCount, lastResult?, lastAt, updatedAt, createdAt | 同名 10 列 | 一致；唯一索引 `(studentId,wordId)` 在库 |
| `VocabSession` (2384-2398) | id, studentId, grade, volume, unit?, total, correct, wrongIds[], answers?, finishedAt, createdAt | 同名 11 列 | 一致 |
| `MasteryRecord` (2281-2293) | id, studentId, teacherId, **termId?**, knowledgePoint, level, note?, createdAt | 库已含 `termId` + 复合索引 | 一致（迁移已落地但未登记） |
| `Notification` (818-857) | userId, title, content, type, link, relatedType, relatedId, href, **read, readAt, status, studentId?, senderId?, pushStatus, pushError, attempts, lastError, qywxMsgId, qywxExternalUserId, qywxSenderUserId, qywxProcessingAt, sentAt, createdAt, deletedAt, deletionBatchId** | 同名 26 列 | 一致（题目点的 `read/readAt/studentId/pushStatus` 全在） |

**结论：本机 dev 库与 schema 当前零漂移**（P2022 当下不会触发）；但这是 `db push` + predev 强校验的结果，**不是迁移的结果**——见 P1。

---

## 5. 23 个词库文件 → 行数/条数 → 库内对照表

### 5.1 vocab-sets（12 个）

| 文件 | 源文件条目数 | 导入目标（grade/volume） | 库内行数 | 差额 |
|---|---|---|---|---|
| `grade7a.ts`（核心 203 条） + `grade7a-textbook.ts`（428 条元组） merge 去重 | 203+428=631 → merge 后 **629** | 初一/上册 | **629** | 0（mergeVocabCatalog 合并 2 条同 headword 多义词） |
| `grade7b-textbook.ts`（461 元组） | 461 | 初一/下册 | **461** | 0（脚本硬校验 `length !== 461` 即抛错） |
| `grade8a-textbook.ts`（549 元组） | 549 | 初二/上册 | **549** | 0（脚本 EXPECTED_TOTAL=549 + 逐单元/逐页计数硬校验） |
| `grade8b-textbook.ts`（603 元组） | 603 | 初二/下册 | **603** | 0 |
| `grade9a-textbook.ts`（484 元组） | 484 | 初三/上册 | **484** | 0 |
| `grade9b-textbook.ts`（247 元组） | 247 | 初三/下册 | **247** | 0（仅 5 单元，教材未编完） |
| `grade7a-textbook.test.ts` / `grade7b-textbook.test.ts` / `grade8a-textbook.test.ts` / `grade8b-textbook.test.ts` | 测试文件 | 不入库 | — | — |
| `index.ts` | 注册表（merge 六册） | 不入库 | — | — |

**合计库内 `VocabWord` = 629+461+549+603+484+247 = 2973，与题目给的 2973 完全一致。**

库内单元分布（抽样）：
- 七上：Starter1=59 / Starter2=57 / Starter3=47 / U1=75 / U2=72 / U3=56 / U4=49 / U5=41 / U6=42 / U7=52 / 参考·基数词=30 / 序数词=30 / 星期=7 / 月份=12
- 七下 U1..U8 = 48/58/55/58/64/62/50/66
- 八上 U1..U8 = 76/62/74/70/68/59/69/71（与 `import-grade8a-vocab.ts:9-16` 硬编码 EXPECTED_UNIT_COUNTS 完全一致）
- 八下 U1..U8 = 59/87/81/82/73/72/89/60（与 `import-grade8b-vocab.ts:9-16` 一致）
- 九上 U1..U8 = 55/73/54/64/76/44/61/57（与 `import-grade9a-vocab.ts:9-17` 一致）
- 九下 U1..U5 = 54/59/55/34/45

### 5.2 vocab-expansions（快照内 11 个；磁盘上另有审计期间新增文件）

| 文件 | 条目数 | 用途 | 是否入库 |
|---|---|---|---|
| `grade7a-starter-unit1.json` | 59 | 七上 Starter1 拓展（例句/搭配/易错/考法） | 否，内存加载 |
| `grade7a-starter-unit2.json` | 57 | 同上 | 否 |
| `grade7a-starter-unit3.json` | 47 | 同上 | 否 |
| `grade7a-unit1.json` | 75 | 七上 Unit1 拓展 | 否 |
| `grade7a-unit2.json` | 72 | | 否 |
| `grade7a-unit3.json` | 56 | | 否 |
| `grade7a-unit4.json` | 49 | | 否 |
| `grade7a-unit5.json` | 41 | | 否 |
| `grade7a-unit6.json` | 42 | | 否 |
| `grade7a-unit7.json` | 52 | | 否 |
| `index.ts` | 注册表 | 按 `grade×volume×unit×lower(headword)` 索引，由 `getVocabExpansion()` 在家长端 deck API 返回 | 否 |

七上 10 个主单元 JSON 条目数（59+57+47+75+72+56+49+41+42+52 = **550**）与库内七上主单元合计（629 − 参考词表 79 = 550）**逐单元一一对应**，覆盖率 100%。

**审计期间磁盘新出现（不在快照内）**：
- `grade7a-reference-cardinal.json`(30) / `ordinal.json`(30) / `weekdays.json`(7) / `months.json`(12) —— 已被 `index.ts:11-14,82-105` 接入，对应库内参考词表 79 条；
- `grade7b-unit2.json`(58) —— **未被 index.ts 引用**，孤儿 WIP 文件；
- `index.ts` mtime 由快照 21:44:51 → 磁盘 22:04:54；`unit3/4/5/6/7.json` mtime 由 21:34-21:50 → 磁盘 21:51:04。

### 5.3 数据结构对齐

- `VocabEntry`（grade7a.ts:3-19）：`id/grade/volume/unit/section/headword/phonetic?/pos/note?/meanings[]/phrase?/bookPage?/sourcePage?` —— 与 `VocabWord` 列一一对应。
- 教材文件采用 `[headword, pos, meanings, note?]` 元组数组 + `PAGE_GROUPS{unit, sourcePage, bookPage, words}`，由文件尾部映射为 `VocabEntry`（`grade/volume` 在 import 脚本里硬编码校验，如 `import-grade9a-vocab.ts:45` 强制 `grade==='初三' && volume==='上册'`、行 46 强制 id 前缀 `g9a-`）。
- `meanings` 为 `String[]`，库侧 0 空义项（已实测）。
- 唯一键 `(grade, volume, unit, normalizedHeadword)`：库内重复 0 条（`GROUP BY … HAVING COUNT(*)>1` = 0 行）。
- `phonetic`：源文件 0 条带音标，库侧 2973/2973 空 —— 数据缺口，非脚本 bug。
- `phrase=true` 库侧 401 条；`bookPage` 填 2693、`sourcePage` 填 2772（参考词表类无页码）。

---

## 6. 脚本专项结论（对应题目 4/5/6/7/10）

### 6.1 6 个 vocab 导入脚本
- **幂等**：全部 `INSERT … ON CONFLICT ("grade","volume","unit","normalizedHeadword") DO UPDATE`（`g7a:54`、`g7b:76`、`g8a:120`、`g8b:125`、`g9a:119`、`g9b:119`），重跑不插重复行；冲突时 `phonetic/bookPage/sourcePage` 用 `COALESCE(EXCLUDED, 旧值)` 不抹已有数据。
- **目标库护栏**：`parseLocalEduManageTarget`（`vocab-database-target.ts:25`）强制 `127.0.0.1:5432/edu_manage`，否则抛错；脚本还二次 `SELECT current_database()` 比对。
- **事务**：单 `$transaction`（g7a 行 42-67，g7b 行 64-89），throw 即回滚。
- **dry-run**：g8a/g8b/g9a/g9b 支持 `--dry-run`（行 89-100 附近），g7a/g7b **没有**。
- **无清空/重灌**：全脚本无 `TRUNCATE`/`DELETE FROM`。
- **写后复核**：g7b 导入后断言"七上数量不变 / VocabProgress 不变 / VocabSession 不变"；g8+ 逐行比对 unit/headword/pos/meanings/phrase/bookPage/sourcePage。
- **grade/volume/unit 来源**：不是从文件名硬编码，而是**在数据条目自身**（每条都带），import 脚本只做断言校验。

### 6.2 `backfill-empty-future-lesson-rosters.ts`
- 默认 dry-run；`--apply` 才写。
- 候选条件极严：未来课、`SCHEDULED`、`attendanceSubmittedAt:null`、`hoursDeductedAt:null`、`lessonStudents/none`、`attendances/none`、group 未归档、course 活跃、enrollment `ACTIVE` 且学生非 INACTIVE、且 `enrollmentIncludesSubject` 匹配本课科目。
- 应用时在 `Serializable` 事务内重新查询候选（行 87-90），`createMany skipDuplicates: true`（行 96-99）。
- **不会**碰已提交考勤的课（条件已排除）；**不会**给不该加的人加（科目匹配过滤）；**幂等**（唯一约束 + skipDuplicates）。

### 6.3 `normalize-hours.ts`
- 只做 8 位小数浮点清理，**不**抹平 Student vs Enrollment 的 136/37 人分歧（仅打印警告）。
- 默认 dry-run；`--apply` 才写；三段循环无事务、无备份（P2）。

### 6.4 `audit-hour-snapshots.ts`
- 真只读：仅 `findMany`（学生 + 报名嵌套）+ `auditHourSnapshots()` 纯函数比对；无任何写操作。
- tolerance 0.0001；输出 `checkedCount/mismatchCount/remainMismatchCount/totalMismatchCount/mismatches[]`。

### 6.5 `security-check.mjs`
- 24 条静态断言：proxy 401、setup 生产 404/setup token、`login-accounts.ts` 硬编码管理员密码（`ren031213` / `mashaoKun`）已移除、teacher 拼音登录已移除、bcrypt `$2` 前缀、uploads 鉴权与路径穿越防护、ai 限流 429、安全头、生产环境 env 校验、danger 恢复口令服务端控制、`.env`/`dev.db` 未被 git 跟踪。
- 密码字符串在 checker 自身用 `String.fromCharCode` 拼接，不入库日志。
- 不扫 `.env` 内容、不扫全源码硬编码密钥——是回归门禁，不是全量 secret 扫描。

### 6.6 `init-docker-env.sh`
- 已有 `.env` 直接保留退出（行 10-13）；否则 `openssl rand -hex 24/32/32` 随机生成 `POSTGRES_PASSWORD/NEXTAUTH_SECRET/AUTH_SECRET/CRON_SECRET`，`umask 077` + `chmod 600`。
- 无明文口令；不覆盖既有配置。

### 6.7 `package.json`
- `prisma ^5.22.0` ↔ `@prisma/client ^5.22.0` 版本对齐。
- 新增 npm scripts 全是 `tsx scripts/import-*-vocab.ts` / `audit:*` / `backfill:*` / `normalize:hours` / `security:check`；**无** `db push --force-reset` / `migrate reset` 类危险命令。
- `predev` 钩子 = `check-local-schema.mjs`：仅允许 loopback 库，跑 `migrate diff`，漂移即拒启动。
- 未引入新重型依赖（词库脚本只用已有 `tsx`/`@prisma/client`）。

---

## 7. 连通性复核（四档）

| 写入点 | 读点 | 判定 |
|---|---|---|
| 6 个 import 脚本 → `VocabWord` | `vocab-catalog.ts:loadVocabEntries` 读库 → `parent/vocab/deck` API → 家长端背词卡片 | **真连通**（库内 2973 行已就位，VocabProgress 32 行 / VocabSession 4 行 / 仅 1 名学生 = 家长端已有人在学） |
| expansions JSON → `getVocabExpansion` | `parent/vocab/deck/route.ts:81` 按 headword 查拓展 | **真连通**（七上 10 单元覆盖率 100%）；七下仅 `grade7b-unit2.json` WIP 未接 = **部分连通** |
| `MasteryRecord.termId` | 上游写点在 R3/R4 分片，本片未审 | 列已就位，但 0 行数据 |
| `Notification` 企微推送族列 | 上游写点在 R3/R4 | 列已就位，本片不判 |
| `normalize-hours.ts`（dry-run 默认） | 当前无运行调用方 | 待命工具，不连业务 |
| `backfill:future-rosters` | 教师端点名页 `/attendance` 读 `ClassLessonStudent` | 脚本未 `--apply` 跑过 → **写了不读/未触发**，需人工 dry-run 确认 |

## 8. 前轮结论失效清单

- 前五轮报告若写"库缺 `MasteryRecord.termId`"——**现已不成立**：列、索引、FK 均在（但 `_prisma_migrations` 仍空，迁移未登记的结论仍成立）。
- 前五轮若写"Vocab* 新模型无迁移"——**部分失效**：`VocabProgress/VocabSession` 已有迁移 `20261106000000`；但 `VocabWord` 仍无迁移。

## 9. 未覆盖与需运行时验证

1. **未读** `scripts/migrate-all.sh` / `db-sync-all.sh`（不在本片文件域）——生产 deploy 究竟走 migrate 还是 db push，需在部署分片确认。
2. **未跑** 6 个 import 脚本、未 `--apply` backfill、未跑 normalize-hours（遵守只读约束）。
3. **审计期间 expansions 目录被持续写入**（21:51 → 22:16），如最终交付前再复核，应重对 mtime。
4. 九下 `grade9b-textbook.ts` 只有 5 单元 247 条——是否后续补完，需业务侧确认。
5. `redis ^6.2.1` 大版本跳跃是否引入运行时行为变化，不在本片范围。
