# 牧哲学堂教育管理系统全项目体检报告

> 审计日期：2026-08-25  
> 审计范围：`src/`、`scripts/`、`prisma/`、`public/`、项目配置与生产构建产物  
> 审计方式：代码静态扫描、依赖/死代码分析、关键业务链路人工追踪、生产构建与产物分析  
> 变更原则：首轮只处理无争议的生产调试日志；经负责人授权后，已按本报告优先级完成一批有回归测试支撑的安全、逻辑、性能与 UI 加固。大范围 Token 迁移和未确认业务规则仍未擅自修改。

## 执行摘要

本次共扫描约 740 个源码/脚本文件、246 个 TSX 文件、104 个页面文件。项目具备较完整的权限边界、错误提示、危险操作确认、移动端壳层安全区处理，并且学员等核心列表已使用服务端分页。最终生产构建和 TypeScript 检查通过。

最需要优先处理的不是格式问题，而是三类系统性风险：考勤两态界面可能改写历史四态数据；教师端与管理端对“首节课就餐登记”的定义不一致；Redis 已被业务代码动态引用但未声明为直接依赖，构建持续告警。视觉层面则存在“已有设计变量，但页面仍大量硬编码”的长期治理问题。

### 整改进度（同日更新）

| 编号 | 状态 | 本次处理 |
| --- | --- | --- |
| LOGIC-01 | **已整改** | 管理端与教师端均保留原始四态及 dirty 标记；未点击的 `ABSENT/MAKEUP` 再次提交时不再被静默改写，并新增纯函数回归测试。 |
| LOGIC-02 | **已整改** | 管理端 API、管理端 UI、教师端 API/UI 统一使用 `isFirstTeachingPeriod()`，口径统一为“系统配置的第一教学时段”。 |
| BUILD-01 / BUILD-02 | **已整改** | `redis`、`dayjs`、`server-only` 已声明为直接依赖；Redis 显式驱动缺少 URL、初始化失败或运行失败时拒绝静默降级。 |
| INTERACT-01 / 02 | **已加固** | 平板/手机停用原生 HTML5 拖拽并以“调课”弹窗为基线；学科排序增加触发距离与键盘传感器。仍需微信 WebView 真机验收。 |
| PERF-01 / 02 / 03 | **已整改** | ECharts、学员导入弹窗/XLSX、html2canvas 均改为按需加载。 |
| A11Y-01 / 02、UI-06 | **分批整改中** | 已覆盖 Layout/登录关键按钮、消息列表、教师试卷入口、反馈折叠与学生选择、成绩页试卷选择、志愿模拟筛选、移动教室与课次卡片、桌面教室矩阵。原生按钮补齐键盘语义，选中/折叠状态使用 ARIA，相关触控目标提升到至少 44px。复杂拖拽和嵌套卡片仍需继续。 |
| UX-01、DEVICE-04 | **已加固** | 三端壳层新增路由 loading；教师考勤三按钮布局增加显式 class fallback，不再依赖 `:has()` 才能正确排版。 |
| DATA-01 / DATA-02 | **已整改主要展示口径** | 教师工作台与 Layout 的留言数共享 `/api/messages/unread-count`；家长 Layout、首页与通知页共享 `/api/parent/unread-counts`，通知页改为数据库精确未读计数。完整 dashboard 数据拆分仍可作为后续性能优化。 |
| UX-02 | **已加固页面级错误恢复** | 管理端、教师端、家长端新增就近 `error.tsx`；共享错误状态提供重试、角色首页入口和问题编号，并按 Next.js 16 使用 `unstable_retry`。局部请求错误态仍需逐页推进。 |
| 产品上下文 | **已更新** | `PRODUCT.md` 已从单一“中考志愿模拟”旧记录升级为完整三端教学运营平台事实，明确核心闭环、子模块定位、生产约束和无障碍支持场景。 |
| CLEAN-04 | **已整改** | 逐项复核 `ts-prune` 可信候选：删除 5 个全项目无引用的旧组件/Hook，并移除 `FeedbackCard`、`SectionHeader` 两个无引用实现；保留仍被教师反馈页使用的常量和仍在使用的 `ParentCard`。 |
| INTERACT-04 | **已整改** | 教师反馈桌面侧栏改为扣除 56px 吸顶导航与上下间距的 sticky 可滚动区域；使用 `100vh` 回退和 `100dvh` 增强，避免矮屏/横屏底部不可达。 |
| REDUNDANT-04 | **已整改** | 报表摘要与 Excel 导出统一使用 `src/lib/domain-labels.ts` 的学员状态文案；同时收敛导出中的掌握度和志愿操作文案，并以参数化测试覆盖全部已知值及未知枚举回退。 |
| REDUNDANT-03 | **部分整改** | 新增 `formatLocaleDate()` / `formatLocaleDateTime()`，收敛三个账号管理页和管理端/家长端成长档案中输出完全一致的重复函数。金额符号、小数位、短日期和带星期格式存在产品差异，继续保留原实现。 |

本节之后的发现表保留审计时证据，便于追溯；状态以本整改进度和文末“已修复清单”为准。

### 健康度评分

