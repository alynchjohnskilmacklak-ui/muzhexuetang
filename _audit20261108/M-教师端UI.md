# 教师端 UI 合规审计：B3 页面核对 + B7 可访问性与降级（ID: M）

> 审计范围（只读，未改源码、未重启 dev）：
> `src/app/teacher/interaction/**`（含 `roll-call/**`、`timer/**`、`_components/shell.tsx`、`interaction.module.css`）、`teacher/attendance/**`、`teacher/students/**`（含 `[id]`）、`teacher/schedule/**`。
> 规范依据：`.agents/skills/mz-interaction-catalog/SKILL.md`、`references/patterns.md`、`references/project-baseline.md`；结论口径遵循 `_audit20261108/_SPEC2.md`。
> 结论档位：合规 / 偏差 / 违规；问题类型：业务口径问题 / 纯视觉偏差 / 红线违反。

## 一、合规结论表

### 1. B3 · 四个页面 × 四项核对

| # | 页面 | 检查项 | 结论 | 证据(file:line) | 偏差规模(数字) | 类型 |
|---|---|---|---|---|---|---|
| 1 | P1 课堂互动（提问/点名/计时） | 卡片语言（半径/阴影/内边距） | 偏差 | `interaction.module.css:29,54,116,160,187,217,236,268,277,280,321,378,409,425,426,446,525,560,668` | 卡片面 16–18px 共 4 处；14px 3 处、12px 6 处、10px 2 处、9px 3 处、8px 1 处；裸写阴影 2 处，`--shadow-*` 令牌 0 处 | 纯视觉偏差 |
| 2 | P1 课堂互动 | 等级标签 TIER_APP 未被改 | 合规 | `teacher/interaction/**` 全目录 Grep `TIER_APP|tier|headerTheme|brandBackground|pageTheme` 0 命中；`constants/teacher-tier.ts:118-153` | 本批页面未渲染教师等级标签，无文案/色值改写 | — |
| 3 | P1 课堂互动 | 深绿顶栏 logo 可见性（红线 4） | 合规 | `components/Layout/MobileLayout.tsx:135,256,259-268`；`components/Layout/TeacherLayout.tsx:229-241` | 教师端未传 `brandBackground`，`:256` img 分支恒不成立，深色顶栏只走金色/白色文字回退 | — |
| 4 | P1 课堂互动 | 按压与状态反馈（点选/提交/撤销/迟到补记） | 偏差 | `interaction/page.tsx:106,210,212,295,297`；`roll-call/page.tsx:81-97,103,117,148,184,238,261`；`timer/page.tsx:48,57,70,82,94` | 4 类操作均有即时反馈；缺口 1 处：迟到补记进行中无本地 busy 标志，按钮未临时禁用 | 纯视觉偏差 |
| 5 | P2 考勤（attendance） | 卡片语言（半径/阴影/内边距） | 偏差 | `globals.css:10379-10387,10457,10502-10515,10683-10695` | 主卡片 14px ×4 选择器、学生卡 12px ×1；卡片阴影 `none !important`；描边用 hairline 令牌合规；内边距 12/14、13/15 | 纯视觉偏差 |
| 6 | P2 考勤 | 等级标签 TIER_APP 未被改 | 合规 | `teacher/attendance/**` Grep `TIER_APP|tier|headerTheme` 0 命中；学生会员徽标走共享组件 `components/Common/StudentMembershipBadge.tsx` | 0 处教师等级标签改写 | — |
| 7 | P2 考勤 | 深绿顶栏 logo 可见性（红线 4） | 合规 | 同 #3；`teacher/attendance/**` 无 `headerTheme|brandBackground|pageTheme|logo` 覆盖 | 0 处页面级覆盖 | — |
| 8 | P2 考勤 | 按压与状态反馈（状态点选/一键全勤/提交/用餐切换） | 合规 | `attendance/page.tsx:315,328,332,342,572,574,688,693,702,730` | 状态按钮即时 `is-active` 切换；提交有 `submitting` + Button loading；成功/失败/警告 toast 齐备；无 zombie 按钮 | — |
| 9 | P3 学员（students 列表 + 详情） | 卡片语言（半径/阴影/内边距） | 偏差 | `students/page.tsx:113,118,137,195,211,281`；`students/[id]/client.tsx:130,132,144,185,198,200,213,231,250,255,300,344,385,495,515,529,546,559,572,597` | 列表卡 10px ×2；详情 hero 20px ×1、内容卡 16px ×8；14px ×3、12px ×1、10px ×3；裸写阴影 4 处；`--shadow-*` 令牌 0 处 | 纯视觉偏差 |
| 10 | P3 学员 | 等级标签 TIER_APP 未被改 | 偏差 | `students/[id]/client.tsx:80-83` 本地 `membershipBadge` 与共享徽标/`constants/membership.ts` 不一致；教师 TIER_APP 0 改写 | 学生会员文案多 `★` 前缀 2 处（SVIP/VIP）；色值 3 档全部脱离共享令牌（见 §2.2） | 纯视觉偏差 |
| 11 | P3 学员 | 深绿顶栏 logo 可见性（红线 4） | 合规 | `teacher/students/**` 无 `headerTheme|brandBackground|pageTheme|logo` 覆盖 | 0 处页面级覆盖 | — |
| 12 | P3 学员 | 按压与状态反馈（查看详情/写反馈/目标勾选） | 偏差 | `students/page.tsx:119,184,204`；`client.tsx:197,212,249,528` | 按钮有 loading/disabled；4 个 div 可点表面无按压态类、无键盘事件（详见 §2.4 与 B7-c） | 纯视觉偏差 |
| 13 | P4 课表（schedule） | 卡片语言（半径/阴影/内边距） | 偏差 | `schedule/page.tsx:211,213,231,232,233,238,254,285,328,331,334,347,353,396,402,433,465` | 卡片 10px ×10、12px ×2、桌面网格小卡 5px ×2、导航钮 6px ×1；字面量/兜底边框 `#EEE7E1` 多处、今日底色字面量 3 处；0 处 `--shadow-*` 令牌 | 纯视觉偏差 |
| 14 | P4 课表 | 等级标签 TIER_APP 未被改 | 合规 | `teacher/schedule/**` Grep `TIER_APP|tier|headerTheme` 0 命中 | 0 处教师等级标签改写 | — |
| 15 | P4 课表 | 深绿顶栏 logo 可见性（红线 4） | 合规 | `teacher/schedule/**` 无 `headerTheme|brandBackground|pageTheme|logo` 覆盖 | 0 处页面级覆盖 | — |
| 16 | P4 课表 | 按压与状态反馈（周导航/类型 Tab/日折叠/下拉刷新） | 合规 | `schedule/page.tsx:195,204,205,206,212,217,222,255`；`globals.css:13637-13657` | 日折叠按钮带 `aria-expanded/aria-controls` 与 focus-visible 样式；周导航/Tab 为原生 button；下拉刷新走全局 `mz-pull-to-refresh` 指示器 | — |

