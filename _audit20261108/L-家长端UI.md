# 家长端页面 UI 合规审计 · 动效资产复用核查（ID: L）

> 范围：B2 家长端 8 个页面逐个核对 + B6 动效资产复用核查。
> 对象目录：`src/app/parent/dashboard`、`class-feedback`、`notifications`、`archive`、`schedule`、`materials`、`vocab`、`benefits`，以及消费的 `src/components/Parent/**`。
> 方法：`Select-String` / Python 码位扫描 + 逐文件 Read 上下文判定；只读，未改源码、未重启 dev、未跑构建。
> 规范依据：`.agents/skills/mz-interaction-catalog/SKILL.md:26-43`、`references/project-baseline.md:13-41,59-72,90-99`、`references/patterns.md`（P08/P15/P17/P21/P22/P23/P32/P39）。
> 令牌基线（`src/app/globals.css:99-108`）：`--radius-md:8px`、`--radius-lg:12px`、`--radius-xl:16px`、`--radius-xxl:24px`、`--radius-container = --radius-lg = 12px`；卡片圆角规范区间 **16–20px**；阴影三档 `--shadow-raised/overlay/card`；按压曲线 `cubic-bezier(.2,.8,.2,1)`；流体/吸附 `cubic-bezier(.16,1,.3,1)`；减速 `easeOutDeceleration`。
> B1（globals 统计）由主控 K 分片完成，本片不重复统计，仅引用：globals 圆角 340 条声明 / 12 套 px 值、16–20px 仅占 13.2%；box-shadow 130 条中裸写 107 条；内联 borderRadius 1507 处 / 166 文件（见 `K-UI令牌与主题.md`）。

## 经验记录缺失说明

任务要求读 `stacked-tab-panel-inactive-must-hide` 与 `css-3d-flip-backface-flattened-context.md` 两条经验记录；在 `.agents/`、`.claude/`、`.serena/`、`.impeccable/`、`docs/` 及用户 skills 目录递归 Glob / Grep 后**均不存在**。本片按任务简述的原则执行：

- 未激活面板必须完全隐藏（`opacity:0` + `visibility:hidden` + `pointer-events:none`），占位不溢出，不允许右/下边缘漏出另一层面板条；
- 整卡不做半透明发灰；
- 3D 翻转背面必须不透光、不镜像，透明度门控兜底。

---

## 一、合规结论矩阵（8 页 × 5 项）

图例：✅ 合规　🟡 偏差　🔴 违规。结论口径：合规 / 偏差 / 违规；类型：纯视觉偏差 / 红线违反 / 业务口径问题。

