# Parent Feedback and Lesson Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make parent feedback detail use the logged-in parent's read receipt and make lesson details display the latest parent-visible lesson data.

**Architecture:** Keep per-parent feedback receipts as the canonical read state. Pass lesson IDs from schedule entry points, then load the lesson server-side through the existing parent-visible active-enrollment filter; preserve query-parameter fallback for legacy links.

**Tech Stack:** Next.js 16 App Router, Prisma, React, Vitest.

**Spec:** User-approved findings from the parent-side audit review in this conversation.

## Global Constraints

- Preserve parent/child access checks; an unowned lesson ID must not reveal lesson data.
- Preserve evaluation privacy: parent satisfaction, reasons, and review details stay admin-only.
- Do not alter business data or database schema.
- Keep old parent lesson-detail URLs working as a compatibility fallback.

## Review Focus

- A stale shared legacy read timestamp must not override the current parent's receipt.
- A parent must not load another family's lesson by changing `lessonId`.
- A lesson with no classroom feedback must still display current schedule details.
- Old lesson-detail links without `lessonId` must retain their existing behavior.

---

### Task 1: Parent feedback detail read state

**Files:**
- Modify: `src/lib/classroom-feedback/read-state.ts`
- Modify: `src/app/parent/class-feedback/[id]/page.tsx`
- Test: `src/lib/classroom-feedback/read-state.test.ts`

- [x] Add a failing test proving detail read-state projection uses this parent's receipt and ignores legacy shared state.
- [x] Run the focused test and confirm the intended failure.
- [x] Pass the receipt into the detail page's projected feedback state.
- [x] Run the focused test and confirm it passes.

### Task 2: Parent lesson details use current lesson data

**Files:**
- Modify: `src/lib/business-visibility.ts`
- Modify: `src/app/parent/lesson-detail/page.tsx`
- Modify: `src/app/parent/schedule/client.tsx`
- Modify: `src/components/Parent/ParentTodayPanel.tsx`
- Test: `src/lib/business-visibility.test.ts`

- [x] Add failing tests for selected-child enrollment scoping in the parent lesson visibility filter.
- [x] Run the focused test and confirm the intended failure.
- [x] Add `lessonId` to schedule and home-panel links.
- [x] Load the current lesson by ID and parent visibility; derive course, teacher, date, time, and room from that record.
- [x] Keep legacy query-parameter behavior when no lesson ID is supplied.
- [x] Run focused tests, type-check, and lint for changed files.

### Task 3: Regression verification

- [x] Run both focused test files.
- [x] Run `npm run type-check`.
- [x] Run ESLint on changed TypeScript/TSX files.
- [x] Review the implementation and preserve all unrelated existing worktree changes.
