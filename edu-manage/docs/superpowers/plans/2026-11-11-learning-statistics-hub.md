# 学习情况统计中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 将管理端 `/grades` 改为学习统计选择页，保留题库统计并增加单词背诵统计。

**Architecture:** `/grades` 是模块入口，现有题库统计页面迁至 `/grades/practice`，新建 `/grades/vocabulary` 和两个管理员只读 API。背词数据只读 `VocabSession`、`VocabProgress` 与 `VocabWord`，服务端始终按管理员 division 收口。

**Tech Stack:** Next.js App Router 16.4.3、React、TypeScript、Prisma、SWR、Ant Design/Tailwind。

**Spec:** `docs/superpowers/specs/2026-11-11-learning-statistics-hub-design.md`

## Global Constraints

- 不新增 Prisma 模型或数据库迁移。
- 不改动家长端背词流程及记录写入。
- 背词接口只能返回当前管理员 division 的有效学员数据。
- 页面遵循 `DESIGN.md`、`docs/frontend-rules.md`，复用项目导航与全局交互反馈。
- 本批不新增或运行测试。

## Review Focus

- 管理员跨 division 请求学员详情时必须拒绝；实现时核对详情 API 的重复归属校验及历史记录边界。
- 停用、离校学员不能作为当前代表；只有进度没有 session 的身份不计入练习学员数。
- 同一身份跨学期有多条学籍时，需在当前 division 内汇总所有未软删除历史记录；progress 同词重复时以最近更新时间去重。
- 同一学生跨年级、册次练习时，进度需按 `VocabWord` 的年级、册次、单元归类，不能合并同名单元。
- `VocabSession.unit` 可空；核对未指定单元的历史记录仍能正确展示。
- 题库统计原入口和筛选详情必须保留；核对迁移前后路由与导航链接。

---

### Task 1: 迁移旧题库统计页并创建统计中心

**Files:**
- Modify: `src/app/(main)/grades/page.tsx`
- Create: `src/app/(main)/grades/practice/page.tsx`
- Modify: `src/components/Layout/admin-nav.tsx`
- Modify: any in-app links found that are specifically labeled as question-bank/practice statistics

**Interfaces:**
- `/grades` renders two module cards linking to `/grades/practice` and `/grades/vocabulary`.
- `/grades/practice` retains the existing question-bank statistics UI and its `/api/admin/practice-stats` calls.

- [x] Move the existing `/grades` page implementation to `/grades/practice`, fixing relative imports while preserving its filters, list, and student detail behavior.
- [x] Replace `/grades/page.tsx` with a compact module selector for “题库练习” and “背诵情况”, with a short description and room for future modules.
- [x] Rename the admin navigation item to “学习情况统计”; route it to `/grades`.
- [x] Update practice-specific in-app links, including the student archive shortcut, to `/grades/practice`; leave generic learning-statistics links at `/grades`.
- [x] Review route imports and the modified links; run targeted ESLint on the changed UI files (0 errors; 6 warnings: 5 dashboard unused values and 1 student-archive hook dependency warning).

### Task 2: Add division-scoped vocabulary statistics APIs

**Files:**
- Create: `src/app/api/admin/vocab-stats/route.ts`
- Create: `src/app/api/admin/vocab-stats/[studentId]/route.ts`

**Interfaces:**
- `GET /api/admin/vocab-stats?grade=&volume=&q=` returns `{ overview, list }`.
- `GET /api/admin/vocab-stats/[studentId]` returns `{ student, overview, units, sessions }`.
- Both handlers use `requireAdminUser()` and `apiHandler`; responses are private and no-store.

- [x] Build the overview from effective identity representatives in the admin division, aggregate session/history IDs by explicit `identityId`, and join progress through matching `VocabWord` IDs.
- [x] Support optional grade, volume, and student-name filters; count identities with at least one matching session as learners; return session count, deduplicated progress count, mastered count, overall accuracy, and per-student aggregates.
- [x] Build student detail only after verifying the representative is not inactive/left, not deleted, and in the admin division; read same-division identity history; return grade/volume/unit mastered/learning/wrong counts, catalogue unit totals, and ten latest sessions.
- [x] Handle empty student IDs/empty divisions without constructing broad unscoped queries; preserve nullable session unit labels.
- [x] Review query filters, returned fields, and cache headers; run targeted ESLint on both API files (0 errors).

### Task 3: Build the vocabulary statistics page and connect the selector

**Files:**
- Create: `src/app/(main)/grades/vocabulary/page.tsx`
- Modify: `src/app/(main)/grades/page.tsx`

**Interfaces:**
- Overview page consumes `/api/admin/vocab-stats` and opens a selected learner's detail from `/api/admin/vocab-stats/[studentId]`.
- Both child pages provide a clear return link to `/grades`.

- [x] Build a responsive summary, grade/volume/name filters, student list, and loading/empty/error states using existing admin page patterns.
- [x] Add an aligned student detail panel/section with unit progress and recent practice sessions.
- [x] Ensure selector cards navigate to the correct child pages and preserve the future-module card pattern.
- [x] Run targeted ESLint, TypeScript checking, and production build; report exact results: the six feature files pass ESLint with no issues; a broader run including dashboard/student archive has 0 errors and 6 pre-existing warnings; project type-check reports errors in four untouched files; production build stops at Windows `EPERM` while creating a `.next/server/app/api/...` route directory.

## Self-Review

- Spec coverage: selector, route migration, nav label, vocabulary overview/detail, filters, division checks, existing-data reuse, cache control, and empty/error states all have explicit tasks.
- Interface consistency: list and detail endpoint paths/response names are fixed above; page uses the same paths.
- Validation follows repository constraints and avoids adding or running tests.