### 2. B7 · 可访问性与降级

| # | 小项 | 结论 | 证据(file:line) | 偏差规模(数字) | 类型 |
|---|---|---|---|---|---|
| 17 | a. `prefers-reduced-motion` 覆盖完整性 | 合规 | `globals.css:156-165,309,1342,1687,9011-9033,12013,12950,13812,13998-14011`；`vocab.module.css:632,638-640,645-646,685-686`；`DeckSession.tsx:115`、`ReviewStack.tsx:80` | globals 覆盖块 9 处；范围内 CSS 动画/过渡 4 条全部落入通用 `*` 块或专项块；缺覆盖动画 **0** 条；范围内 `requestAnimationFrame` 0 处；`setInterval` 2 处为数据轮询（非视觉动画）；3D 翻转在 reduce 下落终态静态 | — |
| 18 | b. 触控热区 ≥44px | 偏差 | 见 §2.6 清单 | **23 组**可点元素高度 <44px（显式高度 12 组、padding 折算 7 组、AntD 默认尺寸 4 组）；合规热区 7 组（点名格 58px、结果钮 46px、主钮 50px、考勤底栏钮 44px、课表折叠钮 64px 等） | 纯视觉偏差 |
| 19 | c. 键盘可达 | 违规 | 见 §2.7 清单；`globals.css:151-154` focus-visible 规则 | **7 个**自绘可点元素（div/li/List.Item/Card + onClick）无 `role`/`tabIndex`/`onKeyDown`；范围内 `outline: none` 0 处；非 role 元素同时无替代焦点样式 | 红线违反（降级可用红线：键盘可达） |
| 20 | d. 无 emoji 图标（红线 5） | 违规 | 见 §2.8 清单 | **5 处** emoji 当图标/装饰（⏱、⚠️、👨‍👩‍👧、✅、🎯）；另 4 类排版符号（✓、★、←/→、×）单列备注，不计 emoji | 红线违反 |

## 二、逐项证据

### 2.1 卡片语言（B3-1）

**规范基线**（`project-baseline.md:70-72`）：卡片圆角 16–20px；软阴影三档令牌 `--shadow-raised / --shadow-overlay / --shadow-card`（`globals.css:106-108`）；描边用 hairline 令牌；内边距走卡片容器。

#### P1 课堂互动 `interaction.module.css`

- 圆角取值集合（按出现位置）：
  - 落在 16–20px：`.emptyBox:29` 16px、`.timerCard:446` 16px、`.drawButton:160` 18px、`.pickedCard:187` 18px —— 4 处合规。
  - 低于下限：`.headBar:54` 14px、`.panel:280` 14px、`.submitBar:425` 14px（3 处 14px）；`.tabs:116`、`.resultBtn:217`、`.commentInput:236`、`.rosterCell:378`、`.primaryBtn:525`、`.seg:560`（6 处 12px）；`.syncBar:106`、`.lockNote:409`（2 处 10px）；`.tab:129`、`.smallBtn:268`、`.seg button:571`（3 处 9px）；`.historyItemActive:321` 8px（1 处）。
- 阴影：`.submitBar:426` `box-shadow: 0 -6px 18px rgba(26,18,1,.06)`、`.tabsSticky:668` `box-shadow: 0 -6px 16px rgba(26,18,1,.08)` —— 2 处裸写 rgba，未挂 `--shadow-raised/card/overlay`；全模块 `--shadow-*` 令牌使用 **0** 处。
- 描边：`.page:5` `--ci-border: var(--color-border, #eee7e1)` 走 `--color-border` 兜底，未用 hairline 令牌 `--color-hairline`。
- 内边距：`.headBar:51` 13px 14px、`.panel:277` 13px 14px 14px、`.timerCard:443` 20px 16px 16px、`.pickedCard:184` 16px 14px、`.emptyBox:25` 28px 20px、`.submitBar:422` 10px 12px 12px —— 无令牌化间距，量级与基线不冲突。

