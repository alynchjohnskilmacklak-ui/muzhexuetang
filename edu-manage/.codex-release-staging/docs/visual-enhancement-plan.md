# 牧哲学堂 UI 视觉增强方案（浮层组件体系）

> 目的：沉淀 2026-08 浮层审计结论与后续视觉/动效/品牌优化计划，供任何 agent（含 codex）按批次执行。
> 硬约束：所有改动不改变业务流程；每批次独立可回滚；`prefers-reduced-motion` 全局兜底。
> 关联文档：`DESIGN.md`（设计系统）、`docs/frontend-rules.md`（前端规则）、审计结论见 2026-08 会话报告（健康评分 13/20）。

---

## 1. 背景：审计结论摘要

- 三端（管理端 `app/(main)`、家长端 `app/parent`、教师端 `app/teacher`）浮层盘点：Modal JSX 59 处 + 静态 confirm 约 15、Drawer 16、Tooltip 39、Dropdown 8、Popconfirm 19；**Popover 0 处、BottomSheet 专用组件 0 处**。
- 六组件规范（组件名/触发方式/弹出位置/是否需用户处理）符合度：Tooltip 部分达标、Popover 未落地、Dropdown 部分未显式 click、Modal 桌面合规但移动端被全局 CSS 接管、Drawer 桌面合规、BottomSheet 无专用组件。
- P1 级 6 项：见第 2 节状态表。

## 2. 审计问题状态与 codex 修复核验（2026-08）

| 编号 | 问题 | 位置 | 状态 |
|---|---|---|---|
| P1-1 | 三套互相冲突的移动端 Modal 全局 CSS（全屏×2 vs 底部弹层），靠层叠顺序生效，`.ant-modal-mobile` 失效，`centered/width/top` 在手机上失效 | `globals.css:310-312`、`722-735`（死代码）、`2466-2483`（生效） | **未处理，批次1第1项** |
| P1-2 | 移动端滚动锁被全局 `!important` 击穿 | 守卫已由 codex 移除（`globals.css` 原 2443-2458 段）；`providers.tsx:44-77` 轮询清理保留 | 已修复（可接受；后续可优化为滚动锁计数器） |
| P1-3 | 弹层容器三策略并存，Modal 内 Select/DatePicker 下拉被裁剪或压遮罩下 | `providers.tsx:83-87`、家长 `messages/client.tsx:375,394,404` 手动规避、`StudyHallWorkspace.tsx:74`（已改 `parentElement`） | 部分修复；全局兜底未统一，后续项 |
| P1-4 | Modal 套 Modal / Modal 叠 Drawer | `courses/[id]/page.tsx:814-826`、`classroom-feedback:588`、`courses:1557` | 未处理（暂缓，涉及交互策略） |
| P1-5 | 教师端 antd 组件橙色 vs 页面强调绿色 `#1D9E75`；管理端内联 `#534AB7` 越出色板 | `theme.ts`（全端共享 `colorPrimary:#E8784A`）、各 teacher/(main) 页面内联色 | 未处理（暂缓：不拆主题，先靠 token 收敛） |
| P1-6 | `userScalable:false` 违反 WCAG 1.4.4 | `src/app/layout.tsx:21` | **已修复**（codex 移除） |

### codex 修复核验记录（2026-08，逐行读码确认）

| 项目 | 核验结果 | 结论 |
|---|---|---|
| 恢复双指缩放 | `layout.tsx` 已删 `userScalable/maximumScale` | ✅ 正确 |
| 滚动守卫移除 | `overflow-y:auto !important` 已删，antd 滚动锁恢复 | ✅ 正确 |
| Dropdown 改点击+键盘+ARIA | `TopNav.tsx:60,95`、`TeacherLayout.tsx:307`、`MobileLayout.tsx:136` 均改 `<button aria-label>` + `trigger={['click']}` | ✅ 正确 |
| Tooltip 补 focus 触发 | `TopNav.tsx:85`、`TeacherLayout.tsx:298` 加 `trigger={['hover','focus']}`；铃铛补 `aria-label` | ✅ 正确 |
| Select 弹层容器 | `StudyHallWorkspace.tsx:74` 改 `trigger.parentElement`，符合 `frontend-rules.md` 约定 | ✅ 正确 |
| 拒绝全量 maskClosable=false | 原建议确有「全量」表述，本意是保护多字段表单子集（改密/新建留言/课时调整等约 6 个） | 🟡 半同意：只对表单子集设置，P2 不急 |
| 拒绝 Popover 替换 | 组件数量不是质量指标，批评成立 | ✅ 同意：只落地 2-3 个具体场景 |
| 拒绝 BottomSheet 重构 | 混淆了「全量重构」与「清理三套冲突死 CSS」；死代码清理是零风险 P1 | ❌ 过于保守：批次1 先做清理，不做重构 |
| 拒绝三端主题拆分 | 视觉优化不依赖拆主题 | ✅ 同意暂缓 |
| 拒绝历史栈接管 | 需逐页验证，有重复历史风险 | ✅ 同意暂缓 |