| 维度 | 得分（0–4） | 结论 |
| --- | ---: | --- |
| 可访问性 | 2 | 全局焦点样式存在，但仍有大量非语义点击元素和不足 44px 的目标 |
| 性能 | 2 | 关键列表有分页，但个别路由静态带入大型依赖，客户端边界偏大 |
| 主题一致性 | 1 | Token 已建立，但硬编码颜色、圆角、描边和间距仍占主导 |
| 响应式与设备适配 | 2 | 主壳层安全区较完整；调课拖拽和旧 WebView 降级不足 |
| 实现完整性 | 2 | 构建通过且有共享业务组件，但跨端状态语义和计数来源仍有分叉 |
| **总分** | **9 / 20** | 可持续运行，但应先解决数据语义和生产依赖风险，再做视觉治理 |

## 优先级 Top 10

| 排名 | 编号 | 严重程度 | 问题 | 建议优先动作 | 安全自动修复 |
| ---: | --- | --- | --- | --- | --- |
| 1 | LOGIC-01 | 严重 | 教师考勤两态界面会把历史 `ABSENT` 归为 `LEAVE`、`MAKEUP` 归为 `PRESENT`，再次提交可能改写原始状态 | 明确四态到两态的产品迁移规则；提交时只更新用户实际改动项，并补回归测试 | 否 |
| 2 | BUILD-01 | 严重 | `redis` 被会话事件和限流模块动态引用但未声明，生产构建持续告警 | 将 `redis` 作为直接依赖；在 Redis 模式启动时 fail-fast，并补连通性健康检查 | 否 |
| 3 | LOGIC-02 | 严重 | 管理端与教师端对“可登记就餐的首节课”定义不同 | 抽取唯一判定函数并统一 API、文案和测试数据 | 否 |
| 4 | INTERACT-01 | 中等 | 管理端教师周课表调课只依赖 HTML5 `drag/drop`，触屏 WebView 不可靠 | 使用现有移动端“调课”弹窗作为触屏主路径，或迁移到 Pointer/Touch Sensor | 否 |
| 5 | PERF-01 | 中等 | 家长成长档案静态引入 ECharts，关联构建 chunk 约 1093.4 KiB | 改为 `next/dynamic`，仅图表进入视口/Tab 激活后加载 | 是（需页面回归） |
| 6 | UI-01 | 中等 | 设计系统存在三套圆角口径，且有 4494 处内联样式 | 先统一 `DESIGN.md`、AntD theme、CSS token，再分模块迁移 | 否（需视觉确认） |
| 7 | DATA-01 | 中等 | 未读数/待办数由 Layout、Dashboard、消息页多处独立请求与计算 | 建立统一 badge API/SWR key 和刷新策略 | 否 |
| 8 | A11Y-01 | 中等 | 多处用 `div`/图标承载点击，没有键盘语义或可访问名称 | 统一替换为 `button`/AntD Button，并保证 44×44 触控目标 | 是（需交互回归） |
| 9 | PERF-02 | 中等 | 学员页静态带入 XLSX 约 398.6 KiB；就餐页静态带入截图依赖 | 将导入弹窗、导出能力按需加载 | 是（需功能回归） |
| 10 | UX-01 | 中等 | 104 个页面仅 1 个路由级 `loading.tsx`，跨路由等待体验不统一 | 为三端壳层和高频数据页增加共享 Skeleton/loading 边界 | 是（需视觉确认） |

---

## 一、UI 布局一致性检查

### 发现

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| UI-01 | 中等 | `DESIGN.md`；`src/constants/theme.ts:44-165`；`src/app/providers.tsx` | 设计文档圆角阶梯为 4/6/8/12/16/24，常量为 6/8/12/16/20，AntD 又是 6/8/10/14；卡片常量 14、输入框 12。设计检测器因此把项目自身的 14px 卡片圆角判为越界，说明“规范”本身没有唯一来源。 | 先确定唯一圆角表，再由 `ANTD_THEME` 与 CSS 变量派生；不要先全局替换。 | 否 |
| UI-02 | 中等 | 全项目统计：4494 处 `style={{…}}`；最高为 `volunteer-sim/page.tsx` 266、`teacher/feedback/page.tsx` 189、`courses/page.tsx` 136、`schedule/intensive/page.tsx` 113 | 大量卡片、标题、间距与响应式规则被锁在组件内，难以统一主题，也使同类页面逐渐分叉。 | 按页面族迁移为 CSS Module/共享组件；先处理 Top 5 热点，不做机械全局替换。 | 否 |
| UI-03 | 中等 | 高频硬编码：`#e8784a` 411 次/112 文件、`#eee7e1` 250 次/57 文件、`#98a2b3` 161 次/42 文件、`#1f2329` 95 次/33 文件 | 品牌主色虽一致，但旧的冷灰色体系仍广泛存在，和暖色设计系统并行。 | 将颜色按语义映射到 `--color-primary`、`--color-hairline`、`--color-ink-*`，迁移时做截图对比。 | 否 |
| UI-04 | 轻微 | `src/components/Layout/TeacherLayout.tsx:266`、`src/app/login/page.tsx:164-302` | 品牌色同时存在 `#E8784A` 与近似值 `#E87545`；另有 `#27a644`、`#E24B4A` 等近似成功/错误色。 | 先增加 lint/检测规则阻止新增近似色，再逐页收敛旧值。 | 是（需视觉确认） |
| UI-05 | 中等 | 全项目 `<Empty>` 约 77 处，`BrandEmpty/GuidedEmpty` 约 48 处；例如 `teacher/dashboard` 使用品牌空态，`teacher/salary` 和 `parent/students/[id]/archive` 使用默认空态 | 同一角色端内的空状态在插画、文案层级、行动按钮上不一致。 | 约定：页面级/可恢复空态用 `GuidedEmpty`，局部表格无数据可用简版 `Empty`。 | 否 |
| UI-06 | 轻微 | `src/app/parent/schedule/client.tsx:230,234,363` | 品牌空态仍使用 🔗/📅/📚 Emoji，和项目“使用图标库、不用 Emoji 图标”的规范冲突。 | 替换为 `@ant-design/icons` 对应图标。 | 是 |