#### P2 考勤 `globals.css:10379-10515`

```css
/* globals.css:10379-10387 */
.teacher-attendance-lesson-card,
.teacher-attendance-main-card,
.teacher-attendance-progress-card,
.teacher-attendance-intensive-card {
  border: 1px solid var(--color-hairline) !important;
  border-radius: 14px !important;
  background: var(--color-surface-1) !important;
  box-shadow: none !important;
}
```

- 4 类主卡片圆角 14px（低于 16px 下限）；`.teacher-attendance-student-card:10512` 12px；`.teacher-attendance-lesson-row:10440` 8px（行形态，非独立卡片）。
- 卡片阴影统一 `none !important`（`:10386`），未使用三档阴影令牌；描边 hairline 令牌合规（`:10383`、`:10511`）。
- 内边距：学生卡 `12px 14px`（`:10510`）；进阶/进度卡 `13px 15px`（`:10457`）；底栏 `10px`（`:10691`）。

#### P3 学员

- 列表 `students/page.tsx`：学员卡 `borderRadius: 10`（`:113`）、筛选卡 `10`（`:281`）、Tag `6`（`:137`）、按钮 `8`（`:195`、`:211`）；描边 `var(--color-hairline)`（`:114`）合规；卡片体无内联阴影。
- 详情 `students/[id]/client.tsx`：hero 20px（`:130`）合规；16px ×8（`:198,:213,:344,:385,:495,:515,:546,:572`）合规；低于下限：14px ×3（`:185` 统计块、`:231` 家长信息、`:300` 时间线卡）、12px ×1（`:250` Tab）、10px ×3（`:529` 目标行、`:559` 弱项行、`:597` 方法行）。头像/图标方块/图片/TextArea/胶囊标签不计入卡片口径。
- 裸写阴影 4 处：`:132` `0 12px 28px rgba(14,94,78,.28)`、`:144` `0 6px 14px rgba(0,0,0,.18)`、`:200` `0 8px 18px rgba(232,120,74,.30)`、`:255` `0 6px 14px rgba(14,94,78,.22)`；`--shadow-*` 令牌 **0** 处。

#### P4 课表 `schedule/page.tsx`

- 圆角：类型 Tab 容器 10px（`:211`）；统计卡 10px ×3（`:231,:232,:233`）；移动端列表卡 10px（`:238`）；课次卡 10px（`:285`）；晚托日块 10px（`:331`）、晚托行 10px（`:334`）；班课/突击桌面卡 10px（`:347,:396`）；晚托卡 12px（`:328`）；日内容 12px（`:254`）；桌面网格小卡 5px ×2（`:375,:433`）；周导航按钮 6px（`:465`）。（`:434` 为小胶囊标签 3px，按标签形态不计入卡片口径。）
- 硬编码边框/底色（未走令牌）：字面量 `#EEE7E1`（`:254,:285`）；`var(--color-border, #EEE7E1)` 兜底（`:349,:353,:363,:373,:398,:402,:413,:419,:422,:465`）；今日底色字面量 `#FFF8F4`（`:254`）、`#FFF6F1`（`:353`）、`#F5F0FF`（`:402`）；`:331` 边框走 `var(--color-hairline)` 合规。
- 0 处 `--shadow-*` 令牌；卡片内边距内联 `10px 12px` 量级，无令牌化间距。
- 内联强调色字面量：突击班 Tab `#534AB7`（`:219`）、统计卡橙 `#E8784A`（`:233`）；`#1D9E75`（`:232`）与 `--color-success` 一致。

### 2.2 等级标签 TIER_APP（B3-2）

**规范基线**（SKILL.md:39、红线 1）：教师端等级名称、徽标、映射与主题配色锁定；视觉升级只改结构/布局/尺寸/反馈。

- 本批 4 个页面目录 Grep `TIER_APP`、`tier`、`headerTheme`、`brandBackground`、`pageTheme`、`logo` 均 **0 命中**；教师等级标签仅在 `components/Layout/TeacherLayout.tsx:239-241` 由 `TIER_THEME[appTier]` / `TIER_APP` 消费，页面侧无覆盖。
- `TIER_APP` 主题定义：`constants/teacher-tier.ts:118-153`（5 档 headerBg/headerFg/siderBg/dark）；徽标文案与浅底色定义：`teacher-tier.ts:22-55`。
- 全局标签类（`globals.css:11559-11610`）与令牌逐档比对：

| 档 | TIER_THEME 令牌（teacher-tier.ts:23-55） | globals.css 标签类 | 比对结果 |
|---|---|---|---|
| MANAGER | 文案「管理」；bg `#F0EDF8` / border `#7C6BC4` / accent `#4C3FA8` | `:11559-11562` 渐变 `#6B5BBF→#4C3FA8`、字 `#fff`、边 `#8F80D4` | 文案一致；色值不一致（既有反白徽标写法，非本批页面改动） |
| ELITE | 文案「牧哲学堂专属教师」；bg `#0E2E2A` / border `#C9A45C` / accent `#C9A45C` | `:11604-11607` `#0E2E2A` / `#C9A45C` / `#C9A45C` | 一致 |
| SENIOR | 文案「资深教师」；bg `#F8F3E7` / border `#C9A45C` / accent `#123C35` | `:11564-11567` `#F8F3E7` / `#123C35` / 边 `#D6B56A` | 边框 `#D6B56A` ≠ 令牌 `#C9A45C`（既有差异，非本批页面改动） |
| EXPERIENCED | 文案「经验教师」；bg `#FFF7F1` / border `#F2B58F` / accent `#B85C2E` | `:11569-11572` 同色 | 一致 |
| NEW | 文案「新晋教师」；bg `#F7FBF8` / border `#D9EFE3` / accent `#3E8E6E` | `:11574-11577` 渐变 `#3E8E6E→#2C6E52`、字 `#fff`、边 `#D9EFE3` | 反白渐变（既有写法），文案一致 |

