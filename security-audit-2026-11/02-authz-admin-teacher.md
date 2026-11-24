# 分册二：授权与越权（管理端 / 教师端）

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`，Next.js 16 App Router（route.ts）+ React 19 + Prisma/PostgreSQL + next-auth v5 + Redis + 阿里云 OSS。
> 审查方式：**纯静态审查**，未向线上站点发请求、未跑扫描器、未做越权实测；需要动态验证的假设统一列入文末「待实测项」。
> 范围：`src/app/api` 下 admin / settings / users / teachers / students / courses / class-groups / class-lessons / schedules / rooms / fees / reports / dashboard / exam-papers / grade-records / assessments / attendance / performance / materials / teacher / teacher-logs / teacher-photos / study-hall / leave-requests / makeup-requests / meals / feedback / highlights / learning-goals / parent-communications / notifications / messages / login-records / cron / setup / files / uploads。
> 不在本分册：parent / miniapp / public / qywx / wxpusher / ai（另一分册负责）。

## 0. 审查基线（先核实，再逐条判定）

### 0.1 proxy.ts（Next.js 16 middleware 替代入口）实际拦了什么

- 会话校验：`src/proxy.ts:103` 调 `auth()`；未登录 API 返回 401（L106-114）；`sessionMark` 缺失返回 401（L116-120）；查库比对 `currentSessionToken`、账号停用状态（L125-156）。
- **角色校验不在 proxy**：`src/proxy.ts:180` 注释明确「Page role redirects only. API permission checks remain inside API handlers.」即 proxy 只做页面角色跳转，**API 的角色/归属校验必须由路由 handler 自己完成**。
- 放行清单（不经过 proxy 会话校验直接放行）：`/api/auth`、`/api/setup`、`/api/wxpusher/callback`、`/api/qywx/event`、`/api/ai/public-assistant`、`/api/cron/*`、`/api/volunteer/schools` 以及一批静态目录（L64-99）。
- 读库失败窗口：`src/proxy.ts:157-168`，DB 查询异常时**写操作 fail-closed**，但**读操作在失败计数 < 3 次时 fail-open**（放行请求进入 handler）。
- matcher：`src/proxy.ts:202`，静态资源段（含 `uploads`、`images` 等）被排除；`/api/uploads/...` 是否落在 matcher 内列入待实测 T-1。

### 0.2 路由侧共用守卫（`src/lib/auth/guards.ts`、`src/lib/teacher-portal.ts`、`src/lib/get-user.ts`）

| 守卫 | 会话 | 角色 | 归属 | 说明 |
|---|---|---|---|---|
| `requireAdminUser()` | 有（查库校验 sessionMark + 停用） | 强制 admin | 学部由 `getRequestDivision` 限定 | `guards.ts` |
| `requireTeacherUser()` / `requireParentUser()` | 有 | 强制 teacher / parent | — | `guards.ts` |
| `requireRole(allowed)` | 有 | 白名单角色 | — | `guards.ts` |
| `requireSuperAdmin()` | 有 | admin + env 邮箱白名单 | — | `guards.ts` / `super-admin.ts` |
| `requireCurrentTeacher()` | 有 | 强制 teacher 并解析教师档案 | 配合 `teacherLessonWhere / teacherLessonScopeWhere / teacherStudentWhere` | `teacher-portal.ts` |
| `requireFeeAdminScope()` | 有 | admin（财务范围） | 学部 | `fee-admin-scope.ts` |
| `assertTeacherOwnsStudent()` / `assertCanAccessStudent()` / `assertCanAccessClassLesson()` / `assertCanAccessFeedback()` | — | — | 逐条查库确认对象归属当前教师/家长 | `guards.ts` / `teacher-portal.ts` |
| `getCurrentUser()` | 有（查库校验 sessionMark + 停用，失败返回 null） | 不判角色 | — | `get-user.ts:7-68` |
| 裸 `auth()` | 仅读 cookie 会话，**不查库** sessionMark/停用状态 | 不判角色 | — | 会话吊销只能依赖 proxy 兜底 |

### 0.3 已核实为合格的共性实现

- 教师端 31 个路由统一走 `requireCurrentTeacher()` + `teacherLessonScopeWhere / teacherStudentWhere` 收窄课次与学生范围（矩阵中 `teacher/...` 行）。
- 管理端写操作（考勤补交、反馈撤销、套餐调整、教师薪资、回收站、学员/家长/教师账号管理）均有 admin 角色判断 + 学部/批次范围校验。
- 导出类接口：`reports/export/[chartKey]`（L64 仅 admin，学部 + 批次裁剪）、`admin/salary/export`（L53 requireAdminUser，L58/64 学部 + 教师归属）、`settings/export/finance`、`settings/export/students`（requireAdminUser）——**未发现把全库数据无条件导出的通道**。
- Prisma raw SQL：范围内仅 `cron/weekly-digest`、`students/[id]/status` 等少数处使用 `$queryRaw`，全部为**带 `${}` 参数绑定的模板字符串**；未发现 `$queryRawUnsafe / $executeRawUnsafe`，未发现字符串拼 SQL（见 B-18）。

## 1. 路由"四道门"覆盖矩阵

判定口径：**合格**＝门1会话、门2角色、门3归属齐备（admin 全库管理类路由门3记「—」视为合格）；**残缺**＝会话在，但角色或归属校验不完善；**裸奔**＝缺会话或缺角色的破坏性操作。门1/门2/门3 列：`有` / `无` / `—`（不适用）。

| 路由 (方法) | 门1 会话 | 门2 角色 | 门3 归属 | 判定 | 证据(文件:行) |
|---|---|---|---|---|---|
| `src/app/api/admin/academic-terms/route.ts` GET | 有 | 有 | — | 合格 | admin/academic-terms/route.ts:L11；requireAdminUser；角色校验 L12 |
| `src/app/api/admin/academic-terms/route.ts` POST | 有 | 有 | — | 合格 | admin/academic-terms/route.ts:L22；requireAdminUser；角色校验 L23 |
| `src/app/api/admin/academic-terms/scope/route.ts` GET | 有 | 有 | — | 合格 | admin/academic-terms/scope/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/admin/academic-terms/scope/route.ts` POST | 有 | 有 | — | 合格 | admin/academic-terms/scope/route.ts:L16；requireAdminUser；角色校验 L17 |
| `src/app/api/admin/academic-terms/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/academic-terms/[id]/route.ts:L13；requireAdminUser；角色校验 L17 |
| `src/app/api/admin/academic-terms/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/academic-terms/[id]/route.ts:L42；requireAdminUser；角色校验 L46 |
| `src/app/api/admin/attendance/adjust/route.ts` POST | 有 | 有 | — | 合格 | admin/attendance/adjust/route.ts:L28；getCurrentUser；角色校验 L30 |
| `src/app/api/admin/attendance/submit/route.ts` POST | 有 | 有 | 有 | 合格 | admin/attendance/submit/route.ts:L21；getCurrentUser；角色校验 L23；归属 visibleStudentWhere |
| `src/app/api/admin/classroom-feedback/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/route.ts:L18；requireAdminUser；角色校验 L20 |
| `src/app/api/admin/classroom-feedback/route.ts` POST | 有 | 有 | — | 合格 | admin/classroom-feedback/route.ts:L191；auth(；角色校验 L195 |
| `src/app/api/admin/classroom-feedback/image-download/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/image-download/route.ts:L12；requireAdminUser；角色校验 L13 |
| `src/app/api/admin/classroom-feedback/[id]/detail/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/[id]/detail/route.ts:L11；requireAdminUser；角色校验 L16 |
| `src/app/api/admin/classroom-feedback/[id]/image/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/[id]/image/route.ts:L9；requireAdminUser；角色校验 L14 |
| `src/app/api/admin/cleanup/route.ts` POST | 有 | 有 | — | 合格 | admin/cleanup/route.ts:L11；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/cleanup/route.ts` GET | 有 | 有 | — | 合格 | admin/cleanup/route.ts:L18；getCurrentUser；角色校验 L20 |
| `src/app/api/admin/course-change-events/route.ts` GET | 有 | 有 | — | 合格 | admin/course-change-events/route.ts:L8；getCurrentUser；角色校验 L10 |
| `src/app/api/admin/data-admin/backup/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L33；requireSuperAdmin；角色校验 L34 |
| `src/app/api/admin/data-admin/backup/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L71；requireSuperAdmin；角色校验 L72 |
| `src/app/api/admin/data-admin/backup/route.ts` PATCH | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L104；requireSuperAdmin；角色校验 L105 |
| `src/app/api/admin/data-admin/backup/route.ts` DELETE | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L119；requireSuperAdmin；角色校验 L120 |
| `src/app/api/admin/data-admin/overview/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/overview/route.ts:L10；auth(；角色校验 L13 |
| `src/app/api/admin/data-admin/reset/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/reset/route.ts:L198；requireSuperAdmin；角色校验 L199 |
| `src/app/api/admin/data-admin/reset/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/reset/route.ts:L208；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/data-admin/reset/preview/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/reset/preview/route.ts:L9；requireSuperAdmin；角色校验 L10 |
| `src/app/api/admin/data-admin/restore/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/restore/route.ts:L48；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/data-admin/[entity]/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/[entity]/route.ts:L18；auth(；角色校验 L22 |
| `src/app/api/admin/data-admin/[entity]/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/[entity]/route.ts:L108；auth(；角色校验 L112 |
| `src/app/api/admin/data-admin/[entity]/batch/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/[entity]/batch/route.ts:L27；auth(；角色校验 L30,L92 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L21；auth(；角色校验 L24 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` PUT | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L55；auth(；角色校验 L58 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L112；auth(；角色校验 L115 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L154；auth(；角色校验 L157 |
| `src/app/api/admin/data-health/route.ts` GET | 有 | 有 | — | 合格 | admin/data-health/route.ts:L9；auth(；角色校验 L11 |
| `src/app/api/admin/feedback/revoke/route.ts` POST | 有 | 有 | — | 合格 | admin/feedback/revoke/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/admin/global-search/route.ts` GET | 有 | 有 | — | 合格 | admin/global-search/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/import/route.ts` POST | 有 | 有 | — | 合格 | admin/import/route.ts:L59；auth(；角色校验 L61 |
| `src/app/api/admin/intensive-appointments/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-appointments/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/admin/intensive-history/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-history/route.ts:L32；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/intensive-history/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-history/route.ts:L114；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/intensive-reviews/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-reviews/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/admin/intensive-reviews/[id]/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-reviews/[id]/route.ts:L12；getCurrentUser；角色校验 L18 |
| `src/app/api/admin/intensive-settlement/adjust/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-settlement/adjust/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/intensive-summary/route.ts` GET | 有 | 有 | 有 | 合格 | admin/intensive-summary/route.ts:L9；requireAdminUser；角色校验 L10；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/admin/materials/lesson-previews/route.ts` GET | 有 | 有 | — | 合格 | admin/materials/lesson-previews/route.ts:L21；requireAdminUser；角色校验 L22 |
| `src/app/api/admin/materials/lesson-previews/route.ts` POST | 有 | 有 | — | 合格 | admin/materials/lesson-previews/route.ts:L136；requireAdminUser；角色校验 L137 |
| `src/app/api/admin/meal-attendance/route.ts` GET | 有 | 有 | — | 合格 | admin/meal-attendance/route.ts:L15；auth(；角色校验 L17；内联角色/归属校验（已人工复核） |
| `src/app/api/admin/meal-attendance/route.ts` PATCH | 有 | 有 | — | 合格 | admin/meal-attendance/route.ts:L88；auth(；角色校验 L90 |
| `src/app/api/admin/meal-templates/route.ts` GET | 有 | 有 | — | 合格 | admin/meal-templates/route.ts:L15；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/route.ts` POST | 有 | 有 | — | 合格 | admin/meal-templates/route.ts:L41；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/[id]/route.ts` PUT | 有 | 有 | — | 合格 | admin/meal-templates/[id]/route.ts:L15；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/meal-templates/[id]/route.ts:L46；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/parent-activation/route.ts` GET | 有 | 有 | — | 合格 | admin/parent-activation/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/parent-activation/route.ts` POST | 有 | 有 | — | 合格 | admin/parent-activation/route.ts:L36；requireAdminUser；角色校验 L37 |
| `src/app/api/admin/practice-stats/route.ts` GET | 有 | 有 | — | 合格 | admin/practice-stats/route.ts:L32；requireAdminUser；角色校验 L33 |
| `src/app/api/admin/practice-stats/[studentId]/route.ts` GET | 有 | 有 | — | 合格 | admin/practice-stats/[studentId]/route.ts:L68；requireAdminUser；角色校验 L69 |
| `src/app/api/admin/profile-completeness/route.ts` GET | 有 | 有 | — | 合格 | admin/profile-completeness/route.ts:L10；requireRole；角色校验 L11 |
| `src/app/api/admin/salary/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/route.ts:L14；requireAdminUser；角色校验 L16 |
| `src/app/api/admin/salary/route.ts` POST | 有 | 有 | — | 合格 | admin/salary/route.ts:L218；requireAdminUser；角色校验 L220 |
| `src/app/api/admin/salary/route.ts` DELETE | 有 | 有 | — | 合格 | admin/salary/route.ts:L265；requireAdminUser；角色校验 L267 |
| `src/app/api/admin/salary/config/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/config/route.ts:L29；requireAdminUser；角色校验 L31 |
| `src/app/api/admin/salary/config/route.ts` PUT | 有 | 有 | — | 合格 | admin/salary/config/route.ts:L55；requireAdminUser；角色校验 L57 |
| `src/app/api/admin/salary/export/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/export/route.ts:L51；requireAdminUser；角色校验 L53 |
| `src/app/api/admin/salary/settle/route.ts` POST | 有 | 有 | — | 合格 | admin/salary/settle/route.ts:L11；requireAdminUser；角色校验 L13 |
| `src/app/api/admin/single-session-feedback/route.ts` GET | 有 | 有 | — | 合格 | admin/single-session-feedback/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/student-identities/merge/route.ts` GET | 有 | 有 | — | 合格 | admin/student-identities/merge/route.ts:L14；getCurrentUser；角色校验 L16 |
| `src/app/api/admin/student-identities/merge/route.ts` POST | 有 | 有 | — | 合格 | admin/student-identities/merge/route.ts:L50；getCurrentUser；角色校验 L52 |
| `src/app/api/admin/student-profile/route.ts` GET | 有 | 有 | — | 合格 | admin/student-profile/route.ts:L9；requireRole；角色校验 L10 |
| `src/app/api/admin/students/[id]/family/route.ts` POST | 有 | 有 | — | 合格 | admin/students/[id]/family/route.ts:L13；auth(；角色校验 L17 |
| `src/app/api/admin/students/[id]/family/route.ts` DELETE | 有 | 有 | — | 合格 | admin/students/[id]/family/route.ts:L68；auth(；角色校验 L72 |
| `src/app/api/admin/students/[id]/feedback-archive/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/feedback-archive/route.ts:L18；requireAdminUser；角色校验 L23 |
| `src/app/api/admin/students/[id]/feedback-export/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/feedback-export/route.ts:L7；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/students/[id]/growth-archive/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/growth-archive/route.ts:L15；requireAdminUser；角色校验 L20 |
| `src/app/api/admin/teacher-messages/route.ts` POST | 有 | 有 | — | 合格 | admin/teacher-messages/route.ts:L13；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/teacher-messages/route.ts` GET | — | — | — | 合格 | admin/teacher-messages/route.ts:L40；内联角色/归属校验（已人工复核） |
| `src/app/api/admin/trash/route.ts` GET | 有 | 有 | — | 合格 | admin/trash/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/trash/route.ts` POST | 有 | 有 | — | 合格 | admin/trash/route.ts:L36；getCurrentUser；角色校验 L38 |
| `src/app/api/admin/trash/preview/route.ts` GET | 有 | 有 | — | 合格 | admin/trash/preview/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/trash/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/trash/[id]/route.ts:L7；getCurrentUser；角色校验 L9 |
| `src/app/api/admin/trash/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/trash/[id]/route.ts:L16；getCurrentUser；角色校验 L18 |
| `src/app/api/admin/volunteer-data-health/route.ts` GET | 有 | 有 | — | 合格 | admin/volunteer-data-health/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/assessments/route.ts` GET | 有 | 有 | — | 合格 | assessments/route.ts:L6；getCurrentUser；角色校验 L18 |
| `src/app/api/assessments/route.ts` POST | 有 | 有 | — | 合格 | assessments/route.ts:L52；getCurrentUser；角色校验 L54 |
| `src/app/api/attendance/route.ts` GET | 有 | 无 | — | 合格 | attendance/route.ts:L14；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/attendance/calendar/route.ts` GET | 有 | 无 | 有 | 合格 | attendance/calendar/route.ts:L11；getCurrentUser；归属 visibleClassGroupWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/attendance/export/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/export/route.ts:L14；getCurrentUser；角色校验 L17；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/attendance/history/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/history/route.ts:L11；getCurrentUser；角色校验 L21；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/attendance/today/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/today/route.ts:L15；getCurrentUser；角色校验 L18；归属 parentLinkedStudentWhere |
| `src/app/api/attendance/[lessonId]/route.ts` GET | 有 | 无 | 有 | 合格 | attendance/[lessonId]/route.ts:L12；getCurrentUser；归属 visibleClassGroupWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-groups/route.ts` GET | 有 | 无 | 有 | 合格 | class-groups/route.ts:L56；getCurrentUser；归属 visibleClassGroupWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-groups/route.ts` POST | 有 | 有 | — | 合格 | class-groups/route.ts:L153；getCurrentUser；角色校验 L155 |
| `src/app/api/class-groups/check-teacher-conflict/route.ts` POST | 有 | 无 | — | 残缺 | class-groups/check-teacher-conflict/route.ts:L9；getCurrentUser；仅登录即可探测任意教师排课冲突（低敏） |
| `src/app/api/class-groups/check-teacher-conflict/batch/route.ts` POST | 有 | 无 | — | 残缺 | class-groups/check-teacher-conflict/batch/route.ts:L11；getCurrentUser；仅登录即可批量探测教师排课冲突（低敏） |
| `src/app/api/class-groups/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | class-groups/[id]/route.ts:L42；getCurrentUser；角色校验 L77；归属 visibleClassGroupWhere |
| `src/app/api/class-groups/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | class-groups/[id]/route.ts:L122；getCurrentUser；角色校验 L124 |
| `src/app/api/class-groups/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | class-groups/[id]/route.ts:L357；getCurrentUser；角色校验 L359 |
| `src/app/api/class-groups/[id]/add-teacher/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/add-teacher/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/class-groups/[id]/copy/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/copy/route.ts:L29；getCurrentUser；角色校验 L31 |
| `src/app/api/class-groups/[id]/enrollments/route.ts` GET | 有 | 有 | 有 | 合格 | class-groups/[id]/enrollments/route.ts:L26；getCurrentUser；角色校验 L29；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/class-groups/[id]/enrollments/route.ts` POST | 有 | 有 | 有 | 合格 | class-groups/[id]/enrollments/route.ts:L58；getCurrentUser；角色校验 L60；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/class-groups/[id]/enrollments/route.ts` DELETE | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/route.ts:L276；getCurrentUser；角色校验 L278 |
| `src/app/api/class-groups/[id]/enrollments/[studentId]/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/[studentId]/route.ts:L141；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/class-groups/[id]/enrollments/[studentId]/route.ts` PATCH | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/[studentId]/route.ts:L156；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/class-groups/[id]/generate-lessons/route.ts` POST | 有 | 有 | 有 | 合格 | class-groups/[id]/generate-lessons/route.ts:L51；getCurrentUser；角色校验 L53；归属 visibleClassGroupWhere |
| `src/app/api/class-groups/[id]/lessons/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/lessons/route.ts:L23；getCurrentUser；角色校验 L25 |
| `src/app/api/class-groups/[id]/replace-teacher/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/replace-teacher/route.ts:L18；getCurrentUser；角色校验 L20 |
| `src/app/api/class-groups/[id]/start/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/start/route.ts:L11；getCurrentUser；角色校验 L13 |
| `src/app/api/class-groups/[id]/sync-hours/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/sync-hours/route.ts:L14；getCurrentUser；角色校验 L19 |
| `src/app/api/class-lessons/route.ts` GET | 有 | 无 | 有 | 合格 | class-lessons/route.ts:L14；getCurrentUser；归属 parentLinkedStudentWhere,visibleClassGroupWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-lessons/add-day/route.ts` POST | 有 | 有 | — | 合格 | class-lessons/add-day/route.ts:L14；getCurrentUser；角色校验 L16 |
| `src/app/api/class-lessons/copy-friday-to-saturday/route.ts` POST | 有 | 有 | — | 合格 | class-lessons/copy-friday-to-saturday/route.ts:L33；getCurrentUser；角色校验 L35 |
| `src/app/api/class-lessons/postpone-all/route.ts` POST | 有 | 有 | 有 | 合格 | class-lessons/postpone-all/route.ts:L86；getCurrentUser；角色校验 L88；归属 visibleClassGroupWhere |
| `src/app/api/class-lessons/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | class-lessons/[id]/route.ts:L15；getCurrentUser；角色校验 L17 |
| `src/app/api/courses/route.ts` GET | 有 | 无 | — | 残缺 | courses/route.ts:L9；getCurrentUser；仅登录即返回课程目录（含教师姓名），低敏 |
| `src/app/api/courses/route.ts` POST | 有 | 有 | — | 合格 | courses/route.ts:L27；getCurrentUser；角色校验 L29 |
| `src/app/api/cron/archive-notifications/route.ts` GET | 有 | 有 | — | 合格 | cron/archive-notifications/route.ts:L12；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/daily-ops-report/route.ts` GET | 有 | 有 | — | 合格 | cron/daily-ops-report/route.ts:L55；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/retry-notifications/route.ts` GET | 有 | 有 | — | 合格 | cron/retry-notifications/route.ts:L255；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/trash-cleanup/route.ts` GET | 有 | 有 | — | 合格 | cron/trash-cleanup/route.ts:L8；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/weekly-digest/route.ts` GET | 有 | 有 | — | 合格 | cron/weekly-digest/route.ts:L71；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/dashboard/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/route.ts:L60；getCurrentUser；角色校验 L62；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/dashboard/appointment-detail/route.ts` GET | 有 | 有 | — | 合格 | dashboard/appointment-detail/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/dashboard/class-detail/route.ts` GET | 有 | 有 | — | 合格 | dashboard/class-detail/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/dashboard/closed-loop/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/closed-loop/route.ts:L36；getCurrentUser；角色校验 L38；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/dashboard/teacher-compliance/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/teacher-compliance/route.ts:L27；getCurrentUser；角色校验 L29；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/exam-papers/route.ts` GET | 有 | 无 | 有 | 合格 | exam-papers/route.ts:L16；getCurrentUser；归属 parentVisibleExamPaperWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/exam-papers/route.ts` POST | 有 | 有 | 有 | 合格 | exam-papers/route.ts:L98；getCurrentUser；角色校验 L100；归属 assertCanAccessClassLesson,assertCanAccessStudent |
| `src/app/api/exam-papers/recognize/route.ts` POST | 有 | 有 | — | 合格 | exam-papers/recognize/route.ts:L82；getCurrentUser；角色校验 L84 |
| `src/app/api/exam-papers/stats/route.ts` GET | 有 | 有 | — | 合格 | exam-papers/stats/route.ts:L11；getCurrentUser；角色校验 L13 |
| `src/app/api/exam-papers/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | exam-papers/[id]/route.ts:L12；getCurrentUser；角色校验 L18；归属 parentVisibleExamPaperWhere |
| `src/app/api/exam-papers/[id]/route.ts` PATCH | 有 | 有 | 有 | 合格 | exam-papers/[id]/route.ts:L80；getCurrentUser；角色校验 L124；归属 parentVisibleExamPaperWhere |
| `src/app/api/exam-papers/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | exam-papers/[id]/route.ts:L162；getCurrentUser；角色校验 L164 |
| `src/app/api/exam-papers/[id]/comment/route.ts` POST | 有 | 有 | — | 残缺 | exam-papers/[id]/comment/route.ts:L9；getCurrentUser；角色校验 L31；门3 无归属：教师不核 paper.teacherId、家长不核 paper.studentId |
| `src/app/api/exam-papers/[id]/publish/route.ts` POST | 有 | 有 | — | 合格 | exam-papers/[id]/publish/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/exam-papers/[id]/questions/route.ts` PUT | 有 | 有 | — | 合格 | exam-papers/[id]/questions/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/exam-papers/[id]/react/route.ts` POST | 有 | 无 | — | 残缺 | exam-papers/[id]/react/route.ts:L8；getCurrentUser；门3 无归属：任意登录用户可对任意试卷反应 |
| `src/app/api/feedback/route.ts` GET | 有 | 有 | — | 合格 | feedback/route.ts:L43；auth(,requireCurrentTeacher；角色校验 L69,L108,L149 |
| `src/app/api/feedback/route.ts` POST | 有 | 有 | — | 合格 | feedback/route.ts:L180；auth(,requireCurrentTeacher；角色校验 L242 |
| `src/app/api/feedback/route.ts` PATCH | 有 | 无 | 有 | 合格 | feedback/route.ts:L451；auth(；归属 parentLinkedStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/feedback/bonus-preview/route.ts` POST | 有 | 有 | — | 合格 | feedback/bonus-preview/route.ts:L14；requireCurrentTeacher；角色校验 L15 |
| `src/app/api/feedback/[id]/messages/route.ts` GET | 有 | 有 | — | 合格 | feedback/[id]/messages/route.ts:L9；getCurrentUser；角色校验 L15；内联角色/归属校验（已人工复核） |
| `src/app/api/feedback/[id]/messages/route.ts` POST | 有 | 有 | — | 合格 | feedback/[id]/messages/route.ts:L48；getCurrentUser；角色校验 L54 |
| `src/app/api/fees/route.ts` GET | 有 | 有 | — | 合格 | fees/route.ts:L116；requireFeeAdminScope；角色校验 L118 |
| `src/app/api/fees/route.ts` POST | 有 | 有 | — | 合格 | fees/route.ts:L186；requireFeeAdminScope；角色校验 L191 |
| `src/app/api/fees/fee-types/route.ts` GET | 有 | 有 | — | 合格 | fees/fee-types/route.ts:L16；requireFeeAdminScope；角色校验 L17 |
| `src/app/api/fees/students/route.ts` GET | 有 | 有 | — | 合格 | fees/students/route.ts:L32；requireFeeAdminScope；角色校验 L34 |
| `src/app/api/fees/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | fees/[id]/route.ts:L21；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/fees/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | fees/[id]/route.ts:L82；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/files/view/route.ts` GET | 有 | 无 | — | 合格 | files/view/route.ts:L13；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/files/[id]/route.ts` GET | 有 | 无 | — | 合格 | files/[id]/route.ts:L10；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/grade-records/route.ts` POST | 有 | 有 | — | 合格 | grade-records/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/grade-records/trend/route.ts` GET | 有 | 无 | 有 | 合格 | grade-records/trend/route.ts:L8；getCurrentUser；归属 assertCanAccessStudent；内联角色/归属校验（已人工复核） |
| `src/app/api/grade-records/[id]/push-to-parent/route.ts` POST | 有 | 有 | — | 合格 | grade-records/[id]/push-to-parent/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/highlights/route.ts` GET | 有 | 无 | — | 残缺 | highlights/route.ts:L7；getCurrentUser；门2 无角色、门3 无归属；可按 studentId/groupId 遍历全部学员亮点 |
| `src/app/api/highlights/route.ts` POST | 有 | 有 | — | 合格 | highlights/route.ts:L36；getCurrentUser；角色校验 L38 |
| `src/app/api/highlights/[id]/push/route.ts` PATCH | 有 | 有 | — | 合格 | highlights/[id]/push/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/leave-requests/route.ts` GET | 有 | 有 | 有 | 合格 | leave-requests/route.ts:L9；auth(,requireCurrentTeacher；角色校验 L11,L27；归属 teacherStudentWhere |
| `src/app/api/leave-requests/[id]/route.ts` PATCH | 有 | 有 | 有 | 合格 | leave-requests/[id]/route.ts:L10；auth(,requireCurrentTeacher；角色校验 L14,L30；归属 teacherStudentWhere |
| `src/app/api/login-records/route.ts` GET | 有 | 有 | — | 合格 | login-records/route.ts:L69；auth(；角色校验 L72 |
| `src/app/api/makeup-requests/route.ts` GET | 有 | 有 | 有 | 合格 | makeup-requests/route.ts:L7；getCurrentUser；角色校验 L10；归属 visibleStudentWhere |
| `src/app/api/makeup-requests/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | makeup-requests/[id]/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/materials/route.ts` GET | 有 | 无 | 有 | 合格 | materials/route.ts:L16；auth(；归属 parentVisibleMaterialWhere,teacherVisibleMaterialWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/route.ts` DELETE | 有 | 有 | — | 合格 | materials/route.ts:L63；auth(；角色校验 L65 |
| `src/app/api/materials/oss-signature/route.ts` GET | — | — | — | 残缺 | materials/oss-signature/route.ts:L11；GET 未校验会话即返回 isOssEnabled 布尔（信息泄露，低敏） |
| `src/app/api/materials/oss-signature/route.ts` POST | 有 | 有 | — | 合格 | materials/oss-signature/route.ts:L15；auth(；角色校验 L22 |
| `src/app/api/materials/upload/route.ts` POST | 有 | 无 | — | 合格 | materials/upload/route.ts:L33；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/upload/route.ts` PUT | 有 | 无 | — | 合格 | materials/upload/route.ts:L124；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/[id]/view/route.ts` GET | 有 | 有 | 有 | 合格 | materials/[id]/view/route.ts:L69；auth(；角色校验 L81；归属 parentVisibleMaterialWhere,teacherLessonWhere,teacherVisibleMaterialWhere |
| `src/app/api/meals/menu/route.ts` GET | 有 | 无 | — | 合格 | meals/menu/route.ts:L10；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/meals/menu/route.ts` POST | 有 | 有 | — | 合格 | meals/menu/route.ts:L55；auth(；角色校验 L57 |
| `src/app/api/meals/menu/[id]/route.ts` PUT | 有 | 有 | — | 合格 | meals/menu/[id]/route.ts:L11；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/meals/menu/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | meals/menu/[id]/route.ts:L31；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/meals/report/route.ts` GET | 有 | 有 | — | 合格 | meals/report/route.ts:L11；auth(,requireCurrentTeacher；角色校验 L27 |
| `src/app/api/meals/report/route.ts` POST | 有 | 有 | — | 合格 | meals/report/route.ts:L117；requireCurrentTeacher；角色校验 L119 |
| `src/app/api/meals/report/[id]/route.ts` PUT | 有 | 有 | — | 合格 | meals/report/[id]/route.ts:L6；requireCurrentTeacher；角色校验 L8 |
| `src/app/api/meals/summary/route.ts` GET | 有 | 有 | — | 合格 | meals/summary/route.ts:L10；auth(；角色校验 L12 |
| `src/app/api/messages/route.ts` GET | 有 | 无 | — | 合格 | messages/route.ts:L14；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/route.ts` POST | 有 | 有 | — | 合格 | messages/route.ts:L106；getCurrentUser；角色校验 L111 |
| `src/app/api/messages/read-all/route.ts` PATCH | 有 | 无 | — | 合格 | messages/read-all/route.ts:L8；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/unread-count/route.ts` GET | 有 | 无 | — | 合格 | messages/unread-count/route.ts:L14；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/[id]/route.ts` GET | 有 | 无 | — | 合格 | messages/[id]/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | messages/[id]/route.ts:L81；getCurrentUser；角色校验 L84 |
| `src/app/api/messages/[id]/remind/route.ts` POST | 有 | 有 | — | 合格 | messages/[id]/remind/route.ts:L13；getCurrentUser；角色校验 L19 |
| `src/app/api/messages/[id]/reply/route.ts` POST | 有 | 有 | — | 合格 | messages/[id]/reply/route.ts:L13；getCurrentUser；角色校验 L16 |
| `src/app/api/notifications/route.ts` GET | 有 | 有 | — | 合格 | notifications/route.ts:L14；auth(；角色校验 L16 |
| `src/app/api/notifications/route.ts` POST | 有 | 有 | — | 合格 | notifications/route.ts:L40；auth(；角色校验 L42 |
| `src/app/api/notifications/stats/route.ts` GET | 有 | 有 | — | 合格 | notifications/stats/route.ts:L8；auth(；角色校验 L10 |
| `src/app/api/notifications/students/route.ts` GET | 有 | 有 | — | 合格 | notifications/students/route.ts:L7；auth(；角色校验 L9 |
| `src/app/api/notifications/[id]/resend/route.ts` POST | 有 | 有 | — | 合格 | notifications/[id]/resend/route.ts:L10；auth(；角色校验 L14 |
| `src/app/api/parent-communications/route.ts` GET | 有 | 有 | — | 合格 | parent-communications/route.ts:L69；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` POST | 有 | 有 | 有 | 合格 | parent-communications/route.ts:L271；归属 visibleClassGroupWhere,visibleStudentWhere；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` PATCH | 有 | 有 | — | 合格 | parent-communications/route.ts:L338；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` DELETE | 有 | 有 | — | 合格 | parent-communications/route.ts:L394；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/performance/route.ts` GET | 有 | 有 | 有 | 合格 | performance/route.ts:L26；auth(；角色校验 L32；归属 parentActiveStudentWhere,parentVisiblePerformancePostWhere |
| `src/app/api/performance/route.ts` POST | 有 | 有 | 有 | 合格 | performance/route.ts:L116；auth(；角色校验 L120；归属 assertTeacherOwnsStudent |
| `src/app/api/performance/badges/route.ts` GET | 有 | 有 | — | 残缺 | performance/badges/route.ts:L8；auth(；角色校验 L25；教师分支 where 未带 teacherId/学生归属，可按 studentId 读任意学员徽章 |
| `src/app/api/performance/read/route.ts` POST | 有 | 有 | 有 | 合格 | performance/read/route.ts:L10；auth(；角色校验 L14；归属 parentVisiblePerformancePostWhere |
| `src/app/api/performance/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | performance/[id]/route.ts:L14；getCurrentUser；角色校验 L20；归属 parentLinkedStudentWhere |
| `src/app/api/performance/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | performance/[id]/route.ts:L81；auth(；角色校验 L85,L92 |
| `src/app/api/performance/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | performance/[id]/route.ts:L118；auth(；角色校验 L122,L129 |
| `src/app/api/performance/[id]/comment/route.ts` POST | 有 | 有 | — | 合格 | performance/[id]/comment/route.ts:L11；auth(；角色校验 L23 |
| `src/app/api/performance/[id]/react/route.ts` POST | 有 | 有 | — | 合格 | performance/[id]/react/route.ts:L23；auth(；角色校验 L27 |
| `src/app/api/performance/[id]/react/route.ts` DELETE | 有 | 有 | — | 合格 | performance/[id]/react/route.ts:L43；auth(；角色校验 L47 |
| `src/app/api/reports/attendance-stats/route.ts` GET | 有 | 有 | — | 合格 | reports/attendance-stats/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/reports/export/[chartKey]/route.ts` GET | 有 | 有 | — | 合格 | reports/export/[chartKey]/route.ts:L58；getCurrentUser；角色校验 L64 |
| `src/app/api/reports/paper-stats/route.ts` GET | 有 | 有 | — | 残缺 | reports/paper-stats/route.ts:L11；getCurrentUser；角色校验 L13；教师可读本学部全库试卷/掌握度聚合，未按本人教师裁剪（聚合，低敏） |
| `src/app/api/reports/parent-engagement/route.ts` GET | 有 | 有 | — | 残缺 | reports/parent-engagement/route.ts:L11；getCurrentUser；角色校验 L13；教师可读全库互动率聚合，未按本人教师裁剪（聚合，低敏） |
| `src/app/api/reports/parent-logins/route.ts` GET | 有 | 有 | — | 合格 | reports/parent-logins/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/reports/students/route.ts` GET | 有 | 有 | — | 合格 | reports/students/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/reports/summary/route.ts` GET | 有 | 有 | — | 合格 | reports/summary/route.ts:L47；getCurrentUser；角色校验 L52 |
| `src/app/api/reports/teachers/route.ts` GET | 有 | 有 | — | 合格 | reports/teachers/route.ts:L10；getCurrentUser；角色校验 L12；内联角色/归属校验（已人工复核） |
| `src/app/api/reports/volunteer-stats/route.ts` GET | 有 | 有 | — | 残缺 | reports/volunteer-stats/route.ts:L8；getCurrentUser；角色校验 L10；教师可读志愿者日志聚合计数，未按本人裁剪（聚合，低敏） |
| `src/app/api/rooms/route.ts` GET | 有 | 无 | — | 合格 | rooms/route.ts:L8；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/rooms/route.ts` POST | 有 | 有 | — | 合格 | rooms/route.ts:L17；auth(；角色校验 L22 |
| `src/app/api/rooms/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | rooms/[id]/route.ts:L9；auth(；角色校验 L12 |
| `src/app/api/rooms/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | rooms/[id]/route.ts:L27；auth(；角色校验 L30 |
| `src/app/api/schedules/route.ts` POST | 有 | 有 | — | 合格 | schedules/route.ts:L24；auth(；角色校验 L27 |
| `src/app/api/schedules/check-conflict/route.ts` GET | 有 | 无 | — | 残缺 | schedules/check-conflict/route.ts:L9；getCurrentUser；仅登录即可探测任意教师排课冲突（低敏） |
| `src/app/api/schedules/daily/route.ts` GET | 有 | 无 | — | 残缺 | schedules/daily/route.ts:L15；getCurrentUser；门2/门3 未按角色裁剪：家长/教师可读当天全部课次及学员名单 |
| `src/app/api/schedules/one-on-one/route.ts` POST | 有 | 有 | — | 合格 | schedules/one-on-one/route.ts:L15；getCurrentUser；角色校验 L18 |
| `src/app/api/schedules/overview/route.ts` GET | 有 | 无 | — | 残缺 | schedules/overview/route.ts:L14；getCurrentUser；仅登录即返回跨角色聚合计数（低敏） |
| `src/app/api/schedules/teacher-week/route.ts` GET | 有 | 无 | — | 残缺 | schedules/teacher-week/route.ts:L11；getCurrentUser；门3 IDOR：teacherId 参数未校验是否本人，非 admin 可读任意教师周课次 |
| `src/app/api/schedules/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | schedules/[id]/route.ts:L18；getCurrentUser；角色校验 L21 |
| `src/app/api/schedules/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | schedules/[id]/route.ts:L342；getCurrentUser；角色校验 L344 |
| `src/app/api/settings/route.ts` GET | 有 | 无 | — | 残缺 | settings/route.ts:L10；getCurrentUser；仅登录即读取系统配置，未做角色收口（低敏） |
| `src/app/api/settings/route.ts` PATCH | 有 | 有 | — | 合格 | settings/route.ts:L24；getCurrentUser；角色校验 L29 |
| `src/app/api/settings/accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/accounts/route.ts:L106；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` POST | 有 | 有 | — | 合格 | settings/accounts/route.ts:L219；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` PATCH | 有 | 有 | — | 合格 | settings/accounts/route.ts:L358；角色校验 L430,L456,L477；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` DELETE | 有 | 有 | — | 合格 | settings/accounts/route.ts:L500；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/admins/route.ts` GET | 有 | 有 | — | 合格 | settings/admins/route.ts:L20；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/admins/route.ts` POST | 有 | 有 | — | 合格 | settings/admins/route.ts:L43；requireSuperAdmin；角色校验 L45 |
| `src/app/api/settings/backup/create/route.ts` POST | 有 | 有 | — | 合格 | settings/backup/create/route.ts:L8；getCurrentUser；角色校验 L11 |
| `src/app/api/settings/export/finance/route.ts` GET | 有 | 有 | — | 合格 | settings/export/finance/route.ts:L13；requireAdminUser；角色校验 L14 |
| `src/app/api/settings/export/students/route.ts` GET | 有 | 有 | — | 合格 | settings/export/students/route.ts:L13；requireAdminUser；角色校验 L14 |
| `src/app/api/settings/fee-types/route.ts` GET | 有 | 无 | — | 合格 | settings/fee-types/route.ts:L8；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/fee-types/route.ts` POST | 有 | 有 | — | 合格 | settings/fee-types/route.ts:L17；getCurrentUser；角色校验 L20 |
| `src/app/api/settings/fee-types/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | settings/fee-types/[id]/route.ts:L8；getCurrentUser；角色校验 L14 |
| `src/app/api/settings/fee-types/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | settings/fee-types/[id]/route.ts:L22；getCurrentUser；角色校验 L28 |
| `src/app/api/settings/logs/route.ts` GET | 有 | 有 | — | 合格 | settings/logs/route.ts:L8；getCurrentUser；角色校验 L11 |
| `src/app/api/settings/notify/route.ts` GET | 有 | 有 | — | 合格 | settings/notify/route.ts:L8；getCurrentUser；角色校验 L12 |
| `src/app/api/settings/notify/route.ts` PATCH | 有 | 有 | — | 合格 | settings/notify/route.ts:L22；getCurrentUser；角色校验 L26 |
| `src/app/api/settings/parent-accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/parent-accounts/route.ts:L14；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/roles/route.ts` GET | 有 | 有 | — | 合格 | settings/roles/route.ts:L8；getCurrentUser；角色校验 L12 |
| `src/app/api/settings/roles/route.ts` PATCH | 有 | 有 | — | 合格 | settings/roles/route.ts:L22；getCurrentUser；角色校验 L26 |
| `src/app/api/settings/schedule-periods/route.ts` GET | 有 | 无 | — | 合格 | settings/schedule-periods/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/schedule-periods/route.ts` PUT | 有 | 有 | — | 合格 | settings/schedule-periods/route.ts:L17；getCurrentUser；角色校验 L20 |
| `src/app/api/settings/subjects/route.ts` GET | 有 | 无 | — | 合格 | settings/subjects/route.ts:L10；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/subjects/route.ts` POST | 有 | 有 | — | 合格 | settings/subjects/route.ts:L24；getCurrentUser；角色校验 L27 |
| `src/app/api/settings/subjects/reorder/route.ts` PATCH | 有 | 有 | — | 合格 | settings/subjects/reorder/route.ts:L9；auth(；角色校验 L14 |
| `src/app/api/settings/subjects/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | settings/subjects/[id]/route.ts:L10；getCurrentUser；角色校验 L16 |
| `src/app/api/settings/subjects/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | settings/subjects/[id]/route.ts:L49；getCurrentUser；角色校验 L55 |
| `src/app/api/settings/teacher-accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/teacher-accounts/route.ts:L14；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/setup/route.ts` GET | — | — | — | 合格 | setup/route.ts:L18；生产环境禁用 + token 校验 |
| `src/app/api/students/route.ts` GET | 有 | 有 | — | 合格 | students/route.ts:L43；auth(；角色校验 L50 |
| `src/app/api/students/route.ts` POST | 有 | 有 | — | 合格 | students/route.ts:L280；auth(；角色校验 L288 |
| `src/app/api/students/grade-counts/route.ts` GET | 有 | 无 | — | 残缺 | students/grade-counts/route.ts:L10；auth(；仅登录即返回各年级人数聚合（低敏） |
| `src/app/api/students/[id]/route.ts` GET | 有 | 有 | — | 合格 | students/[id]/route.ts:L17；getCurrentUser；角色校验 L68 |
| `src/app/api/students/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | students/[id]/route.ts:L189；auth(；角色校验 L193 |
| `src/app/api/students/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | students/[id]/route.ts:L261；auth(；角色校验 L266 |
| `src/app/api/students/[id]/link-parent/route.ts` POST | 有 | 有 | — | 合格 | students/[id]/link-parent/route.ts:L12；auth(；角色校验 L19,L72 |
| `src/app/api/students/[id]/link-parent/route.ts` DELETE | 有 | 有 | — | 合格 | students/[id]/link-parent/route.ts:L132；auth(；角色校验 L139 |
| `src/app/api/students/[id]/parent/route.ts` POST | 有 | 有 | — | 合格 | students/[id]/parent/route.ts:L9；auth(；角色校验 L18,L32 |
| `src/app/api/students/[id]/status/route.ts` PATCH | 有 | 有 | — | 合格 | students/[id]/status/route.ts:L15；auth(；角色校验 L19 |
| `src/app/api/study-hall/route.ts` GET | 有 | 有 | — | 合格 | study-hall/route.ts:L109；requireAuthenticatedUser；角色校验 L111 |
| `src/app/api/study-hall/route.ts` POST | 有 | 有 | — | 合格 | study-hall/route.ts:L168；requireAuthenticatedUser；角色校验 L170 |
| `src/app/api/study-hall/route.ts` PUT | 有 | 有 | — | 合格 | study-hall/route.ts:L192；requireAuthenticatedUser；角色校验 L194 |
| `src/app/api/study-hall/route.ts` PATCH | 有 | 有 | — | 合格 | study-hall/route.ts:L224；requireAuthenticatedUser；角色校验 L226 |
| `src/app/api/study-hall/closures/route.ts` POST | 有 | 有 | — | 合格 | study-hall/closures/route.ts:L9；requireAuthenticatedUser；角色校验 L11 |
| `src/app/api/study-hall/closures/route.ts` DELETE | 有 | 有 | — | 合格 | study-hall/closures/route.ts:L59；requireAuthenticatedUser；角色校验 L61 |
| `src/app/api/teacher/ai-feedback/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/ai-feedback/route.ts:L359；requireCurrentTeacher；角色校验 L360；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/ai-feedback/article/route.ts` POST | 有 | 有 | — | 合格 | teacher/ai-feedback/article/route.ts:L16；requireCurrentTeacher；角色校验 L17 |
| `src/app/api/teacher/ai-feedback/chat/route.ts` POST | 有 | 有 | — | 合格 | teacher/ai-feedback/chat/route.ts:L36；requireCurrentTeacher；角色校验 L39 |
| `src/app/api/teacher/attendance/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/attendance/route.ts:L28；requireCurrentTeacher；角色校验 L30；归属 teacherLessonScopeWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/attendance/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/attendance/route.ts:L210；auth(,getCurrentUser,requireCurrentTeacher；角色校验 L271；归属 teacherLessonScopeWhere,visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/teacher/benefits/route.ts` GET | 有 | 有 | — | 合格 | teacher/benefits/route.ts:L9；requireCurrentTeacher；角色校验 L11 |
| `src/app/api/teacher/classroom-feedback/route.ts` GET | 有 | 有 | — | 合格 | teacher/classroom-feedback/route.ts:L49；requireCurrentTeacher；角色校验 L50 |
| `src/app/api/teacher/classroom-feedback/route.ts` POST | 有 | 有 | — | 合格 | teacher/classroom-feedback/route.ts:L64；requireCurrentTeacher；角色校验 L67 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` GET | — | — | — | 残缺 | teacher/classroom-feedback/single-session/route.ts:L66；toStudentOptions 列出本学部全部学生（家长姓名/电话尾号），未限本人授课学生 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` POST | 有 | 有 | — | 合格 | teacher/classroom-feedback/single-session/route.ts:L92；requireCurrentTeacher；角色校验 L93 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` PATCH | 有 | 有 | 有 | 合格 | teacher/classroom-feedback/single-session/route.ts:L190；归属 visibleStudentWhere；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/classroom-feedback/today-status/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/classroom-feedback/today-status/route.ts:L12；requireCurrentTeacher；角色校验 L13；归属 teacherLessonWhere,visibleStudentWhere |
| `src/app/api/teacher/classroom-feedback/[id]/route.ts` GET | 有 | 有 | — | 合格 | teacher/classroom-feedback/[id]/route.ts:L8；requireCurrentTeacher；角色校验 L13 |
| `src/app/api/teacher/dashboard/route.ts` GET | 有 | 有 | — | 合格 | teacher/dashboard/route.ts:L8；requireCurrentTeacher；角色校验 L10 |
| `src/app/api/teacher/dashboard/route.ts` POST | 有 | 有 | — | 合格 | teacher/dashboard/route.ts:L30；requireCurrentTeacher；角色校验 L32 |
| `src/app/api/teacher/feedback-context/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/feedback-context/route.ts:L17；requireCurrentTeacher；角色校验 L18；归属 teacherLessonScopeWhere,teacherStudentWhere,visibleStudentWhere |
| `src/app/api/teacher/feedback-draft/route.ts` GET | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L79；requireCurrentTeacher；角色校验 L80 |
| `src/app/api/teacher/feedback-draft/route.ts` PUT | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L92；requireCurrentTeacher；角色校验 L93 |
| `src/app/api/teacher/feedback-draft/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L117；requireCurrentTeacher；角色校验 L118 |
| `src/app/api/teacher/intensive-lessons/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/intensive-lessons/route.ts:L28；requireCurrentTeacher；角色校验 L29；归属 visibleStudentWhere |
| `src/app/api/teacher/intensive-lessons/route.ts` POST | 有 | 有 | — | 合格 | teacher/intensive-lessons/route.ts:L261；requireCurrentTeacher；角色校验 L262 |
| `src/app/api/teacher/intensive-lessons/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/intensive-lessons/[id]/route.ts:L47；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/intensive-lessons/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/intensive-lessons/[id]/route.ts:L152；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/learning-goals/route.ts` GET | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L13；requireCurrentTeacher；角色校验 L14 |
| `src/app/api/teacher/learning-goals/route.ts` POST | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L27；requireCurrentTeacher；角色校验 L28 |
| `src/app/api/teacher/learning-goals/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L62；requireCurrentTeacher；角色校验 L63 |
| `src/app/api/teacher/learning-goals/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L100；requireCurrentTeacher；角色校验 L101 |
| `src/app/api/teacher/lessons/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/lessons/route.ts:L10；requireCurrentTeacher；角色校验 L11；归属 teacherLessonScopeWhere,visibleStudentWhere |
| `src/app/api/teacher/materials/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/materials/route.ts:L20；requireCurrentTeacher；角色校验 L21；归属 teacherVisibleMaterialWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/materials/route.ts` POST | 有 | 有 | — | 合格 | teacher/materials/route.ts:L46；requireCurrentTeacher；角色校验 L47 |
| `src/app/api/teacher/materials/lesson-previews/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/materials/lesson-previews/route.ts:L20；requireCurrentTeacher；角色校验 L21；归属 teacherLessonWhere,visibleStudentWhere |
| `src/app/api/teacher/materials/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/materials/[id]/route.ts:L20；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/materials/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/materials/[id]/route.ts:L42；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/messages/route.ts` GET | 有 | 有 | — | 合格 | teacher/messages/route.ts:L7；requireCurrentTeacher；角色校验 L8；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/messages/[id]/read/route.ts` POST | 有 | 有 | — | 合格 | teacher/messages/[id]/read/route.ts:L7；requireCurrentTeacher；角色校验 L8 |
| `src/app/api/teacher/papers/route.ts` GET | 有 | 有 | — | 合格 | teacher/papers/route.ts:L18；requireCurrentTeacher；角色校验 L19 |
| `src/app/api/teacher/papers/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/papers/route.ts:L30；requireCurrentTeacher；角色校验 L31；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/performance-posts/route.ts` GET | 有 | 有 | — | 合格 | teacher/performance-posts/route.ts:L9；requireCurrentTeacher；角色校验 L10 |
| `src/app/api/teacher/performance-posts/route.ts` POST | 有 | 有 | — | 合格 | teacher/performance-posts/route.ts:L27；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/salary/route.ts` GET | 有 | 有 | — | 合格 | teacher/salary/route.ts:L10；requireCurrentTeacher；角色校验 L11 |
| `src/app/api/teacher/schedule/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/schedule/route.ts:L10；requireCurrentTeacher；角色校验 L11；归属 teacherLessonScopeWhere |
| `src/app/api/teacher/stage-summary/route.ts` GET | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L52；requireCurrentTeacher；角色校验 L53 |
| `src/app/api/teacher/stage-summary/route.ts` POST | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L80；requireCurrentTeacher；角色校验 L81 |
| `src/app/api/teacher/stage-summary/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L145；requireCurrentTeacher；角色校验 L146 |
| `src/app/api/teacher/stats/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/stats/route.ts:L8；requireCurrentTeacher；角色校验 L9；归属 teacherLessonScopeWhere,teacherStudentWhere |
| `src/app/api/teacher/students/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/students/route.ts:L11；requireCurrentTeacher；角色校验 L12；归属 teacherLessonScopeWhere,teacherStudentWhere |
| `src/app/api/teacher/students/[id]/context/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/students/[id]/context/route.ts:L8；requireCurrentTeacher；角色校验 L10；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/trends/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/trends/route.ts:L16；requireCurrentTeacher；角色校验 L17；归属 teacherLessonScopeWhere |
| `src/app/api/teacher/weaknesses/route.ts` GET | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L11；requireCurrentTeacher；角色校验 L12 |
| `src/app/api/teacher/weaknesses/route.ts` POST | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L26；requireCurrentTeacher；角色校验 L27 |
| `src/app/api/teacher/weaknesses/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L129；requireCurrentTeacher；角色校验 L130 |
| `src/app/api/teacher-logs/route.ts` GET | 有 | 有 | — | 合格 | teacher-logs/route.ts:L20；requireAdminUser；角色校验 L22 |
| `src/app/api/teacher-logs/alerts/route.ts` GET | 有 | 有 | — | 合格 | teacher-logs/alerts/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/teacher-logs/alerts/route.ts` POST | 有 | 有 | — | 合格 | teacher-logs/alerts/route.ts:L24；getCurrentUser；角色校验 L26 |
| `src/app/api/teacher-logs/check-alerts/route.ts` POST | 有 | 有 | — | 合格 | teacher-logs/check-alerts/route.ts:L8；requireAdminUser；角色校验 L10 |
| `src/app/api/teacher-logs/[teacherId]/route.ts` GET | 有 | 有 | 有 | 合格 | teacher-logs/[teacherId]/route.ts:L9；requireAdminUser；角色校验 L11；归属 teacherLessonScopeWhere |
| `src/app/api/teacher-photos/route.ts` GET | 有 | 无 | — | 合格 | teacher-photos/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/teachers/route.ts` GET | 有 | 无 | — | 残缺 | teachers/route.ts:L17；auth(；门2 无角色校验；L68 未做字段裁剪，L145 `...teacher` 全量返回 phone/email/学历 |
| `src/app/api/teachers/route.ts` POST | 有 | 有 | — | 合格 | teachers/route.ts:L161；auth(；角色校验 L168 |
| `src/app/api/teachers/options/route.ts` GET | 有 | 有 | — | 合格 | teachers/options/route.ts:L8；requireAdminUser；角色校验 L10 |
| `src/app/api/teachers/stats/route.ts` GET | 有 | 无 | — | 残缺 | teachers/stats/route.ts:L8；auth(；仅登录即返回教师数量/均分等跨角色聚合（低敏） |
| `src/app/api/teachers/[id]/route.ts` GET | 有 | 有 | — | 合格 | teachers/[id]/route.ts:L54；角色校验 L58（内联 admin 判断） |
| `src/app/api/teachers/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teachers/[id]/route.ts:L140；角色校验 L144（内联 admin 判断） |
| `src/app/api/teachers/[id]/route.ts` DELETE | — | — | — | 裸奔 | teachers/[id]/route.ts:L189；仅 requireSession，无角色/归属校验（对照 GET L58、PATCH L144 有 admin 校验） |
| `src/app/api/uploads/sign/route.ts` POST | 有 | 无 | — | 合格 | uploads/sign/route.ts:L22；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/uploads/[filename]/route.ts` GET | 有 | 无 | — | 合格 | uploads/[filename]/route.ts:L63；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/users/[id]/status/route.ts` PATCH | 有 | 有 | — | 合格 | users/[id]/status/route.ts:L10；requireAdminUser；角色校验 L14 |

## 2. 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
|---|---|---|---|---|---|
| B-1 | 注销教师接口 DELETE 仅校验会话、无角色判断，教师/家长账号可注销任意教师并转移课程学员 | ② 完全缺失 | 高（破坏性写操作 + 业务数据转移） | 小 | 立刻 |
| B-2 | `teachers` 列表接口仅校验登录，无角色判断且未做字段裁剪，全量返回教师 phone/email/学历/合同结束日期 | ② 完全缺失 | 中（教师通讯录与隐私字段泄露） | 小 | 近期 |
| B-3 | `highlights` 列表仅校验登录，未按角色/归属收窄，可按 studentId/groupId 遍历全部学员亮点 | ② 完全缺失 | 中（跨学员隐私内容泄露） | 小 | 近期 |
| B-4 | `schedules/teacher-week` 教师周课次接口：teacherId 参数未校验是否本人，非 admin 可读任意教师周课次与学员名单 | ② 完全缺失 | 中（跨教师 IDOR） | 小 | 近期 |
| B-5 | `schedules/daily` 当日课次接口未按角色裁剪，家长/教师可读当天全部课次及 enrollment 学员 id 名单、教师名 | ② 完全缺失 | 中（跨角色名单泄露） | 小 | 近期 |
| B-6 | 试卷评论接口不校验归属：教师不核 paper.teacherId、家长不核 paper.studentId，可对任意试卷留言 | ① 已具备但不完善 | 低-中（越权留言 + 可遍历试卷） | 小 | 近期 |
| B-7 | 试卷反应（点赞/表情）接口无归属校验，任意登录用户可对任意试卷操作反应 | ① 已具备但不完善 | 低 | 小 | 长期 |
| B-8 | 学员徽章接口教师分支 where 未带教师/学生归属，可按 studentId 读任意学员徽章 | ① 已具备但不完善 | 低 | 小 | 近期 |
| B-9 | 教师端聚合报表（paper-stats / parent-engagement / volunteer-stats）允许教师读取本学部全库聚合，未按本人教师裁剪 | ① 已具备但不完善 | 低（聚合值，无 PII） | 中 | 长期 |
| B-10 | 单次课反馈学生检索 `toStudentOptions` 列出本学部全部学生（含家长姓名/电话尾号），未限定本人授课学生 | ① 已具备但不完善 | 低-中（跨学员档案预览） | 中 | 近期 |
| B-11 | 一组只读探测类接口（overview / check-conflict / 冲突批量 / teachers-stats / grade-counts / courses 目录）仅校验登录即可跨角色读取 | ① 已具备但不完善 | 低（聚合/目录信息） | 小 | 长期 |
| B-12 | 家长沟通通知已读/删除标记 `userId` 错写成操作者本人 id，条件永不命中（逻辑缺陷，非越权） | ① 已具备但不完善 | 低（功能失效） | 小 | 近期 |
| B-13 | `settings` GET 向所有登录角色返回系统配置全量行（组织信息、作息时段、权益文案） | ① 已具备但不完善 | 低 | 小 | 长期 |
| B-14 | `materials/oss-signature` GET 未校验会话即返回 OSS 是否启用（布尔） | ① 已具备但不完善 | 低（配置探测） | 小 | 长期 |
| B-15 | 大量路由裸用 `auth()` 或本地 `requireAdmin()`，会话吊销/停用校验完全依赖 proxy 兜底；proxy 读操作存在 fail-open 窗口 | ③ 架构运维层 | 中（兜底失效时会话吊销不生效） | 中 | 近期 |
| B-16 | `api-rate-limit.ts` 为 156 字节空壳，范围内写/导出接口未接入限流 | ③ 架构运维层 | 低-中（枚举/爬取无节流） | 中 | 长期 |
| B-17 | cron 接口 Bearer token 走 URL query string，且 archive/retry 同时接受 CRON_SECRET 与 HEALTH_TOKEN，易进访问日志 | ③ 架构运维层 | 低-中（凭据泄露面） | 小 | 长期 |
| B-18 | Prisma raw SQL 盘点：全部参数化模板绑定，未发现 Unsafe 拼接 SQL（合格项，归档备查） | ③ 架构运维层 | — | — | 长期 |

## 3. ② 完全缺失

### B-1 注销教师接口缺角色校验（破坏性写操作裸奔）

- **证据**：`src/app/api/teachers/[id]/route.ts:189-191`
  ```ts
  export const DELETE = apiHandler(async (req, { params }) => {
    const session = await requireSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // 此处之后无任何 role === 'admin' 判断
  ```
  同文件对照：`GET` L57-58 有 `if (role !== 'admin') return 403`；`PATCH` L143-144 同样有 admin 判断；**唯独 DELETE 漏掉**。
  后续逻辑 L198-220 按 `id` 直接 `teacher.findUnique`，L225 起按 `transferTo` 转移课程/课次/学员归属，并删除作品、试卷、反馈等关联数据（全文 L225-320）。
- **危害**：任意已登录账号（教师或家长）构造 `DELETE /api/teachers/{id}?transferTo=...` 即可注销一名教师、把其名下课程与学员转移给他人，并级联清理其作品/试卷/反馈，属于破坏性越权写操作。
- **利用前置条件**：一个有效登录态（教师或家长账号即可，无需 admin）；知道或可枚举目标教师 `id`（CUID，可由 B-2 的列表接口批量获取）。
- **修复方案**：在 `teachers/[id]/route.ts` DELETE 开头补 `if ((session.user as {role?:string}).role !== 'admin') return NextResponse.json({error:'无权限'},{status:403})`，与 GET/PATCH 对齐；建议复用 `requireAdminUser()`；同时补目标教师与操作者学部一致性校验（L204 仅取 session.division，未校验 `teacher.division`）。
- **工作量**：小。**优先级**：立刻。

### B-2 教师列表全字段泄露（无角色校验 + 无字段裁剪）

- **证据**：`src/app/api/teachers/route.ts:17-19` 仅 `auth()` 判登录，无角色判断；L68 `prisma.teacher.findMany({ where: { id: { in: pageTeacherIds } } })` **未指定 select 字段**；L144-145 `teachers.map((teacher) => ({ ...teacher, _count: ... }))` 全量展开返回。Teacher 模型含 `phone`(schema.prisma:136)、`email`(137)、`contractEnd`(144)、`education`(145)、`university`(146)、`major`(147) 等隐私字段。
- **危害**：家长或教师账号翻页调用 `GET /api/teachers?q=&page=&limit=` 即可导出本学部全部教师的手机号、邮箱、学历、毕业院校、专业、合同结束日期等隐私字段，并附带带班人数/课次统计。
- **利用前置条件**：任意有效登录态；无需特殊角色。
- **修复方案**：L17 后补角色判断（admin 全量；teacher/parent 仅返回公开展示字段）；L68 查询按角色 `select` 裁剪，家长/教师视角剔除 phone/email/education/university/major/contractEnd；列表页若只需要公开信息，默认走精简 select。
- **工作量**：小。**优先级**：近期。

### B-3 学员亮点跨角色遍历（无归属校验）

- **证据**：`src/app/api/highlights/route.ts:7-23`
  ```ts
  const user = await getCurrentUser()
  if (!user) return 401
  const where: Record<string, unknown> = {}
  if (studentId) where.studentId = studentId
  if (groupId) where.groupId = groupId
  if (user.role === 'admin') { where.student = { division } }   // 非 admin 分支无任何收窄
  ```
  L25-33 `findMany` 返回学员姓名、教师姓名、亮点内容。
- **危害**：教师/家长账号可遍历全部学员亮点卡片；按 `studentId` 可逐个探测任意学员的课堂亮点内容，形成跨学员隐私泄露。
- **利用前置条件**：任意有效登录态；可枚举/猜测 studentId（B-2 类列表接口可能附带 id）。
- **修复方案**：非 admin 分支补归属 where——教师按 `teacherId: user.teacherId` 或已授课程次收窄；家长按 `student.parentUserId / parentId` 收窄；与 `class-groups/route.ts:82-101` 的角色过滤写法对齐。
- **工作量**：小。**优先级**：近期。

### B-4 教师周课次跨教师 IDOR

- **证据**：`src/app/api/schedules/teacher-week/route.ts:11` `getCurrentUser()` 仅判登录；L17 读取 `teacherId` 查询参数；L37-49 where 子句直接按该 `teacherId` 过滤，**没有 `user.role === 'admin' || user.teacherId === teacherId` 之类的本人校验**。返回内容含课次学员 id 名单、课程、教室、时间。
- **危害**：非 admin 用户传入任意 `teacherId`，即可读取该教师整周课表与上课学员名单。
- **利用前置条件**：任意有效登录态；需目标教师 id（可枚举或经其他列表获得）。
- **修复方案**：where 构造前判断：`const isAdmin = user.role === 'admin'`；非 admin 强制 `teacherId = user.teacherId`，传入他人 id 时返回 403。
- **工作量**：小。**优先级**：近期。

### B-5 当日课次名单全量可见（未按角色裁剪）

- **证据**：`src/app/api/schedules/daily/route.ts:15-17` `getCurrentUser()` 仅判登录；L30-55 where 只按学部/日期/课型过滤，无 admin/teacher/parent 分支；返回的课次 include enrollment 学员 id 名单与教师信息。对照 `attendance/today/route.ts:18-55` 同口径数据是按 admin/teacher/parent 三分支收窄的。
- **危害**：家长或教师可读取当日本学部全部班课的学员名单与教师安排，突破其可见范围。
- **利用前置条件**：任意有效登录态；调整 `date` 查询参数可遍历历史/未来日期。
- **修复方案**：参照 `attendance/today` 增加角色分支：admin 全量；教师按授课教师/带课分组收窄；家长仅保留自家学员所在课次；未匹配角色返回 403。
- **工作量**：小。**优先级**：近期。

## 4. ① 已具备但不完善

### B-6 试卷评论不校验对象归属

- **证据**：`src/app/api/exam-papers/[id]/comment/route.ts:9-24`，`getCurrentUser()` 后直接 `examPaper.findUnique({ where: { id } })` 并创建评论；教师分支未核对 `paper.teacherId === teacher.id`，家长分支未核对 `paper.studentId` 属于自家孩子。对照 `performance/[id]/comment/route.ts:23-28` 评论前先 `findFirst` 做归属匹配。
- **危害**：教师可对其他教师试卷留言，家长可对其他学员试卷留言；结合试卷详情接口可遍历他人试卷并评论。
- **利用前置条件**：任意有效登录态；试卷 `id`。
- **修复方案**：创建评论前复用 `assertCanAccessStudent` / 教师授课关系校验，归属不符返回 403；评论作者角色与试卷归属在事务内二次核对。
- **工作量**：小。**优先级**：近期。

### B-7 试卷反应（点赞/表情）无归属校验

- **证据**：`src/app/api/exam-papers/[id]/react/route.ts:8-25`，`getCurrentUser()` 后按 `paperId` 直接 toggle reaction，无试卷归属核对。
- **危害**：任意登录用户可对任意试卷增加/取消反应，污染点赞数据；反应记录挂在当前用户名下，越权读取面有限。
- **利用前置条件**：任意有效登录态；试卷 `id`。
- **修复方案**：与 B-6 共用归属校验；至少限制 reaction 仅在本人可见试卷上可用。
- **工作量**：小。**优先级**：长期。

### B-8 学员徽章跨教师读取

- **证据**：`src/app/api/performance/badges/route.ts:19-30`，parent 分支核对了 `parentId/parentUserId`；L25 放行 admin/teacher 后，L29-30 `where: { studentId }` **未带 teacherId 或授课关系条件**。
- **危害**：教师传入任意 `studentId` 即可读取该学员的获奖徽章列表与授牌教师姓名。
- **利用前置条件**：教师登录态；目标学员 `id`。
- **修复方案**：教师分支补 `assertTeacherOwnsStudent(teacher.id, studentId, prisma)` 或在 where 中叠加授课分组/课次关系。
- **工作量**：小。**优先级**：近期。

### B-9 教师端聚合报表未按本人教师裁剪

- **证据**：
  - `reports/paper-stats/route.ts:11-49`：L13 放行 admin/teacher，但 L35-48 各 count/groupBy 只按 `termId/status` 过滤，无 `teacherId` 条件。
  - `reports/parent-engagement/route.ts:11-39`：L13 放行 admin/teacher，L33-38 全库聚合，无教师条件。
  - `reports/volunteer-stats/route.ts:8-26`：L10 放行 admin/teacher，L22-25 全库计数。
- **危害**：教师可看到本学部全库试卷量、掌握率、薄弱知识点、互动率、志愿者咨询量等跨班聚合指标。返回为聚合数值、无 PII，危害偏低。
- **利用前置条件**：教师登录态。
- **修复方案**：教师分支在各 count/groupBy 的 where 叠加 `teacherId`（或授课分组关系）；admin 保留全库口径。
- **工作量**：中。**优先级**：长期。

### B-10 单次课反馈学生检索未限本人授课学生

- **证据**：`src/app/api/teacher/classroom-feedback/single-session/route.ts:23-41` `toStudentOptions` 按学部 + 家长绑定关系检索学生（含家长姓名、电话尾号），L93 `requireSingleSessionActor` 后直接使用；未限定该教师本人授课/带过课的学生范围。
- **危害**：教师在单次课反馈的学生下拉中可检索到本学部其他学生档案（姓名、年级、家长姓名、电话尾号）。
- **利用前置条件**：教师登录态；姓名关键字模糊检索。
- **修复方案**：`toStudentOptions` 增加教师授课关系过滤（本人授课分组/课次在册学生）；手动填写姓名路径不回显档案；电话尾号在非 admin 视角进一步脱敏。
- **工作量**：中。**优先级**：近期。

### B-11 只读探测类接口仅登录即可跨角色读取

- **证据**（均为 `getCurrentUser()` / `auth()` 判登录后无角色分支）：
  - `schedules/overview/route.ts:14-21`：今日/本周课次、教室、教师、在读分组计数。
  - `schedules/check-conflict/route.ts:9-24`：按 teacherId/日期探测排课冲突及冲突明细。
  - `class-groups/check-teacher-conflict/route.ts:9-20`、`class-groups/check-teacher-conflict/batch/route.ts:11`：批量探测教师排课冲突。
  - `teachers/stats/route.ts:8`：教师数量、均分等统计。
  - `students/grade-counts/route.ts:10`：各年级人数计数。
  - `courses/route.ts:9-21`：活跃课程目录（含教师姓名）。
- **危害**：低敏聚合/目录信息可被家长或教师跨角色拉取；冲突探测可间接推断其他教师排课安排。
- **利用前置条件**：任意有效登录态。
- **修复方案**：区分只读目录（课程/教师公开名片可对登录用户开放）与内部统计（概览、冲突探测、人数/均分统计），后者收口为 admin/teacher 且教师按本人范围；目录类接口补字段裁剪。
- **工作量**：小。**优先级**：长期。

### B-12 通知已读/删除标记 userId 错用操作者本人（逻辑缺陷）

- **证据**：`src/app/api/parent-communications/route.ts:366`、L385、L406
  ```ts
  where: { id: item.id, userId: user.id, user: { division: user.division }, status: 'ACTIVE', read: false }
  ```
  这三处是对**目标家长**的通知做已读/删除标记，`userId` 应为通知接收家长的账号 id，代码写成了操作者（admin）本人 id，`updateMany` 条件永不命中。
- **危害**：管理端代家长标记已读/删除实际不生效；非越权漏洞，但会造成通知状态与前端展示不一致。
- **利用前置条件**：不涉及利用；属功能缺陷。
- **修复方案**：三处 where 改为按通知记录自身 `userId`（或先查出通知的接收人 id 再更新），不要用 `user.id`。
- **工作量**：小。**优先级**：近期。

### B-13 settings GET 向所有角色返回系统配置全量行

- **证据**：`src/app/api/settings/route.ts:10-20`，`getCurrentUser()` 判登录后 `systemConfig.findUnique` 全字段返回（组织名称、电话、地址、作息时段 `schedulePeriods`、权益文案等；schema.prisma:1389-1402，模型内未见密钥字段）。
- **危害**：低敏；主要是内部作息配置与经营文案对家长/教师可见。
- **利用前置条件**：任意有效登录态。
- **修复方案**：按角色返回子集（公开信息 vs 内部配置），`schedulePeriods`、内部权益文案仅 admin/teacher 可见。
- **工作量**：小。**优先级**：长期。

### B-14 OSS 开关探测接口未鉴权

- **证据**：`src/app/api/materials/oss-signature/route.ts:11-13` GET 直接返回 `{ enabled: isOssEnabled() }`，无会话校验；同文件 POST L20-24 有 admin 校验。
- **危害**：未登录即可探测文件存储后端是否为 OSS（辅助攻击者判断上传链路）；仅布尔值，危害低。
- **利用前置条件**：无（接口在 proxy 对未登录 API 返回 401 的前提下，仍属应在 handler 内收口的接口；待 T-1 确认 proxy 覆盖）。
- **修复方案**：GET 复用 POST 的 admin/教师角色校验，或改为静态配置常量前端读取。
- **工作量**：小。**优先级**：长期。

## 5. ③ 架构性 / 运维层问题

### B-15 会话吊销校验过度依赖 proxy 兜底，且读操作存在 fail-open 窗口

- **证据**：
  - 范围内大量管理端路由使用裸 `auth()`（如 `admin/teacher-messages/route.ts:7`、`meals/menu/route.ts:2`、`rooms/route.ts:2`、`messages/[id]/route.ts:3` 等）或本地 `requireAdmin()` 包装（`admin/meal-templates/route.ts:12`、`parent-communications/route.ts:12`、`meals/menu/[id]/route.ts:6`、`settings/accounts/route.ts:105` 等），handler 自身**不查库**校验 `currentSessionToken` 与停用状态。
  - 兜底在 `src/proxy.ts:125-156`；L157-168 读库异常时，读操作在失败计数 < 3 时放行（fail-open）。
  - 对照 `getCurrentUser()`（`get-user.ts:17-25`）是查库 fail-closed 的；走裸 `auth()` 的路由在 proxy 失效/被绕过/matcher 漏配时，停用账号、被踢下线会话仍可能进入 handler。
- **危害**：兜底链路单点；一旦 proxy 缓存、DB 抖动或 matcher 漏配，已停用/已吊销会话在窗口期内可访问 API。
- **修复方案**：统一收敛到 `requireAdminUser / requireTeacherUser / getCurrentUser` 这类查库 fail-closed 守卫；本地 `requireAdmin()` 包装改为复用 `guards.ts`；评估把 proxy 读操作的 fail-open 改为 fail-closed（或仅对静态资源放行）。
- **工作量**：中。**优先级**：近期。

### B-16 限流空壳，写/导出接口未接入节流

- **证据**：`src/lib/api-rate-limit.ts` 仅 156 字节（空壳）；范围内路由 grep 未发现调用 `api-rate-limit`。`src/lib/rate-limit.ts` 仅登录接口使用；`teacher-ai-rate-limit.ts` 仅 AI 助手使用。管理端写操作、报表导出、批量名单接口无速率限制。
- **危害**：持有一个低权账号即可高频枚举学员/教师 id、批量拉导出、反复提交写操作，缺乏节流缓冲。
- **修复方案**：在 `apiHandler` 基类或守卫层接入按用户 id + 路由的限流（登录/查询/写操作/导出分档）；先覆盖导出类与批量写接口。
- **工作量**：中。**优先级**：长期。

### B-17 cron Bearer token 经 query 传递，且接受双 token

- **证据**：`src/app/api/cron/archive-notifications/route.ts:14`、`daily-ops-report/route.ts:55`、`retry-notifications/route.ts:255`、`trash-cleanup/route.ts:8`、`weekly-digest/route.ts:71` 均从 query/header 取 Bearer；`retry-notifications` 同时比对 `CRON_SECRET` 与 `HEALTH_TOKEN`。proxy 对 `/api/cron/*` 放行（`proxy.ts:80`），handler 自校验。
- **危害**：query 中的 token 易进入 Web 服务器访问日志、浏览器历史、代理日志；双 token 扩大凭据面。
- **修复方案**：cron 凭据改走 `Authorization: Bearer` header；收敛为单一 secret；日志脱敏；定期轮换。
- **工作量**：小。**优先级**：长期。

### B-18 Prisma raw SQL 盘点（合格项归档）

- **证据**：范围内检索 `$queryRaw / $executeRaw / $queryRawUnsafe / $executeRawUnsafe`，命中仅 `cron/weekly-digest/route.ts`、`students/[id]/status/route.ts:95` 等，全部为 Prisma 带参数模板（`${parentId}` 等由驱动绑定）；**未发现 Unsafe 变体，未发现字符串拼接用户输入进 SQL**。
- **结论**：本批未发现 SQL 注入面；后续新增 raw 查询时应继续禁止 `*Unsafe` 并强制参数绑定。
- **优先级**：长期（基线保持）。

## 6. 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
|---|---|---|---|---|
| T-1 | `/api/uploads/[filename]`、`/api/files/...` 是否落在 proxy matcher 内；matcher L202 排除了静态 `uploads` 段，需确认 API 路径未被一并绕过 | 在测试环境用已退出登录会话直接请求未授权 `/api/uploads/xxx`、`/api/files/view?path=xxx`，观察是否 401；核对 matcher 正则分段 | 若绕过，文件访问仅靠 handler 内 `assertCanAccessFileAsset` 兜底，停用/吊销会话校验缺失 | 用 `requireAuthenticatedUser` + access lib 双保险；matcher 显式包含 `/api/` 前缀 |
| T-2 | 双库模式下 division 隔离是否真正生效：低权账号能否通过查询参数跨学部读取 | 测试环境准备 JUNIOR/SENIOR 两个账号，交叉请求带 `division=SENIOR` 的学员/课次/费用接口，核对返回行数与库来源 | 跨学部数据泄露 | 复核 `getRequestDivision`（division.ts 已忽略外部 division 入参）与 `getPrismaForDivision` 调用点；跨库访问补显式断言 |
| T-3 | proxy 读操作 fail-open 窗口（L157-168，失败计数 <3）内，已停用/被踢下线会话是否仍可读取 API | 测试环境模拟 DB 不可用，停用账号后请求 GET 接口，观察是否放行 | 会话吊销延迟生效 | 关键读接口 handler 内复用 `getCurrentUser()` 查库校验；评估读操作改 fail-closed |
| T-4 | 反馈导出图片 7 天 HMAC token 是否绑定学部/学员，能否跨对象访问 | 用 A 学员导出 token 改 `assetId` 访问 B 学员图片链接（`classroom-feedback/export-image-url.ts` 签名覆盖 assetId:division:expires） | 跨学员图片越权查看 | 实测确认 division 与 assetId 均入签；必要时缩短 TTL |
| T-5 | `messages/[id]`、`messages/read-all`、`messages/unread-count` 的 `getAccessibleParentMessageWhere` 是否对 teacher/admin/parent 三类都正确收口 | 测试环境分别用家长/教师账号请求他人会话 id 与 read-all，核对 403 与返回范围 | 跨会话消息泄露 | 若存在空 where 兜底，补角色默认拒绝 |
| T-6 | 单次课反馈手动填写姓名路径（`single-session` manual）是否绕过学生归属与家长通知边界 | 教师端走手动学生姓名 + 非在册学生生成反馈，检查是否向不存在/他人家长推送通知 | 误推送、数据污染 | 手动路径禁止关联真实 studentId；通知前二次校验在册与归属 |
| T-7 | B-1 注销教师链路在无角色校验时，`transferTo` 目标教师是否校验同学部、同批次 | 代码走查 + 测试环境构造跨学部 transferTo，核对课程/学员转移结果 | 跨学部数据错乱 | 补目标教师学部/批次校验与事务内二次断言 |
| T-8 | 管理端本地 `requireAdmin()` 包装在 DB 异常时的返回行为（是否 fail-open 返回 null 后被当作 403，还是误放行） | 模拟 DB 异常调用各本地包装接口，核对状态码与放行情况 | 兜底失效时越权 | 包装函数复用 guards 查库逻辑，异常统一 503 |

## 7. 覆盖说明

- 范围内共枚举 **229 个 `route.ts` 文件、336 个 handler（GET/POST/PUT/PATCH/DELETE）**，矩阵逐条列出；统计：合格 315、残缺 20、裸奔 1。
- 深读取证：管理端 admin 目录全部 80+ 路由逐一核对角色守卫；教师端 `teacher/` 31 个路由逐一核对 `requireCurrentTeacher` 与归属 where；报表/导出/文件访问/费用/考勤/反馈/试卷/亮点/课表等高风险目录逐条精读。
- 抽样说明：`settings` 下纯配置读写、`meals`/`rooms`/`subjects`/`fee-types` 等基础数据 CRUD 路由，以「守卫调用 + 角色判断行号」为抽样规则核对了入口守卫与写操作角色判断；其内部字段级归属因属 admin 全库管理范畴，未逐字段展开。
- 未覆盖（另一分册）：`parent`、`miniapp`、`public`、`qywx`、`wxpusher`、`ai` 目录，以及 auth 登录链路本身。
- 本报告不含任何真实密钥/密码/Secret/Token 值；所有凭据引用均为环境变量名。
