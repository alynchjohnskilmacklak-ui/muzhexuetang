# Teacher Lesson Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve teacher attendance course navigation and provide safe read-only previews for the next class.

**Architecture:** Add a pure, Asia/Shanghai-aware lesson navigation helper with unit tests. Reuse the existing active-term attendance endpoint to derive readiness and next-lesson data; update attendance and interaction UI; guard all interaction mutations on the server until lesson start.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Ant Design 5, CSS Modules/global CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-teacher-lesson-navigation.md`

## Global Constraints

- Preserve teacher theme, existing attendance accounting, authorization scopes, and the 2.2-second random-pick animation.
- Reuse existing APIs and dependencies; do not add schema changes or packages.
- Use Asia/Shanghai for lesson dates and times.
- Do not write future classroom events or notify parents before the lesson starts.
- Keep database and production environment unchanged.

## Review Focus

- Regular attendance becomes available exactly 30 minutes before start, while interaction writes remain locked until start.
- Intensive attendance and interaction unlock exactly at the scheduled start.
- A lesson past its end and still unsubmitted is available under backfill, not the current-actionable count.
- Completed, submitted, cancelled, postponed, invalid-time, and out-of-scope lessons must not be mislabeled as actionable/upcoming.
- A future lesson opened by `lessonId` remains preview-only, even when a client bypasses disabled controls and calls the write API directly.

---

### Task 1: Lesson navigation rules

**Files:**
- Create: `src/lib/teacher-lesson-navigation.ts`
- Test: `src/lib/teacher-lesson-navigation.test.ts`

**Interfaces:**
- `getTeacherLessonAttendanceState(lesson, now)` returns `UPCOMING | READY | BACKFILL | DONE | INVALID`.
- `getNextTeacherLesson(lessons, now)` returns the earliest future valid lesson, or `null`.
- `getDefaultTeacherInteractionLesson(lessons, now)` prefers an in-progress lesson, then the nearest upcoming lesson, then the latest unsubmitted lesson.
- `canWriteTeacherInteraction(lesson, now)` is true only at or after scheduled start.
- `groupTeacherLessonsByMonthAndDate(lessons)` returns chronological month/date groups for the UI.

- [x] Write tests for exact attendance-open boundaries, intensive start boundary, end/backfill boundary, done/invalid states, next/default selection, China-local ISO dates, and month/date grouping.
- [x] Run `npx vitest run src/lib/teacher-lesson-navigation.test.ts`; confirm it fails because the module is not implemented.
- [x] Implement the smallest pure helper using the existing scheduling/time-zone utilities.
- [x] Run the focused test; confirm all cases pass.

### Task 2: Server-side future interaction guard

**Files:**
- Modify: `src/app/api/teacher/interaction/route.ts`
- Modify: `src/app/api/teacher/interaction/pick/route.ts`
- Test: `src/lib/teacher-lesson-navigation.test.ts`

**Interfaces:**
- Use `canWriteTeacherInteraction` from Task 1 for roll-call, pick creation, and pick edits. Keep deletion available so a teacher can remove an erroneous pre-existing pick.
- Return HTTP 409 with a clear message while the lesson has not started.

- [x] Add a failing test proving an instant before start is locked and the exact start instant is writable.
- [x] Run the focused test and confirm the expected failure.
- [x] Add guards after teacher/lesson ownership validation and before any database writes or parent notifications; retain own-record deletion as a correction path.
- [x] Run focused tests and ESLint on both route files.

### Task 3: Attendance navigation and next-lesson preview

**Files:**
- Create: `src/components/teacher/NextLessonCard.tsx`
- Create: `src/components/teacher/next-lesson-card.module.css`
- Modify: `src/app/teacher/attendance/page.tsx`
- Modify: `src/app/globals.css`

- [x] Replace the misleading all-unsubmitted count with separate actionable and backfill counts; future lessons are excluded from both until their respective time state applies.
- [x] Add class filtering and month/date disclosure groups while retaining access to every current-term lesson.
- [x] Show the next real lesson when Today has no class, without invented attendance counts.
- [x] Keep the existing schedule/lesson selection and attendance submission rules intact.
- [x] Run TypeScript, focused tests, and ESLint for changed files.

### Task 4: Interaction page preview flow

**Files:**
- Modify: `src/app/teacher/interaction/_components/shell.tsx`
- Modify: `src/app/teacher/interaction/interaction.module.css`
- Modify: `src/lib/classroom-interaction-lesson.ts`

- [x] Load the nearest upcoming lesson from the existing current-term attendance endpoint when there is no lesson today.
- [x] Offer a link to its `lessonId` preview; render future roster/course details read-only until scheduled start.
- [x] Keep today's default selection time-aware and retain lesson switching for today's lessons.
- [x] Preserve timer and active-lesson behavior; keep the 2.2-second server-result animation unchanged.
- [x] Run TypeScript, focused tests, ESLint, then the full Vitest suite.

### Final verification

- [x] Run `npx tsc --noEmit`.
- [x] Run `npx eslint` on all changed TypeScript/TSX files.
- [x] Run `npx vitest run`.
- [x] Attempt production build; it repeatedly failed with Windows `EPERM` while Next.js created dynamic route directories under `.next`, including when using a fresh build directory and one worker. This appears separate from the changed code; TypeScript, ESLint, and tests pass.
