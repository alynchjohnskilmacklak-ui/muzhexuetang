# 第五轮规范：家长端模块传导核查（_SPEC5）

## 0. 判定口径
沿用 `_SPEC4.md` 的四档判定与每条结论固定结构，主体换成**家长端**：

> **家长在家长端点了一个动作 → 写进去 → 管理端 / 教师端有没有真的读到；反向：教师端/管理端写入后，家长端是否立刻看到最新值。**

| 档 | 定义 |
|---|------|
| **真连通** | 写入 → 对方读**同一表同一字段**，实测一致 |
| **部分连通** | 有读方但读快照/缓存/另一口径，或只覆盖部分记录 |
| **孤岛** | 写进去了，但全仓无管理端/教师端读点 |
| **假控件** | ①接口不存在 ②字段被白名单丢弃 ③被 `.catch(()=>{})` 吞 ④只改前端 state |

## 1. 每条结论固定结构

```
### 动作：<家长端页面> · <控件名>
- 家长端入口：src/app/parent/<page>.tsx:<line>（打哪个 URL）
- 写入点：src/app/api/parent/<route>/route.ts:<line>（表·字段·事务）
- 管理端消费：<path:line> / 无
- 教师端消费：<path:line> / 无
- 越权核查：studentId/recordId 来自前端还是服务端解析；是否服务端校验归属
- 结论 + 证据（3~8 行片段）+ 实测（SQL）+ 修复方向 + 风险级别 + 确定性
```

## 2. 家长端特有的五条硬要求

1. **跨孩子越权**（最高优先）：凡接口接收 `studentId`/`childId`/`recordId` 的，逐个判断——
   - 服务端是从会话解析孩子（`getParentChildren` / `resolveParentChildRequest` / `studentIds` 白名单）→ 安全
   - 还是直接吃前端传的 id、只校验"这个 id 存在"→ **越权**（任意家长可读别人孩子的反馈/档案/成绩/余额/餐食/请假）
   - 必须给 path:line 与判据函数名；判"越权"的写清"能读到什么"。
2. **解绑/换绑残留**：管理端已查得 **56 条 ACTIVE 通知接收人与当前绑定脱节**。从家长端侧复核：解绑后还能不能收到/看到旧孩子的留言、请假、通知、反馈；`parent/notifications/page.tsx:20-23` 的 where 是否仍只按 `userId`。
3. **已读/评价回流**：家长点"已读"、写评价、点"有用"之后，写入哪个字段；**教师端 / 管理端是否真有读点**（教师端分片已判"回流是孤岛"，请从写入侧确认字段名与行号，不重复结论本身）。
4. **假保存全量扫**：前端 `fetch` 的每个 URL 是否都有对应 route.ts；有没有 `catch(() => {})`；有没有只 `setState` 不发请求。**把每个"点击→请求→落库"链条走一遍**。
5. **孤儿页**：以 `src/components/Layout/ParentLayout.tsx` 导航数组为权威（桌面 `:163-195`、移动 `:205-208`）。已知 `/parent/interaction` 可能无入口，需复核；另外检查 `archive/entry`、`materials/preview`、`meals/[id]`、`notifications/[id]`、`services/[slug]`、`volunteer/*` 是否可达。

## 3. 环境

- 仓库：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`
- 输出：`D:\01muzhexuetang\muzhexuetang\coding\_audit20261109\`，前缀 `P*`
- DB：`postgresql://postgres:edu_manage_test@127.0.0.1:5432/edu_manage`
- 家长端页面 **37 个**、文件 79 个、`api/parent/**` 路由 **30 个**
- Windows + PowerShell；docker/psql 不在 PATH；用 Prisma `$queryRaw`（只 SELECT）
- 余额口径统一 **136 人 / 37 人报名级为 0**

## 4. 已知基线（11-09 当前代码/库，已核实，可按需复核但不要整段重查）
- 反馈：家长端 where 强制 `status=PUBLISHED + deletedAt=null`；发布时建 `FeedbackParentReadReceipt` + 通知
- 图片：家长取图走 `/api/uploads` 鉴权代理；撤销后家长被拒，但**原上传教师仍可取图**
- 餐食：家长只见自选餐 `ParentMealChoice`；教师登记 MANUAL 1392 行家长端无读点；与课时扣减隔离成立
- 背单词：`VocabProgress/VocabSession` 仅 `/parent/vocab` 本页回显，教师端/周报/档案零消费（需按当前代码复核）
- 掌握度：库缺 `termId` 列 → 写入 42703 → 静默失败；两端无读点
- 突击班 179 节有工资无课时流水
- 解绑后通知脱节 56 条
- 请假：家长提交 → 教师/管理审批 → 后端回写考勤（`api/leave-requests/[id]/route.ts:88-171`）
- 教师薪资页规则为实时读配置（上一轮 O3 的"写死"判断已被纠正，勿再沿用）