### 建议统一到主题变量的高频写法

| 当前写法 | 典型出现量/范围 | 目标 Token |
| --- | --- | --- |
| `#E8784A` / `#e8784a` / `#E87545` | 主色 411 次；近似色 55 次 | `var(--color-primary)` / `COLORS.primary` |
| `#EEE7E1` | 250 次 / 57 文件 | `var(--color-hairline)` |
| `#98A2B3` | 161 次 / 42 文件 | `var(--color-ink-subtle)` |
| `#1F2329` | 95 次 / 33 文件 | `var(--color-ink)` |
| `borderRadius: 8/10/12/14` | 多个页面重复；8px 单一对象至少重复 31 次 | 统一后的 radius token |
| `borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1'` | 至少重复 28 次 | 共享 Card variant/CSS class |

### 正向项

- `src/app/globals.css` 已建立完整暖色 CSS 变量，`ANTD_THEME` 也集中配置了主色与控件尺寸，具备收敛基础。
- 新版页面已大量使用 `var(--color-*)`，不是从零开始重建。

---

## 二、页面滑动 / 交互流畅度检查

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| INTERACT-01 | 中等 | `src/app/(main)/schedule/TeacherWeekView.tsx:305-337` | 调课依赖 `draggable`、`onDragStart`、`onDrop`，没有 Touch Sensor。微信 Android WebView 中可能无法拖动或与页面滚动冲突。 | 移动端隐藏拖拽暗示并强化已有“调课”按钮；中期改用 dnd-kit Pointer/Touch Sensor。 | 否 |
| INTERACT-02 | 中等 | `src/app/(main)/settings/SubjectsTab.tsx:45,96` | dnd-kit 只注册 `PointerSensor`，未设置触摸激活距离/延迟，标签排序在触屏上可能抢占滚动。 | 增加 `TouchSensor`/activationConstraint，并做 WebView 真机测试。 | 否 |
| INTERACT-03 | 轻微 | 13 处 fixed、18 处 sticky、36 处横向 auto-scroll | 数量本身不是缺陷，但这些区域缺少统一的“内容补偿 + 安全区 + 滚动条隐藏”组件约束，后续容易再次出现遮挡。 | 建立 `StickyActionBar`、`HorizontalScroller` 两个共享模式及验收用例。 | 否 |
| INTERACT-04 | 轻微 | `src/app/teacher/feedback/page.tsx`、`src/app/globals.css` | **已自动修复**：桌面侧栏 sticky 起点避开 56px 顶栏，最大高度扣除顶栏与间距；用 `100vh` 作为回退、`100dvh` 作为动态视口增强，并限制滚动链。 | 仍需在微信横屏真机上确认手感。 | 是（已修复，待设备验收） |
| LIST-01 | 中等 | `teacher/feedback/page.tsx` 47 个 `.map()`；`courses/page.tsx` 31 个；`volunteer-sim/page.tsx` 29 个 | `.map()` 数量不等于 DOM 数量，但这些超大客户端组件同时承担数据、筛选和渲染，后续数据增长会放大重渲染成本。 | 用 React Profiler 对真实大数据测试；按列表区块拆组件，只有实际超量列表再引入虚拟化。 | 否 |

### 已确认没有明显遮挡的部分

- `src/components/Layout/MobileLayout.tsx:374-395` 同时为固定头部、底部 Tab Bar 和 `safe-area-inset-bottom` 预留空间。
- 教师考勤提交栏在 `src/app/globals.css:6247-6248` 使用 `bottom: calc(68px + env(safe-area-inset-bottom, 0px))`。
- 学员、通知、薪资、成长档案等主要长列表已使用 API 分页或 AntD Pagination。`data-admin` 的 `limit=10000` 位于导出流程，不是页面 DOM 渲染。

---

