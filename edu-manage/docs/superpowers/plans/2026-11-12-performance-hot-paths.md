# Performance Hot Paths Implementation Plan

> For agentic workers: follow the user-approved performance recommendations in this conversation. Preserve existing business behavior and API response shapes.

**Goal:** Reduce unnecessary authenticated API payloads and defer large client modules until they are needed.

**Architecture:** Keep all personal and division-scoped APIs private and uncached. Query the vocabulary database for the selected book and compact book summaries. Split the teacher dashboard chart library and parent learning modules into on-demand chunks, preserving existing chart options and module content.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, ECharts.

**Spec:** User-approved performance review and implementation direction from this conversation; no separate spec file.

## Global Constraints

- Preserve auth checks, division scoping, vocabulary progress semantics, and current module interactions.
- Keep user-specific API responses `private, no-store`.
- Do not stop the active dev server or run a production build.
- Do not add or run tests unless the user asks for verification.
- Defer feedback response pruning and dashboard SQL aggregation until every consumer and time-zone boundary is mapped.

## Review Focus

- Authenticated course data must not be exposed to a shared public cache.
- Selecting “全部” must return all volumes for the selected grade and preserve available-book counts.
- Progress results must include only words in the selected catalog while preserving unit statistics.
- Browsers without `IntersectionObserver` must still initialize charts.
- Deferred modules must retain their existing content and show a stable loading state.

---

### Task 1: Secure cache policy and narrow vocabulary reads

**Files:** `src/app/api/courses/route.ts`, `src/app/api/parent/vocab/route.ts`, `src/app/api/parent/vocab/deck/route.ts`, `src/lib/vocab-catalog.ts`, `src/lib/prisma.ts`, `next.config.ts`

- [x] Make the authenticated course list response `private, no-store` to agree with the global API cache rule.
- [x] Add a compact grouped query for available grade/volume counts.
- [x] Add grade and optional volume filters to the vocabulary catalog query.
- [x] Apply the selected grade/volume and word-ID filters to deck generation and progress reads.
- [x] Restrict the vocabulary progress query to selected word IDs and required fields.
- [x] Give public sticker assets a bounded cache lifetime and add returned-row counts to sampled database timing logs.
- [x] Inspect the changed route implementations and manually compare response fields to the existing contract.

### Task 2: Defer parent learning modules

**Files:** `src/app/parent/vocab/page.tsx`, `src/app/parent/vocab/_components/EnglishHub.tsx`

- [x] Dynamically import verb, grammar, and composition modules with the existing shared card skeleton as the loading state.
- [x] Remove large content-array imports from the always-visible module overview; keep concise descriptive copy.
- [x] Preserve all feature content within its selected module.
- [x] Inspect the import graph and changed source without running tests or a build.

### Task 3: Defer ECharts initialization

**Files:** `src/app/teacher/dashboard/page.tsx`

- [x] Replace the runtime static ECharts import with type-only imports and an on-demand dynamic import.
- [x] Initialize charts when they approach the viewport; use immediate loading when `IntersectionObserver` is unavailable.
- [x] Preserve chart options, dimensions, resize handling, and disposal; show a fixed-size accessible loading/error state.
- [x] Inspect the changed source and run TypeScript/ESLint checks; do not run the production build.
