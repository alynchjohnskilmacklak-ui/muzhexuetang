# S4 · UI 改动对业务流程的影响（第七轮 · 只读流程审查）

> 主题：这批 UI 改动是否让业务流程变难走或走不通。只报流程影响与红线事实，不评价配色美观，不提"整体重构"建议。
> 仓库：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`；基线快照 `_audit20261112\S0-变更集快照.json`。
> 取证方式除注明外均为**代码层只读推断**；未启动 3000 端口 dev、未跑 dev、未改源码/库、未做 git 操作。审计期间本域文件与快照逐一比对：**75/76 文件字节数一致**；1 处 mtime+size 漂移见 §1.3，本报告取证基于当前磁盘内容。

## 1. 本片覆盖

### 1.1 文件与页面

- 快照命中本域 **76 个文件 / 42,847 行 / 1.45 MB**（components、globals.css、全部 `.module.css`、parent/teacher/(main) dashboard、各 layout 与 Layout 组件）。
- 分组计数：components 55（Layout 12、Dashboard 8、teacher 8、Parent 7、根目录散件 7、AI 5、Common 5、DataAdmin/PhET/Services 各 1）；app 侧 21（三个 dashboard 目录共 4 个页面文件、各目录 `.module.css` 15、globals.css 1、`app/layout.tsx` 1）。
- 页面走查：`parent/dashboard`、`teacher/dashboard`、`(main)/dashboard`；布局侧快照内 `app/layout.tsx`、`teacher/layout.tsx`、`ParentLayout`、`TeacherLayout`、`MobileLayout`、`MainLayout`；`parent/layout.tsx`、`(main)/layout.tsx` 磁盘存在但本轮快照未变更，仅引读结构。引读页面级 UI 结构（抽屉/折叠/死路/滚动）结论只出 UI 侧，页面正文业务口径归 S1/S2/S3。
- 闭环节点数（UI 侧）：入口导航 3 套（家长端/教师端/管理端底部导航 + 抽屉分组）、弹层容器 3 类（BrandModal/ResponsiveDialog/SafeFormModal）、AI 悬浮助手 1 套、全屏练习沉浸层 1 套、提交反馈面 6 处、空态组件 2 类。

### 1.2 量化统计口径（PowerShell 只读扫描本域文件）

| 指标 | 数值 | 备注 |
|---|---|---|
| `!important` 总数 | **689**（globals.css 533，其他文件 156） | 其他文件 Top：practice-bank.module.css 37、vocab.module.css 23、homework.module.css 16、FeedbackComposer.module.css 11、attendance.module.css 11（按文件名聚合，存在同名文件） |
| `box-shadow` 声明 | **387**（var() 令牌 50，裸写 **337**） | 基线量级 `0 6px 18px rgba(26,18,1,.08)` |
| `border-radius` 声明 | **979** | Top10 见 §7 红线表 |
| `overflow:hidden` + 邻近固定高度组合 | **62** | CSS 内 ±6 行窗口判定 |
| `animation` 声明 / `transition` 声明 | 63 / 219 | CSS 全量 |
| `animation-delay`（CSS 2 + TSX 内联 2） | 4 | 本域内联仅 `parent/dashboard/client.tsx:762,828` |
| 含 `prefers-reduced-motion` 的 CSS 文件 | **13 / 33** | 另有全局兜底 `globals.css:156-165` |
| `100vh` / `100dvh` | 23 / 32 | 残留 100vh 见 §5.3 |
| 非测试文件符号（emoji/装饰字形）行 | **98**：emoji 58、dingbat 25、箭头 8、几何形 4、混合 3 | 明细见 §7 红线表 |
| 内联/样式表按钮热区 <44px | 8 处可点元素（清单 §8） | 其余 32–40px 为装饰图标盒，非独立热区；另有若干 32–36px 芯片未逐一判定（§9-9） |

### 1.3 快照漂移核对

| 文件 | 快照（S0） | 当前磁盘 | 说明 |
|---|---|---|---|
| `src/app/teacher/schedule/schedule.module.css` | 498 行 / 11,392 B / mtime 2026-11-09 17:47:34 | 775 行 / 15,404 B / mtime 2026-11-12 12:06:14 | 快照后被改动；未做 git diff（禁操作），归属与改动面需 S1/S3 复核（§9-10）。本报告引用的 teacher 课表样式行号均以当前磁盘为准 |
| 其余 75 文件 | — | 字节数与快照一致 | 行计数差异为快照与本地换行统计口径不同，非内容漂移 |

## 2. 链路图（UI 侧：入口 → 导航层级 → 载体 → 反馈）

### 2.1 家长端

```
parent/dashboard（client.tsx）
├─ 切换孩子  · ✓ 通 · 行内 `.parent-child-switcher` 按钮 1 次点击（client.tsx:593；仅 >1 孩子时渲染）
├─ 高频胶囊 ParentTodayPanel（:187 button 原生可点）
│  ├─ 家校沟通 → /parent/messages  · ✓ 通 · 1 次
│  ├─ 成长档案 → /parent/archive   · ✓ 通 · 1 次（:101）
│  ├─ 特训自测 → /parent/vocab     · ✓ 通 · 1 次（:111）
│  └─ 教师信息 → /parent/teachers  · ✓ 通 · 1 次（:121）
├─ 今日课节卡（:240 button → openLesson :169）
│  ├─ 前 4 节  · ✓ 通 · 1 次进入详情
│  └─ 第 5 节起 · ⚠ 需先点"查看全天全部"（:282）再进课节 = 2 次
├─ 反馈列表/详情  · ✓ 通 · 列表 1 次（:752）→ 详情 1 次（:763）
├─ 通知列表/详情  · ✓ 通 · 列表 1 次（:811）→ 详情 1 次（:829）；已读乐观更新，失败回滚 catch 分支 ✓
├─ 请假入口  · ✗ dashboard 无直达；底部导航无；抽屉 更多(1)→家校服务(2)→请假(3)（ParentLayout.tsx:215）
├─ 题库练习 /parent/practice  · ⚠ 高频胶囊无；抽屉 更多(1)→学习工具(2)→题库练习(3)（ParentLayout.tsx:226）
├─ 作业/资料/仿真/AI/VIP/档案/教师/就餐/缴费/志愿/权益/绑定/个人中心 · ⚠ 均抽屉 3 步（ParentLayout.tsx:203-235）
└─ /parent/interaction  · ✗ 页面存在但家长导航数组无此项（R5 P1#4 继续成立，见 §5）
```

### 2.2 教师端

```
teacher/dashboard（page.tsx）
├─ 快捷动作格：通用 6 格（:629-636 录入考勤/发布反馈/我的课表/薪酬福利/在带学员/备课资料）+ 等级专属格（:639-659 tierExclusiveActions）
│  ├─ 录入考勤 / 发布反馈  · ✓ 通 · 1 次（通用）
│  ├─ 请假协同（SENIOR 专属 :650）/ 单次反馈（SENIOR 专属 :654）等  · ✓ 1 次，仅对应等级可见
│  └─ 等级不可见的动作  · ⚠ 由 tier 配置裁剪，非死路，走导航抽屉可达
├─ 首节课卡（:1062-1099）
│  ├─ 主 CTA 按状态互斥其一：录考勤(:1064-1071) / 发反馈(:1073-1080) / 查看教案与详情(:1082-1089)  · ✓ 通 · 1 次
│  └─ 副按钮 查看整日课表(:1092-1099)  · ✓ 通 · 1 次
├─ 第 2 节及以后（折叠在"展开(N)"后，:1110-1124）
│  └─ 紧凑时间线条目为纯 div，无 onClick/无 CTA（:1139-1169） · ⚠ dashboard 内不可直接操作，需展开(1)后另走 课表/考勤 页
├─ 底部导航：首页/课表/考勤/反馈/更多（TeacherLayout.tsx:176-180）
│  ├─ 课表/考勤/反馈  · ✓ 通 · 1 次
│  └─ 请假审批 · ✗ 底部导航无；更多(1)→学员与家校(2)→请假审批(3)（TeacherLayout.tsx:82）
└─ 课堂互动/作业/学员/消息/资源/AI/就餐/薪酬 · ⚠ 抽屉分组 3 步（TeacherLayout.tsx:66-92）
```

### 2.3 管理端（(main)/dashboard）

```
(main)/dashboard/page.tsx
├─ 概览动作卡  · ✓ 通 · 1 次（router.push，:78/:488/:546/:805 等）
├─ 空态段  · ✓ 通 · GuidedEmpty/Empty 带 onAction 或重试按钮（:1059 行内按钮带 Enter/Space 键盘处理）
└─ 服务概览卡 · ✓ 通 · href="/services"（AdminServiceOverviewCard.tsx:9）
```

### 2.4 弹层 / 浮层载体

```
BrandModal（Common/BrandModal.tsx）
├─ 关闭按钮 closable=true（:77）✓；ESC keyboard=true（:76）✓；蒙层 maskClosable 默认 false（:75，符合 P57"不点蒙层关闭"）✓
└─ busy 态：mask/keyboard/closable 三者一并禁用（:190-192）✓

