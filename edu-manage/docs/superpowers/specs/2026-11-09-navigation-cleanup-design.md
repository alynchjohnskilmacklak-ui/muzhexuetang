# Navigation Cleanup Design

## Intent

Make the teacher, admin, and parent navigation match reachable pages and remove misleading duplicate entries, while preserving existing role gates, page behavior, and visual themes.

## Goals

- Place ordinary-course homework under the teacher route layout while keeping its public URL `/teacher/homework`.
- Make `/teacher-logs` reachable from the existing admin navigation so its existing alert badge is useful.
- Make `/teacher/schedule` the teacher schedule's canonical URL and retain `/teacher/teaching-schedule` as a compatibility redirect.
- Remove the parent menu entry `/parent/archive?tab=hours`; the archive already contains the relevant hours and attendance summary and does not recognize that tab.

## Non-goals

- Do not add `/teacher-compliance` or `/parent/interaction` as top-level navigation entries.
- Do not move `/services`, merge admin workflows, change themes, or change business data behavior.
- Do not delete the legacy teacher schedule URL.

## Approaches

- **Keep current routes and alter auth redirects:** low file movement, but would make the shared `(main)` route group more permissive for teachers and risk exposing unrelated management pages. Rejected.
- **Move only the homework page into the teacher route tree:** keeps the URL and teacher guard, but leaves two competing schedule URLs. Incomplete.
- **Move homework into the teacher route tree, canonicalize the schedule URL, add a redirect alias, and make the two small menu corrections:** preserves the existing security boundary and links while resolving the reported navigation defects. Selected by the user when authorizing this implementation.

## Constraints and implementation calls

- Keep teacher authentication via `requireTeacherPage` and `src/app/teacher/layout.tsx`.
- Add the admin log item to the existing teacher-management group; do not add the unsupported teacher-compliance detail route.
- Leave parent classroom interaction reachable through its existing contextual entry points; do not add another main menu item.
- Keep all existing colors, tier labels, role themes, and interaction patterns unchanged.
- Update internal teacher schedule links to `/teacher/schedule`; keep the old URL as a server redirect.

## Verification

Add focused regression coverage for the teacher homework route location, the legacy schedule redirect, the admin navigation item, and the parent menu output. Run focused tests, the full Vitest suite, TypeScript checking, and ESLint on changed TypeScript files.
