# 课堂反馈 AI 扩写 v2 · 优化设计方案

> 目标：老师勾选 1～N 名学生 + 写一句课堂要点 → AI 产出「有知识含量、像一篇文章」的反馈 → 每位家长只看到自己孩子那一篇。
> 本文基于当前代码实读（非推测），每条结论附文件与行号。
>
> **核对基准**：本次调研期间 `src/app/teacher/feedback/page.tsx` 被改动过（调研开始 1709 行 → 结束 1656 行，mtime 2026/10/4 16:29）。下文行号以**结束时版本**为准，并标注了哪个缺陷在改动中被修掉。

---

## 零、先修一个会让功能整体失效的 bug

`src/app/teacher/feedback/page.tsx` 的 1085～1130 区间引用 `aiPreviewOpen` / `setAiPreviewOpen` / `aiArticleDraft` / `setAiArticleDraft` / `adoptAiArticle`，但**全文件没有任何声明**（已 grep 确认 0 处命中，`useState` 共 54 处逐条核对过）。

这是上一版「生成→预览弹层→逐条采用」工作流被删除后留下的残骸。**该页面当前无法编译 / 无法构建。** 修复方式二选一：
- 删除这段残留 JSX（新流程用逐生卡片直接编辑，本方案采用这条）；
- 或补回 `aiPreviewOpen`/`aiArticleDraft` 两个 `useState` 与 `adoptAiArticle()` 函数。

> 与之相邻的另一个字段名不匹配问题（前端读 `data.card` 但 `ChatApiResponse` 未声明 `card`）**已在本次改动中修好** —— 现 `ChatApiResponse` 已含 `ok?: boolean` 与 `card?: KnowledgePointCard | null`。据此，知识卡片现在可以正常落库。

---

## 一、现状体检：四个真问题

### 问题 1（P0）：逐生内容没有"可分发的形态" —— 家长看到的是共同版本

这是与「每个家长只能看到自己孩子的反馈」**直接冲突**的现存缺陷。

现状链路：

| 环节 | 代码位置 | 实际行为 |
|---|---|---|
| 老师逐生评语 | `src/app/teacher/feedback/page.tsx:219` | `perStudentComments: Record<studentId, string>`（仅前端 state） |
| 提交时判定 | `page.tsx:607,616` | 只在 `targetStudents.length > 1` 时才走"逐生"分支 |
| 逐生提交 | `page.tsx:647-681` | **为每名学生单独 POST 一次**，`studentIds: [item.studentId]`，`overallComment: item.comment` |
| 落库 | `src/app/api/teacher/classroom-feedback/route.ts:110,118` | 一条记录只含 1 名学生；`overallComment` 截断 1400 字 |
| 家长端渲染 | `src/lib/classroom-feedback/parent-feedback-content.ts:64-93` | 只读 `overallComment / summary / lessonContent / knowledgePoints / homework / tags / studentRating` |

**关键事实（已逐行核对）**：`studentRatings` 里**只有档位枚举，没有评语**。

```ts
// page.tsx:596-598 —— 这就是 studentRatings 的全部内容
const studentRatings = targetStudents
  .filter((studentId) => Boolean(studentPerf[studentId]))
  .map((studentId) => ({ studentId, rating: studentPerf[studentId] }))
```

所以「逐生正文」的唯一载体是**记录级的 `overallComment` + 单元素 `studentIds`**。数据库里**没有 `perStudentComments` 这一列**（`prisma/schema.prisma:784-835`）。家长端 `getParentFeedbackSections` 也没有任何按学生切分正文的代码路径 —— 多学生时它读的是**整条记录的共享字段**（`parent-feedback-content.ts:80`）。

结论：

1. 现状靠"**写侧拆记录**"来隔离（每个学生一条），因此 `lessonContent`/`knowledgeCard`/照片会在每条记录里**重复存储**。这正是那份 55 页 PDF 里同一章节反复出现的原因。
2. **单学生**场景家长能看到该生评语（因为被塞进了 `overallComment`）；**多学生**场景家长看到的必然是共同内容。体验不一致，且没有中间形态。
3. 缺少的正是本方案要补的东西：一个**可存储、可按学生裁剪、且能渲染成文章**的逐生正文字段。