SafeFormModal（Common/SafeFormModal.tsx）
├─ maskClosable=false（:46）✓；keyboard/closable 随 confirmLoading 门控（:47-48）✓
└─ 脏数据关闭拦截 requestClose（:28-38）✓

MobileLayout 抽屉（MobileLayout.tsx）
├─ 内部关闭按钮（:442-459）✓；onClose 接线 ✓；AntD 默认蒙层点击 + ESC 可关
└─ body 滚动：抽屉打开时由 AntD 处理；未发现自定义锁死

AIFloatingLauncher（AI/AIFloatingLauncher.tsx）
├─ 蒙层点击关闭（:723-735）✓；面板内关闭按钮（:787 aria-label / :803 CloseOutlined）✓
├─ body 滚动锁：保存 prev 并在 cleanup 恢复（:297-303）✓
└─ ✗ 无 ESC 键关闭监听（全文件无 keydown/Escape）· ⚠ 键盘可达缺口，见 §3.2

InteractionMotionLayer（Common/InteractionMotionLayer.tsx）
└─ 返回 null，无覆盖层 DOM；波纹层 .mz-ripple-layer pointer-events:none（globals.css）✓ 不挡点击

Hub 子模块互达
└─ launcher 17 个 href 目标路由逐一校验，page.tsx 全部存在 ✓（parent/class-feedback、messages、fees、practice、schedule、notifications；teacher/today-lessons、attendance、feedback、messages、compensation；students、teachers、attendance、classroom-feedback、fees、notifications）
```

## 3. 问题表

| 编号 | 严重度 | 流程节点 | 文件:行 | 影响角色 | 证据 | 取证方式 |
|---|---|---|---|---|---|---|
| S4-01 | **P1（沿用前轮）** | 家长端 `/parent/interaction` 页面存在但导航不可达 | `components/Layout/ParentLayout.tsx:201-235`（navItems 无 `/parent/interaction`；243-249 bottomTabs 亦无） | 家长 | 全文件 grep `/parent/interaction` 0 命中；R5 P1#4 本轮复查**继续成立** | 代码层 |
| S4-02 | P2 | 教师 dashboard 第 2 节及以后课次无直接操作入口 | `teacher/dashboard/page.tsx:1139-1169`（紧凑时间线纯 div，无 onClick/无按钮）；折叠开关 :1110-1124 | 教师 | 条目仅渲染时间/科目/教师/状态，无打卡/反馈/教案 CTA；要操作须展开后另进课表或考勤页 | 代码层 |
| S4-03 | P2 | AI 助手弹层无 ESC 关闭，键盘用户无法用键退出 | `components/AI/AIFloatingLauncher.tsx`（无 keydown/Escape 监听；关闭仅蒙层点击 :725 与面板按钮 :787） | 家长/教师/管理端 | 全文 grep `Escape|keydown|keyCode` 0 命中 | 代码层 |
| S4-04 | P2 | 课次状态缺"停课/延期/已撤销"映射，未命中回退默认琥珀色"待上课" | `teacher/dashboard/page.tsx:152-179`（LESSON_STATUS_META 仅 5 态）；回退 :1002、:1132 | 教师 | 状态 meta 表无 SUSPENDED/DEFERRED/CANCELLED 分支；若后端返回这些状态将落到默认项，标签可能误标 | 代码层推断；未用真实课次数据验证（见 §9） |
| S4-05 | P2 | 可点热区 <44px（移动端可点性） | 见 §8 清单：teacher-dashboard.module.css:750/794（38px）、:1221（40px）；TeacherClassroomSubnav.module.css:39/139（36/34px）；vocab.module.css:1566-1567（40px）；(main)/classroom-feedback.module.css:333（筛选 ant-btn min-height 34px）；MobileLayout.tsx:279-313/315-331（顶栏返回/菜单 pill 38px） | 教师/家长/管理端（触屏） | CSS 高度/最小高度实测；桌面端鼠标场景影响小，手机端为缺口；另有多处 32–36px 字形/芯片未逐一判定是否独立热区（见 §9） | 代码层 |
| S4-06 | P3（观察） | 家长端通知未读无"未读"文字标签；已有圆点 + aria-label + 背景/字重/颜色多线索 | `parent/dashboard/client.tsx:850-853`（`parent-notice-glow-dot` + `aria-label="未读新通知"`）；样式 `globals.css:3556-3560` | 家长 | 未读线索：圆点（带 aria-label）+ 金边背景 + 阴影 + 图标透明度 + 标题字重/颜色；缺一条可见文字"未读"，读屏可识别、目视仅靠圆点与配色 | 代码层 |
| S4-07 | P2 | 快捷入口图标使用 emoji 而非 AntD 图标（红线区外的功能入口） | `AI/AIFloatingLauncher.tsx:69-89,99-114,890`；`teacher/FeedbackComposer.tsx:2287-2291,3772`；`PhET/PhETSimulator.tsx:84-91,190,265`；`components/FeedbackCard.tsx:2-5,10`；`Feedback/PersonalizedLearningPath.tsx:172-175` | 家长/教师/管理端 | 详见 §7 红线表 R-04 | 代码层 |
| S4-08 | P2 | 等级/会员标签前拼接 emoji（等级标签样式被装饰改动） | `teacher/dashboard/page.tsx:1020-1024,1207-1211,425/434/443/452/461`；`parent/dashboard/client.tsx:880`；`(main)/dashboard/page.tsx:222,442` | 教师/家长/管理端 | 常量 `constants/teacher-tier.ts`、`constants/membership.ts` 内 label 文本无 emoji；emoji 为页面层拼接，属标签样式改动 | 代码层；是否本轮新增未做 git diff（见 §9） |
| S4-09 | P2 | 圆角分布偏离卡片 16–20px 规范（已知 `--radius-lg=12px` 冲突） | 见 §7 R-05；979 处中 CSS 内 16–20px 89 处，<16px 480 处（含芯片/按钮/图标等内部元素，未逐类拆分） | 全局 | Top10 分布见 §7 | 代码层 |
| S4-10 | P2 | 阴影裸写 337 处，采样到 α .20–.35 的绿/金彩色阴影；硬灰边框 1 处 | §7 R-06；`(main)/attendance/attendance.module.css:97` `border:1px solid #E5E7EB` | 全局 | 基线阴影为暖黑 `rgba(26,18,1,.08)` 量级；当前多为品牌绿/金彩色投影 | 代码层 |
| S4-11 | P2 | 残留 `100vh` 23 处（部分已由后续 `100dvh` 覆盖），移动端 WebView 地址栏伸缩场景未实测 | §5.3 清单口径；vocab.module.css:1510/1511 为 `100vh` 后接 `100dvh` 覆盖 ✓ | 家长（移动端） | 未跑 dev、未真机/WebView 验证 | 代码层推断 |
| S4-12 | P3（观察） | 高频胶囊使用蓝/紫/橙等高饱和渐变，未走令牌色板 | `Parent/ParentTodayPanel.tsx:93,103,113,123`（绿/蓝/橙/紫渐变 + 彩色投影） | 家长 | SKILL 要求"禁止引入脱离令牌的硬编码高饱和色"；用户红线清单未单列此项，记观察 | 代码层 |

