# 教师端课堂成长反馈 · AI 扩写实施规范

> 用途：本规范给 Codex（或其他 AI 编码工具）直接执行，也可由豆包按此实现。
> 参考样式：`D:\01muzhexuetang\muzhexuetang\课程规划\任泓涛\任泓涛_家长版课堂反馈.pdf`（家长版反馈单：橙色标题条 + 每学科板块 = 本节课学习内容 / 课堂反馈 / 孩子掌握情况）。

## 0. 目标一句话

老师随手输入一句话 → AI 按"本节课学习内容 / 课堂反馈 / 孩子掌握情况"三板块扩写成一篇像老师当面聊孩子的反馈 → 老师弹出预览、逐条/全部采用 → 一键发布给家长。

## 1. 关键文件（真实代码，勿臆造路径）

| 文件 | 作用 |
|---|---|
| `src/app/teacher/feedback/page.tsx` | 教师端反馈页（约 1700 行，含班级/学科下拉、学生勾选、AI 面板、预览弹层） |
| `src/app/api/teacher/ai-feedback/route.ts` | 通用 AI 反馈接口（已文章化，四段式，需改为三板块） |
| `src/app/api/teacher/ai-feedback/article` 路由（同 route.ts 内） | 逐人文章接口：`POST {classLessonId, groupId, subject, studentIds, lessonNote, observations}` → `{topic, knowledge, knowledgeSource, articles:[{studentId, article}]}` |
| `src/lib/ai/client.ts` | `callDoubao` / DeepSeek 客户端；生产已配 `DEEPSEEK_API_KEY`，`ARK_API_KEY` 配置后自动优先豆包 |
| `src/lib/classroom-feedback/subject-knowledge-points.ts` | 分年级/学科知识点词表（Obsidian 教研库提取） |
| `docs/teacher-feedback-v2.html` | 已验收的前端交互设计稿（真机可点） |

## 2. 已实现且已上线（不要重复开发）

- AI 生成能力真实在跑：生产 DeepSeek key，`/api/teacher/ai-feedback/article` 返回逐人文章。
- prompt 已具备：像老师当面聊孩子、知识点扩写（1~3 句通俗讲解）、称呼铁律（真实姓名+同学，禁"孩子/孩子同学/这位同学/该同学/宝贝/小朋友"）、按学科调整观察重点、按档位（积极/一般/需提升）定基调、禁编造分数名次事件、相似评语检测。
- 前端弹出预览已上线：`aiArticleDraft` state + `adoptAiArticle()` 逐条/全部采用 + Modal（移动端底部抽屉 `.ai-preview-drawer` 样式已在 `globals.css`）。
- 称呼修复已上线（`normalizeStudentComment` 泛指前缀兜底替换）。

## 3. 需要改的点（本轮任务）

### 3.1 后端：AI 输出结构改为三板块（对齐 PDF）

在 `src/app/api/teacher/ai-feedback/route.ts` 的 `sys` prompt 中，把段落结构从"课堂表现：/知识掌握：/存在问题：/后续建议："改为：

```
每份反馈按以下三个板块输出，标题单独一行且顺序固定：
本节课学习内容：
课堂反馈：
孩子掌握情况：
```

要求同步修改：
- "知识点扩写"写进"本节课学习内容"板块；"课堂反馈"板块写老师输入里的真实课堂细节 + 该生具体表现（结合档位）；"孩子掌握情况"板块给一句话结论（如"掌握情况：积极/良好/需巩固"+一句依据）。
- 全篇 200~400 字、连贯成文，三板块互相呼应，仍是"一篇老师跟家长聊孩子的文章"而不是三条干巴巴结论。
- 称呼铁律不变：正文第一处称呼=真实姓名+同学。
- 输出 JSON 里的字段名不变（overallComment / perStudentComments[].comment），只是评语正文内部的标题行换为三板块。

同步检查 `ensureStructuredFeedback` / `buildFallbackResponse` / `normalizeStudentComment` 中与四段标题（"课堂表现：""知识掌握：""存在问题：""后续建议："）相关的解析与兜底，统一改为三板块标题，避免旧标题残留在兜底文案。

### 3.2 前端：选择课程（page.tsx 桌面 1452~1458 / 移动 1548~1566）

- 取消班级"搜索"能力（移动端 `MobileSelect` 去掉 `searchable`；桌面端保持下拉）。
- 班级下拉选项排序：
  1. 年级顺序固定：初一 → 初二 → 初三 → 高一（`groups` 项里有年级字段则用之；否则按班名含"初一/初二/初三/高一"排序；其他年级排后）。
  2. 同一年级内：学科主科优先 = 语文、数学、英语，其次副科（物理、化学、生物、政治、历史、地理…），无学科排最后。
- 选项 label 保持 `${g.name || g.courseName} · ${g.subject || '未填学科'} · ${g.studentCount}人`。

### 3.3 前端：填写反馈区（对应 v2 设计稿 ③）

- 保留单一"课堂反馈内容"输入框（`lessonContent`/`aiNote`），简单命令输入。
- 保留：课堂状态（表现档位点选，作为 AI 参考点）、闪光徽章（`BADGES`）、课堂资料上传（照片/讲义，随反馈发家长）。
- 去掉：个性评语、手动分开填写（"本节课学习内容/孩子掌握情况/课堂反馈"三个分栏输入、`structuredOverrides` 相关入口）。AI 填充即按三板块逻辑填充。
- AI 生成按钮 → 弹出预览（已上线）→ 采用 → 底部"发布反馈给家长"按钮直接提交。

### 3.4 预览卡渲染（page.tsx 弹层内）

预览卡每张：学生姓名+同学 + 三板块正文（保留 `whiteSpace:'pre-wrap'`，标题行由后端带回）。「采用此条」/「全部采用」逻辑沿用 `adoptAiArticle`。

## 4. 验收清单（交付前逐项过）

1. 班级下拉：初一→高一顺序、主科优先，无搜索框；375px 无横向滚动。
2. 学生勾选：最多 3 人、全选/清空/搜索保留，课堂状态点选保留。
3. AI 生成：输入一句话 → 返回逐人文章，称呼=真实姓名+同学，无"孩子同学/该同学"。
4. 文章结构：每篇含"本节课学习内容：/课堂反馈：/孩子掌握情况："三板块，200~400 字，知识点有通俗扩写。
5. 弹层：逐条采用保持打开、全部采用后关闭；未采用不进入草稿；发布按钮文案随状态变化。
6. 发布：采用后可一键发送家长端；家长端只看到自己孩子的反馈。
7. 降级：AI 失败（超时/报错）有友好中文提示，不显示英文技术报错，可重试。
8. `npx tsc --noEmit` 通过；部署走 D 盘 Docker 链路（`docker build --target runner` → save → scp → 服务器 load → 切 latest → curl 200）。

## 5. 约束

- 不改 `/login` 与家长端业务逻辑。
- 家长隐私：不泄露班级人数、不展示其他孩子信息。
- 文案禁极限用语（最好/第一/保证提分）。
- 不改接口字段名，兼容已上线版本。