### 问题 1b（P0 · 安全）：跨学生串名的唯一防线是"前端弹窗"

多学生发布前，老师端有一道检查（`page.tsx:610-617`）：

```ts
const sharedText = [resolvedLessonContent, resolvedSummary, resolvedOverallComment].join('\n')
const mentionedStudents = groupStudents.filter((s) => s.name.length >= 2 && sharedText.includes(s.name))
if (mentionedStudents.length) {
  toast.warning(`共同课堂内容中出现${mentionedStudents.map((s) => s.name).join('、')}，请移至对应学生的专属评语，避免其他家长看到`)
  return
}
```

全仓 grep「避免其他家长看到」**只有这一处命中** —— 它是**客户端 toast**。三条服务端写入路径（`api/feedback/route.ts:153,274`、`api/teacher/classroom-feedback/route.ts:118`、`api/admin/classroom-feedback/route.ts:191`）对 `overallComment` 只做 `slice(0, 1400)`，**零姓名校验**。

而 AI 生成的文章**天然带真名**（`ai-article.ts:54-55` 强制把 `S1` 还原成 `${student.name}同学`），防串人只查内部标记 `S1/S2`，**不查真实姓名**（`ai-article.ts:46-50`）。

叠加 `canViewFeedback` 用的是「**studentIds 有交集**」而非「相等」（`access.ts:162-165`），以及 `redactFeedbackForParent` **完全不检查任何文本字段**（只收窄 `studentIds`/`studentRatings`/`students`，见 `access.ts:350-372`）——

> 只要存在一条记录是 `studentIds: [A, B]` 且 `overallComment` 里写着「A同学…」，**B 的家长就会完整读到 A 的姓名和表现**。

这不是理论风险：绕过前端直接调 API、旧数据、或 admin 端发布都可能产生这种记录。**本方案必须把这道校验下沉到服务端。**

### 问题 2（P0）：知识层是"空壳"

| 层 | 现状 | 证据 |
|---|---|---|
| 知识点**词表** | 只有**裸名称字符串数组**，没有任何释义/公式/例题 | `src/lib/classroom-feedback/subject-knowledge-points.ts:5`（1348 行，`Record<年级, Record<学科, string[]>>`，如 `'一元一次方程'`） |
| 知识点**卡片** | 由模型现编，硬上限：`definition` 600 字、`formulas` 5 条、例题 1 道、`steps` 6 步 | `src/lib/classroom-feedback/knowledge-point-cards.ts:29-49` |
| **人工核实卡片** | **空数组** —— 永远命中不到，AI 只能"无依据生成" | `knowledge-point-cards.ts:15` `const VERIFIED_CARDS: KnowledgePointCard[] = []` |
| 提取脚本 | **不存在**（注释指向的 `docs/_extract_kp.py` 缺失） | `subject-knowledge-points.ts:3` 注释 vs 实际无此文件 |
| 联网查资料 | **完全没有任何实现**，prompt 里明确禁止声称联网 | `ai-chat.ts:59` `'不声称实时联网查阅资料。'`；全仓 `grep tavily/serper/bocha/web_search` 零命中 |

老师写「一元一次方程」，AI 只能靠自身参数记忆现编一段 600 字以内的解释。**这就是"补充知识点"这一步目前做不厚的根因。**

### 问题 3（P1）：生成形态是"三条干巴巴结论"，不是文章