## 三、项目逻辑检查

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| LOGIC-01 | 严重 | `src/app/teacher/attendance/page.tsx:21-26,212,304`；`src/app/api/teacher/attendance/route.ts:329-348`；`prisma/schema.prisma` 的 `AttStatus` | 教师 UI 只保留 `PRESENT/LEAVE`：`ABSENT → LEAVE`，其他状态（包括 `MAKEUP`）→ `PRESENT`。页面再次提交全体学生记录时，历史四态数据可能被静默改写；报表仍分别统计四态。 | 明确迁移策略；保留原始状态与 dirty 标记，只提交被用户改变的学生；为 ABSENT/MAKEUP 回显和二次提交补测试。 | 否 |
| LOGIC-02 | 严重 | `src/app/api/teacher/attendance/route.ts:200-208`；`src/app/api/admin/attendance/submit/route.ts:64-82` | 教师 API 以“系统课节配置中的第一教学时段”判断就餐；管理 API 以“该教师当天按时间排序的第一节实际课程”判断。相同课次可能在一端允许、另一端拒绝。 | 抽取 `resolveMealReportingLesson()`，由两端共用；确定缺课/临时调课时的业务规则。 | 否 |
| LOGIC-03 | 中等 | `src/lib/attendance-hours.ts`；`src/app/api/reports/attendance-stats/route.ts:58-61`；家长考勤页面 | 扣课时、补课申请、报表与家长展示都依赖四态语义，但规则分散在多个函数/API，缺少单一领域说明。 | 新增 attendance domain 文档与状态转换表，并以参数化测试覆盖“扣课时/补课/工资/家长展示”。 | 否 |
| DATA-01 | 中等 | `src/components/Layout/TeacherLayout.tsx:129-135`；`src/app/teacher/dashboard/page.tsx:171`；`src/app/teacher/attendance/page.tsx:98` | `/api/teacher/dashboard` 在 Layout、Dashboard 和考勤页分别订阅；未读消息又单独请求。虽 SWR 可去重，但刷新频率和 fallback 不同，页面不同位置可能短暂显示不同数字。 | 建立统一 badge hook 与稳定 SWR key；Dashboard 数据和 badge 数据职责分离。 | 否 |
| DATA-02 | 中等 | `src/components/Layout/ParentLayout.tsx:88`；`src/app/parent/dashboard/client.tsx:187`；`src/app/parent/notifications/page.tsx:23-31` 与 `client.tsx:100` | 家长端 Layout 使用聚合未读接口，Dashboard 从当前通知数组计算，通知页又以截断到 100 条的数组计算，口径可能不同。 | 统一以服务端 unread-count 为展示口径；本地数组只用于当前列表标记。 | 否 |
| LOGIC-04 | 中等 | `docs/production-safety.md` | 文档明确项目仍同时存在 legacy `Schedule` 与新 `ClassGroup/ClassLesson`。新增统计若只查询一种课表会漏数。 | 所有新增统计 PR 必须声明数据源范围；制定迁移和停用 legacy 的里程碑。 | 否 |

### 共享逻辑正向项

- 晚托作业班已经通过 `StudyHallWorkspace.tsx` 共享核心工作区。
- 服务中心通过 `ServiceOverviewPage.tsx` / `ServiceDetailPage.tsx` 被三端薄封装复用。
- 课时扣减、余额、个性化课程结算已经开始下沉到 `src/lib/`，方向正确。

---

## 四、代码整理

### `ts-prune`

命令：`npx --yes ts-prune`

结果噪声较高：工具扫描了 `.next` 生成类型，并把 Next.js 约定导出误判为未使用，因此没有根据工具结果批量删除。后续逐项使用 `rg`、TypeScript、测试和生产构建复核，下列可信候选现已处理：

- `src/components/FeedbackCard.tsx`：移除无引用的 `FeedbackCard` 组件和相关客户端依赖，保留仍被教师反馈页引用的 `MOODS`、`QUICK_TAGS`、`QUICK_KPS`、`BADGES`。
- 删除无引用的 `src/components/Dashboard/TeacherDailyWorkflow.tsx`。
- 删除无引用的 `src/components/Parent/TodayStatus.tsx`。
- `src/components/Parent/ParentCard.tsx`：移除无引用的 `SectionHeader`，保留在家长课表、通知和课堂反馈页面使用的 `ParentCard`。
- 删除无引用的 `src/components/teacher/StudentContextPanel.tsx`。
- 删除无引用的 `src/components/Volunteer/SchoolCard.tsx`。
- 删除无引用的 `src/hooks/useCountUp.ts`。

本批清理没有改变路由、业务数据、权限或现有交互；复验结果见文末。

### `depcheck`

命令：`npx --yes depcheck --json`

| 类型 | 发现 | 判断 | 安全自动修复 |
| --- | --- | --- | --- |
| 疑似未使用依赖 | `@fullcalendar/*`、`@auth/prisma-adapter`、`jspdf-autotable` | 源码未检出引用；删除会改 lockfile，需确认历史脚本/部署用途 | 否 |
| 疑似未使用开发依赖 | Tailwind/PostCSS/React types 等 | Tailwind 实际由 CSS/PostCSS 配置使用，属于 depcheck 误报 | 否 |
| 未声明直接依赖 | `dayjs`、`server-only` | 多个源码文件直接 import，但根依赖列表为空，当前依赖来自传递依赖，升级后可能失效 | 否 |
| 未声明可选依赖 | `redis` | 构建真实告警，且生产限流/踢下线事件会使用 | 否 |
| 脚本依赖 | `dotenv` | 由 `scripts/` 使用；需明确放 dependencies 还是 devDependencies | 否 |
| 扫描噪声 | `.review/` 中的 `playwright` | 非产品源码，不应进入项目依赖结论 | 不适用 |

### 调试代码与待办

| 编号 | 严重程度 | 发现 | 处理 | 安全自动修复 |
| --- | --- | --- | --- | --- |
| CLEAN-01 | 轻微 | `src/lib/volunteer.ts` 的默认图片回填 `console.log` | **已自动修复** | 是 |
| CLEAN-02 | 中等 | `src/lib/teacher-salary.ts` 输出 feedbackId、teacherId、学员 ID、奖励资格等明细 | **已自动修复**，避免生产日志暴露业务明细 | 是 |
| CLEAN-03 | 轻微 | `src/` 中未发现剩余 `console.log`、`debugger`、TODO/FIXME/HACK | 无需处理；`scripts/` 中正常 CLI 输出不应删除 | 不适用 |

---

