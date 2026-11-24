# 七年级上册背词库入库实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把教材图片里的全部七年级上册词汇写入本地数据库，并让家长端背词 API 使用数据库词库。

**Architecture:** 新增 `VocabWord` 表并保留现有词条 ID；教材内容放在可审查的结构化词表文件中。幂等导入脚本合并现有 202 条词与教材条目，API 统一从数据库加载词条；进度、作答记录继续写入既有表。

**Tech Stack:** Next.js 16.4.3 Route Handlers、Prisma 5.22.0、PostgreSQL、TypeScript、Vitest。

**Spec:** `docs/superpowers/specs/2026-11-10-grade7-vocabulary-database.md`

## Global Constraints

- 只允许导入到本机 loopback 的 `edu_manage` 数据库。
- 不删除既有词条，不改学生学习进度和练习历史。
- 旧静态词条 ID 必须保持不变。
- 重复运行导入脚本必须幂等。
- 不增加依赖，不改家长端 UI。

## Review Focus

- 教材中同一词头在不同单元出现：每个单元保留独立词条与进度。
- 同一词头在一个单元有多个词性/释义：合并时不得漏掉任一项。
- 词形变化和括号说明：保存为可读备注，不被误认为新单元。
- 数据库离线或连接串非本机：导入必须安全失败，不能写错环境。
- 已有 `VocabProgress.wordId`：旧词条 ID 不变，旧记录仍能映射。

---

### Task 1: 建立词表与合并规则测试

**Files:**
- Create: `src/data/vocab-sets/grade7a-textbook.test.ts`
- Create: `src/lib/vocab-catalog.test.ts`
- Test: above files

- [x] Write failing tests for unit coverage, data completeness, required fields, duplicate detection, ID preservation, and multi-meaning merges.
- [x] Run targeted tests and confirm they fail before implementing the catalog and merge helper.

### Task 2: 整理教材词表并实现稳定合并

**Files:**
- Create: `src/data/vocab-sets/grade7a-textbook.ts`
- Create: `src/lib/vocab-catalog.ts`
- Test: `src/data/vocab-sets/grade7a-textbook.test.ts`, `src/lib/vocab-catalog.test.ts`

- [x] Transcribe all listed words from the nine supplied pages into unit/page/headword/POS/note/meanings records; pronunciation remains optional and was not guessed.
- [x] Implement deterministic IDs and same-unit duplicate merging while preserving legacy IDs and all meanings.
- [x] Run the tests and review totals by unit and section (428 textbook rows; merged catalog 629 rows).

### Task 3: Add the database model and idempotent importer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/import-grade7a-vocab.ts`
- Modify: `package.json`

- [x] Add the word table and compound uniqueness constraint.
- [x] Add an importer that requires `DATABASE_URL` to point to loopback `edu_manage`, combines existing and textbook entries, and performs upserts without deleting rows.
- [x] Validate the schema and type-check the importer. Prisma Client regeneration hit Windows `EPERM`; the implementation uses the existing generated client's parameterized raw SQL APIs and schema sync used `--skip-generate`.

### Task 4: Switch parent vocabulary APIs to the database catalog

**Files:**
- Modify: `src/app/api/parent/vocab/route.ts`
- Modify: `src/app/api/parent/vocab/deck/route.ts`
- Modify: `src/app/api/parent/vocab/session/route.ts`
- Test: vocabulary helper and API tests

- [x] Read catalog entries from Prisma in listing, deck building, and answer grading.
- [x] Keep student authorization, progress filtering, statuses, and session recording behavior unchanged.
- [x] Run focused tests and TypeScript checks.

### Task 5: Import and verify local data

**Files:**
- No additional source files

- [x] Confirm local PostgreSQL is reachable and the target database is `edu_manage`.
- [x] Apply the additive schema change with the repository's supported `db:push` workflow.
- [x] Run the idempotent importer twice.
- [x] Verify row totals, unit totals, duplicate count, sentinel headwords, and old progress ID compatibility; read through the same database helper used by parent APIs.
- [x] Run focused and full test suites; report the full-repository lint caveat separately from changed-file lint.