**判定**：教师 TIER_APP 锁定值在本批页面未被改写（合规）；上表色值差异均位于全局 CSS 既有类，不在本片文件域。

- **旁证（学生会员徽标，非 TIER_APP，偏差）**：`students/[id]/client.tsx:80-83` 本地 `membershipBadge` 复刻了共享徽标逻辑，与共享组件 `components/Common/StudentMembershipBadge.tsx` + `constants/membership.ts` 不一致：
  - SVIP：本地文案 `★ SVIP`、字 `#5A4420`、金渐变 `#E4C97F→#C9A45C`；共享 badge `SVIP`、bg `#F8F3E7`、边 `#C9A45C`、字 `#123C35`。
  - VIP：本地 `★ VIP`、字 `#7A3A18`、橙渐变 `#F7A97C→#F0875B`；共享 `VIP`、bg `#FFF7F1`、边 `#F2B58F`、字 `#2F3F38`。
  - 普通：本地 `rgba(255,255,255,.85)` / `rgba(255,255,255,.14)`；共享 bg `#F7FBF8`、边 `#D9EFE3`、字 `#285247`。
  - 类型：纯视觉偏差（文案多 `★` 前缀、色值脱离共享令牌）；建议改回用共享 `StudentMembershipBadge`。

### 2.3 深绿顶栏 logo 可见性（B3-3 · 红线 4）

```tsx
// components/Layout/MobileLayout.tsx:135
const isDarkHeader = Boolean(headerTheme?.dark) || pageTheme === 'svip'
// :256-268
{brandBackground && !isDarkHeader ? (
  <img className="brand-background-header-logo" src="/brand/logo.png" alt="牧哲学堂" />
) : <span className="mobile-brand-title" style={{
  color: headerTheme?.fg ?? (pageTheme === 'svip' ? '#F6E9C8' : 'var(--color-ink)'),
  textShadow: pageTheme === 'svip' || headerTheme ? '0 1px 3px rgba(0,0,0,.35)' : undefined,
}}>{title}</span>}
```

- 教师端移动版调用点 `TeacherLayout.tsx:229-241`：传 `headerTheme`（`:241`，`dark` 来自 `TIER_APP.dark`，`teacher-tier.ts:124,131,138,145,152`），**未传 `brandBackground`**（`undefined`）→ `:256` 条件 `brandBackground && !isDarkHeader` 恒为 false → 深色顶栏（ELITE/SENIOR，`dark: true`）只渲染文字 span，不会出现 img 黑 logo 压深底。
- 文字回退仍在：fg 取 `headerTheme.fg`（ELITE/SENIOR 为 `#F6E9C8` 金色，`teacher-tier.ts:127,134`），并带暗色文字阴影 `:264`。
- 本批 4 页面 Grep 无任何 `headerTheme` / `brandBackground` / `pageTheme` 覆盖，回退分支未被绕过。**判定：合规。**
- 待运行时验证（非 MobileLayout 分支）：桌面侧栏 `TeacherLayout.tsx:293` `<Image src="/images/logo.jpg">` 位于 `siderBg`；ELITE `siderBg #0D3732` 为深底（`teacher-tier.ts:128`），若 `logo.jpg` 为深色图形需目视确认可见性。

### 2.4 按压与状态反馈（B3-4）