## 五、冗余代码检查

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| REDUNDANT-01 | 中等 | `TeacherLayout`、教师 Dashboard、教师考勤页 | 同一 dashboard/badge 数据被多个常驻组件订阅，接口与刷新责任重叠。 | 将 badge 与完整 dashboard 数据拆开；由统一 hook 管理。 | 否 |
| REDUNDANT-02 | 中等 | 4494 个内联样式；重复 `width:'100%'` 169 次、`fontSize:12` 74 次、`marginBottom:16` 57 次 | 重复对象增加维护成本，并使响应式修改散落。 | 优先抽取有语义的组件样式，不要为单个属性制造无意义 class。 | 否 |
| REDUNDANT-03 | 轻微 | 5 个页面各自实现 `formatDate`；多处金额使用 `¥/￥`、`toFixed`、`toLocaleString` 的不同组合 | **已部分自动修复**：`src/lib/format-date.ts` 新增本地日期/日期时间函数，并迁移三个账号管理页、管理端学员成长档案和家长成长报告中语义完全相同的调用。 | 金额正负号、`¥/￥`、小数位、短日期与带星期格式需先确定产品规范，再继续收敛。 | 是（日期已修复，金额待确认） |
| REDUNDANT-04 | 轻微 | `src/app/api/reports/summary/route.ts`、export route、`src/lib/domain-labels.ts` | **已自动修复**：学员状态、试卷掌握度和志愿操作文案使用共享纯函数；未知枚举保留原始值，避免空白或错误替换。考勤文案涉及“旷课/缺勤”等产品口径，暂不擅自合并。 | 后续新增枚举时同步扩充共享映射和参数化测试。 | 是（已修复） |
| REDUNDANT-05 | 轻微 | `ParentCard`、多个页面自定义统计卡片/SectionHeader；教师详情页另有同名局部 `SectionHeader` | 视觉近似但 API 不统一，造成复制粘贴。 | 先确认 2–3 个稳定变体，再合并；不要追求一个万能卡片。 | 否 |

---

## 六、性能与加载速度

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| PERF-01 | 中等 | `src/app/parent/archive/client.tsx:13` | 静态 import `echarts-for-react`，构建关联 ECharts chunk 约 1093.4 KiB（未压缩）；家长档案首屏可能承担不必要解析成本。 | 与 Dashboard 图表一样改用 `next/dynamic`，Tab 打开后加载。 | 是（需回归） |
| PERF-02 | 中等 | `src/app/(main)/students/_components/ImportModal.tsx:6`，并由学员页静态 import | XLSX chunk 约 398.6 KiB，即使用户不打开导入弹窗也进入该路由依赖图。 | 动态加载整个 ImportModal，或在文件选择后动态 import `xlsx`。 | 是（需回归） |
| PERF-03 | 中等 | `src/app/(main)/meals/StudentMealLedger.tsx:5` | `html2canvas` 静态 import；构建关联两个大型支持 chunk（约 322.5 + 193.4 KiB）。 | 点击生成台账图片时再 import。 | 是（需回归） |
| PERF-04 | 中等 | 185 个源码文件含 `'use client'`；最大客户端文件包括 `volunteer-sim` 2253 行、`teacher/feedback` 1801 行、`schedule/intensive` 1198 行 | 客户端边界偏宽，大组件会增加 hydration、解析和重渲染成本。 | 优先将静态说明、标题、只读卡片移出客户端边界；交互岛保留 client。 | 否 |
| PERF-05 | 中等 | `public/` 84 个栅格图共 65.62 MiB；36 个超过 1 MiB，共 45.87 MiB | 服务海报属于刻意保留原图，但 `marketing/main-business`、`muzhe-brand-banner.png`、`people/*.png` 也有 1.5–2 MiB 文件。若仍被页面使用，会增加移动流量。 | 先核对引用；展示图生成 WebP/AVIF，下载原图仍保留。不要删除可能由外部 URL 直链的静态资源。 | 否 |
| PERF-06 | 轻微 | `src/components/AI/AIChatPanel.tsx` | PDF.js 与 mammoth 已使用动态 import。 | 保持现状，并为大文件解析设置大小/页数上限。 | 不适用 |

### 图片加载正向项

- `src/` 未发现原生 `<img>`；页面图片基本使用 Next `<Image>` 或 AntD 图片组件。
- 服务中心宣传资料原图按产品要求保留，不列为错误。

### 构建产物中的关键路由/依赖体积

Next.js 16 本次构建不再打印旧版“每路由 First Load JS”列。下表来自 `.next/static/chunks`，为**未压缩的页面专属 chunk 或可明确关联的大型依赖 chunk**，不包含共享 React/AntD/runtime，因此不能相加当作完整下载量。

| 路由/能力 | 页面专属 chunk | 关联大型依赖 chunk | 说明 |
| --- | ---: | ---: | --- |
| `/schedule` | 64.0 KiB | — | 最大页面专属 chunk |
| `/teacher/feedback` | 63.5 KiB | — | 1801 行客户端组件 |
| `/volunteer-sim` | 62.5 KiB | 按需 PDF/截图 chunk | 页面复杂度高 |
| `/settings` | 58.2 KiB | — | 多设置 Tab 汇总 |
| `/courses` | 57.8 KiB | — | 请求/交互面较广 |
| `/parent/archive` | 29.9 KiB | ECharts 1093.4 KiB | 当前为静态图表 import |
| `/students` | 35.0 KiB | XLSX 398.6 KiB | ImportModal 静态 import |
| `/meals` | 19.1 KiB | 截图支持 chunk 322.5 + 193.4 KiB | html2canvas 静态 import |

---

