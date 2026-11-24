# Three-client Navigation IA Design

## Intent

Make management, teacher, and parent navigation easier to scan by grouping related tasks, while preserving role boundaries, route URLs, badges, and frequent mobile shortcuts.

## Goals

- Keep all existing destination pages and URLs reachable.
- Move admin and parent service-overview entries out of the main menu and keep them directly reachable from their dashboards.
- Group admin teaching, scheduling, teacher, family operations, resources, advancement, and system functions with clearer labels.
- Split the teacher's nine-item teaching list into classroom teaching and homework/class management, while grouping students, family messages, and leave approvals together.
- Keep the parent navigation organized around child learning, family services, learning tools, advancement, and personal account.
- Keep the parent and teacher bottom tabs unchanged.

## Non-goals

- Do not merge role-specific pages or change permission checks, APIs, data behavior, or business workflows.
- Do not add a mega-page or a new multi-level navigation engine.
- Do not change themes, tier labels, or visual motion patterns.

## Approaches

- **Reorganize the existing route tree:** rename/reassign menu groups and add dashboard cards for service overview. Existing pages and links remain intact. Selected by the user; it is low-risk and addresses discoverability directly.
- **Create new hub pages with tabs:** collapse several links into workflow landing pages, but add another navigation layer and require broader route/shortcut migration. Deferred until the simpler grouping has usage feedback.

## Exact structure

- **Admin:** keep data overview and today's classroom direct; remove `/services` from the menu and add a dashboard card to `/services`. Rename academic group to 教务管理, schedule group to 排课管理, operations group to 家校运营, resources to 教学资源, advancement to 升学服务, and system group to 系统与数据. Move `/lesson-previews/bulk` from family operations to teaching resources.
- **Teacher:** keep 工作台 direct. Use 课堂教学 for schedule, VIP appointment, lesson previews, attendance, interaction, and feedback; 作业与班级管理 for ordinary homework and study-hall workbench; 学员与家校 for students, parent messages, and leave approvals; retain the teaching-resources and personal-service groups.
- **Parent:** keep 首页 direct and remove `/parent/services` from the menu; its existing dashboard quick action remains the shortcut. Keep 孩子学习, 家校服务, 学习工具, and 升学服务; rename the account group to 我的.

## Verification

Add regression tests for each client menu's grouping and route preservation, and for the admin service-overview card link. Run focused tests, the full Vitest suite, TypeScript, and ESLint on changed files.