| 操作 | 载体 file:line | 即时反馈 | 提交中 | 成功 | 失败 | 判定 |
|---|---|---|---|---|---|---|
| 点名 · 点选 | `roll-call/page.tsx:103`（`tap`）；格内类 `:209` `cellMarked/cellAbsent/cellLate`（CSS `:384-387`） | 本地 draft 切换 + 格内描边/底色即时变更；锁定/请假 `message.warning`（`:72,:78`） | — | 随提交闭环 | 由 `shell.tsx:200,227` `message.error` 兜底 | 合规 |
| 点名 · 提交 | `roll-call/page.tsx:117` `submit` → Modal.confirm → `saveRollCall` | 按钮禁用 + 文案「提交中…」（`:261`）、`savingDot` 状态点（`:184`，CSS `:357`） | 有 | `message.success`（`:142`） | `shell.tsx:200,227` | 合规 |
| 点名 · 撤销 | `roll-call/page.tsx:148` `reset` → Modal.confirm → `resetRollCall` | `dangerLink` 可点态（CSS `:673-683`） | — | `shell.tsx:256` 成功 toast | `shell.tsx:252` 失败 toast | 合规 |
| 点名 · 迟到补记 | `roll-call/page.tsx:81-97` `markLate` | 成功 `message.success('已补记为迟到')`（`:92`）；失败 `message.error`（`:89,:95`） | **缺口**：进行中无本地 busy 标志，触发按钮未临时禁用，连点无拦截 | 有 | 有 | 偏差（纯视觉偏差） |
| 考勤 · 状态点选 | `attendance/page.tsx:688,693,702` → `setAttendance`；`is-active` 类（CSS `:10679-10681`） | 本地 state + 选中底色/边框即时切换；锁定态 `disabled`（`:690,:695,:704`） | — | — | — | 合规 |
| 考勤 · 一键全勤 | `attendance/page.tsx:315` `handleAllPresent`；保留请假时 `toast.info`（`:328`） | 本地批量置全勤 | — | — | — | 合规 |
| 考勤 · 提交 | `attendance/page.tsx:342`；`submitting` + Button `loading`（`:574,:730`） | 底栏按钮 loading 态 | 有 | 成功 toast | 失败/警告 toast | 合规 |
| 考勤 · 用餐切换 | `attendance/page.tsx:332` | 本地 state + `is-meal` 类（CSS `:10681`） | — | — | — | 合规 |
| 提问 · 抽取 | `interaction/page.tsx:106` `create` 链路；`drawing/busy` 标志；按钮禁用（`:210`）、文案「正在抽取…」（`:212`） | 抽取后 `setPicks` 即时上屏 | 有 | 有 | `message.error` | 合规 |
| 提问 · 结果/标签草稿 | `page.tsx:262`、`:277` | 本地 draft 即时切换 `resultBtnActive`/`tagChipOn`（CSS `:221-225,:615-619`） | — | — | — | 合规 |
| 提问 · 提交 | `page.tsx:143`；`submitting` 文案「提交中…」（`:295`） | 按钮 loading 态 | 有 | `message.success` | `message.error` | 合规 |
| 提问 · 重置/删除 | `page.tsx:297`（`!dirty` 禁用）；`:182` 失败 toast | 禁用态 | — | — | 有 | 合规 |
| 计时 · 开始/暂停/归零/加时长 | `timer/page.tsx:48,57,70,82,94` | 原生 button 本地即时态；进度条 `timerFill` 宽度过渡（CSS `:470-475`） | — | — | — | 合规 |
| 课表 · 周导航/Tab/日折叠/刷新 | `schedule/page.tsx:195,204,205,206,212,217,222,255` | 原生 button + `aria-expanded/controls`；刷新走全局 `mz-pull-to-refresh` | — | — | — | 合规 |

- zombie 按钮排查：范围内所有 `onClick` 均绑定到真实 handler（提交/点选/撤销/补记/切换/导航），无「绑定空函数或仅展示」的死按钮；未发现点了没反应的控件。

### 2.5 B7-a · `prefers-reduced-motion` 覆盖

**globals.css 覆盖块（9 处 reduce + 2 处 no-preference，后者不计入降级名单）**：

| # | 行号 | 覆盖选择器 | 手段 |
|---|---|---|---|
| 1 | `globals.css:156-165` | 通用 `*, *::before, *::after` | `animation-duration/.01ms`、迭代 1 次、`transition-duration/.01ms`、`scroll-behavior: auto` |
| 2 | `globals.css:309-311` | `.brand-bg-float` | `animation: none` |
| 3 | `globals.css:1342-1353` | 启动屏 `.splash-screen-*` | 过渡/动画关闭 + `clip-path: none` |
| 4 | `globals.css:1687-1694` | 登录海报 `.login-business-*` | 动画/过渡 `none` |
| 5 | `globals.css:9011-9033` | 通用 `*` + `.stagger-item`、`.status-breathe`、`.pressable:active` | 时长压 `.01ms`；交错/呼吸动画 `none`；按压位移 `none` |
| 6 | `globals.css:12013-12017` | `.teacher-message-card` | `transition: none` |
| 7 | `globals.css:12950-12967` | `.mz-ripple-layer`、`.mz-spring-release`、`.mz-is-pressed`、开关把手、点赞 burst | 动画 `none`、位移 `none`、scale 归 1 |
| 8 | `globals.css:13812-13827` | `.teacher-dashboard-quick-action`、`.teacher-lesson-card__*` | 过渡/位移 `none`，光带 `display: none` |
| 9 | `globals.css:13998-14011` | 底部导航指示器/项/角标、`.mobile-route-enter`、`.teacher-intensive-*`、`.mz-pull-to-refresh__indicator` | 动画/过渡 `none` |

**范围内动效清单逐条核对**：

| 动效 | 位置 | 类型 | 是否落入 reduce 名单 |
|---|---|---|---|
| `.tab` 背景/颜色过渡 0.15s | `interaction.module.css:131` | CSS transition | 是 —— 通用块 `:156/:9016-9023` |
| `.timerFill` 宽度过渡 0.4s linear | `interaction.module.css:474` | CSS transition | 是 —— 通用块 |
| 考勤进度条 `flex .2s ease` | `globals.css:10482` | CSS transition | 是 —— 通用块 |
| `.stagger-item` 交错入场 | `students/page.tsx:109`、`schedule/page.tsx:243` 消费；类定义全局 | CSS animation `fadeInUp .38s` | 是 —— 专项块 `:9025-9028` |
| 计时 tick 500ms | `shell.tsx:344` `setInterval` | JS 数据轮询（刷新剩余秒数文本） | 非视觉动画，不计入；reduce 下不应停止时钟语义 |
| 考勤时钟 15s | `attendance/page.tsx:232` `setInterval` | JS 数据轮询 | 同上 |
| `timerDone` 类 3s 后移除 | `timer/page.tsx:24` `setTimeout` | 状态类移除（CSS 仅换字色 `:461`，无动画） | 无过渡载体，无需降级 |
| `requestAnimationFrame` | 范围内 **0** 处 | — | — |
| 内联 `transition:` 样式 | 范围内 **0** 处 | — | — |
| 3D 翻转 | 教师端 0 处；背单词 `vocab.module.css:632,638-640,645-646,685-686` | CSS rotateY 180° | 见下 |