- 硬约束三段式，顺序固定，缺一段就判失败：`src/lib/classroom-feedback/ai-article.ts:9-16`（`articleSections` 必须恰好 3 段）
- 每生正文硬上限 1400 字：`ai-chat.ts:137`
- 一次最多 3 名学生：`ai-chat.ts:27`（后端）/ `page.tsx:38` `MAX_STUDENTS_PER_FEEDBACK = 3` / `api/teacher/classroom-feedback/route.ts:95`
- `maxTokens: 3600`、`temperature: 0.25`：`api/teacher/ai-feedback/chat/route.ts:148-149`
- 防幻觉校验反而把内容压薄：无个人观察时必须明写"本次未记录个人课堂表现"（`ai-chat.ts:155-158`），否则整条丢弃

### 问题 4（P0）：逐生差异化"数据源本身为空" —— AI 只能写出雷同评语

`studentObservations`（`page.tsx:249`）这个 state **在界面上没有任何输入控件**。全文件 9 处引用逐条核对：

| 行号 | 行为 | 老师可否输入 |
|---|---|---|
| 249 | `useState` 声明 | — |
| 285, 286 | 写进 `aiInputSignatureRef` / 依赖数组 | 只读 |
| 327, 328 | 从**本地草稿**回填 | 只读 |
| 354, 362 | 草稿持久化 | 只读 |
| 757 | 切换班级时清空 | 只读 |
| **867** | **提交给 AI：`observations: studentObservations`** | **恒为 `{}`** |

即：老师**没有任何地方可以填"每个孩子今天表现如何"**，提交给服务端的 `observations` 永远是空对象。服务端于是给每生填入同一句占位文案：

```ts
// src/app/api/teacher/ai-feedback/chat/route.ts:95
observation: anonymize(student.observation) || '教师未提供个人课堂观察，不能推断个人表现或掌握程度',
```

而 `ai-chat.ts:155-158` 又强制要求：没有个人观察时**必须**写「未记录」，否则该生整条判失败。两条规则叠加 —— **多学生生成必然雷同**，唯一差异信号只剩 `studentPerf` 档位（`chat/route.ts:94`），而 prompt 明确规定"档位只定语气，不证明具体事实"（`ai-chat.ts:51`）。相似度检测只警告不阻断，且对应 UI 位于已删除的死代码里（`ai-chat.ts:167-170`，阈值 `0.55`）。

**这是"每个家长看到属于自己孩子的那一篇"的真正瓶颈** —— 不是权限（权限已隔离），而是**没有素材可以差异化**。方案 3.3 阶段 B 与 3.4 第 6 点专门解决它。

---

## 二、你手上其实已经有一个更好的"资料源"

我实地盘了 D 盘教研库 —— 这是本次方案的关键杠杆。

```
D:\01muzhexuetang\muzhexuetang\
├── 01牧哲学堂七年级上册\   81 个文件  → 七年级数学上册（冀教版2024）| 七年级生物上册（冀少版2024）| 七年级英语上册
├── 02牧哲学堂七年级下册\  126 个文件  → 七年级生物下册（冀少版2024）| 七年级英语下册
├── 03牧哲学堂八年级上册\   58 个文件  → 八年级数学上册（冀教版）| 八年级英语上册
├── 04牧哲学堂八年级下册\   33 个文件  → 八年级数学下册（冀教版）| 八年级英语下册
├── 05牧哲学堂九年级上册\   36 个文件  → 九年级数学上册（冀教版）
├── 06牧哲学堂九年级下册\    0 个文件  → 缺口
└── 牧哲学堂各年级重点汇总\ → 七/八/九年级下册 各科重点（doc/docx/pdf）
```

文件命名本身就是**天然的章节索引**，例如：

```
七年级数学上册（冀教版2024）\
  第五章 一元一次方程知识归纳与题型突破（单元复习 8类题型清单）（教师版）.docx
  第五章 一元一次方程压轴训练（单元复习 含参数问题、换元法、新定义型）（教师版）.docx
  第五章 一元一次方程的应用压轴训练（单元复习 7类压轴）（教师版）.docx
  第五章 一元一次方程单元重点综合测试（教师版）.docx
```

