# Parent WeCom Notification Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make parent notification creation, WeCom manual confirmation, and connection checks clear and safe.

**Architecture:** Keep the existing per-family digest and one-task-per-parent-per-day behavior. Resolve all external links through a public-origin helper, preserve notification error details, and add a test-only mass-task path restricted to an admin and a configured test contact.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Prisma, Ant Design, WeCom Customer Contact API.

**Spec:** User-authorized recommendations in the conversation; project rules in `AGENTS.md`, `DESIGN.md`, `docs/frontend-rules.md`, and `docs/production-safety.md`.

## Global Constraints

- Never send a message to an ordinary parent from the test path.
- The test path creates a WeCom pending task only; a staff member must confirm it in WeCom.
- Do not invoke the test path during implementation or verification.
- Keep personalized family digests isolated to the linked parent and children.
- Preserve existing notification and WeCom task data; do not run database changes.
- Do not add or run tests in this task.

## Review Focus

- A localhost or malformed origin must never appear in a WeCom card link.
- The family digest must link to the parent dashboard, not just one feedback item.
- Test mass sends must require admin role, dedicated sender, and a verified dedicated contact.
- Queued, pending-confirmation, and confirmed-sent labels must not claim immediate delivery or read status.
- Missing-binding and retry errors must remain visible after the notification record is created.

### Task 1: Public links and family digest

**Files:** `src/lib/public-origin.ts`, `src/lib/daily-digest.ts`

- [x] Add a server-side configured public-origin resolver that rejects local hosts and uses the canonical HTTPS origin as fallback.
- [x] Make the parent digest link to the complete parent dashboard, preserving the single-child filter when applicable.

### Task 2: Safe, dedicated WeCom mass-task connectivity path

**Files:** `src/app/api/qywx/test-send/route.ts`, `.env.example`, `docs/production-safety.md`

- [x] Add `parent-mass` test mode that only admins can use.
- [x] Require dedicated test sender/contact variables, verify contact membership, WeCom contact type, and that the contact is not bound to a parent in either division.
- [x] Return task status without exposing the contact identifier; document that confirmation remains manual.

### Task 3: Notification wording and persisted outcomes

**Files:** `src/lib/notifications.ts`, `src/app/api/notifications/route.ts`, `src/app/api/notifications/[id]/resend/route.ts`, `src/app/api/cron/retry-notifications/route.ts`, `src/lib/wxpusher.ts`, `src/components/CommunicationCenter/NotificationsTab.tsx`

- [x] Persist initial queue and binding errors and use neutral wording for safe-home reminders.
- [x] Update the admin UI to distinguish queued tasks, pending manual confirmation, and confirmed-sent notification records.
- [x] Add an explicit admin-only UI action to create the dedicated test task, with an adjacent confirmation that explains its effect.

### Task 4: Review and verification

**Files:** changed files above

- [x] Review changed files for privacy leaks and confirm that the test path never returns the configured external contact ID.
- [x] Run targeted TypeScript and ESLint checks only; no WeCom endpoint or test was run.

**Verification note:** `rtk git diff --check` and its direct Git retry could not resolve the repository root because it is outside the writable workspace. TypeScript and targeted ESLint checks completed successfully.