**3D 翻转退化检查（背单词，对照基线要求终态静态）**：
- `vocab.module.css:632` 翻转过渡 `transform 0.6s cubic-bezier(.3,.9,.3,1)`；`.flipCard.flipped:638-640` 终态 `rotateY(180deg)`；背面 `:685-686` `rotateY(180deg) translateZ(1px)`；`backface-visibility: hidden`（`:645-646`）不透光不镜像。
- reduce 下通用块把 transition 压到 `.01ms`，transform 终态照常应用 → 卡片直接落在 `rotateY(180deg)` 终态，不停在半翻中间态。
- JS 指针高光在 reduce 下直接返回：`DeckSession.tsx:115`、`ReviewStack.tsx:80` `matchMedia('(prefers-reduced-motion: reduce)').matches → return`。

**判定**：缺 reduced-motion 覆盖的动画 **0** 条；3D 翻转退化为终态静态；合规。

### 2.6 B7-b · 触控热区 ≥44px 清单

> 折算口径：显式 `min-height/height` 直接判；仅 `padding` 撑高的按「字号 × 行高 + 上下 padding」折算；AntD 默认中号按钮按 32px、Segmented 默认按 ~32px 计。合规热区单列。

**<44px 可点元素（23 组）**：

| # | 位置 file:line | 元素 | 尺寸/折算 | 折算高度 | 分组 |
|---|---|---|---|---|---|
| 1 | `interaction.module.css:121`（消费 `shell.tsx:613`） | 顶部 `.tab` 导航 Link ×3 | `min-height: 38px` | 38 | 显式高度 |
| 2 | `interaction.module.css:248`（消费 `page.tsx:297`、`timer:70`） | `.ghostBtn` 次级按钮 | `min-height: 36px` | 36 | 显式高度 |
| 3 | `interaction.module.css:261`（消费 `roll-call:173`、`timer:94`） | `.smallBtn` 小按钮 | `min-height: 32px` | 32 | 显式高度 |
| 4 | `interaction.module.css:484`（消费 `timer:48,57`） | `.chip` 计时预设/加 1 分钟 ×5 | `min-height: 34px` | 34 | 显式高度 |
| 5 | `interaction.module.css:565`（消费 `page.tsx:196,199`） | `.seg button` 模式切换 ×2 | `min-height: 36px` | 36 | 显式高度 |
| 6 | `interaction.module.css:604`（消费 `page.tsx:277`） | `.tagChip` 点评标签 ×5 | `min-height: 34px` | 34 | 显式高度 |
| 7 | `interaction.module.css:642-643`（消费 `page.tsx:342`） | `.historyDelete` 记录删除钮 | `min-width/height: 32px` | 32 | 显式高度 |
| 8 | `interaction.module.css:653`（消费 `shell.tsx:555`） | `.timerChip` 计时链接 | `padding: 2px 7px` + 11px 字 | ≈17 | padding 折算 |
| 9 | `interaction.module.css:674`（消费 `roll-call:238`） | `.dangerLink` 撤销提交 | `min-height: 36px` | 36 | 显式高度 |
| 10 | `interaction.module.css:540,546`（消费 `timer:82`；`:90` 只读不可点） | `.switchRow` 铃声 checkbox 行 | `padding: 10px 0` + 13px×1.6 | ≈40.8 | padding 折算 |
| 11 | `globals.css:10664`（消费 `attendance:688,693,702`） | 学员状态按钮（出勤/请假/用餐）桌面 | `min-height: 40px` | 40 | 显式高度；移动端 `:10834` 覆盖 44px 合规 |
| 12 | `globals.css:10406`（消费 `attendance:493`） | `.teacher-attendance-pill` 移动端课次钮 | `padding: 9px 14px` + 13px/1.35 | ≈35.6 | padding 折算 |
| 13 | `attendance/page.tsx:572,574` | 一键全勤 / 提交考勤 AntD Button（桌面） | AntD 默认中号 32px，无显式高度覆盖 | 32 | AntD 默认；移动端 `globals.css:10697` 44px 合规 |
| 14 | `attendance/page.tsx:441` | 范围 Segmented | AntD Segmented 默认 ~32px | ≈32 | AntD 默认 |
| 15 | `students/page.tsx:194`（消费 `:184`） | 「去反馈」按钮 | height 34 mobile / 30 desktop | 34/30 | 显式高度 |
| 16 | `students/page.tsx:211`（消费 `:204`） | 「查看详情」按钮 | height 34 mobile / 30 desktop | 34/30 | 显式高度 |
| 17 | `students/page.tsx:273` | 搜索 Input | height 40 mobile | 40 | 显式高度 |
| 18 | `students/page.tsx:285` | 筛选 Segmented | AntD 默认 ~32px | ≈32 | AntD 默认 |
| 19 | `students/[id]/client.tsx:121` | 返回 Button（`type="text"`） | AntD text 默认 ~32px | ≈32 | AntD 默认 |
| 20 | `client.tsx:250`（消费 `:249`） | 详情 Tab 切换 ×3 | `padding: 9px 0` + 13px 字 | ≈31 | padding 折算 |
| 21 | `client.tsx:529`（消费 `:528`） | 目标完成切换行 | `padding: 8px 10px` + 13px 字 | ≈33 | padding 折算 |
| 22 | `schedule/page.tsx:465`（消费 `:204,205,206`） | 周导航按钮 ×3 | `padding: 4px 10px` + 13px 字 | ≈26 | padding 折算 |
| 23 | `schedule/page.tsx:213,218,223`（按钮 `:212,:217,:222`） | 类型 Tab 按钮 ×3 | `padding: 9px 10px` + 12px/1.4 | ≈34.8 | padding 折算 |

