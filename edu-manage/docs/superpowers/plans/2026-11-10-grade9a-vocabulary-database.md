# 九年级上册词库入库 Implementation Plan

> **For agentic workers:** Execute directly in the current workspace; the user explicitly requested the import.

**Goal:** 将用户提供的《人教版》九年级上册（2026 秋版）词汇页 107–116 收录到系统词库。

**Architecture:** 参照现有七、八年级数据文件，新增初三上册教材词表，注册到统一词库；用独立、幂等的 Prisma 导入脚本写入 `VocabWord`。写入前校验数据库只能是本地 loopback 上的 `edu_manage`。

**Tech Stack:** TypeScript、Prisma、PostgreSQL。

**Spec:** 本对话的用户请求与所附词汇页；沿用 `src/data/vocab-sets/grade8a-textbook.ts` 和 `scripts/import-grade8a-vocab.ts` 的字段与导入行为。

## Global Constraints

- 年级 `初三`，册次 `上册`，包含 Unit 1–8 中列出的单词、短语和专有名词。
- 记录课本正文页码及词表页码；音标不可靠时留空，不猜填。
- 按年级、册次、单元、规范化词头幂等写入，不删除其它册词条或学习记录。
- 仅写入 `127.0.0.1:5432/edu_manage`、`localhost:5432/edu_manage` 或 `::1:5432/edu_manage`。
- 不运行测试；以导入器校验、dry-run 和入库后的数据库核对作验证。

## Review Focus

- 词表页跨页续接时，词条仍归到正确单元。
- 图片跨行释义与短语被完整收录，尤其是多词性的词头。
- 多词短语不被误判为专有名词，专有名词也不被标成短语。
- 同单元内规范化词头唯一，ID 稳定且使用 `g9a-` 前缀。
- 导入目标不符或教材数量核对失败时，数据库写入必须停止。

---

### Task 1: 整理并注册教材词表

**Files:**
- Create: `src/data/vocab-sets/grade9a-textbook.ts`
- Modify: `src/data/vocab-sets/index.ts`

**Interfaces:** 导出 `GRADE9A_TEXTBOOK_VOCAB: VocabEntry[]`，并将 `GRADE9A_COMPLETE_VOCAB` 加入 `VOCAB_BANKS`。

- [x] 按图逐项录入词头、词性、释义、课本页码和词表页码；重复义项合并在同一词头记录。
- [x] 用稳定的单元与规范化词头哈希生成 `g9a-` ID；释义按 `；` 拆分，保留词性说明。
- [x] 核对 8 个单元、10 个词表页的来源页范围及词条数量。

### Task 2: 幂等导入本地数据库

**Files:**
- Create: `scripts/import-grade9a-vocab.ts`
- Modify: `package.json`

**Interfaces:** `npm run import:vocab:g9a -- --dry-run` 预览；省略 `--dry-run` 时导入并复核。

- [x] 验证词条字段、ID、单元唯一性与册次；在校验通过后才连接数据库。
- [x] 复用 `parseLocalEduManageTarget`，以 `(grade, volume, unit, normalizedHeadword)` 冲突键 upsert。
- [x] dry-run 确认目标与新增数；随后导入并核对所有源词条、总数以及进度与历史练习未变化。
