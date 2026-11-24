# Three-client Navigation IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize all three client menus so related functions are easier to find without changing their pages or permissions.

**Architecture:** Keep existing route destinations and shared layout shells. Change each role's navigation tree, expose admin services from a dashboard card, and retain the parent's existing dashboard shortcut.

**Tech Stack:** Next.js App Router, TypeScript, React, Ant Design, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-three-client-navigation-ia-design.md`

## Global Constraints

- Preserve all business routes, role access, unread badges, and admin/teacher/parent data boundaries.
- Keep teacher and parent bottom tabs unchanged.
- Do not add dependencies or new hub pages.
- Keep the existing warm-light design and role themes.

## Review Focus

- Removing service overview from menus must not orphan it — verify the admin dashboard card links to `/services` and the parent quick action still links to `/parent/services`.
- Moving menu items must not break route selection or badges — test that the same destination keys remain under the intended groups.
- Teachers must still reach all nine former teaching-work functions — test each route under its new group.
- Grade/division gating and bottom-tab configuration must remain untouched — review the changed client layouts and run type/lint checks.

---

### Task 1: Admin menu and dashboard service card

**Files:**
- Modify: `src/components/Layout/admin-nav.tsx`
- Modify: `src/app/(main)/dashboard/page.tsx`
- Create: `src/components/Dashboard/AdminServiceOverviewCard.tsx`
- Test: `src/components/Layout/admin-nav.test.tsx`
- Test: `src/components/Dashboard/AdminServiceOverviewCard.test.tsx`

- [x] Add failing tests for admin group labels, route group membership, absence of `/services` in the menu, and service-card link.
- [x] Run the tests and confirm the expected current-menu/card failures.
- [x] Rename admin groups, move bulk lesson upload to teaching resources, remove `/services` from the menu, and render the service card on both desktop and mobile dashboards.
- [x] Run focused tests, TypeScript, and ESLint for changed files.

### Task 2: Teacher menu grouping

**Files:**
- Modify: `src/components/Layout/TeacherLayout.tsx`
- Test: `src/components/Layout/TeacherLayout.navigation.test.tsx`

- [x] Add a failing render test for the intended classroom, homework/class, and student/family groups and their route members.
- [x] Run the test and confirm the existing nine-link teaching group does not match the target structure.
- [x] Reassign the existing menu items to the approved groups while preserving badges and bottom tabs.
- [x] Run the focused test, TypeScript, and ESLint for the changed layout.

### Task 3: Parent menu grouping

**Files:**
- Modify: `src/components/Layout/ParentLayout.tsx`
- Test: `src/components/Layout/ParentLayout.navigation.test.tsx`

- [x] Extend the parent navigation render test to require the approved group labels, remove `/parent/services` from navigation, and retain the archive and child-learning routes.
- [x] Run the test and confirm it fails against the current menu.
- [x] Rename the account group, remove the service-overview menu item, and preserve the existing dashboard quick action and bottom tabs.
- [x] Run the focused test, TypeScript, and ESLint for the changed layout.

### Final verification

- [x] Run the full Vitest suite — 288 files and 1,198 tests passed.
- [x] Run `npm run type-check` — passed.
- [x] Run ESLint on all changed TypeScript/TSX files — 0 errors; 5 existing unused-variable warnings remain in the admin dashboard page.
- [x] Review route links, permissions, badges, division gating, and bottom tabs against the spec.