## 七、易用性检查

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| UX-01 | 中等 | 104 个 `page.tsx`，仅 `src/app/teacher/meals/loading.tsx` 一个路由 loading；只有根 `error.tsx`/`global-error.tsx` | 页面内部多有 Spin/Skeleton，但跨路由数据等待缺少稳定骨架，慢网可能出现页面级空白/跳变。 | 为三端 layout 增加共享 loading，随后给排课、学员、反馈、档案等高频页补局部边界。 | 是（需视觉确认） |
| UX-02 | 中等 | 默认 `Empty` 与 `GuidedEmpty/BrandEmpty` 混用 | 加载失败有时被表现为“暂无数据”，用户无法区分空数据与接口错误。 | 制定 Loading/Empty/Error 三态组件约定，错误态必须提供重试。 | 否 |
| A11Y-01 | 中等 | Layout、登录页及多个 `div onClick`（消息卡、课表卡、学生选择等） | **分批整改中**：除上一批外，本轮完成成绩页年级与试卷选择、志愿模拟桌面/移动筛选、移动教室折叠与课次卡片、桌面教室矩阵课程/空时段、教师反馈学生选择；均改为原生按钮并补选中/展开状态。 | 继续处理剩余周课表、热力图、志愿卡片内部操作等复杂目标；拖拽区域需保留独立 Pointer/Touch 语义。 | 是（已完成多批，需继续） |
| A11Y-02 | 中等 | `Sidebar.tsx:147-151`、`ParentLayout.tsx:245-250` | 32×32 的折叠按钮低于 44×44 通用触控建议；部分按钮还缺 `type`/aria-label。 | 可视图标保持 32px，但交互盒扩大到 44px。 | 是（需视觉确认） |
| UX-03 | 轻微 | 财务、学员、课程、资料、账号管理页面 | 抽查的删除/停用/离校操作普遍有 Popconfirm/Modal；提交按钮也大多有 loading 状态。 | 保持现状；为 API 增加幂等键比单纯前端防抖更可靠。 | 不适用 |
| UX-04 | 轻微 | `src/app/(main)/dashboard/page.tsx` | 管理端首页同时展示 Hero 指标、今日安排、异常中心和图表，信息密度高，但未发现和家长/教师首页相同的明显重复区块。 | 通过真实运营访谈确认低频图表是否应折叠，不建议仅凭静态代码删减。 | 否 |

### 可访问性正向项

- `src/app/globals.css:2202-2208` 有全局 `:focus-visible` 轮廓。
- `prefers-reduced-motion` 已在全局样式、启动页和下拉刷新中处理。
- 主要危险操作使用明确文案和二次确认。

---

## 八、不同手机型号 / 设备适配检查

| 编号 | 严重程度 | 文件/证据 | 问题与影响 | 建议 | 安全自动修复 |
| --- | --- | --- | --- | --- | --- |
| DEVICE-01 | 轻微 | `MobileLayout.tsx:374-395`；全项目约 32 处 bottom safe-area、7 处 top safe-area | 主移动壳层处理正确；零散页面仍直接使用 `100vh` 和自建 sticky 区，横屏/地址栏伸缩时可能不稳定。 | 新页面统一使用 `100dvh` + `100vh` fallback，并复用壳层变量。 | 否 |
| DEVICE-02 | 中等 | 大部分页面只调用默认 `useIsMobile()`；课表页面额外使用 `useIsMobile(1025)` | 中间断点只在课表等少数页面存在。768–1024px 平板上，部分双栏页面可能出现拥挤或空白。 | 定义 mobile/tablet/desktop 三档 token；优先验证消息双栏、反馈、排课、学员详情。 | 否 |
| DEVICE-03 | 中等 | 多处 8–11px 字号、32px 图标按钮、横向密集筛选 | iPhone SE 等窄屏上可读性和触控面积不足；检测器也标出大量非设计字号。 | 交互文字不低于 12px，正文不低于 14px，触控盒不低于 44px。 | 否 |
| DEVICE-04 | 中等 | `src/app/globals.css` 有 32 处 `color-mix()`、9 处 `:has()`、6 处 `content-visibility`；另有 `backdrop-filter` | 新版微信 WebView 通常可用，但低版本 Android WebView 可能忽略声明。教师考勤三按钮网格依赖 `:has()`，失败时布局会退回两列。 | 在高级声明前提供静态 fallback；用 `@supports` 包裹增强效果。 | 是（需兼容测试） |
| DEVICE-05 | 中等 | `TeacherWeekView.tsx` 的 HTML5 拖拽 | 触屏兼容问题见 INTERACT-01。 | 以点击调课为移动端基线能力。 | 否 |
| DEVICE-06 | 轻微 | 教师反馈、消息双栏、AI 面板使用 `calc(100vh - …)` | 横屏高度较低时，sticky/内部滚动可能形成双滚动区。 | 在 812×375、844×390 等横屏尺寸做专项测试；不建议锁定竖屏。 | 否 |

### 设备验证限制

本次没有可用的管理端/教师端/家长端测试账号，因此无法在真实登录态下完成微信 iOS/Android WebView 的交互验收。上述设备结论来自代码、CSS 和构建产物审计；拖拽、横屏、刘海安全区仍需真机测试后关闭问题。

---

## 按严重程度汇总

### 严重

1. `LOGIC-01`：教师考勤两态回显/全量提交可能改写历史四态。
2. `BUILD-01`：Redis 未声明导致生产构建告警，Redis 模式存在启动/降级不透明风险。
3. `LOGIC-02`：管理端和教师端就餐首节课判定不一致。