我**实测转换了一份**（`第五章 一元一次方程知识归纳与题型突破（教师版）.docx`，anydoc 转出 60,894 字节 / 1,497 行），内容是现成的结构化教研材料：

```
一、基本概念
1、等式的概念：含有等号，表示相等关系的式子
2、方程的概念：含有未知数的等式
3、一元一次方程的概念：（1）只含有1个未知数；（2）未知数的最高次数为1次；（3）等式两边都是整式．
二、等式的性质    三、解一元一次方程（去分母/去括号/移项/合并同类项/系数化为1）
四、列方程解应用题的步骤（①审 ②设 ③找 ④列…）
# 题型一 列一元一次方程    # 题型二 等式的基本性质   … # 题型八 用一元一次方程解决实际问题
```

**这就是"AI 扩写知识点"最该引用的原文** —— 本机构自己的教材版本（冀教版2024）、按章节对齐、有题型清单。比让模型凭空回忆准确得多，也天然可标注来源。

工具链已验证可用：`pandoc` 在 `D:\anaconda3\Library\bin\pandoc.exe`；`mammoth`、`python-docx` 均已安装；`npx @firecrawl/anydoc` 可转 docx/xls/pdf。

---

## 三、优化方案

### 3.1 知识层：本地教研库优先 + 联网兜底（新增，方案的"厚度"来源）

新增一条**离线预生成**的索引流水线（构建期跑一次，产出静态 TS 数据，运行时零成本）：

```
scripts/kp/build-knowledge-base.ts
  ├── 扫描 D:\01muzhexuetang\muzhexuetang\{01..06}牧哲学堂*\ 与 牧哲学堂各年级重点汇总\
  ├── 文件名解析 → { 年级, 学科, 教材版本, 章节号, 主题, 类型(归纳/压轴/测试) }
  ├── pandoc / anydoc 转 Markdown（docx 优先，公式用 pandoc --to markdown 保留 OMML→LaTeX）
  ├── 章节切块 → 每块 { id, grade, subject, edition, chapter, topic, keywords[], body, sourceFile, sourceLine }
  └── 产出 src/lib/classroom-feedback/knowledge-base.generated.ts（+ .json 供检索）
```

> ⚠️ 已知坑：anydoc 把公式转成了 `Embedded object: Equation.KSEE3`。必须用 **pandoc** 转 docx 才能拿到 LaTeX 公式。文件名含全角空格/括号，需规范化。

新增检索 API（`src/lib/classroom-feedback/knowledge-lookup.ts`）：

```ts
findKnowledgeMaterial({ grade, subject, edition, note })
  → ① 把 note 与 knowledge-base 的 topic/keywords 做打分匹配（含同义词表：如「解方程」→「一元一次方程」）
    ② 命中 → 返回 top-3 片段（含 sourceFile + 章节号）
    ③ 未命中 → 走联网兜底（见下），并把结果**带来源 URL 落库**，供以后复用
```

**联网兜底：火山方舟官方「联网内容插件」**