## 4. 关键动作 × 当前点击步数 × 可达性（附加表一）

> 步数为当前源码现状；无旧版基线可对比，不臆造旧值。"抽屉 3 步"= 底部"更多"→ 分组 → 条目。

### 4.1 家长端

| 页面 | 关键动作 | 当前点击/滚动步数 | 是否可达 | 证据 |
|---|---|---|---|---|
| parent/dashboard | 切换孩子 | 1（仅 >1 孩子时出现行内开关） | ✓ | client.tsx:593 |
| parent/dashboard | 进家校沟通 | 1（高频胶囊） | ✓ | ParentTodayPanel.tsx:88,191 |
| parent/dashboard | 进成长档案 | 1（高频胶囊 / 报告条） | ✓ | ParentTodayPanel.tsx:101；client.tsx:709 |
| parent/dashboard | 进背单词/英语特训 | 1（高频胶囊"特训自测"） | ✓ | ParentTodayPanel.tsx:111 |
| parent/dashboard | 进教师信息 | 1（高频胶囊） | ✓ | ParentTodayPanel.tsx:121 |
| parent/dashboard | 进课节详情（前 4 节） | 1 | ✓ | ParentTodayPanel.tsx:240-246 |
| parent/dashboard | 进课节详情（第 5 节起） | 2（先"查看全天全部" :282 展开，再点课节卡 :240） | ✓ 可达，路径变长 | ParentTodayPanel.tsx:282,240-246 |
| parent/dashboard | 反馈详情 | 1（列表行） | ✓ | client.tsx:763 |
| parent/dashboard | 反馈列表 | 1（"查看全部"） | ✓ | client.tsx:752 |
| parent/dashboard | 通知详情 | 1 | ✓ | client.tsx:829 |
| parent/dashboard | 通知列表 | 1 | ✓ | client.tsx:811 |
| parent/dashboard | 请假 | 3（更多→家校服务→请假）；dashboard 无直达 | ✓ 可达，藏入二级抽屉 | ParentLayout.tsx:215 |
| parent/dashboard | 题库练习 /parent/practice | 3（更多→学习工具→题库练习）；高频胶囊无 | ✓ 可达，藏入二级抽屉 | ParentLayout.tsx:226 |
| parent/dashboard | 作业/资料/仿真/AI/VIP/就餐/缴费/志愿/权益/绑定/个人中心 | 3（抽屉分组） | ✓ 可达 | ParentLayout.tsx:203-235 |
| parent/* | 课堂互动 /parent/interaction | 无入口 | ✗ 不可达（R5 P1#4 继续成立） | ParentLayout.tsx 无该 key |
| parent/archive | 从 dashboard 进入档案 | 1（报告条/胶囊） | ✓ | client.tsx:709；ParentLessonPreview.tsx:115,147 |
| parent/vocab | 从 dashboard 进入特训 | 1 | ✓ | ParentTodayPanel.tsx:111 |
| parent/vocab | 退出沉浸练习 | 1（左上关闭按钮） | ✓ | DeckSession.tsx:86-87；vocab.module.css:1563 |

### 4.2 教师端

| 页面 | 关键动作 | 当前点击/滚动步数 | 是否可达 | 证据 |
|---|---|---|---|---|
| teacher/dashboard | 录入考勤 | 1（通用快捷格） | ✓ | page.tsx:630 |
| teacher/dashboard | 发布反馈 | 1（通用快捷格） | ✓ | page.tsx:631 |
| teacher/dashboard | 请假协同 | 1（SENIOR 专属格 :650）；其他等级抽屉 3 步 | ✓/⚠ 按等级裁剪，抽屉可达 | page.tsx:650；TeacherLayout.tsx:82 |
| teacher/dashboard | 单次反馈 | 1（SENIOR 专属格 :654）；其他等级抽屉 3 步 | ✓/⚠ 按等级裁剪 | page.tsx:654 |
| teacher/dashboard | 首节课录考勤（主 CTA，状态命中时） | 1 | ✓ | page.tsx:1064-1071 |
| teacher/dashboard | 首节课发反馈（主 CTA，状态命中时） | 1 | ✓ | page.tsx:1073-1080 |
| teacher/dashboard | 首节课教案详情（主 CTA，其余状态） | 1 | ✓ | page.tsx:1082-1089 |
| teacher/dashboard | 查看整日课表（副按钮） | 1 | ✓ | page.tsx:1092-1099 |
| teacher/dashboard | 第 2 节及以后课次操作 | dashboard 内 0 个可点 CTA；需先"展开(N)"再跳课表/考勤 | ⚠ 绕路，非死路 | page.tsx:1110-1124,1139-1169 |
| teacher/dashboard | 请假审批 | 3（更多→学员与家校→请假审批）；底部导航无 | ✓ 可达，藏入二级抽屉 | TeacherLayout.tsx:82,180 |
| teacher/dashboard | 课堂互动/作业/学员/消息/资源/AI/就餐/薪酬 | 3（抽屉分组） | ✓ 可达 | TeacherLayout.tsx:66-92 |
| teacher/schedule | 从 dashboard 进课表 | 1（底部 tab） | ✓ | TeacherLayout.tsx:177 |
| teacher/attendance | 从 dashboard 进考勤 | 1（底部 tab） | ✓ | TeacherLayout.tsx:178 |

### 4.3 管理端

| 页面 | 关键动作 | 步数 | 可达 | 证据 |
|---|---|---|---|---|
| (main)/dashboard | 各概览动作卡跳转 | 1 | ✓ | page.tsx:78,488,546,805 等 |
| (main)/dashboard | 空态去操作页 | 1（空态 onAction / 空态按钮） | ✓ | page.tsx:613,730,1055-1059；TodaySchedule.tsx:62,101-102 |

## 5. 专项走查

### 5.1 关键动作是否被折叠/藏进二级

- 家长端底部 tab 仅 4 个业务页（首页/课堂反馈/课程表/通知，ParentLayout.tsx:243-249）；其余 20+ 入口全部收进抽屉分组，**3 步到达**。dashboard 高频胶囊补回 4 个 1 步入口（沟通/档案/特训/教师），但**题库练习 /parent/practice 未进胶囊**，仍 3 步。
- 教师端底部 tab 4 个（首页/课表/考勤/反馈，TeacherLayout.tsx:176-180）；请假审批、互动、作业、学员、消息、资源、AI、就餐、薪酬均 3 步。
- dashboard 课次列表：家长端前 4 节直出、超出折叠；教师端首节课全 CTA、其余节次仅展示无 CTA（S4-02）。
- 未发现"原本一步、本轮改两步"的旧版对照证据（无基线 diff）；以上为当前步数实测。

### 5.2 新死路排查

| 检查项 | 结论 | 证据 |
|---|---|---|
| 抽屉/弹层可关闭 | ✓ BrandModal/SafeFormModal/MobileLayout 抽屉均有关闭按钮 + onClose；busy 态禁用关闭符合规范 | BrandModal.tsx:75-77,190-192；SafeFormModal.tsx:45-54；MobileLayout.tsx:442-459 |
| ESC / 蒙层 | ✓ BrandModal keyboard=true；SafeFormModal keyboard 门控；抽屉默认 ESC 可关；⚠ AI 弹层无 ESC（S4-03）；蒙层点击关闭 ✓ | AIFloatingLauncher.tsx:723-735 |
| 返回按钮 | ✓ 子页面底部导航隐藏并显示返回 pill（MobileLayout.tsx:275-313；`handleBack` :176-182，无历史时回退主 tab）；反馈页 `showBottomTabs=false`（TeacherLayout.tsx:226） | MobileLayout.tsx:176-182,275-313 |
| InteractionMotionLayer 挡点击 | ✓ 层返回 null；波纹层 pointer-events:none；未在页面内重复挂按压/波纹监听 | InteractionMotionLayer.tsx 全文；globals.css `.mz-ripple-layer` |
| Hub 子模块互达 | ✓ launcher 17 个目标路由 page.tsx 全部存在；教师子导航 TeacherClassroomSubnav 6 项均为 `<Link>` 且带 lessonId 联动 | TeacherClassroomSubnav.tsx:34-41,76-103 |
| 恒空页面段 | ✓ 空态复用 GuidedEmpty/AppErrorState/ant Empty，且带动作入口或重试 | TodaySchedule.tsx:62,64；TeacherWorkload.tsx:44；(main)/dashboard 空态 onAction |
| 退出登录/改密 | ✓ 教师抽屉底部 退出登录/修改密码/使用帮助 均有 onClick | TeacherLayout.tsx:346-348 |

### 5.3 滚动劫持 / 滚动锁定

- **body 滚动锁**：AI 弹层打开时 `document.body.style.overflow='hidden'`，cleanup 恢复 prev（AIFloatingLauncher.tsx:297-303）✓；未发现锁死后不恢复的路径。
- **全屏沉浸层**：vocab `.studyScreen` `position:fixed; inset:0; overflow:hidden`，高度 `100vh` 后被 `100dvh` 覆盖（vocab.module.css:1503-1513），四边 `env(safe-area-inset-*)`（:1514），`overscroll-behavior:contain`（:1520）✓；底部 `.studyActionBar` sticky bottom、min-height 50px（:2008-2018），提交/下一题按钮不在折叠区 ✓。
- **组合锁定统计**：`overflow:hidden` + 邻近固定高度 **62** 处（CSS ±6 行窗口）；多为卡片/头像/进度条等局部裁剪，未发现整页正文被 `overflow:hidden + 固定高度` 锁死的容器。
- **横向滚动**：教师子导航 `overflow-x:auto; overflow-y:hidden`，隐藏滚动条，激活项自动居中（TeacherClassroomSubnav.module.css:24-31；TeacherClassroomSubnav.tsx:59-71）✓。
- **sticky 遮挡**：本域 CSS 共 14 处 `position:sticky`，均为吸顶标题/筛选条、底部操作条或孩子切换条：吸顶类 globals.css:1506（mobile-action-bar 底栏上方）、:1640（school-filter-bar top 76px）、:1710（孩子切换条 top 0）、vocab.module.css:1556（顶部条 top 0，min-height 44px）、interaction.module.css:726/975；底部操作条 vocab.module.css:2015、practice-bank.module.css:964（sheetFooter bottom 0）。未发现 sticky 头部压住提交按钮或主操作区；主内容 `paddingBottom = TAB_BAR_HEIGHT(60) + 26px` + 底部安全区避让底栏（MobileLayout.tsx:16,693-696）。
- **100vh 残留**：本域 23 处 `100vh` / 32 处 `100dvh`；vocab 沉浸层为双写后 dvh 覆盖。其余 100vh 分布在组件内联样式与桌面卡片，未逐一定位是否需 dvh 化（未真机验证，见 §9）。
- **提交按钮可见性**：反馈提交走 dock 按钮组（FeedbackComposer.tsx:3016-3056）；练习/评价/打卡按钮均在表单底部随页面滚动，未被固定层遮挡。

### 5.4 动效是否阻塞提交

| 检查项 | 结论 | 证据 |
|---|---|---|
| 提交按钮 loading/禁用态 | ✓ 反馈发布 `loading={saving}` + 多条件 disabled；草稿/单次反馈/分享图生成均有门控 | FeedbackComposer.tsx:3008-3009,3032-3033,3044-3045,3055-3056 |
| 其他提交面禁用态 | ✓ 练习回传/作业打卡/满意度评价/管理端回复均有 loading/disabled | AdminPracticeReplyPanel.tsx:140,142；FeedbackPracticeCheckin.tsx:92,114-115；ParentClassroomFeedbackEvaluation.tsx:128-129；ParentFeedbackHomeworkCheckin.tsx:93 |
| 过渡是否让按钮 150ms 内不可点 | ✓ 按压/回弹走全局层，未发现 transition 延迟解锁按钮；按钮 disabled 由业务态控制 | InteractionMotionLayer.tsx；globals.css 按压 90ms |
| AnimatedNumber 金额/数字延迟 | ✓ 620ms 减速滚动，reduced-motion 直接终态；`aria-label` 带终值；纯展示不阻塞提交 | Common/AnimatedNumber.tsx:15-18,23,44 |
| 入场动画延后表单出现 | 本域内联 `animationDelay` 仅 2 处（client.tsx:762,828），`index*40ms`、最大 80ms；`stagger-item` fill-mode both，延迟项起始透明，80ms 内出现；未观察到表单主操作被延后超过一帧 | client.tsx:762,828；globals.css `.stagger-item` |
| prefers-reduced-motion 覆盖 | ✓ 全局兜底 `*` 动画/过渡降为 .01ms（globals.css:156-165）；13/33 CSS 文件另有局部覆盖；AnimatedNumber/PullToRefresh 内部监听 reduced-motion | globals.css:156-165；AnimatedNumber.tsx:15；PullToRefresh.tsx:32-39 |
| 页面内重复按压/波纹监听 | ✓ 未在页面组件发现重复的 pointer/click 按压监听（按压/波纹归全局层） | 代码层扫描 |

### 5.5 状态可感知

| 状态类别 | 结论 | 证据 |
|---|---|---|
| 课次状态（待上课/上课中/已完成/已考勤/待考勤） | ✓ 颜色 + 文字 + 图标盒三线索；⚠ 缺停课/延期/已撤销映射（S4-04） | teacher/dashboard/page.tsx:152-179,1002,1132 |
| 通知已读/未读 | ✓ 圆点 + aria-label"未读新通知" + 金边背景 + 阴影 + 图标透明度 + 标题字重/颜色；⚠ 缺可见"未读"文字标签（S4-06） | client.tsx:821-853；globals.css:3556-3560 |
| 反馈/打卡状态 | ✓ 状态色 + 文字标签；失败 `toast.error`；成功 `toast.success` | FeedbackPracticeCheckin.tsx:69-71；ParentFeedbackHomeworkCheckin.tsx:53-55 |
| 开关/保存反馈 | ✓ 草稿自动保存状态文案可见（读取中/保存中/已保存/离线/失败）；打卡按钮 disabled 直至选择状态 | FeedbackComposer.tsx:2996-3002；FeedbackPracticeCheckin.tsx:114-115 |
| 乐观更新失败回滚 | ✓ 家长通知已读：先写本地 id，catch 移除本地 id 并 toast.error；练习/作业打卡为非乐观（成功后才 setStatus/setCheckin），无需回滚 | client.tsx catch 分支；FeedbackPracticeCheckin.tsx:66；ParentFeedbackHomeworkCheckin.tsx:52 |
| 待办角标 | ✓ 考勤/反馈/消息角标数字 99+ 封顶；子导航 pill 红点金/红双色 | TeacherClassroomSubnav.tsx:97-101；MobileLayout.tsx:18 MobileAnimatedBadge |

## 6. 改进建议（不改业务口径；代价与批次标注）

| 编号 | 建议 | 为什么 | 代价 | 批次 |
|---|---|---|---|---|
| S4-01 | 在家长导航数组补 `/parent/interaction` 入口（或确认该页对家长下线并移除路由） | 页面存在但不可达，属前轮遗留死链 | 改代码（ParentLayout 导航配置） | 上线前 |
| S4-02 | 教师 dashboard 紧凑时间线条目补最小 CTA（至少"去考勤/去反馈"跳转），或与首节课卡保持同一操作集 | 第 2 节以后教师须绕路课表/考勤 | 改代码 | 本周 |
| S4-03 | AI 弹层增加 ESC keydown 关闭（与蒙层/按钮同一 handleClose） | 键盘可达缺口，规范要求键盘可完成关闭 | 改代码（AIFloatingLauncher 加 1 个 useEffect） | 本周 |
| S4-04 | LESSON_STATUS_META 补停课/延期/已撤销分支，或在回退项标注"未知状态"避免误显"待上课" | 状态误标会误导教师排课判断 | 改代码；状态枚举口径需与 S1/S2 数据侧对齐 | 上线前 |
| S4-05 | <44px 可点热区加高到 44px（教师主/次按钮、子导航 pill、沉浸层退出按钮） | 移动端触屏误触；规范热区 ≥44px | 改 CSS 高度/padding | 本周 |
| S4-06 | 未读通知在圆点旁补可见"未读"小字标签（圆点与 aria-label 已有） | 目视线索中缺一条文字通道 | 改代码（样式 + 文本） | 本周 |
| S4-07/08 | 梳理 emoji 图标：功能入口统一换 AntD 图标；等级/会员标签前的 emoji 移除（标签文案与样式锁定） | 红线"不用 emoji 作图标/装饰"；等级标签样式禁改 | 改代码；等级标签是否本轮新增需先核版本 | 上线前（需拍板） |
| S4-09 | 卡片圆角复核：卡片表面统一 16–20px；12px 令牌冲突（`--radius-lg`，globals.css:100）单独拍板 | 基线规范卡片 16–20px | 改代码/令牌；令牌调整需拍板 | 本周 |
| S4-10 | 阴影向基线量级回收；`#E5E7EB` 硬灰边框换 hairline token | 描边用 hairline、软阴影基线量级 | 改 CSS | 本周 |
| S4-11 | 残留 100vh 逐一改为 100dvh（移动端容器优先） | 移动浏览器地址栏伸缩时高度抖动 | 改 CSS | 本周 |
| S4-12 | 高频胶囊高饱和渐变评估是否换令牌派生色 | 规范禁止脱离令牌的高饱和色；不影响流程 | 改代码（需拍板配色口径） | 本周 |

## 7. 红线核对表（附加表二）

> 判定：合规 / 违规 / 需拍板。证据行号均为本域源码现状；"是否本轮新增"未做 git diff，见 §9。

| 编号 | 红线项 | 判定 | 证据 |
|---|---|---|---|
| R-01 | 未改主题配色令牌（`@theme` / `:root` 颜色变量值） | **合规** | `globals.css:10-103` @theme 值与基线逐项一致：primary `#14574D`、hover `#10483F`、gold `#8A6517`、fill `#D6B45B`、gold-bg `#F8F1DE`、ink `#1a1201`、muted `#5a4e3a`、subtle `#756A58`、hairline `rgba(0,0,0,.06)`、strong `.12`、success `#1D9E75`、warning `#A56B00`、error `#B42318`；`:root` 1614-1618 仅安全区/底部间距变量，无颜色覆盖 |
| R-02 | SVIP 权益区墨绿渐变 `#123C35→#0B2A25` + 金边 `rgba(201,164,92,.5)` | **合规** | `globals.css:3828-3833`：`background: linear-gradient(150deg,#123C35 0%,#0B2A25 100%) !important`；`border: 1px solid rgba(201,164,92,.5) !important`；内部金描边/金字 3834-3846 |
| R-03 | 深绿顶栏品牌 logo 可见 | **需拍板（部分合规）** | 教师桌面 sider：`TeacherLayout.tsx:286` logo.jpg ✓；家长桌面 header：仅 dashboard 路由显 logo.png（`ParentLayout.tsx:426`），其余家长页为文字"家长中心"；移动端：logo 仅 `brandBackground && !isDarkHeader` 时渲染（`MobileLayout.tsx:355`），`isDarkHeader = headerTheme.dark || pageTheme==='svip'`（:144），SVIP 深色顶栏与教师移动端回退文字 wordmark（:358-367）。未发现 logo 资源缺失：`/images/logo.jpg|logo.png|logo-small.png`、`/logo-banner.jpg` 均在 public |
| R-04 | 不用 emoji 作图标/装饰（品牌资产除外） | **违规候选（需拍板）** | 非测试符号行 98：emoji 58、dingbat 25、箭头 8、几何形 4、混合 3。<br>**红线区（等级/会员标签）**：`teacher/dashboard/page.tsx:1020-1024`（👑⭐🌿🌱🛡️）、`:1207-1211`、`:425/434/443/452/461`（sealIcon）；`parent/dashboard/client.tsx:880`（👑✨/👑）；`(main)/dashboard/page.tsx:222`（✦）、`:442`（👑）。<br>**功能入口/内容 emoji**：AIFloatingLauncher.tsx:69-89,99-114,890；FeedbackComposer.tsx:2287-2291,3772；PhETSimulator.tsx:84-91,190,265；FeedbackCard.tsx:2-5,10；PersonalizedLearningPath.tsx:172-175；StickerPanel.tsx:34（🐑 贴纸 mascot）；WeeklyReport.tsx:192（🌙）；PeopleReports.tsx:77（⭐ 评分）；AIChatPanel.tsx:202,496；会员权益项图标来自常量 `constants/membership.ts:135-157`（常量文件非本域，渲染面 client.tsx:885）。<br>字形类（✓★✕▲▼○⌕ 等）25+4 处，属排版符号，未计入 emoji 违规 |
| R-05 | 卡片圆角 16–20px | **需拍板** | 总 **979** 处（CSS `border-radius` 声明 + TSX 内联 `borderRadius` 合计，口径同 scan8）；Top10：999px 160、12px 103、10px 100、14px 78、50% 68、8px 59、16px 56、6px 33、`var(--radius-md)` 32、`var(--radius-lg)` 31。CSS 内 16–20px 共 **89** 处（16px 56、17px 1、18px 21、20px 11）；<16px **480** 处，含芯片/按钮/图标/标签等内部元素，未逐类拆分。已知冲突：`--radius-lg:12px`（globals.css:100），卡片规范 16–20px；另有 `--radius-xl:16px`(:101) |
| R-06 | 软阴影 `0 6px 18px rgba(26,18,1,.08)` 量级；描边 hairline | **部分偏差** | box-shadow 387：var() 50、裸写 337；α>.18 的彩色阴影 **88** 行（绿 `rgba(20,87,77,α)`、金/棕金 `rgba(168,135,61,α)` 等，α .20–.35，如 homework.module.css:264 α.30、practice-bank.module.css:612 α.35、schedule.module.css:160 α.32）。硬灰边框仅 **1** 处：`(main)/attendance/attendance.module.css:97` `#E5E7EB`；其余描边走 hairline token 或品牌色半透明 |
| R-07 | 不把"分隔线列表行"重构成"独立卡片" | **未验证** | 无旧版基线、禁止 git diff，无法判定是否本轮重构。现状：通知条目 `globals.css:3526-3560`（背景渐变 + 圆角 15px + 阴影）、反馈行/时间线条目均为卡片形态；列表行→卡片化是否发生在本轮，需对照 R0 快照前版本确认 |
| R-08 | 不做整页视觉重排（局部改造） | **未验证** | 同上，无基线页面截图/结构 diff；本轮仅记录现状结构，不作重排判定 |
| R-09 | 等级/会员标签文案与样式锁定 | **违规候选（标签装饰）** | 常量 label 文本未改：`constants/teacher-tier.ts` TIER_THEME.label（管理教师/专属教师/资深教师/经验教师/新晋教师）、`constants/membership.ts` label（普通/VIP/SVIP）；但页面层在标签前拼接 emoji（R-04 红线区行号），属标签样式装饰改动；等级主题色仍取 TIER_APP/TIER_THEME 常量（TeacherLayout.tsx:232-233），未改映射 |
| R-10 | 按压/波纹走全局层，页面内不重复监听 | **合规** | 本域组件未发现自写 pointer/click 按压回弹与波纹监听；全局层 providers.tsx:61 挂载；data-motion-ignore 用于非按压表面 |
| R-11 | prefers-reduced-motion 退化终态静态；键盘可达 | **基本合规，2 处缺口** | 全局兜底 globals.css:156-165 ✓；缺口：① AI 弹层无 ESC（S4-03）；② 教师 dashboard 折叠开关 `role=button tabIndex=0` 仅 onClick，未见 onKeyDown Enter/Space（page.tsx:1110-1124） |

## 8. 移动端专项

| 检查项 | 结论 | 证据 |
|---|---|---|
| 底部导航被新组件遮挡 | ✓ 底栏 z-index 298；AI 悬浮球 z 1080-1100 为设计内悬浮；主内容 paddingBottom 86px（60 栏高 + 26）避让；未发现新固定组件压住底栏可点区 | MobileLayout.tsx:16,693-696,715；AIFloatingLauncher.tsx:447,497,730 |
| 安全区 `env(safe-area-inset-*)` | ✓ 沉浸层四边、brand-background、底栏底部均接 safe-area；viewportFit=cover（app/layout.tsx:29） | vocab.module.css:1514；globals.css:174；MobileLayout.tsx:220,655,695,716-717 |
| 热区 <44px 位置 | 可点元素 8 处：① teacher `.btnPrimary` 38px（teacher-dashboard.module.css:750）；② `.btnSecondary` 38px（:794）；③ `.overviewActionBtn` 40px（:1221）；④ 教师子导航 pill 36px / 移动 34px（TeacherClassroomSubnav.module.css:39,139）；⑤ vocab 退出按钮 40px（vocab.module.css:1566-1567）；⑥ 管理端反馈筛选 ant-btn min-height 34px（(main)/classroom-feedback.module.css:333）；⑦ 顶栏返回 pill 内返回按钮 38px（MobileLayout.tsx:279,293-313）；⑧ 顶栏返回 pill 内菜单按钮 38px（:315-331）。装饰性图标盒 38/40px（quickIconBox、glyph、step 号）非独立热区，不计入；AI/Feedback 芯片另有 32–36px 若干，未逐一判定交互性（§9-9） | 代码层 |
| 教师端手机点名/打卡可点性 | 首节课打卡按钮为原生 button（page.tsx:1062-1067），热区随卡片；紧凑节次无按钮（S4-02）；底部"考勤"tab 1 步可达 | page.tsx:1062；TeacherLayout.tsx:178 |
| 底栏标签截断 | ✓ 标签 maxWidth + ellipsis，不换行挤压图标 | MobileLayout.tsx:785-790 |

## 9. 未验证清单（具体验法）

1. **未跑真实页面/真机**：本轮未启动 dev（3000 端口禁用），所有布局/遮挡/滚动/热区结论为代码层推断；验法：`next dev` 后在手机视口（375×812）走查家长首页、教师首页、vocab 沉浸层，量按钮热区与底栏遮挡。
2. **停课/延期/已撤销状态是否出现**：S4-04 需查库 `Lesson` 表 status 枚举实际取值（只读 SELECT），确认 dashboard 列表是否会落到未映射分支；当前仅代码层推断。
3. **emoji/标签装饰是否本轮新增**：禁止 git diff；验法：对照 `_audit20261110\R0-变更集快照.json` 前版本或 `git log -p`（授权后）逐行核 R-04/R-08 行号。
4. **列表行→卡片化、整页重排**（R-07/R-08）：需旧版页面截图或结构 diff；本轮仅记录现状。
5. **残留 100vh 清单**：23 处中哪些在移动端容器、哪些可保留（桌面 fixed 背景等），需逐处定位后决定 dvh 化。
6. **100vh/dvh 与 WebView**：未在安卓/iOS WebView 实测地址栏伸缩；验法：真机滚动观察沉浸层与首屏高度。
7. **S4-02 绕路是否影响高频操作**：需统计教师日均课节数（库内只读聚合），判断第 2 节以后无 CTA 的实际影响面。
8. **vitest/tsc/eslint**：本轮未运行（SPEC7 允许只读校验，但本报告为流程走查，未触发；组件测试如 `mobile-bottom-tabs.test.tsx`、`ParentLayout.navigation.test.tsx` 已存在，回归门禁由 S5 统一执行）。
9. **其余 32–36px 芯片/小按钮**：AI（AssistantBriefing/AIClientOverview）、Feedback（practice-checkin、poster-sections、knowledge-trend）等模块另有若干 32–36px 控件，未逐一判定是否独立可点热区；验法：逐类核对 class 挂载的元素标签（button/a/role=button）与 onClick。
10. **漂移文件 `teacher/schedule/schedule.module.css`**：快照后改动（498→775 行，+4,012 B），本轮未对照旧版；验法：授权后 `git diff` 或对照 R0/S0 快照确认改动面是否含流程/布局影响，归属教师端页面分片（S1/S3）复核。

## 10. 前轮结论引用与变化

- **R5 P1#4**（`/parent/interaction` 页面存在但家长导航不可达）：本轮复查**继续成立**，证据 `ParentLayout.tsx:201-249` 无该 key（S4-01）。
- **R4 P2**（读路径静默 catch、空态与无数据混用，volunteer/practice/interaction/students 四处）：属页面数据层，归 S1/S2 复核；本域 UI 侧空态组件复用未发现新增静默空态。
- **R4 P2**（teacher dashboard 状态同步 POST 失败仅 console.warn）：遥测写点，本域未重复展开。
- 第六轮 1 P0 / 12 P1 / 11 P2 编号以 R4/R5 原文为准，本表不重抄。