| 页面 | ① 圆角/阴影/间距统一 | ② 半透明发灰叠层 | ③ hover/按压反馈 | ④ zombie 按钮 | ⑤ emoji 图标 |
|---|---|---|---|---|---|
| dashboard | 🟡 偏差（主卡 12px 走 `--radius-container`，低于 16–20；hero 阴影走 constants）`dashboard/client.tsx:343`；`components/Parent/ParentCard.tsx:25-26` | ✅ 合规（深色 hero 上的白色光斑属装饰，非奶油底整卡压暗）`dashboard/client.tsx:344` | ✅ 合规（7 处可点均为原生 button / AntD Button，全局层覆盖）`dashboard/client.tsx:341,370,376,380,415,424,429` | ✅ 合规（空函数 / console.log / 无态 disabled 均 0 命中） | 🔴 违规 `dashboard/client.tsx:350`（👑）、`:405`（👑✨） |
| class-feedback | 🟡 偏差（详情内容卡 14px 低于 16；hero 18 ✓、教师卡 16 ✓）`class-feedback/[id]/client.tsx:344,386,415` | ✅ 合规（`:408` 文字行 opacity .75 属文字级，非整卡）`class-feedback/[id]/client.tsx:408` | ✅ 合规（列表行项原生 button）`class-feedback/client.tsx:233` | ✅ 合规（分页 / 发送按钮 disabled 走 AntD 默认禁用态）`class-feedback/client.tsx:263,265`；`class-feedback/[id]/client.tsx:585` | ✅ 合规（0 命中） |
| notifications | 🟡 偏差（详情主卡 12px；列表行 18 ✓、hero 20/24 ✓；头像 15）`notifications/[id]/client.tsx:111`；`notifications/client.tsx:212,238,261,447,647` | 🟡 偏差（轻）（已读卡底 `.92` 白、空态 `.85`、未激活 tab `.8` 叠奶油底；已读徽章 `.55` 为徽章级）`notifications/client.tsx:569,612,646,308` | ✅ 合规（行项 `role=button` + `pressable`，全局层覆盖）`notifications/client.tsx:630-635` | ✅ 合规（0 命中） | ✅ 合规（0 命中） |
| archive | 🟡 偏差（最集中：主卡 14px ×17、12px ×3；tab 13px；entry hero 16 ✓）`archive/client.tsx:747,867,898,922,952,965,1003,1009,1048,1064,1103,1108,1142,1151,1162,1186,1195,799,1201,1361,852` | ✅ 合规（层叠面板未激活 `opacity:0`+`visibility:hidden`+`pointer-events:none`，无漏层）`archive/client.tsx:689-709`；🟡 未获徽章行 `.45` 压暗 `archive/client.tsx:1054` | 🟡 偏差（2 处可点无任何按压/悬停反馈，详见 二-③）`archive/client.tsx:1082`、`:1201` | ✅ 合规（点赞 disabled 有禁用态样式）`archive/entry/client.tsx:280,285`；`globals.css:12904` | 🔴 违规 `archive/client.tsx:69`（📊）、`:70`（🗓）、`:71`（📚）、`:1481`（✅/📌） |
| schedule | 🟡 偏差（banner 16 ✓；ParentCard token 12；内块 10；课时格 5）`schedule/client.tsx:296,342,458,541,659` | 🟡 偏差（过期日期整组容器 `.62` 压暗，含子按钮）`schedule/client.tsx:458` | ✅ 合规（日头 button、反馈 button 原生，全局层覆盖）`schedule/client.tsx:459,679` | 🟡 偏差（2 处 disabled 原生 button 无禁用态样式，详见 二-④）`schedule/client.tsx:278,285` | ✅ 合规（0 命中） |
| materials | 🟡 偏差（行卡 14；封面 10/12；PracticeBank 主卡 14、选项 10/14、银行 20、弹窗 16/26；双影裸写）`materials/page.tsx:316,403-407`；`materials/practice-bank.module.css:109,178,238,295,437,672,919,1318,1347` | ✅ 合规（书脊内阴影属装饰；无整卡压暗）`materials/page.tsx:428` | 🟡 偏差（封面 `role=button` 自写 `:active scale(.975)` 与全局层 .96 压缩重复竞争）`materials/page.tsx:285,415-417` | ✅ 合规（选项 / 揭示 / 模式按钮 disabled 均有 `.5` + `not-allowed` 样式）`materials/practice-bank.module.css:906-910,1515-1518` | 🟡 边界 `materials/PracticeBank.tsx:791`（✓/□ 状态字形，非表情符号区，倾向偏差） |
| vocab | ✅ 合规偏 🟡（hero 20 ✓、UnitCard 18 ✓、flipCard 16 ✓；次级块 10/12/14；3 条私有弹簧曲线）`vocab/vocab.module.css:98,317,632,725,733` | ✅ 合规（翻转背面 opacity 门控齐全；无整卡发灰）`vocab/vocab.module.css:642-699` | ✅ 合规（翻转卡 `role=button`；非顶层堆叠卡不挂 role/click）`vocab/DeckSession.tsx:110`；`vocab/ReviewStack.tsx:75` | ✅ 合规（`reviewBtn:disabled` 有 `.5` + `not-allowed`）`vocab/vocab.module.css:307-310` | ✅ 合规（0 命中） |
| benefits | 🟡 偏差（轻）（概念卡 16 ✓、等级卡 18 ✓、规则卡 16 ✓；内项 14/12；顶栏 26 为异形 header）`benefits/client.tsx:182,210,262,300,334,373,397,150` | ✅ 合规（手风琴未激活条件渲染卸载，无层叠漏层；光斑在深色底）`benefits/client.tsx:324` | ✅ 合规（头部原生 button，全局层覆盖）`benefits/client.tsx:305` | ✅ 合规（0 命中） | ✅ 合规（0 命中） |

**矩阵汇总**：40 个单元格中，合规 **25** 个、偏差 **12** 个、违规 **2** 个（均为 emoji 红线，落在 dashboard、archive）、边界待拍板 **1** 个（materials ✓/□ 字形）。（vocab ① 首标合规，其 3 条私有弹簧曲线已计入 B6-a 偏差清单。）

---

## 二、逐项证据

### ① 卡片圆角 / 阴影 / 间距统一

**规范要求**：卡片圆角 16–20px；阴影走 `--shadow-raised/overlay/card` 三档；描边用 `--color-hairline`；间距用一套刻度（`project-baseline.md:70-72`）。

**现状（每页卡片半径值集合**，已剔除 pill 999/9999、圆形头像、图标小方砖等合理小半径）：

