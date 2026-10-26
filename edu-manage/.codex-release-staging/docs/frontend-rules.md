# Frontend Rules For Codex Changes

Read this before changing edu-manage UI.

## Mobile layout

- Use `useIsMobile()` for mobile branches when a page has cards, tables, sidebars, grids, or sticky bars.
- Mobile containers must use `width: '100%'`, `maxWidth: '100%'`, and avoid fixed pixel widths that exceed 360px.
- Ant Design tables on mobile must use `scroll={{ x: 'max-content' }}` or be replaced by card lists.
- Multi-column grids collapse to one column on mobile unless the content is intentionally small and tested at 360px.
- Mobile padding should usually be 12px or less inside dense admin tools.

## Inputs and keyboard stability

- Do not define render-time function components inside another component and then render them as `<Child />`. Use JSX variables such as `{chatPanel}` or extract a top-level component. Otherwise React remounts inputs and mobile keyboards close.
- Avoid `showSearch` Selects in mobile dialogs unless search is required. If used inside a modal or drawer, set `getPopupContainer={(trigger) => trigger.parentElement || document.body}`, a small `listHeight`, and `virtual={false}`.
- Every async button action must show success or failure with `toast` or `message`.

## Sticky bars

- If the page shell already applies top padding for a fixed header, sticky child bars should normally use `top: 0`, not another header height.
- Avoid negative top margins around sticky controls; use explicit left/right margins instead.

## Protected uploads

- Store upload URLs as `/api/uploads/...` for newly uploaded images. Old `/uploads/...` paths must be normalized through `normalizeUploadUrl`.
- Do not introduce direct links to `/uploads/...` in new UI.

## Theme

- Keep the warm light education theme from `DESIGN.md`.
- Do not reintroduce old purple-blue/slate dashboard colors as the dominant palette. Purple can be an accent only when a feature needs a distinct role color.

## Management menus

- Desktop admin navigation lives in `src/components/Layout/Sidebar.tsx` as `menuItems`.
- Mobile admin navigation lives in `src/components/Layout/MainLayout.tsx` as `adminNavItems`.
- Add, remove, or rename management entries in both places, otherwise desktop and mobile navigation will diverge.

## Realtime lists

- Lists that must feel realtime should use SWR with `refreshInterval: 5000`, `revalidateOnFocus: true`, and `revalidateOnReconnect: true`.

## Merged schedule data

- When merging old `Schedule` data with new `ClassLesson` data, sort by displayed time of day such as `HH:mm`. Do not rely on ISO string `localeCompare`, because timezone offsets can scramble same-day ordering.

## Brand role colors

- Parent portal warm orange: `#E8784A`.
- Teacher portal green: `#1D9E75`.
- Admin console purple accent: `#534AB7`.