**合规热区（≥44px，抽样核对）**：点名格 `.rosterCell:367` 58px；`.resultBtn:211` 46px；`.primaryBtn:518` 50px；`.drawButtonSmall:580` 44px；考勤底栏钮 `globals.css:10697` 44px；课表日折叠钮 `globals.css:13640` 64px；考勤学生卡行（头像 40px + 上下 padding 12px，`globals.css:10502-10510`）≈64px。

### 2.7 B7-c · 键盘可达清单

- 范围内 Grep `onKeyDown|role=|tabIndex` 全部 **0 命中**；全局 focus-visible 规则 `globals.css:151-154` 仅覆盖 `button/a/input/textarea/select/[role=button]`；范围内 `outline: none` **0** 处。

**不可键盘操作的可点元素（7 个）**：

| # | 位置 file:line | 元素 | 现状 | 缺什么 |
|---|---|---|---|---|
| 1 | `interaction/page.tsx:321` | `<li>` 提问记录行 `onClick`（选中当前记录） | 裸 li + onClick，`cursor: pointer`（CSS `:314-316`） | `role="button"`/`tabIndex={0}`/`onKeyDown`（Enter/Space）+ 焦点样式 |
| 2 | `attendance/page.tsx:532` | AntD `List.Item` `onClick`（切换课次，桌面端） | 渲染为 div，无 role/键盘事件 | 同上；`aria-disabled` 已有（提交中）但缺键盘激活 |
| 3 | `students/page.tsx:119` | AntD `Card` `onClick`（进详情） | div + onClick | 同上 |
| 4 | `students/[id]/client.tsx:197` | div「写课堂反馈」 | 裸 div + onClick | 同上 |
| 5 | `client.tsx:212` | div「写表现反馈」 | 裸 div + onClick | 同上 |
| 6 | `client.tsx:249` | div Tab 切换 | 裸 div + onClick | 同上；宜用 `role="tab"` + 方向键 |
| 7 | `client.tsx:528` | div 目标完成勾选 | 裸 div + onClick | 同上；宜用 `role="checkbox"` + aria-checked |

- 已合规的键盘载体：点名格/状态钮/主按钮/导航/Tab/折叠钮均为原生 `<button>`（`roll-call:209`、`attendance:688/693/702`、`schedule:204-226,255`）；课表折叠钮带 `aria-expanded`/`aria-controls`（`schedule:255`）与 `:focus-visible` 样式（`globals.css:13652-13657`）。

### 2.8 B7-d · emoji 图标清单（红线 5）

**违规（5 处，emoji 当图标/装饰）**：

| # | 位置 file:line | emoji | 用途 |
|---|---|---|---|
| 1 | `interaction/_components/shell.tsx:559` | ⏱ | 顶部计时 chip 内的时钟图标（`shell.tsx:555` Link 内） |
| 2 | `attendance/page.tsx:680` | ⚠️ | 剩余课时不足 meta 前的警告图标 |
| 3 | `students/[id]/client.tsx:234` | 👨‍👩‍👧 | 家长信息行图标 |
| 4 | `client.tsx:533` | ✅ | 目标已完成图标 |
| 5 | `client.tsx:533` | 🎯 | 目标未完成图标 |

**排版符号备注（不计 emoji，建议后续替换为 AntD icon 或令牌色圆点）**：`attendance:214` ✓（提交文案「已提交 ✓」）；`client.tsx:81,82` ★（会员徽标前缀，见 §2.2 旁证）；`schedule:204,206` ←/→（周导航箭头）；`roll-call:9,168` →（说明文案）；`page.tsx:240` ×、`:349` ×（关闭/删除字符）。

## 三、按出现次数排序的偏差清单