## 3. 设计系统硬约束（任何改动执行前必读）

来源：`DESIGN.md` + impeccable 产品规范。

1. **色板**：canvas `#faf8f5`、surface-1 `#ffffff`、primary `#E8784A`、ink `#1a1201`；橙色强调 ≤10% 面积；禁止新硬编码色（统一走 `theme.ts`/CSS 变量）。
2. **禁项**：无渐变背景与渐变按钮、无玻璃拟态（`backdrop-filter`）、无 side-stripe 彩色竖条、无 emoji 做图标、无 hero-metric 大数字模板。
3. **动效**：150-260ms；ease-out-quart 类曲线；只动 `transform/opacity`，不动 layout 属性；无 bounce/elastic；动效传达状态而非装饰；`prefers-reduced-motion` 下全部关闭（`globals.css:2241` 已有先例，新动画必须纳入）。
4. **触控与无障碍**：触控目标 ≥44px；对比度 ≥4.5:1（注意 `#9a8e7a` 仅约 3.2:1，小字号慎用）；焦点环统一 2px 暖橙。
5. **圆角**：交互元素 10px（token `borderRadius`）、容器 14px（`borderRadiusLG`）；`globals.css` 现有 16px/18px 覆盖是有意为之的浮层形态，不得再新增第三种。

## 4. 三层方案明细

### 4.1 批次 1：零风险样式层（纯 CSS/主题 token，不碰组件逻辑）

| # | 改动 | 位置 | 做法 | 验收 |
|---|---|---|---|---|
| 1.1 | 删除移动端 Modal 死代码 | `globals.css:310-312`、`722-735` | 整段删除；保留 `2466-2483` 底部弹层作为移动端 Modal 唯一形态（**不改变现有用户习惯**）；同步删 `.ant-modal-mobile` 失效相关说明，`ScheduleFormModal/StudentForm/TeacherForm` 三个使用处保持不动 | 375px 视口下三类 Modal（confirm/表单/详情）仍为底部弹层；桌面形态不变 |
| 1.2 | 浮层 token 化 | `src/constants/theme.ts` | 新增：`token.motionDurationMid:180`、`token.motionDurationSlow:260`、`token.boxShadowSecondary`、`token.colorBgSpotlight:'#2a2211'`（Tooltip 暖深棕，替代 antd 默认黑）；`components.Drawer`、`components.Tooltip`、`components.Popover` 基础 token；把 `globals.css:1924-1933` 的硬编码（圆角 16、`#fff`、`#1a1201`）改为引用 CSS 变量或 token | `grep` 无新硬编码色；Tooltip 底色为暖深棕 |
| 1.3 | 浮层进入动画 | `globals.css` 新增 keyframe + `theme.ts` motion token | Modal：fade + scale(0.97→1) 0.18s；遮罩 fade 0.18s；Drawer：slide 0.24s；底部弹层：translateY(24px→0) 0.26s；曲线 `cubic-bezier(.16,1,.3,1)`；`@media (prefers-reduced-motion: reduce)` 下全部 `animation:none` | 三端浮层开合有感知但克制；reduced-motion 下无动画 |
| 1.4 | 按钮微交互 | `globals.css` 通用类（扩展 `.pressable` 模式） | 主按钮 hover `translateY(-1px)` + 阴影加深 0.15s；按下回缩；图标按钮 hover 暖橙底色 `rgba(232,120,74,.08)`；全部限定 `@media (hover:hover) and (pointer:fine)` | 鼠标设备有反馈，触屏无 hover 残留 |
| 1.5 | Toast 品牌化 | `src/app/providers.tsx` Toaster 配置 | `richColors` 主题对齐：success 语义绿 `#1D9E75`、error 语义红 `#E24B4A`、info 暖橙；toast 内联图标，时长 2200ms 保持 | 三端 toast 色板统一 |