技术路径已确认：方舟用 `/api/v3/responses` + `tools:[{type:"web_search", max_keyword:N}]`，返回带 `url_citation` 的来源（[方舟联网插件文档](https://docs.volcengine.com/docs/ark/web-search?lang=zh)、[接入说明](https://github.com/ye-hhh/ark-websearch-mcp)）。
好消息：本项目 `edu-manage/.env.local` 里 **`ARK_API_KEY` 已配置**（`doubao-seed-2-1-turbo-260628`），只需在 `src/lib/ai/client.ts` 增加一个 `callArkWebSearch()`（走 Responses API），并在方舟控制台开通「联网内容插件」。
计费按搜索次数，成本与"每天新增知识点数"同阶，不是每次生成都搜（本地库命中就不搜）。

**知识卡升级为"知识讲义"**（`knowledge-point-cards.ts` 扩字段，向后兼容）：

```ts
type KnowledgeArticle = {
  topic: string
  overview: string          // 3~5 句通俗导语，给家长看的"为什么学这个"
  concepts: Array<{ name: string; explain: string }>   // 概念逐条：定义 + 通俗解释
  formulas: Array<{ latex: string; note: string }>      // 公式 + 使用条件
  steps: string[]           // 解题步骤（来自教研材料的"步骤"节）
  commonMistakes: string[]  // 易错点
  typicalProblems: Array<{ type: string; example: string; hint: string }>  // 题型 + 例题 + 思路
  curriculum: { edition: string; chapter: string; topic: string }
  source: { kind: 'local-material' | 'web' | 'textbook' | 'ai-generated'
            label: string; refs: Array<{ title: string; url?: string; file?: string }> }
  verified: boolean
}
```

**诚实性分级**（家长端可见，不吹牛）：

| source.kind | 家长端标注 |
|---|---|
| `local-material` | 「依据牧哲学堂教研材料 · 冀教版2024 第五章」 |
| `textbook` | 「依据 XX 教材 第X章」 |
| `web` | 「参考公开资料（附来源链接）」 |
| `ai-generated` | 「AI 生成讲解，供参考（未经教材核实）」 |

### 3.2 数据模型：一条班级记录 + 逐生文章字段

新增列（Prisma 迁移，全部可空，**旧数据完全兼容**）：

```prisma
model ClassroomFeedback {
  // ... 现有字段不动
  studentArticles Json?   // [{ studentId, name, article, wordCount, generatedAt, source }]
  lessonArticle   Json?   // 全班共享的「本节课学习内容」+ 知识讲义快照（替代 knowledgeCard 的新增冗余）
}
```

设计要点：
- **一条反馈记录承载整班**（`studentIds: [...]`，不再拆 N 条），共享内容只存一份，图片不重复占空间。
- `overallComment` 继续保留（兼容旧数据与 PDF），新流程写入"共同部分"。
- `studentArticles` 是逐生正文的唯一权威来源；家长端按 `visibleStudentIds` 过滤后只取自己孩子那条。
- 保留"渲染成三段式纯文本"（`articleSections`）以兼容现有 `parent-feedback-content.ts` 与 PDF 导出，迁移期零破坏。

### 3.3 AI 生成管线：两阶段 + 逐生并行 + 流式

替换现在"一次请求出全部"的形态（`api/teacher/ai-feedback/chat/route.ts:123-181`）：

```
阶段 A（全班共享，一次）
  输入：学科 / 年级 / 教材版本 / 老师那句要点 / 命中的教研材料片段
  产出：knowledgeArticle（知识讲义）+ sharedLesson（本节课学习内容）
  校验：知识讲义必须有 concepts≥3 且 source 明确；失败则降级为「AI生成讲解」并标注

阶段 B（逐生并行，每人一次）
  输入：阶段A 产物（已冻结，保证全班一致）+ 该生【专属】观察/档位 + 该生历史反馈摘要
  产出：一篇 350~700 字的连贯文章：
        ① 本节共同学习内容（引用知识讲义，通俗讲"今天学了什么、为什么重要"）
        ② 该生课堂表现（只用老师给该生的证据；无证据则写"本次未记录个人表现"，不编）
        ③ 掌握情况判断（与证据一致的谨慎结论，禁止分数/名次/提分承诺）
        ④ 家庭配合建议（1~2 条具体、可执行）
  并发：默认 3，可配；SSE 逐生推送，老师边生成边审
```

**质量门（生成后自动校验，不通过不填入草稿）**：

| 门 | 规则 | 动机 |
|---|---|---|
| 长度 | 350 ≤ 正文 ≤ 700 字（可配） | 治"太薄" |
| 结构 | 四段齐全、顺序正确 | 治"干巴巴" |
| 称呼 | 首处 = `真实姓名+同学`；禁 孩子同学/该同学/这位同学/小朋友/宝贝 | 沿用 `ai-chat.ts:80` |
| 隔离 | 正文不得出现其他学生代号或姓名 | 防串人 |
| 事实 | 无该生观察时不得推断个人表现 | 沿用 `ai-chat.ts:155` |
| 相似度 | 同一批内两两相似度 < 0.55 | 沿用 `comment-similarity.ts` |
| 夸大 | 禁 最好/第一/保证提分/全班最强/望再接再厉 | 沿用 `ai-chat.ts:80` |
| 知识来源 | 知识讲义 source 必须明确，不得声称"教材原文"除非真引自教研材料 | 诚实性 |

### 3.4 教师端交互：一屏成文 + 逐生可改

0. **【最关键】补上"逐生课堂观察"输入**（治问题 4）。在每张已选学生卡片上，档位按钮（积极/一般/需提升）下方加一个单行输入：`placeholder="这个孩子今天的具体表现（可选）"`，直接绑定 `setStudentObservations`。老师写「马紫晨做题快但粗心」→ 该生文章立刻与别人不同。
   - 这是"每个家长看到属于自己孩子的那一篇"的**内容前提**，权限隔离已经有了，素材一直没有。
   - 可选增强：每生一个小麦克风走浏览器语音转文字，老师课间一句话就能填完。

`src/app/teacher/feedback/page.tsx` 的改造点：

1. **学生勾选上限 3 → 20/整班**：`page.tsx:38, 451, 578` 与 `route.ts:95` 同步放开（放开后必须走 3.2 的单记录方案，否则会产生 N 条记录）。
2. **考点/知识点选择器接上本地库**：现在 `getKnowledgePointOptions(subject, grade)` 只给裸名称（`subject-knowledge-points.ts:1342`），改为"边输入边匹配教研库"，命中即显示「将引用：第五章 一元一次方程知识归纳（教师版）」。
3. **生成过程可见**：阶段 A 先出「本节课学习内容 + 知识讲义」卡片（老师可直接核对/编辑），阶段 B 逐生流式填入右侧卡片。
4. **逐生卡片**：姓名 + 档位色条 + 文章（可编辑）+ 「重新生成这一位」+ 「AI 内容未核对」角标；沿用现有"手动改过要确认覆盖"逻辑（`page.tsx:767`）与"撤销本次 AI 修改"（`page.tsx:811-822`）。
5. **发布前核对清单**：字数达标 / 无其他学生姓名（已有 `page.tsx:611-617`，扩展到 `studentArticles`）/ 知识来源已标注 / 逐生都有正文。
6. **一次发布 = 一次 POST**（现在多学生是 N 次 POST，`page.tsx:636-674`），改为单次事务，失败回滚而不是"发了一半"。

### 3.5 家长端与 PDF：只给自己孩子那一篇

- `src/lib/classroom-feedback/parent-feedback-content.ts`：新增分支 —— 若 `studentArticles` 存在，取**当前家长可见学生**那一篇作为主内容（找不到该生条目时**整条不展示**，而不是回退到共同正文，避免家长读到别人孩子的文章）。
- `redactFeedbackForParent`（`access.ts:350-372`）扩展两件事：
  1. 过滤 `studentArticles` 只留 `visibleStudentIds` 的条目 —— **硬性安全点**，不过滤就会泄漏别人孩子的内容；
  2. 顺手改成**显式白名单 DTO**（现在用 `...feedback` 首行展开，把 `deletedAt`/`deletionBatchId`/`notifySent`/`termId`/`inClassRating`/`adminRepliedAt` 等内部字段全下发给家长了；家长端 RSC 用 `include` 而非 `select`，这些字段确实进了客户端 props）。
- `src/app/parent/class-feedback/[id]/client.tsx:58` 目前把「知识点」标签过滤掉不要（只把 knowledgeCard 嵌在"本节课学习内容"下面），改为**独立的知识讲义折叠区**（默认收起，点开看概念/公式/例题/来源）。
- **顺带修一个会让人误判的文案**：`KnowledgePointDetail.tsx:16-17` 现在恒显「AI生成讲解，供参考，**请老师核对**」，因为 `VERIFIED_CARDS` 是空数组（`knowledge-point-cards.ts:15`）导致 `verified` 永远为 `false`。在一份给家长的正式反馈里出现"请老师核对"会直接削弱可信度 —— 这正是本方案 3.1 要修的（有教研材料来源后改标「依据牧哲学堂教研材料 · 冀教版2024 第五章」）。
- **四个家长阅读入口要统一**（这是"像一篇文章"能否被读到的关键）：
  | 入口 | 现状 | 要改 |
  |---|---|---|
  | `/parent/class-feedback/[id]` | 唯一做三段式拆分 | 加知识讲义区 + **补回复框**（通知正落在这个页面，却没有回复入口） |
  | `/parent/class-feedback` 列表弹窗 | 硬编码顺序，原样渲染 `overallComment` → 与上方 lessonContent/summary **同一内容三处重复**；无 knowledgeCard | 改为复用统一的 `getParentFeedbackSections` |
  | `/parent/archive` 时间线弹窗 | **完全不显示正文**（`archive/client.tsx:105-116`，只渲染知识点/作业/小结/标签/徽章，数据其实已下发） | 补回正文与知识讲义 |
  | 家长版 PDF | 知识点整体消失（三段式下 `parent-feedback-content.ts:86` 抑制「知识点」段；概览「课堂关键词」列用的又是 `tags`） | 补回 `knowledgePoints` 与知识讲义区块 |
- `parent-pdf.ts`：补齐知识讲义区块与来源脚注；标题栏按学科分节（与样例 PDF 视觉一致）。**附加建议**：现在 PDF 是把整页 canvas 转 JPEG 贴入（`parent-pdf.ts:314-317`），文字不可选、不可搜、小字发虚。既然要重做版式，建议一并改走 jsPDF 文本 API。

---

## 四、实施顺序（建议）

| 阶段 | 内容 | 依赖 | 可独立验收 |
|---|---|---|---|
| **P0-0** | **删除 `page.tsx` 中未声明的死代码 Modal（编译阻断）** | 无 | ✅ 先让页面能构建 |
| **P0-1** | **跨学生姓名校验下沉到服务端**（三条写入路径共用一个校验函数） | 无 | ✅ 安全止血 |
| **P0-2** | `redactFeedbackForParent` 改白名单 DTO + 预留 `studentArticles` 过滤 | 无 | ✅ |
| **P0-3** | **补"逐生课堂观察"输入框**（治问题 4，差异化的唯一素材来源） | 无 | ✅ 立刻让生成结果不再雷同 |
| **P0-4** | 知识库流水线（本地教研材料 → 索引 + 知识讲义） | 无 | ✅ 可单独跑，产出静态文件 |
| **P0-5** | 数据模型 `studentArticles` + 单记录发布链路（5 人） | P0-2 | ✅ |
| **P1-1** | 两阶段生成管线 + 质量门 + 流式 | P0-4,5 | ✅ |
| **P1-2** | 教师端 UI 改造（5 人勾选、逐生卡片、正文可编辑、过程可见） | P1-1 | ✅ |
| **P1-3** | 家长端四入口统一 + PDF 知识讲义区 | P0-4 | ✅ |
| **P2** | 联网兜底（方舟 web_search）+ 知识库复用缓存 | 需开通插件 | ✅ |

约束（沿用 `docs/ai-feedback-spec.md`）：不改 `/login`；不泄露班级人数与其他孩子信息；禁极限用语；发布前 `npx tsc --noEmit` 通过。

**注意**：`edu-manage` 当前有大量未提交改动（`git status` 显示 `teacher/feedback/page.tsx`、`access.ts`、`parent-feedback-content.ts` 等均处于 modified，且 `ai-chat.ts`/`ai-article.ts`/`create.ts` 为 untracked）。开工前建议先确认这批改动是否要提交，避免方案落地时与在途改动冲突。

---

## 五、已确认的产品决策（本次沟通结论）

| # | 决策 | 结论 |
|---|---|---|
| 1 | **勾选上限** | **放开到 5 人**（现为硬限 3 人：`page.tsx:38` / `chat/route.ts:27` / `classroom-feedback/route.ts:95` 三处同步改） |
| 2 | **个性化要求** | **知识点通用，学生表现必须个性化**。→ 知识讲义全班共用一份、可跨课复用；逐生文章必须写到"这个孩子" |
| 3 | **资料来源** | **本地教研库优先，联网仅兜底**（本地命中就不联网） |
| 4 | **知识讲义可见性** | **家长端折叠展示**（默认收起，点开看概念/公式/例题/来源） |
| 5 | **本轮范围** | **不改代码，先出方案**（本文即交付物） |

### 决策 2 的直接落地：三层内容架构

这是本次沟通最重要的一条，它把"像一篇文章"和"每个家长只看到自己孩子"统一起来了：

```
第一层  知识讲义 knowledgeArticle     通用 · 全班共用 · 可跨课复用
       来源：本地教研材料（冀教版2024 第五章 一元一次方程）
       内容：概念 / 公式 / 解题步骤 / 易错点 / 题型与例题 / 来源标注
       去向：家长端折叠区；多节课复用同一份，不重复生成、不重复计费
                    │
                    ▼  注入（已冻结，保证全班口径一致）
第二层  逐生文章 studentArticles[i]    一人一篇 · 家长只能看到自己那一篇
       来源：知识讲义（共同）+ 该生专属观察（老师输入）+ 该生档位 + 该生历史反馈
       内容：① 本节学了什么（引用讲义，通俗）② 这个孩子今天怎么样（只用该生证据）
             ③ 掌握情况判断 ④ 家庭配合建议
       去向：redactFeedbackForParent 按 visibleStudentIds 裁剪 → 家长只拿到自己那条
                    │
                    ▼  可选
第三层  整班观察 sharedObservation    全班共同发生的课堂事件（纪律/进度/课堂氛围）
       注意：**这一层严禁写任何学生姓名** —— 它是多学生记录被共享的那部分，
             也是问题 1b 泄漏的唯一来源。服务端强制校验。
```

**为什么"知识点通用"反而是好事**：知识点不需要每人一份，所以它可以在**课前就预生成好**、跨多个班级多节课复用，成本几乎为零；AI 的算力全部花在"这个孩子"上——正是你要求的"到底表现怎么样需要个性化反馈"。这也让 5 人上限的成本可控（只有第二层随人数增长）。


---

## 六、开工前还需你/管理员确认的 2 件小事

1. **方舟「联网内容插件」是否开通**（P2 才用得到，不阻塞 P0/P1）。需在[方舟控制台](https://console.volcengine.com/ark) → 服务组件库 → 联网内容插件 → 开通（免费开通，按搜索次数计费）。代码侧走 `/api/v3/responses` + `tools:[{type:"web_search", max_keyword:N}]`（[方舟联网插件文档](https://docs.volcengine.com/docs/ark/web-search?lang=zh)）。
   注：我实测当前 `ARK_API_KEY` 调 `/api/v3/responses` 返回 404，原因待查（可能是插件未开通或该模型未开放 Responses API）。**这不影响方案主体** —— 本地教研库已覆盖数学/英语/生物主要册次，联网只是兜底。
2. **在途改动如何处理**：`teacher/feedback/page.tsx`、`access.ts`、`parent-feedback-content.ts` 等当前都是未提交的 modified 状态。建议先提交或暂存，再按本文 P0 顺序动手。

---

## 七、一句话总结

现在的链路是「**AI 写一篇共同文章 → 拆成 N 条记录 → 家长看到共同内容**」，而且知识层是空壳、逐生差异化没有素材。

要改成的链路是「**知识讲义全班共用（本地教研材料扩写，可复用）→ 每个孩子一篇专属文章（老师一句话观察 + 该生档位）→ 服务端按 studentIds 裁剪，家长只拿到自己那一篇**」。