| 页面 | 主容器半径值集合（px） | 主卡是否在 16–20 | 备注 |
|---|---|---|---|
| dashboard | 12（ParentCard token）、16（lesson preview 外层 xl）、12（内层 lg）、20（ChildSwitcher） | 主卡 12 ✗ | 主卡由共享 `ParentCard` 收口，见 G0 |
| class-feedback 列表 | 10（alert）；行项 globals 类 | — | 列表行沿用现状形态 |
| class-feedback/[id] | 8、10、12、14、16、18 | hero 18 ✓、教师卡 16 ✓、内容卡 14 ✗ | `:415` 内容卡 14 |
| notifications 列表 | 15（头像）、18（行卡）、20（空态）、20/24（hero） | 行卡 18 ✓、hero ✓ | 头像 15 为小偏差 |
| notifications/[id] | 8、10、12 | 主卡 12 ✗ | `:111` |
| archive 列表 | 8、9、10、12、13、14 | 主卡 14 / 12 ✗ | 14px Card 17 处、12px 3 处（见矩阵） |
| archive/[id] | 10、12 | 主卡 12 ✗ | `:79` |
| archive/entry | 8、10、14、16 | hero 16 ✓、内卡 14 ✗ | `:240,256,275` |
| schedule | 5（课时格）、10（按钮/内块）、12（ParentCard）、16（banner） | banner 16 ✓、ParentCard 12 ✗ | 课时格 5 为图表小块，合理 |
| materials 列表 | 6、10、12、14 | 行卡 14 ✗ | `:316` |
| materials/preview | 6、10、11、12、14 | 封面 12/14 ✗ | `:283,377,394` |
| PracticeBank | 4、8、10、12、14、16、18、20、26 | 银行顶卡 20 ✓、弹窗 16/26 ✓、questionCard/option/结果卡 10/14 ✗ | 14px 在 module.css 出现 14 处 |
| vocab | 5、8、10、12、14、16、18、20 | hero 20 ✓、UnitCard 18 ✓、flipCard 16 ✓ | 次级块 10/12/14 |
| benefits | 8、11、12、14、16、18、26 | 概念卡 16 ✓、等级卡 18 ✓、规则卡 16 ✓ | 内项 14/12；header 26 异形 |

**阴影写法**：本片范围内走三档 token 的仅 5 处：

- `components/Parent/ParentCard.tsx:26` `var(--shadow-raised)`
- `components/Parent/StickerPanel.tsx:22` `var(--shadow-overlay)`
- `components/Parent/ParentLessonPreview.tsx:164` `var(--shadow-card)`
- `components/Parent/ParentLessonPreviewHistory.tsx:130` `var(--shadow-card)`
- `app/parent/archive/client.tsx:706` 未激活面板 `var(--shadow-card)`

其余页面级内联裸写 `rgba(...)` 阴影约 **43 处**（class-feedback/[id] 3、notifications 8、archive 2、schedule 2、materials 2、PracticeBank module.css 13、vocab 5、benefits 5，含一处双影 `materials/page.tsx:404-407`）；globals 层面 107 条裸写归 K 分片，本片不重复计数。

**判定**：偏差（纯视觉偏差）。页面主卡大量落在 12/14px，与 16–20px 基线不符；根因之一是共享 `--radius-container = --radius-lg = 12px`（令牌自带矛盾，K 分片已列）。阴影页面级基本未走三档 token，同语义阴影被写成多个近似 rgba 值。

### ② 半透明发灰叠层

**规范要求**：不允许 opacity<1 的整卡容器叠加；不允许 `rgba(255,255,255,.<1)` 叠在奶油底上形成发灰叠层；未激活 tab 面板必须完全隐藏，不留占位漏边。

| file:line | 现状 | 判定 |
|---|---|---|
| `archive/client.tsx:689-709` | 层叠 tab 面板：未激活 `opacity:0` + `visibility:hidden` + `pointerEvents:none`，absolute inset 0；激活面板才显形 | ✅ 合规（符合"未激活必须隐藏"原则，无右/下边缘漏层） |
| `vocab/vocab.module.css:642-699` | 翻转双保险：`backface-visibility:hidden` + `.flipBack{opacity:0}` + `.flipped .flipFront{opacity:0}` | ✅ 合规（P23 透明度门控齐全，背面不透光不镜像） |
| `benefits/client.tsx:324` | 手风琴未激活面板条件渲染卸载，不做层叠 | ✅ 合规 |
| `schedule/client.tsx:458` | 过期日期整组容器 `opacity: isPast ? .62 : 1`，压暗范围含子按钮与课时格 | 🟡 偏差（整组压暗，非单元素状态色；对比度下降） |
| `archive/client.tsx:1054` | 未获得徽章行 `opacity: earned ? 1 : .45` | 🟡 偏差（轻，徽章组状态压暗，非主卡） |
| `notifications/client.tsx:646` | 已读卡底 `rgba(255,255,255,.92)` 叠奶油底 | 🟡 偏差（轻，近不透明白，视觉影响小） |
| `notifications/client.tsx:612` | 空态容器 `rgba(255,255,255,.85)` | 🟡 偏差（轻） |
| `notifications/client.tsx:569` | 未激活 tab 丸 `rgba(255,255,255,.8)` | 🟡 偏差（轻，控件底色非卡片） |
| `notifications/client.tsx:308` | 已读等级徽章 `opacity .55` | ✅ 合规（徽章级状态，非整卡） |
| `class-feedback/[id]/client.tsx:408` | 文字行 `opacity .75` | ✅ 合规（文字级） |
| `archive/client.tsx:1364` | 报告汇总面板 `rgba(255,255,255,.92)` | ✅ 合规（弹层/报告面板，非奶油底列表卡） |
| `archive/client.tsx:1312` | 无反馈日期按钮 `opacity .62`，配套 `cursor:not-allowed`、surface-3 底、subtle 色 | ✅ 合规（按钮级禁用态压暗，非整卡） |
| `schedule/client.tsx:301` | 深色 hero 上 CrownFilled 水印 `.10` | ✅ 合规（装饰水印） |
| `dashboard/client.tsx:344`、`benefits/client.tsx:153-154,186,219`、`notifications/client.tsx:458-459` | 白色/金色 radial 光斑叠在深色 hero 底上 | ✅ 合规（深色底装饰光斑，非奶油底发灰叠层） |

