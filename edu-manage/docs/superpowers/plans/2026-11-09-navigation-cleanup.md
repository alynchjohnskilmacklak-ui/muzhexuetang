# Navigation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four teacher/admin/parent navigation defects without changing business behavior or visual themes.

**Architecture:** Keep the existing teacher and admin navigation owners. Move the teacher homework route into the teacher route tree, make `/teacher/schedule` canonical with a redirect alias, add the admin logs item to shared admin navigation, and remove the redundant parent archive-hours item.

**Tech Stack:** Next.js App Router, TypeScript, React, Vitest, Ant Design navigation config.

**Spec:** `docs/superpowers/specs/2026-11-09-navigation-cleanup-design.md`

## Global Constraints

- Preserve teacher authorization through `requireTeacherPage` and the teacher route layout.
- Preserve `/teacher/homework` and `/teacher/teaching-schedule` as reachable URLs.
- Do not add `/teacher-compliance` or `/parent/interaction` as top-level navigation items.
- Keep current labels, colors, themes, and business behavior outside the listed navigation changes.

## Review Focus

- Teacher homework must resolve inside the teacher route tree — test that its route page exists at `src/app/teacher/homework/page.tsx`; verify the existing `requireTeacherPage` call remains in the moved page.
- The old schedule URL must not strand existing links — test that the legacy page redirects to the canonical URL.
- Admin alert badge logic depends on an exact `/teacher-logs` key — test that shared admin navigation contains that key and does not add the parameterized detail route.
- Parent archive remains reachable after removing the duplicate hours item — render the parent navigation shell and verify `成长档案` remains while `课时与考勤` is absent.

---

### Task 1: Teacher route and schedule canonicalization

**Files:**
- Move: `src/app/(main)/teacher/homework/page.tsx` → `src/app/teacher/homework/page.tsx`
- Move: `src/app/(main)/teacher/homework/client.tsx` → `src/app/teacher/homework/client.tsx`
- Modify: `src/app/teacher/teaching-schedule/page.tsx`
- Modify: teacher schedule links in `src/components/Layout/TeacherLayout.tsx`, `src/app/teacher/ai/page.tsx`, `src/app/teacher/dashboard/page.tsx`, `src/app/teacher/today-lessons/page.tsx`, `src/components/AI/AssistantBriefing.tsx`, and `src/lib/teacher-dashboard.ts`
- Test: `src/app/teacher/homework/route.test.ts`, `src/app/teacher/teaching-schedule/page.test.ts`

- [x] Write route-location and legacy-redirect tests first.
- [x] Run those tests and confirm they fail because the page is under `(main)` and the legacy page does not redirect.
- [x] Move the homework page and client without changing their contents or URL; replace the legacy schedule page with `redirect('/teacher/schedule')`.
- [x] Update internal schedule links to the canonical path.
- [x] Run the focused tests, TypeScript check, and ESLint for changed files.

### Task 2: Admin teacher-log navigation

**Files:**
- Modify: `src/components/Layout/admin-nav.tsx`
- Test: `src/components/Layout/admin-nav.test.tsx`

- [x] Add a regression test that flattens `adminNavItems` and requires `/teacher-logs` while rejecting `/teacher-compliance`.
- [x] Run the test and confirm it fails because `/teacher-logs` is absent.
- [x] Add `/teacher-logs` under the existing teacher-management group, matching the key consumed by `Sidebar`'s alert badge.
- [x] Run the focused test, TypeScript check, and ESLint for changed files.

### Task 3: Remove duplicate parent archive menu item

**Files:**
- Modify: `src/components/Layout/ParentLayout.tsx`
- Test: `src/components/Layout/ParentLayout.navigation.test.tsx`

- [x] Add a focused server-render test for the actual parent navigation output: `成长档案` remains available and `课时与考勤` is absent.
- [x] Run the test and confirm it fails with the existing menu item.
- [x] Remove `/parent/archive?tab=hours` and its now-unused icon import; keep the archive page and its recognized tabs unchanged.
- [x] Run the focused test, TypeScript check, and ESLint for changed files.

### Final verification

- [x] Run the full Vitest suite: 286 test files and 1194 tests passed.
- [x] Run `npm run type-check`.
- [x] Run ESLint on every changed TypeScript/TSX file.
- [x] Review changed navigation files and route references; themes, role guards, and business behavior remain unchanged.

## Verification note

`next typegen` completed successfully. `npm run build` was attempted with both the existing `.next` output and a fresh isolated `distDir`; both attempts stopped on Windows `EPERM` while creating generated server route directories. The isolated partial output was removed; the existing `.next` directory was left untouched.