1. **纯视觉偏差 · 触控热区 <44px：23 组**（明细 §2.6；显式高度 12 组、padding 折算 7 组、AntD 默认 4 组）。
2. **纯视觉偏差 · 卡片圆角低于 16px 下限：47 处**——P1 互动 15 处（14px×3、12px×6、10px×2、9px×3、8px×1）；P2 考勤 5 处（14px×4 选择器、12px×1）；P3 学员 12 处（列表 10px×2、按钮 8px×2、Tag 6px×1；详情 14px×3、12px×1、10px×3）；P4 课表 15 处（10px×10、12px×2、5px×2、导航钮 6px×1）。合规圆角：16–18px 共 4 处（P1）；20px 1 处 + 16px×8（P3 详情）。
3. **纯视觉偏差 · 裸写阴影未挂令牌：6 处**——P1 互动 2 处（`module.css:426,668`）；P3 详情 4 处（`client.tsx:132,144,200,255`）；P2 考勤卡片阴影 `none !important`（`globals.css:10386`）；P4 课表 0 阴影。范围内 `--shadow-raised/overlay/card` 令牌使用 **0** 处。
4. **红线违反 · 不可键盘操作可点元素：7 个**（明细 §2.7）。
5. **红线违反 · emoji 图标：5 处**（明细 §2.8）。
6. **纯视觉偏差 · 学生会员徽标脱离共享令牌：3 档**（`client.tsx:80-83`，文案 `★` 前缀 2 处、色值 3 档，明细 §2.2）。
7. **纯视觉偏差 · 迟到补记无 in-flight busy 态：1 处**（`roll-call/page.tsx:81-97`）。
8. **纯视觉偏差 · 硬编码边框/底色：6 处字面量**（P4 课表 `#EEE7E1`×2：`:254,:285`；今日底色 `#FFF8F4`×1 `:254`、`#FFF6F1`×1 `:353`、`#F5F0FF`×1 `:402`；另有 10 行 `var(--color-border, #EEE7E1)` 兜底值，`:349,:353,:363,:373,:398,:402,:413,:419,:422,:465`）；P1 描边走 `--color-border` 兜底而非 hairline（`module.css:5`）。

## 四、红线逐条核对（用户 6 条）

| # | 红线 | 判定 | 证据 |
|---|---|---|---|
| 1 | 只改结构/动效/图标/卡片呈现；禁改主题令牌、会员/教师等级标签文案与样式、业务文案、接口与数据口径 | **部分违反**（学生会员徽标局部） | 教师 TIER_APP 文案/色值 0 改写（§2.2，`teacher-tier.ts:22-153`）；偏差：`client.tsx:80-83` 本地复刻会员徽标，文案加 `★` 前缀、3 档色值脱离共享令牌；接口/数据通路本片未触碰（只读审计） |
| 2 | 既有列表行/卡片版式以现状为准，不擅自把分隔线行重构为独立卡片/便当格 | **合规** | 考勤课次行 `globals.css:10436-10443` 仍为行形态；学员列表 `students/page.tsx:119` 单卡形态维持现状；提问记录 `page.tsx:304-327` 仍为分隔线 li 列表；未发现行→卡片重构 |
| 3 | SVIP 权益区底色保持墨绿渐变 `#123C35→#0B2A25` + 金边 `rgba(201,164,92,.5)`，不刷浅色 | **合规（不适用）** | 本批教师端 4 页面无 SVIP 权益区；无相关底色硬编码 |
| 4 | 深绿顶栏品牌 logo 必须可见，`isDarkHeader` 金色文字回退不得复发 | **合规** | `MobileLayout.tsx:135,256,259-268`；`TeacherLayout.tsx:229-241` 未传 `brandBackground`；4 页面无覆盖；待运行时验证桌面侧栏 `TeacherLayout.tsx:293` ELITE 深底 logo.jpg |
| 5 | 不用 emoji 作图标/装饰（品牌资产除外） | **违反** | 5 处 emoji：`shell.tsx:559` ⏱、`attendance:680` ⚠️、`client.tsx:234` 👨‍👩‍👧、`client.tsx:533` ✅/🎯（明细 §2.8） |
| 6 | 动效红线：烟花只挂点赞/收藏；翻转背面不透光不镜像；无载体不强套；不整页重排；reduce 下终态静态 | **合规** | 范围内无点赞烟花；教师端无 3D 翻转；背单词翻转 `vocab.module.css:645-646,685-686` 背面处理合规、reduce 落终态（§2.5）；无整页视觉重排；reduce 覆盖 9 块、缺覆盖动画 0 条 |

## 五、需要用户拍板

1. **学生会员徽标是否回归共享组件**（`client.tsx:80-83`）：现状本地复刻，文案 `★ SVIP/★ VIP`、色值金/橙渐变；共享 `StudentMembershipBadge` 为浅底令牌色。两种口径：① 回归共享组件（与家长端徽标一致，去掉 `★` 前缀）；② 保留本地渐变写法并补入令牌体系。前者改动小、风险低。
2. **23 组 <44px 热区的收口范围**：交互模块内 10 组（P1）多为紧凑胶囊/小按钮，是否统一提到 44px 会影响三栏点名格与底部底栏密度；建议移动端优先抬高 `chip/tagChip/smallBtn/historyDelete`，桌面端 AntD 默认按钮另议。
3. **7 个自绘可点元素的键盘方案**：是补 `role="button"` + `tabIndex` + Enter/Space，还是直接改造成原生 `<button>`/`<AntD Button>`；后者可同时获得全局按压层 `mz-is-pressed` 反馈（`project-baseline.md:30-32`）。

## 六、未能确认 / 需运行时验证

1. 桌面侧栏 ELITE 深底 `siderBg #0D3732` 下 `TeacherLayout.tsx:293` `logo.jpg` 的实际可见性（图片未在源码内核对；需真机/截图确认）。
2. AntD 默认 Button / Segmented 在当前 AntD 5 版本下的真实计算高度（按 32px 估；需 dev 环境量取 computed style 复核）。
3. 考勤桌面端课次行 `List.Item`（`attendance:532`）在 AntD 5 下是否附带原生焦点态（源码未见 role/tabIndex，按不可键盘操作计；需浏览器 Tab 走查复核）。