**判定**：层叠隐藏与翻转门控合规；整组压暗 1 处、徽章级压暗 1 处、近透明白底 3 处为轻偏差。

### ③ hover / 按压反馈缺失（自绘可点表面）

**规范要求**：全局层 `InteractionMotionLayer` 已覆盖 `button:not(:disabled)`、`[role=button/switch/checkbox]`、`.ant-segmented-item`、`label:has(...)`、`a[href]`（`components/Common/InteractionMotionLayer.tsx:5,105-109`）；普通 div、AntD Card 带 onClick **不在覆盖内**；`data-motion-ignore` 只应挂在不需要按压反馈的表面（拖拽把手等）。

**可点但无任何视觉反馈（2 处，均在 archive）**：

1. `archive/client.tsx:1082` — `<article role="button" tabIndex={0} data-motion-ignore="true" onClick={...} onKeyDown={...}>`；CSS `globals.css:5693-5695` `.parent-growth-history-item.is-clickable` 仅 `cursor:pointer`，无 hover/active 规则；`data-motion-ignore` 又使全局层跳过 → **按压压缩、悬停上浮、跟手波纹全部缺失**。键盘 handler 已挂（1082 行 `onKeyDown` Enter/Space），可访问性部分在，但视觉反馈为零。属于 `data-motion-ignore` 误用。
2. `archive/client.tsx:1201` — AntD `<Card onClick={...} cursor="pointer">`，div 无 `role=button`、无 `tabIndex`、无键盘 handler；全局层选择器不命中 div；`.parent-card` 仅为布局类（`globals.css:354-356` 只覆盖圆角），无 hover/active 规则 → **点击无按压/悬停反馈，且键盘不可达**。

**合规的可点表面**：

- `dashboard/client.tsx:341,370,376,380,415,424,429`、`schedule/client.tsx:459,679`、`benefits/client.tsx:305`、`class-feedback/client.tsx:233`：原生 `<button>`，全局层覆盖 ✓。
- `notifications/client.tsx:630-635`：`role="button"` + `.pressable`，全局层覆盖 ✓。
- `vocab/_components/DeckSession.tsx:110`：翻转卡 `role=button`，`:116` 复用 `getTiltSurfacePosition`；`vocab/_components/ReviewStack.tsx:66-78`：非顶层卡 `role=undefined`、`tabIndex=-1`、点击不触发 ✓。
- `materials/PracticeCanvas.tsx:239`：原生 button ✓。

**判定**：偏差（纯视觉偏差 / 交互反馈缺失），2 处集中在 archive 时间线与试卷卡。

### ④ zombie 按钮

**规范口径**：`onClick` 为空函数、只 `console.log`、disabled 但无禁用态样式、点了没反应，均算可用性硬伤。

- 严格扫描（空 onClick、`()=>undefined`、`console.log`、null/undefined、TODO/FIXME、alert）：**0 命中**；`console.log` 0 处。
- disabled 无禁用态样式：**2 处**，均在 schedule 周翻页：
  - `schedule/client.tsx:278-279`（上一周）：`<button disabled={!canChangeWeek(-1)}>`，内联样式 `background: var(--color-surface-1); color: var(--color-ink-muted)` 与启用态完全相同；globals 中 disabled 规则均为作用域类（`globals.css:4082,4621,9600,10677,12904`），无一覆盖这两个按钮。
  - `schedule/client.tsx:285-286`（下一周）：同上。
  - 现象：到达本周第一周/最后一周时，箭头按钮与可点状态视觉一致，用户无法分辨是否可翻。
- 其余 disabled 按钮均有禁用态：`class-feedback/client.tsx:263,265`、`class-feedback/[id]/client.tsx:585`（AntD Button 默认禁用态）；`archive/entry/client.tsx:280,285` + `globals.css:12904` `.parent-feedback-like:disabled{cursor:wait;opacity:.72}`；`materials/practice-bank.module.css:906-910,1515-1518`（`.5` + `not-allowed`）；`vocab/vocab.module.css:307-310`。

**判定**：严格口径 zombie 0；disabled 无禁用态样式 2 处（偏差，纯视觉偏差，可用性边缘项）。

### ⑤ emoji 图标（红线 5）

**规范要求**：不用 emoji 作图标/装饰（品牌资产除外）；图标走 AntD Outlined 系列（`project-baseline.md:34`）。

