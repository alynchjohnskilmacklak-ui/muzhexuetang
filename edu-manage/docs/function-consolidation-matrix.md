# 功能收敛矩阵（P0）—— 三端功能冗余与调用关系核查

> 目的：纠正「按目录/模型名统计重复」的过重结论，改为按「页面 → API → 模型」真实调用关系，把三端页面标注为
> **正式入口 / 兼容跳转 / 专业详情 / 确实废弃 / 已统一**。本文件是后续 P1–P5 改造的唯一依据，先不改 Prisma schema。

## 一、核心结论（纠正）

1. **成长时间线已经统一**（这是 codex 以为还需要做的 P1）：
   - 服务层 `src/lib/student-profile.ts` 已实现统一 `TLItem` 时间线，`type` 覆盖 `paper / feedback / post / badge / grade / goal`，把 `ExamPaper`、`ClassroomFeedback`、`PerformancePost`、`AchievementBadge`、`GradeRecord`、`LearningGoal` 等**多张业务表转换成同一个 DTO**，没有合并表。
   - 家长端统一入口是「成长主页」`/parent/archive`（`ParentArchiveClient`），已含时间线、学科筛选、知识掌握、成绩趋势、徽章、目标、教师寄语、PDF 报告，且**已做移动端适配**（`useIsMobile`、grid 折叠、签名图、`maxWidth`）。
   - 教师端统一入口是「教学记录」`/teacher/feedback`（89KB 主页面）。
2. **部分「重复页面」其实是兼容跳转（redirect shim）**，不是又实现了一套功能。

## 二、兼容跳转清单（保留，供旧链接使用，P5 阶段再评估删除）

| 旧路径 | 跳转到 | 说明 |
|---|---|---|
| `/teacher/performance` | `/teacher/feedback` | 教师「表现反馈」已并入教学记录 |
| `/teacher/classroom-feedback` | `/teacher/feedback`（带 lessonId） | 教师「课堂反馈」已并入 |
| `/parent/growth` | `/parent/archive` | 旧「成长动态」并入成长主页 |

## 三、三端页面分类

### 家长端 `/parent/*`（导航 19 项）

| 页面 | 分类 | 说明 |
|---|---|---|
| dashboard | 正式入口 | 首页 |
| schedule / class-feedback / archive / teachers | 正式入口 | 学习与成长组 |
| volunteer/schools / volunteer / volunteer/rank-query | 正式入口 | 中考志愿（rank-query 复用了 `(main)/volunteer-sim/rank-query` 页面） |
| notifications / messages | 正式入口 | 消息沟通 |
| meals / leave / hour-records | 正式入口 | 生活服务 |
| materials / phet / ai | 正式入口 | 学习资源 |
| benefits / bind / profile | 正式入口 | 账户设置 |
| archive（成长主页） | **已统一** | 统一成长时间线，覆盖反馈/试卷/动态/徽章/成绩/目标 |
| grades / performance | **专业详情** | 试卷详情 + 表现动态详情，从 archive 深链进入，不在导航 |
| attendance / fees | **专业详情** | 考勤日历 / 缴费，从首页深链进入 |
| study-hall | **正式入口** | 晚托与周末作业记录，复用 Notification 未读体系 |
| growth / volunteer/guide | 兼容跳转 | 见上表 |

### 教师端 `/teacher/*`（导航 16 项）

| 页面 | 分类 | 说明 |
|---|---|---|
| dashboard / schedule / intensive / attendance / feedback | 正式入口 | 工作台 + 教学工作 |
| messages / leave / meals | 正式入口 | 沟通与服务 |
| students / papers / materials | 正式入口 | 学员与资源 |
| benefits / salary / phet / ai | 正式入口 | 个人与工具 |
| study-hall | **正式入口** | 独立作业班工作台，不参与课堂反馈奖励、课时或工资 |
| performance / classroom-feedback | 兼容跳转 | 见上表 |
| student / student-profile | 专业详情 | 学员详情页，深链进入 |

### 管理端 `/(main)/*`（导航约 20 组）

| 页面 | 分类 | 说明 |
|---|---|---|
| dashboard / students / teachers / teacher-logs / teacher-salary / courses / academic-terms / schedule(+intensive) / attendance / classroom-feedback / fees / meals / student-archive / parent-messages / notifications / volunteer(+volunteer-sim/schools/rank-query) / reports / data-admin / login-records / parent-access / materials / phet / ai / settings | 正式入口 | 见 `Sidebar.tsx` menuItems |
| grades | **专业详情/疑似遗留** | 33KB 页面，未挂导航 |
| performance | **专业详情/疑似遗留** | 10KB 页面，未挂导航 |
| communications | **专业详情/疑似遗留** | 10KB 页面，未挂导航 |
| feedback | **空目录** | 无 page.tsx，仅残留目录 |
| study-hall | **正式入口** | 作业班、成员、教师任期和周末时段管理 |

## 四、其余冗余点（数据层，非页面）

1. **排课双轨**：`Schedule`（legacy）与 `ClassGroup/ClassLesson` 并存，代码双读双写（`teacher-busy.ts`、`parent-dashboard.ts`、`admin/cleanup` 等）。→ P4 单独迁移。
2. **消息多轨**：`Notification`（系统通知）、`ParentMessage`（人工对话）、`ClassroomFeedback.parentReply`（反馈内嵌回复）。→ P3 统一「消息中心」界面，但不合并表。
3. **资源三件套**：`materials/phet/ai` 三端各一份页面，但三端权限与操作能力不同，保留角色路由，仅抽共享组件/服务。

## 五、建议实施顺序（与 codex 对齐）

- **P0（本文）**：完成调用矩阵。✅
- **P1**：统一三端导航 + 成长时间线。**已基本完成**（student-profile.ts + archive + 教师 feedback 单入口）；剩余仅需确认 `(main)/grades|performance|communications` 三个未挂导航的管理页是「深链详情」还是「废弃」。
- **P2**：统一推送/已读/附件/家长互动服务（抽公共 service，不改 schema）。
- **P3**：反馈回复接入统一消息中心（`ClassroomFeedback.parentReply` → `ParentMessage`）。
- **P4**：`Schedule → ClassLesson` 迁移（分阶段，不直接删表）。
- **P5**：删除兼容跳转与确认无调用的死代码（含空目录 `(main)/feedback`、根 `src/app/{students,teachers,...}` 空目录）。

## 六、待确认项（需要你拍板）

1. `(main)/grades`、`(main)/performance`、`(main)/communications` 三个管理页是否还在用？（决定是「保留挂导航」还是「删」）
2. 家长端 `attendance`、`fees` 两个深链详情页是否要挂回导航？