回滚：批次 1 全部为样式层，`git revert` 单文件即可；无数据流变更。

### 4.2 批次 2：品牌层

| # | 改动 | 位置 | 做法 |
|---|---|---|---|
| 2.1 | 空状态升级 | `src/components/Parent/BrandEmpty.tsx` + 三端空状态调用处 | 统一暖色线稿 SVG（书本/课桌/日历）+ 一句「下一步做什么」引导文案；替代 antd Empty 默认灰 |
| 2.2 | 浮层品牌标记 | 浮层标题统一样式 | Modal/Drawer 标题前 8px 暖橙圆点（延续 `ScheduleDetailPanel` 4px 橙条先例），占面积 <1%；标题统一 17px/700 |
| 2.3 | 骨架屏暖色 | dashboard/列表骨架 | shimmer 扫光 `rgba(232,120,74,.06)`，替代默认灰 |
| 2.4 | 反模式清理 | `parent/messages/client.tsx:336,432,458,549`；`parent/dashboard/client.tsx:336-343` | 渐变按钮（`#E87545`）改 token 主色平涂；欢迎浮层桌面 `backdrop-filter` 移除（移动端本就没有）；`bind/client.tsx:97` `#27a644` → 语义绿 token |
| 2.5 | 触控目标补齐 | 浮层关闭按钮、Dropdown 菜单项、家长端 28-42px 按钮 | 统一 ≥44px；补 `aria-label` |

### 4.3 批次 3：动效与布局

| # | 改动 | 做法 |
|---|---|---|
| 3.1 | 数字动效 | 考勤/工资/课时等上下文小统计：数值变化 0.4s count-up + 橙色高亮闪烁一次；不做循环、不做 hero 大数字 |
| 3.2 | 页面头统一 | 三端一致模式：eyebrow（13px/500/0.4px 字距）+ 标题 + 右侧操作区；`PageLayout` 已有雏形，收敛为统一组件 |
| 3.3 | 移动表单 footer 固定 | 改密（`parent/profile/client.tsx`）、新建留言（`parent/messages/client.tsx`）先行：footer sticky 底部 + `env(safe-area-inset-bottom)` + `visualViewport` 键盘偏移（参考 `teacher/messages/client.tsx:364` 先例） |
| 3.4 | 仪表盘节奏 | 统计区「数字+迷你趋势」混排图表与列表，避免一排列等大卡片（DESIGN.md 反模式） |

## 5. 暂缓/待决策清单（含理由）

| 事项 | 理由 | 触发条件 |
|---|---|---|
| maskClosable=false 表单子集（约 6 个） | 改变部分用户「点遮罩关闭」习惯 | 如出现表单误关丢数据的用户反馈，再按表单逐个启用 |
| Popover 落地 2-3 处（`volunteer-sim/page.tsx:2056` 等） | 组件数量不是质量指标；仅在「补充内容+按钮」场景使用 | 新交互需求涉及次级操作时按四维规格选型 |
| 三端主题拆分（教师绿/管理紫） | 视觉不依赖拆主题；拆分成本高 | token 收敛完成后评估是否值得 |
| Android 返回键接管历史栈 | 需逐页验证，易产生重复历史 | 逐页压测后按页面启用 |
| BottomSheet 专用组件 | 存量不重构；现有 CSS 底部弹层 + 3 处 Drawer bottom 已可用 | 新移动端弹层需求出现时，用专用组件承载 |
| 滚动锁计数器替代轮询 | 轮询已可用且低风险 | 出现滚动锁残留复现时再动 |

## 6. 每批次验收清单

1. `npm run build` 通过；eslint 通过（`npx eslint src` 抽查改动文件）。
2. 三端各抽查 3 个页面：桌面 1280px + 移动 375px（含浮层打开/关闭、滚动、键盘弹出）。
3. `prefers-reduced-motion`（系统设置）下：无任何动画。
4. `grep` 校验：改动文件无新硬编码颜色（白名单：语义色沿用 token）。
5. 触控目标抽查：浮层关闭按钮、菜单项 ≥44px。
6. 对比度抽查：新增文本不使用 `#9a8e7a` 小字号。

## 7. 执行记录

- 2026-08：codex 完成 a11y 保守修复 6 项（见第 2 节核验表）；视觉批次尚未执行。
- 本文件为视觉增强唯一执行依据；执行时按批次顺序，每批完成后更新本记录。