| # | file:line | 字符 | 载体 | 判定 |
|---|---|---|---|---|
| 1 | `archive/client.tsx:69` | 📊 U+1F4CA | 概览 tab 图标，`:860` `<span>{tab.icon}</span>` 渲染 | 🔴 红线违反 |
| 2 | `archive/client.tsx:70` | 🗓 U+1F5D3 | 时间线 tab 图标 | 🔴 红线违反 |
| 3 | `archive/client.tsx:71` | 📚 U+1F4DA | 学习分析 tab 图标 | 🔴 红线违反 |
| 4 | `archive/client.tsx:1481` | ✅ U+2705 / 📌 U+1F4CC | 学习目标达成/未达成状态 | 🔴 红线违反 |
| 5 | `dashboard/client.tsx:350` | 👑 U+1F451 | SVIP/VIP 会员徽章 | 🔴 红线违反（应走 CrownOutlined，`schedule/client.tsx:303`、`components/Parent/IntensiveDetailView.tsx:125` 已有正确参照） |
| 6 | `dashboard/client.tsx:405` | 👑 U+1F451 / ✨ U+2728 | 会员徽章 | 🔴 红线违反 |
| 7 | `components/Parent/StickerPanel.tsx:34` | 🐑 U+1F411 | 贴纸面板标题形象 | 🟡 待拍板（疑似品牌贴纸吉祥物，是否属"品牌资产除外"见第五节） |
| 8 | `materials/PracticeBank.tsx:791` | ✓ U+2713 / □ U+25A1 | 多选选项字母格状态标记 | 🟡 边界项（非表情符号区，是静态状态字形；P19 勾选应走 SVG 描边，但现状为静态标记，倾向偏差） |

**判定**：明确违反红线 5 共 **6 处文件行 / 8 个符号**（archive 4 行、dashboard 2 行）；边界待拍板 2 处。

---

## 三、偏差清单（按出现次数 / 严重度排序，均给数字）

| 排序 | 偏差项 | 数量 | 证据 file:line | 类型 |
|---|---|---|---|---|
| 1 | 页面主卡圆角低于 16px（12/14px 为主） | archive 主卡 14px ×17、12px ×3；PracticeBank module.css 14px ×14；其余页 14/12 各 1–2 处；全片主卡 <16 合计 **≥40 处** | `archive/client.tsx:747,867,898,922,952,965,1003,1009,1048,1064,1103,1108,1142,1151,1162,1186,1195,799,1201,1361`；`materials/practice-bank.module.css:109,178,238,295,437,672,919,1318,1337,1347` | 纯视觉偏差 |
| 2 | emoji 作图标/装饰 | 明确违反 6 行 / 8 符号；边界 2 处 | 见 二-⑤ | 红线违反 |
| 3 | 页面级裸写 rgba 阴影（未走三档 token） | 约 **43 处**（token 阴影仅 5 处） | 见 二-① | 纯视觉偏差 |
| 4 | 可点表面无按压/悬停反馈 | **2 处**（archive 时间线 article、试卷 Card） | `archive/client.tsx:1082,1201`；`globals.css:5693-5695` | 纯视觉偏差 |
| 5 | 未复用 `AnimatedNumber` 的统计数字 | **13 个**：WeeklyReport 4、HoursLeaderboard 3、IntensiveDetailView 4、vocab 结果页 2 | `components/Parent/WeeklyReport.tsx:95`；`components/Parent/HoursLeaderboard.tsx:246-247`；`components/Parent/IntensiveDetailView.tsx:209,212,215,218`；`vocab/page.tsx:186` | 纯视觉偏差 |
| 6 | 私造骨架（AntD `<Skeleton active>` 替代 `.mz-skeleton`/`CardSkeleton`） | **3 个文件 / 5 个实例** | `components/Parent/WeeklyReport.tsx:58`；`components/Parent/ParentLessonPreviewHistory.tsx:91`（×2）；`materials/preview/page.tsx:409`（rows 6） | 纯视觉偏差 |
| 7 | 私有缓动曲线（未走按压/流体/减速三条既定曲线） | **4 条** | `materials/page.tsx:410`（`.2,0,0,1`）；`vocab/vocab.module.css:632`（`.3,.9,.3,1`）、`:725`（`.18,1.25,.32,1`）、`:733`（`.18,1.3,.32,1`） | 纯视觉偏差 |
| 8 | 并行按压 / hover 实现 | **2 处** | `components/Parent/StickerPanel.tsx:60-67`（自写 onMouseEnter/Leave 改 transform+boxShadow）；`materials/page.tsx:415-417`（CSS `:active scale(.975)` 与全局层 .96 重复） | 纯视觉偏差 |
| 9 | 本地 keyframes（未复用 `.stagger-item` 等全局类） | **1 处** | `components/Parent/HoursLeaderboard.tsx:221` `@keyframes hcFadeIn` | 纯视觉偏差 |
| 10 | 骨架与真实内容不等高 | **3 个抽样页**（详见 B6-c） | `materials/page.tsx:263-269`；`class-feedback/[id]/client.tsx:540,543`；`vocab/_components/VocabHome.tsx:60-76` | 纯视觉偏差 |
| 11 | disabled 无禁用态样式 | **2 处** | `schedule/client.tsx:278,285` | 纯视觉偏差 |
| 12 | 整组 / 整卡压暗（opacity<1） | 整组 1、徽章级 1、近透明白底 3 | `schedule/client.tsx:458`；`archive/client.tsx:1054`；`notifications/client.tsx:569,612,646` | 纯视觉偏差 |