### 中等

- UI：UI-01、UI-02、UI-03、UI-05。
- 交互/设备：INTERACT-01、INTERACT-02、LIST-01、DEVICE-02、DEVICE-03、DEVICE-04、DEVICE-05。
- 数据与逻辑：LOGIC-03、LOGIC-04、DATA-01、DATA-02。
- 代码/性能：BUILD-02（未声明直接依赖）、REDUNDANT-01、PERF-01 至 PERF-05。
- 易用性/可访问性：UX-01、UX-02、A11Y-01、A11Y-02。

### 轻微

- UI-04、UI-06、INTERACT-03、REDUNDANT-03、REDUNDANT-05、PERF-06、UX-03、UX-04、DEVICE-01、DEVICE-06。INTERACT-04 已完成代码整改，待微信横屏真机验收；REDUNDANT-04 已完成。
- CLEAN-01、CLEAN-02 已修复；CLEAN-03 无残留。

> 注：`BUILD-02` 指 `dayjs`、`server-only` 等直接 import 却未在根依赖声明的问题；与 Redis 的运行风险不同，当前构建不会因此失败，但仍应在下一次依赖整理中修正。

---

## 已自动修复清单

| 文件 | 修复 |
| --- | --- |
| `src/lib/volunteer.ts` | 删除默认图片回填时的生产 `console.log` |
| `src/lib/teacher-salary.ts` | 删除包含 feedback/teacher/lesson/学员 ID 与奖励判定明细的生产 `console.log` |
| `src/lib/attendance-status.ts`、两端考勤页 | 两态编辑器保留未触碰的四态历史数据，避免数据语义被静默覆盖 |
| `src/app/teacher/attendance/page.tsx` | 修复过早点击提交后互斥锁未释放、后续无法再次提交的问题 |
| `src/app/api/admin/attendance/submit/route.ts` | 管理端就餐校验统一为系统第一课节 |
| `src/lib/rate-limit.ts`、`src/lib/session-events.ts` | Redis 显式模式 fail-closed；非法驱动与缺失 URL 提供明确错误 |
| `package.json`、`package-lock.json` | 补齐 `redis`、`dayjs`、`server-only` 直接依赖 |
| 家长档案、学员导入、就餐台账 | 将 ECharts、导入弹窗/XLSX、html2canvas 改为按需加载 |
| 三端 `loading.tsx` | 增加管理端、教师端、家长端路由级加载骨架 |
| Layout、登录、家长课表、课表/设置交互 | 修正关键按钮语义和触控面积、Emoji 图标、触屏调课路径、键盘排序及 `:has()` fallback |
| 家长未读聚合、通知页、教师工作台 | 统一服务端未读口径；批量/单条已读操作校验 HTTP 结果并同步刷新共享 SWR 缓存 |
| `src/components/Common/AppErrorState.tsx`、三端 `error.tsx` | 增加角色就近错误恢复页，修正 Next.js 16 错误边界重试接口 |
| `PRODUCT.md` | 按 Impeccable schema 1 记录完整平台用户、用途、能力、安全约束和产品原则 |
| 5 个无引用旧组件/Hook、`FeedbackCard`、`ParentCard` | 删除已确认无引用的遗留实现，保留仍有调用方的常量与组件 |
| `src/app/teacher/feedback/page.tsx`、`src/app/globals.css` | 修复桌面 sticky 侧栏未扣除顶栏、矮屏底部不可达的问题，增加动态视口与旧浏览器回退 |
| `src/lib/domain-labels.ts`、两个报表 API | 统一学员状态、试卷掌握度和志愿操作文案，新增未知枚举安全回退与参数化测试 |
| `src/lib/format-date.ts`、账号管理与成长档案页面 | 收敛完全等价的本地日期/日期时间格式函数；未改变现有输出、时区或空值文案 |
| 教师/管理端消息、教师试卷、教师反馈页 | 将安全范围内的非语义点击项替换为原生按钮，补充选中/展开状态和 44px 触控目标 |
| 成绩、志愿模拟、移动排课、教室矩阵、教师反馈学生选择 | 批量替换可安全迁移的非语义点击项，补齐 `aria-pressed`、`aria-expanded`、`aria-controls` 与 44px 触控区域 |
| 教师周课表、周热力图、家长课表、志愿模拟 | 补齐周切换与日期折叠语义、课程/学校卡片键盘入口、志愿移除和换位按钮，并将关键触控目标提升到 44px；保留原拖拽、弹窗及计算逻辑 |

仍未自动处理：全项目视觉 Token 批量替换、badge 数据源重构、旧/新课表数据迁移、所有历史非语义点击元素、图片批量压缩与大客户端组件拆分。这些事项需要页面截图、真实数据或产品口径确认。

---

## 构建与工具结果

### 生产构建

命令：`npm run build`（脚本实际执行 `next build --webpack`）

- 首次：Webpack 编译成功，类型检查被 `.next/dev/types/validator.ts` 中已删除的临时预览路由 `/people/service-preview` 缓存阻塞。
- 处理：仅删除生成缓存 `.next/dev`，未修改产品源码。
- 整改后最终复验：**通过**。Next.js 16.2.6；Webpack 编译和 TypeScript 均通过；108 个静态页面生成完成；路由清单生成完成。
- 整改后不再出现 `redis` 无法解析警告。
- Next.js 16 构建输出不提供旧版逐路由 First Load JS 数值；因此本报告保留首次审计的 chunk 基线作为整改前对照，不把它当作整改后的首屏下载量。

