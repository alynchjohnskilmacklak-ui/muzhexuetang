# 第六轮规范：最近改动代码审查（_SPEC6）

## 0. 变更集（已固定，审计期间不得扩大/缩小）
- 截止时间：**2026-11-09 00:00:00**（含之后所有改动）
- 命中：**298 个文件 / 113,443 行**
- 基线快照：`_audit20261110\R0-变更集快照.json`（每文件 path / size / lines / mtime）
- 排除：`_svrbase`、`_deploy`、`_archive`、`backups`、`release`、根下 `_tmp*`/`_check*`、`.next`
- 若审计过程中某文件 mtime 与快照不一致 → **在分片里单独标注"审计期间被改动"**，不要默默按新内容下结论

## 1. 每个改动点必须回答三件事

### A. 改得对不对（正确性）
- 事务边界：多表写入是否同一 `$transaction`；事务中 throws 是否被内部 catch 吞掉导致"部分提交/全回滚"
- 幂等：重试/双击是否产生第二条流水；唯一键/`skipDuplicates`/`upsert` 是否到位
- 并发/竞态：`updateMany` 条件是否够严；余额读改写是否可能丢更新
- 错误处理：**`.catch(() => {})`、空 catch、`catch { return null }`** —— 逐个数出来，标"用户以为成功其实没生效"
- 异常冒泡：throw 是否被 route 层 catch 后返回 200
- 空值/软删/退班/INACTIVE：`deletedAt`、`status`、`remainHours` 边界是否处理
- 金额与课时精度：浮点累加是否 `round`；小时是否 `Decimal`
- 权限与归属：**是否只在客户端判断**；服务端是否校验 `studentId` 归属（家长端越权是重点）；role 白名单是否遗漏
- 类型与 schema：Prisma 类型与库实际列是否一致（**已知库缺 `MasteryRecord.termId`、无 `_prisma_migrations`**），`P2022` 风险

### B. 数据连通性是否还通
- 写入点 → **管理端/教师端/家长端各自读点（path:line）**，四档判定：真连通 / 部分连通 / 孤岛 / 假控件
- 快照与台账双口径：`Student.remainHours` vs `Enrollment.remainHours`（统一口径 **136 人 / 37 人报名级为 0**）
- 写了不读（孤岛）/ 读了不写（假数据）/ 需要手动触发才同步
- 新增表/字段是否有回填脚本；回填脚本是否幂等、是否只读安全

### C. 是否与上一轮结论冲突
前五轮报告：
- `管理端管控传导核查_2026-11-09.md`
- `教师端模块传导核查_2026-11-09.md`
- `家长端模块传导核查_2026-11-09.md`
- `牧哲学堂数据链路连通性核查_2026-11-08.md`
- `牧哲学堂数据通路与UI合规核查_2026-11-08.md`

凡被新代码推翻的 → 单列「前轮结论失效清单」，给新旧两边的 `file:line`。

## 2. 严重度
- **P0**：错账 / 越权 / 丢数据 / 整事务失败
- **P1**：逻辑错误或静默失效（以为成功其实没生效）
- **P2**：一致性与体验问题

## 3. 取证方式必须标注
每条结论标：**代码层推断** / **已用库抽样验证**（给脚本名或 SQL）。
"代码看起来已修"必须写清 **代码层已修 ≠ 运行时已生效**（库缺列、无迁移记录是已知陷阱）。

## 4. 环境
- 仓库：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`
- 输出：`D:\01muzhexuetang\muzhexuetang\coding\_audit20261110\`，前缀 `R*`
- DB：`postgresql://postgres:edu_manage_test@127.0.0.1:5432/edu_manage`，Node + Prisma `$queryRaw`，**只 SELECT**
- Windows + PowerShell；`$env:NODE_PATH` 指向仓库 `node_modules`，`Set-Location` 到仓库根再跑脚本
- **严禁碰 3000 端口 dev（PID 31700，用户正在预览 `/parent/dashboard`）**：不重启、不 kill、不 `npm run dev`
- 不改源码、不改库、不跑 migrate、不 git 操作

## 5. 输出结构（每个分片）
`R<n>-<主题>.md`：
1. 本片覆盖清单（文件数 + 文件清单 + 变更性质猜测：新增/重构/微调）
2. **问题总表**：严重度 / 文件:行 / 问题 / 影响端 / 证据片段 / 取证方式 / 修复建议
3. P0/P1 逐条展开（含 3~8 行代码片段）
4. 连通性复核表（四档）
5. 前轮结论失效清单
6. 未覆盖与需运行时验证