---

## 四、B6 动效资产复用核查（跨页面）

### B6-a 私造第二套并行实现

既有资产（`project-baseline.md:15-41`）：`ui-motion.ts` 七函数、`AnimatedNumber`、`CardSkeleton`、`PullToRefresh`、`InteractionMotionLayer`、全局类 `.mz-skeleton/.stagger-item/.pressable/.status-breathe`。

**(1) 私造骨架 —— 3 文件 / 5 实例**

| file:line | 现状 | 应复用 |
|---|---|---|
| `components/Parent/WeeklyReport.tsx:58` | `<Skeleton active paragraph={{ rows: 1 }} />` | `CardSkeleton` / `.mz-skeleton` |
| `components/Parent/ParentLessonPreviewHistory.tsx:91` | `<Skeleton active /><Skeleton active />` 两行 | `CardSkeleton` |
| `materials/preview/page.tsx:409` | Suspense fallback `<Skeleton active paragraph={{ rows: 6 }} />` | `.mz-skeleton` 条 |

对照合规样本：`materials/PracticeBank.tsx:591` 用 `CardSkeleton rows=3` ✓；`materials/page.tsx:256,265,266,268` 与 `preview/page.tsx:210-211` 用 `.mz-skeleton` ✓；`components/Parent/CardSkeleton.tsx:7-10` 为统一等高骨架。

**(2) 未复用 AnimatedNumber —— 13 个统计数字**

| file:line | 裸数字 | 数量 |
|---|---|---|
| `components/Parent/WeeklyReport.tsx:95`（metrics 80-83） | 本周课次 / 出勤率 / 消息通知 / 周测均分 | 4 |
| `components/Parent/HoursLeaderboard.tsx:246-247` | 我的课时 / 班级平均 / 差值 | 3 |
| `components/Parent/IntensiveDetailView.tsx:209,212,215,218` | 剩余课时 / 已审核 / 待审核 / 待上课 | 4 |
| `app/parent/vocab/page.tsx:186` | 总单词 / 答对 | 2 |

对照合规样本：`dashboard/client.tsx:365-367`、`schedule/client.tsx:372,375,378,381`、`materials/PracticeBank.tsx:892,899,904`、`vocab/_components/VocabHome.tsx:125,147,154,161,169` 均已用 `AnimatedNumber` ✓。
注：本片未发现自写 `setInterval`/rAF 做数字滚动的并行实现；上述为"资产未复用"，不是另造计数器。

**(3) 并行按压 / hover 监听或样式 —— 2 处**

- `components/Parent/StickerPanel.tsx:60-67`：按钮自写 `onMouseEnter`（改 `transform: scale(1.06)` + `boxShadow: 0 4px 12px rgba(0,0,0,.12)`）/ `onMouseLeave`（复位），`:56` 另挂 `transition`。全局层已覆盖原生 button 的按压压缩与回弹，此处为并行 hover/按压实现。
- `materials/page.tsx:415-417`：`.book-cover:active { transform: scale(.975) }`，而 `:285` 该元素是 `role=button`，全局层按下会加 `.mz-is-pressed`（.96）；两套缩放同时生效，按压幅度互相竞争。

**(4) 私有缓动曲线 —— 4 条**

| file:line | 私有曲线 | 既定对应 |
|---|---|---|
| `materials/page.tsx:410` | `cubic-bezier(.2,0,0,1)` | 按压/回弹 `(.2,.8,.2,1)` |
| `vocab/vocab.module.css:632` | `cubic-bezier(.3,.9,.3,1)`（翻转 0.6s） | 流体/吸附 `(.16,1,.3,1)` |
| `vocab/vocab.module.css:725` | `cubic-bezier(.18,1.25,.32,1)`（堆叠高度展开） | 流体/吸附曲线 |
| `vocab/vocab.module.css:733` | `cubic-bezier(.18,1.3,.32,1)`（堆叠位移） | 流体/吸附曲线 |

注：725/733 为堆叠超调弹簧，超调幅度需对照 P15"≤2.5%"复核；本片只判"曲线未走既定曲线"，不评价弹性手感。

**(5) 本地 keyframes —— 1 处**

- `components/Parent/HoursLeaderboard.tsx:221`：本地 `@keyframes hcFadeIn`；入场交错应复用 `.stagger-item`（`fadeInUp .38s` + `animation-delay`）。
- 对照：`archive/client.tsx:1118`、`benefits/client.tsx:262,373`、`dashboard/client.tsx:380,429` 等已用 `.stagger-item` ✓。

**(6) 合法定时器 / 手势（不计私造）**

