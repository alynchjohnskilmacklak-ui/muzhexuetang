# 第三轮审计规范：管理端管控传导核查（_SPEC3）

## 0. 本轮问题
**不是**查教师端/家长端自己能不能读写，而是查：**管理员在管理端点了一个控件 → 数据写进去 → 教师端/家长端有没有真的跟着变。**

判定四档（必须只用这四档）：

| 档 | 定义 | 反例特征 |
|---|------|---------|
| **真连通** | 管理端写入 → 教师端/家长端读**同一张表同一字段**，且有实测数值一致（SQL 抽样） | 需要给出两端读点 path:line |
| **部分连通** | 有读方，但读的是**快照/缓存/另一口径**，或要**手动触发才同步**，或只覆盖了一部分记录 | 例如写 `Student.remainHours` 但家长端读 `Enrollment.remainHours` |
| **孤岛** | 写进去了，但全仓**没有任何教师端/家长端读点** | Grep 读点为空 |
| **假控件** | 前端有按钮/开关，但①接口路由不存在 ②被 `.catch(()=>{})` 吞掉 ③只改前端 `useState` 不发请求 ④请求发出但后端忽略字段 | 必须指出是哪一种 |

## 1. 每条结论的固定结构（缺一不算完成）

```
### 动作：<管理端页面> · <控件名>
- 管理端入口：src/app/(main)/<page>.tsx:<line>（控件是什么，onClick/submit 打到哪个 URL）
- 写入点：src/app/api/<route>/route.ts:<line>（哪张表、哪个字段、是否在事务内）
- 教师端消费：<path:line> / 无
- 家长端消费：<path:line> / 无
- 结论：真连通 / 部分连通 / 孤岛 / 假控件
- 证据（3~8 行代码片段，带行号）
- 实测（若跑了 SQL）：两端当前值对比、不一致条数
- 修复方向：<一句话>；风险级别：零风险改代码 / 要改数据 / 要改 schema
- 确定性：[已核实] / [推断] / [待验证]
```

## 2. 结论表（每个分片开头必须给的汇总表）

| # | 管控动作 | 管理端入口 | 写入点 | 教师端读点 | 家长端读点 | 结论 | 风险 |
|---|---------|-----------|--------|-----------|-----------|------|------|

## 3. 硬性要求

1. **控件级枚举，不是路由级**。同一个页面里"改课时单价"和"发放奖金"是两个动作，要分开列。页面上的每个可提交控件都要有归属：要么列进表里，要么在"本页无管控动作控件"一节点名说明（如纯展示页）。
2. **不要只看页面**。管理端动作也可能出现在 `src/lib/**` 的批量任务、`data-correction`、`import`、定时/一次性脚本调用链里，这些同样算"管理端管控"。
3. **教师端/家长端读点必须 grep 反查确认**，不能凭页面名字猜。建议反查方式：`Grep <字段名>` 限定 `src/app/teacher/**`、`src/app/parent/**`、`src/app/api/parent/**`、`src/app/api/teacher/**`。
4. **双写快照必须核**：凡写入 `Student.remainHours / totalHours`、`Enrollment.remainHours`、`Attendance.hoursDeducted`、`TeacherSalaryTransaction`、`StudentMealAttendance` 的动作，都要检查是否同时更新对面那一份，以及是否调用 `syncStudentHourSnapshot`。
5. **事务边界**：写入是否在 `$transaction` 内；部分成功是否会导致两端不一致。
6. **写后是否通知**：管理端改了影响家长/老师的事（调课、停课、换老师、余额调整、退费、等级变更），是否发 `Notification` / 企业微信推送。没发要写"无通知"。
7. **缓存**：凡有 `revalidatePath`/`unstable_cache`/内存 Map 缓存/TTL 的，标注是否会被管理端写操作失效。
8. **确定性标注**：代码能证明的 `[已核实]`；靠推理的 `[推断]`；只能运行时确认的 `[待验证]` 并写验法。
9. **只读**：只允许 `SELECT`。脚本放 `_audit20261109\`，cwd 设为仓库根以解析 `node_modules`。**不要碰 3000 端口的 dev，不要重启、不要 migrate、不要写源码。**
10. 不要评价配色/美观。不修任何问题，只报。

## 4. 环境事实（不用再验证）

- 仓库根：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`
- 输出目录：`D:\01muzhexuetang\muzhexuetang\coding\_audit20261109\`（**不要**写进 `edu-manage\` 内）
- DATABASE_URL：`postgresql://postgres:edu_manage_test@127.0.0.1:5432/edu_manage`
- Node v22 + `@prisma/client` + `tsx` 已装；`pg` 未装 → 一律走 Prisma `$queryRaw`；docker/psql 不在 PATH
- Windows + PowerShell，Bash 不可用
- 管理端页面 = `src/app/(main)/**/page.tsx`（**没有** `admin` 路径段，所以搜 `admin` 目录找不到管理端页面）
- admin 写接口 = `src/app/api/admin/**/route.ts`（56 个）+ 语义上的管理端写路由（`api/fees`、`api/leave-requests/[id]`、`api/settings/**`、`api/notifications` 等）

## 5. 前两轮已确认、直接引用不重验

- 点名与考勤同表同键：`Attendance` 的 `@@unique([lessonId, studentId], name: "attendance_lesson_student_unique")`（`schema.prisma:545`）
- 扣减规则（`lib/attendance-hours.ts:17-26`）：PRESENT 扣整节；**LEAVE 一律扣整节**；ABSENT 按计费模式（MONTHLY 扣、PER_HOUR 不扣）；MAKEUP 不扣
- 余额双口径已知分裂：`Student.remainHours`（后台/导出读）vs `Enrollment.remainHours`（家长/教师读），136/191 不一致，37 人"学生级有、报名级 0"
- 撤销反馈不冲销 `FEEDBACK_BONUS`：`admin/feedback/revoke/route.ts:38-57` + `salary-settlement.ts:39-43`，5090 条敞口
- `/api/teacher/mastery` 路由全仓不存在，前端 POST 被 `.catch(() => {})` 吞（掌握度永久空表）
- 背单词 `VocabProgress/VocabSession` 是孤岛，仅 `/parent/vocab` 本页回显
- 导出 `settings/export/students/route.ts:19-21` where 只有 `division`，`:30` 读 `Student` 快照，194 行含 37 个不可见学员
- 餐食 `meal-attendance-sync.ts:53-71` 只写 `StudentMealAttendance`，与扣减隔离（安全）
- 请假单批准不回写考勤（`leave-requests/[id]/route.ts:45-53`），925 条 LEAVE 中 921 条无单据
- 课次软删不处理考勤（`data-correction/trash.ts:187-191`），39 条残留
- 换老师不会双计（`lessonPayKey` 唯一 + `FOR UPDATE`），但原老师已入账后新老师拿不到
- UI 侧（第二轮面 B）：令牌未收敛（圆角 12 套值、16–20px 仅 13.2%）；emoji 违规家长端 6 行/8 符号、教师端 5 处；键盘不可达 7 个；SVIP 墨绿+金边合规但靠 `!important`；深绿顶栏 logo 回退未复发

## 6. 交付
- 每个分片一个 md 文件，文件名 `X-<主题>.md`，中文
- 分片末尾必须有一节「本片未覆盖 / 需别人接」与「需运行时验证」