### 测试与依赖安全

- `npx tsc --noEmit`：**通过**。
- 针对本轮变更文件的 ESLint：**通过，无警告**。
- `npm test`：**67 个测试文件、324 个用例全部通过**。
- 新增回归覆盖：四态考勤无改动提交、用户显式修改、配置化第一课节判断、Redis 显式模式缺失 URL。
- `npm audit --json`：**0 个已知漏洞**（low/moderate/high/critical 均为 0）。
- Impeccable UI detector：已对本次涉及的 15 个 UI/CSS 目标运行一次；命中主要为既有硬编码颜色、字号、圆角债务，没有本次新增的阻断级问题。

### 后续安全清理复验（2026-08-25）

- `npm run type-check`：**通过**。
- 变更文件 ESLint：**通过，无警告**。
- `npm test`：**67 个测试文件、324 个用例全部通过**。首次在受限沙箱内因 Windows 子进程 `EPERM` 未启动，按权限要求重新运行后通过；这不是测试用例失败。
- `npm run build`：在未使用代码清理后通过；完成 `INTERACT-04` 后再次复验仍为**通过**。Webpack 编译、TypeScript、页面数据收集与 108 个静态页面生成均完成。

### 共享领域文案复验（2026-08-25）

- 新增 `src/lib/domain-labels.test.ts`：**14 个参数化用例通过**。
- `npm run type-check` 与变更文件 ESLint：**通过**。
- `npm test`：**68 个测试文件、338 个用例全部通过**。
- `npm run build`：**通过**；Webpack 编译、TypeScript 与 108 个静态页面生成完成。

### 日期格式安全收敛复验（2026-08-25）

- 新增 `src/lib/format-date.test.ts`：**4 个用例通过**，对照原生 `zh-CN` 输出并覆盖空值文案。
- `npm run type-check` 与变更文件 ESLint：**通过**。
- `npm test`：**69 个测试文件、342 个用例全部通过**。
- `npm run build`：**通过**；Webpack 编译、TypeScript 与 108 个静态页面生成完成。

### 可访问性交互批次复验（2026-08-25）

- 变更文件静态扫描：目标范围只剩教师反馈页两处带嵌套操作的学生选择卡片，已留待交互层级拆分，不做无效的嵌套按钮改造。
- `npm run type-check` 与变更文件 ESLint：**通过**。
- `npm test`：**69 个测试文件、342 个用例全部通过**。
- `npm run build`：**通过**；Webpack 编译、TypeScript 与 108 个静态页面生成完成。

### 可访问性交互批次二复验（2026-08-25）

- UI 静态复核：成绩页、志愿筛选、移动教室/课次、教室矩阵、教师反馈学生选择均已使用原生按钮；志愿页目标范围剩余的 `div onClick` 仅用于阻止父级事件冒泡，不是操作入口。
- `npm run type-check` 与 5 个变更文件 ESLint：**通过**。
- `npm test`：**69 个测试文件、342 个用例全部通过**。
- `npm run build`：**通过**；Webpack 编译、TypeScript 与 108 个静态页面生成完成。

### 可访问性交互批次三复验（2026-08-25）

- 教师周课表：上一周/下一周/本周按钮达到 44px；可拖拽课程卡片增加键盘查看入口，移动端点击调课路径与桌面拖拽逻辑保持不变。
- 周热力图：普通班和突击班日期格改为原生按钮，补充包含教室、日期和班型的可访问名称。
- 家长课表：日期折叠补充 `aria-expanded`/`aria-controls`，课堂反馈按钮触控高度提升到 44px。
- 志愿模拟：结果筛选、学校详情卡、志愿移除和换位入口支持键盘操作；密集换位按钮允许换行并提供 44px 触控区域。
- `npm run type-check` 与 4 个变更文件 ESLint：**通过**。
- `npm test`：**69 个测试文件、342 个用例全部通过**。首次受限沙箱内因 Windows 子进程 `EPERM` 未启动，授权后复验通过；不是用例失败。
- `npm run build`：**通过**；Webpack 编译、TypeScript、页面数据收集与 108 个静态页面生成均完成。
- 全量 `npm run lint` 当前被非产品评审辅助文件 `.review/screenshot_flyer.cjs` 的 3 条 `no-require-imports` 错误阻塞，另有 `flyer-reference/editor.js` 2 条未使用异常变量警告；本批产品源码定向 lint 为零错误、零警告。为避免误删评审资产，本轮未自动处理这两个目录。

### 本次使用的检查

```text
npx --yes ts-prune
npx --yes depcheck --json
npx tsc --noEmit
npm run lint -- <本轮变更文件>
npm test
npm audit --json
npm run build
项目级 rg/PowerShell 静态统计
Impeccable 设计反模式检测（代表性布局、考勤、课表与全局 CSS）
```

设计检测器的可信发现主要是：设计系统外颜色/字号/圆角、`transition: width/margin-left` 布局动画；大量“侧边强调线”属于项目现有业务视觉语言，不应脱离页面上下文机械删除。

## 建议的实施顺序

1. 在微信 iOS/Android WebView 上回归考勤、就餐、移动调课、学科排序、登录密码按钮与三端 loading。
2. 建立 badge 单一来源与加载/空/错三态规范。
3. 明确 legacy `Schedule` 的迁移/停用时间，并为跨表统计补数据源约束。
4. 按页面族推进 Token、空态和剩余可访问性治理，每次都配截图与三端回归，避免一次性大改。