- `components/Parent/HoursLeaderboard.tsx:92`：`setInterval` 8s 轮播排行文案，属内容轮换，非数字滚动 ✓。
- `vocab/_components/ReviewStack.tsx:27`：`setTimeout` 用于退场动画结束后推进下一张（P25 补位）✓；`DeckSession`/`ReviewStack` 无数字滚动类 rAF 循环。
- `components/Parent/ParentUsageGuide.tsx:162-182,333-336`：pointerdown/move/up/cancel 拖拽手势（P05/P11）✓。
- `materials/PracticeBank.tsx:131`：`keydown` Esc 关闭弹层 ✓。
- 其余 `setTimeout` 均为 toast/图片兜底/欢迎条延迟，非动画并行实现。

**B6-a 计数**：私造并行实现 **10 处**（私造骨架 3 + 并行按压/hover 2 + 私有曲线 4 + 本地 keyframes 1）；另 13 个统计数字未复用 `AnimatedNumber`。

### B6-b 重复 `addEventListener('pointerdown')` 按压监听

**0 处**。本片范围内未发现页面级 `addEventListener('pointerdown')` 做按压压缩/波纹；唯一 document 级 capture 监听在 `components/Common/InteractionMotionLayer.tsx:105-109`。`components/Parent/ParentUsageGuide.tsx:333` 的 `onPointerDown` 是抽屉拖拽手势（React 属性，非 addEventListener，且为合法 P05/P11 载体）。

### B6-c 骨架等高抽样（3 个列表页）

| 抽样页 | 骨架尺寸 | 真实内容尺寸 | 差多少 | 判定 |
|---|---|---|---|---|
| `materials/page.tsx:263-269` 列表行 / `:256` 封面 | 文本块 14px + 12px 两条灰条、gap 7 ≈ **33px**；右侧 44px 动作块；封面骨架 `:256` 仅 aspect 3/4.1，无下方 meta | 真实行 `:281-284`：标题 ≈20px + 2 行 meta ≈34px，文本块 ≈**54px**；封面真实卡 `:403` 下另含 `.book-meta` 行 ≈36px + 7px 间距（`:298-303,525-531`） | 文本块偏矮约 **21px**；封面缺 meta 行约 **43px**，加载完会跳变 | 🟡 偏差 |
| `class-feedback/[id]/client.tsx:540,543` 气泡 | 两条骨架气泡高 **34px**、radius 12 | 真实气泡 `:551`：padding 8×2 + 标题 11px + 3px 间距 + 正文 13px（单条）≈ **50px**（正文换行更高） | 偏矮约 **16px**（估算，随正文行数浮动） | 🟡 偏差（轻） |
| `vocab/_components/VocabHome.tsx:60-76` 单元卡 | head ≈35px + 3 枚 12px 灰条（对应真实 chips）；`.skeletonAction` 类在 `vocab.module.css:234-238` 已定义但**未接线** | 真实 UnitCard：head 35px（`:33-38`）+ 进度条行 ≈19px（`:40-45`）+ chips 行（`:47-51`）+ 底部按钮行 ≈52px（`:53-55`） | 骨架缺进度行与按钮行，偏矮约 **70px**，三页中跳变最明显 | 🟡 偏差（明显） |

### B6-d `data-motion-ignore` 合理性

| file:line | 载体 | 判定 |
|---|---|---|
| `components/Parent/ParentUsageGuide.tsx:330` | 抽屉拖拽把手 button，绑 `onPointerDown/Move/Up/Cancel` 拖拽手势 | ✅ 合理（手势表面不应再触发按压压缩，P05/P11） |
| `app/parent/archive/client.tsx:1082` | 时间线条目 `article role=button`，纯点击跳转 | 🔴 误用：可点表面挂 ignore，导致全局层按压/波纹被跳过，叠加 CSS 无 active 规则 → 零反馈（见 二-③ 第 1 处） |

本片范围内 `data-motion-ignore` 共 2 处：合理 1、误用 1。

---

## 五、六条用户红线逐条核对

