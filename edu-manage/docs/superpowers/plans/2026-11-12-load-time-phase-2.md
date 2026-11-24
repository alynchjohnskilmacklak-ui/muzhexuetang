# Load Time Optimization Phase 2 Implementation Plan

> **For agentic workers:** Follow this plan in order. Preserve original images and existing API semantics.

**Goal:** Reduce image bytes and avoid unnecessary global CSS and database row transfer on frequently used pages.

**Architecture:** Serve lossless WebP variants for large static practice images while preserving PNG originals. Replace the raw full-resolution logo at display sites with a small preoptimized WebP. Move KaTeX CSS to math-using modules, narrow feedback relation selection, and aggregate dashboard lesson hours in SQL.

**Tech Stack:** Next.js 16.4.3, React 19, Prisma 5, PostgreSQL, Pillow for lossless image conversion.

**Spec:** `docs/superpowers/specs/2026-11-12-load-time-phase-2-design.md`

## Global Constraints

- Do not delete or overwrite source images.
- Do not change feedback authorization, question content, answer semantics, or API fields used by current clients.
- Do not run tests or a production build; preserve the running dev server.

## Review Focus

- Every changed practice `imageUrl` resolves to an actual lossless WebP; original PNGs remain unchanged.
- CSS-only watermarks use a small asset and do not request the full logo PNG.
- Feedback teacher access still has `classLesson.teacherId` available.
- SQL dashboard totals match the existing `lessonMinutes`/time-range calculation and keep every scope predicate.

---

### Task 1: Create small logo and lossless practice WebP assets

**Files:** `public/images/logo-small-128.webp`, `public/images/practice/**/*.webp`, related `src/data/practice-sets/*.ts` paths, `src/app/globals.css`, logo display components.

- [x] Generate 128×128 logo WebP and only the 19 measured practice WebPs with at least 20% size reduction.
- [x] Keep all PNG sources unchanged.
- [x] Update only `imageUrl` values (not source citations) for converted practice images.
- [x] Update direct logo and CSS watermark references to the small WebP.
- [x] Record source/output byte totals and visually inspect representative text-heavy and logo assets.

### Task 2: Scope KaTeX styles to math UI

**Files:** `src/app/layout.tsx`, `src/components/AI/AIChatPanel.tsx`, `src/app/parent/materials/MathText.tsx`.

- [x] Remove the KaTeX CSS import from root layout.
- [x] Import it in `AIChatPanel` and retain the existing `MathText` local import.
- [x] Confirm only math-using routes/components retain KaTeX stylesheet references.

### Task 3: Narrow feedback relation payload

**Files:** `src/app/api/feedback/route.ts`.

- [x] Replace `classLesson.include` with an explicit relation select containing identifiers, access-check teacher ID, date/time/subject, group name, and course name/subject/type.
- [x] Preserve feedback scalar fields, auth filters, and response keys currently read by clients.

### Task 4: Aggregate dashboard lesson hours in the database

**Files:** `src/app/api/dashboard/route.ts`.

- [x] Replace current-month and six-month lesson-detail reads with one month-bucket aggregate.
- [x] Preserve division, selected term, visible course/group, lesson status, the existing group/course soft-delete filters, and local calendar month semantics.
- [x] Use the same group `lessonMinutes` value and start/end fallback as the current implementation.
- [x] Verify the query's returned buckets and response structure by source inspection and TypeScript checking.

### Task 5: Run allowed checks

- [x] Run TypeScript checking and ESLint on changed TypeScript files.
- [x] Review conversion manifest, changed references, SQL predicates, and response fields.
- [x] Do not run tests or `next build`.

## Verification notes

- TypeScript: `npm run type-check` passed.
- ESLint: targeted changed-file run exited successfully with 0 errors and 10 warnings; warnings are existing unused-symbol and raw `<img>` notices in the touched pages/data modules.
- Practice-image payload: 7,321,036 bytes of PNGs → 3,395,250 bytes of WebP, saving 3,925,786 bytes (53.6%). All 19 PNG/WebP pairs exist.
- Logo display asset: `logo-small.png` 461,940 bytes → `logo-small-128.webp` 12,058 bytes (97.4% smaller).
- No tests or production build were run; the development server was left alone.