| # | 红线 | 本片结论 | 证据 |
|---|---|---|---|
| 1 | 只改组件结构/动效/图标/卡片呈现；禁改主题配色令牌、等级标签文案与样式、业务文案、接口与数据口径 | ✅ 遵守（审计视角）：未发现页面级擅自改主题色或等级标签；benefits 三档标签文案/配色保持现状 | `benefits/client.tsx:377,381,385`；`dashboard/client.tsx:350,405`（徽章文案未改，仅图标形态违规） |
| 2 | 既有列表行/卡片版式以现状为准，不擅自把分隔线行重构为独立卡片/便当格 | ✅ 遵守：本片未发现行→卡重构；archive 行项、materials 行项、vocab 单元卡均保留原形态 | `archive/client.tsx:1118`；`materials/page.tsx:316`；`vocab/vocab.module.css:98` |
| 3 | SVIP 权益区底色保持墨绿渐变 `#123C35→#0B2A25` + 金边 `rgba(201,164,92,.5)`，不刷浅色 | ✅ 遵守（主题色值核对归 K 分片，本片复核消费侧未越权改色）：`benefits/client.tsx:188,264,385` 金/墨绿渐变保留 | K 分片 `K-UI令牌与主题.md` B5 结论；`benefits/client.tsx:210,217` |
| 4 | 深绿顶栏品牌 logo 必须可见（`isDarkHeader` 金色文字回退未复发） | ➖ 本片 8 页无顶栏 logo 载体（布局归 G0/M 分片）；`benefits/client.tsx:156` 内页 logo 14px 圆角保留 | 顶栏可见性归 M 分片复核 |
| 5 | 不用 emoji 作图标/装饰（品牌资产除外） | 🔴 **违反**：6 行 / 8 符号明确命中；🐑、✓/□ 两处待拍板 | 见 二-⑤ |
| 6 | 动效红线：P18 烟花只挂点赞/收藏；3D 翻转背面不透光不镜像；无载体不强套；不做整页重排；reduced-motion 退化为终态静态 | ✅ 基本遵守：点赞烟花仅 `archive/entry/client.tsx:280` 点赞动作，未扩散；翻转门控齐全 `vocab/vocab.module.css:642-699`；无载体排布模式（P41-44）本片未强套；未发现整页重排。私有曲线/并行实现见 B6-a，属复用偏差而非红线突破。reduced-motion 降级由全局层与 globals 统一处理，本片页面未发现动画绕过 | `archive/entry/client.tsx:280`；`vocab/vocab.module.css:642-699`；`components/Common/InteractionMotionLayer.tsx:105-109` |

---

## 六、需要用户拍板的业务口径问题

1. **`components/Parent/StickerPanel.tsx:34` 的 🐑 是否算"品牌资产除外"**：该形象是贴纸面板吉祥物/品牌贴图，还是普通装饰图标？两种口径：算品牌资产 → 保留，不计红线；不算 → 需替换为图片资源或 Outlined 图标。
2. **`PracticeBank.tsx:791` 的 ✓/□ 状态字形是否纳入红线 5**：U+2713/U+25A1 属文字符号区而非 emoji 区；若口径是"一切非 SVG 状态标记都换"，应改 P19 SVG 描边勾选；若只禁 emoji 码位，可保留。
3. **12px 容器令牌与 16–20px 卡片规范冲突的收口方向**：`--radius-container = --radius-lg = 12px`，页面"用令牌"即低于卡片基线（K 分片已列）。是上调容器令牌到 16px，还是卡片类单独切 `--radius-xl`？本片页面级只能先记录，不改令牌。
4. **过期日期整组压暗口径**（`schedule/client.tsx:458` `.62`）：是否允许对过期整组（含可点按钮）做半透明压暗，还是应改为日期置灰、按钮保持全不透明？
5. **骨架等高口径**：封面/动作块在加载期是否需要完整占位（materials 封面缺 meta 行、vocab 缺进度行与按钮行）？若要求零跳变，需补全骨架行；若接受加载后局部填充，现状可接受。

## 七、已确认正常（合规项证据）

- 全局按压层覆盖所有原生 button / `role=button` 行项：`dashboard/client.tsx:341,370,376,380,415,424,429`；`notifications/client.tsx:630-635`；`schedule/client.tsx:459,679`；`benefits/client.tsx:305`；`class-feedback/client.tsx:233`。
- 层叠面板未激活完全隐藏：`archive/client.tsx:689-709`（opacity 0 + visibility hidden + pointerEvents none）。
- 3D 翻转透明度门控 + 背面剔除：`vocab/vocab.module.css:642-699`。
- 合法复用资产：`dashboard/client.tsx:21-22,331,365-367`（AnimatedNumber、PullToRefresh）；`materials/PracticeBank.tsx:591,892,899,904`（CardSkeleton、AnimatedNumber）；`schedule/client.tsx:372,375,378,381`；`vocab/_components/VocabHome.tsx:125,147,154,161,169`。
- 合法定时器/手势：`components/Parent/HoursLeaderboard.tsx:92`（文案轮换）；`components/Parent/ParentUsageGuide.tsx:162-182,333-336`（拖拽）；`materials/PracticeBank.tsx:131`（Esc 关闭）。
- 手风琴未激活条件渲染卸载：`benefits/client.tsx:324`。
- 点赞动效仅挂点赞动作：`archive/entry/client.tsx:280`。

## 八、未能确认 / 需运行时验证

- 各页 `prefers-reduced-motion: reduce` 下的终态静态表现需浏览器实测；本片静态扫描未发现页面级动画分支缺失，但未运行 dev 与录屏复核（任务约束不重启 dev）。
- archive 时间线条目（`:1082`）与试卷卡（`:1201`）的实际 hover/active 视觉需在浏览器确认；本片依据源码与 CSS 规则判定"无任何反馈"。
- 经验记录 `stacked-tab-panel-inactive-must-hide`、`css-3d-flip-backface-flattened-context.md` 在磁盘不存在，相关判定按任务简述原则执行；若档案后续补回，需按原记录复核 archive 层叠面板与 vocab 翻转两处。
