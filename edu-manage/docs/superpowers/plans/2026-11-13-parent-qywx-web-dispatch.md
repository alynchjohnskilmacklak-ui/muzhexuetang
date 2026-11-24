# 家长企微通知网页即时处理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理端提交家长通知后，网页立即为对应家长创建企微待确认任务，并能从网页处理已有排队通知。

**Architecture:** 把按家长归并通知、校验绑定、每日限额、构建安全简报、创建企微任务和回写状态抽成共享服务，供现有 cron 与网页 API 使用。管理页面在整批通知创建完成后调用管理员专用 API；API 按家长分组、分批处理，并只在企微返回任务编号且数据库成功回写后报告“待企微确认”。企微仍由员工手动确认发送。

**Tech Stack:** Next.js 16.4 App Router Route Handlers、React、TypeScript、Prisma、Ant Design、企业微信客户联系 API。

**Spec:** `docs/superpowers/specs/2026-11-13-parent-qywx-web-dispatch-design.md`

## Global Constraints

- 每个家长每天最多创建一个企微群发任务。
- 同一家庭的多条通知合并为一份家校简报，家庭信息只进入对应家长任务。
- 只有企微返回任务编号并且数据库回写成功后，状态才是 `pending_confirm`。
- 企微最终发送仍由员工在企业微信确认。
- 本次不安装服务器 cron、不改变自动通知来源策略、不调整家长通知文案、不改数据库结构。
- 不调用真实企微接口创建任务，不部署，不新增或运行测试。

## Review Focus

- 同一家长多个孩子在同一批次内的通知应只创建一个任务，且全进简报。
- 网页请求与 cron 并发时，原子认领和每日限额必须阻止重复创建。
- 联系人、发送成员缺失或企微返回失败时，错误状态与原因要留在记录中。
- 企微创建成功但本地状态回写失败时，不能向网页报“待确认”。
- 大批家长分批处理失败或中断时，已处理结果和剩余队列都必须可辨认。

---

### Task 1: 抽取家长级企微任务创建服务并复用到 cron

**Files:**
- Create: `src/lib/parent-qywx-dispatch.ts`
- Modify: `src/app/api/cron/retry-notifications/route.ts`

**Interfaces:**
- Produces: `dispatchParentQywxNotifications(db: PrismaClient, parentUserId: string, now: number, options?: { forceQueued?: boolean })`，返回该家长本次认领的通知 ID、最终状态和可展示错误。
- `forceQueued: true` 立即处理该家长下一批最多 250 条符合条件的 `queued` 通知；网页 API 根据剩余 ID 继续分批。默认模式保留 cron 当前两分钟静默期与失败退避重试。
- 两种模式均复用相同的原子认领、联系人/发送成员检查、每日限额、家长安全简报、企微调用和成功/失败回写逻辑。

- [x] 把 cron 的家长通知收集与创建任务步骤移入共享服务；保留 cron 的待确认轮询、处理中超时恢复、逾期费用和续费提醒行为。
- [x] 保持 cron 的默认静默期、失败退避、最多五次尝试和按家长单日一任务行为；新排队记录优先，失败记录在队列清空后重试，并按最近尝试时间执行退避。
- [x] 创建任务成功时保留 `qywxProcessingAt` 作为企微任务创建时间；失败尝试也用该字段记录最近尝试时间，每日限额仅统计有企微任务编号的记录，历史任务回退到 `createdAt`，不新增数据库列。
- [x] 手动检查共享服务的认领条件、每日限额查询、企微成功回写与各类错误回写，确认没有暴露其他家庭的简报内容。

### Task 2: 新增管理员网页即时处理 API

**Files:**
- Create: `src/app/api/notifications/dispatch/route.ts`

**Interfaces:**
- `POST` 接受 `{ notificationIds: string[] }`，只允许 admin；服务端从可见且 `queued` 的通知记录推导家长 ID，不信任客户端传入的家长或企微联系人 ID。
- 单次最多处理 20 位家长；响应包含本批每位家长的结果，以及尚未处理家长对应的 `remainingNotificationIds`，供网页继续请求。
- 重复请求只处理仍处于 `queued` 的记录；已创建企微任务的记录不重复创建。

- [x] 使用当前请求的 division Prisma 客户端读取通知，并过滤非当前可见记录。
- [x] 将 ID 按家长分组，每次最多调用 20 组的共享服务，返回状态、错误和未处理记录 ID。
- [x] 校验空列表、重复/无效 ID、超过上限的请求体；不向响应返回企微联系人 ID 或密钥。
- [x] 手动检查权限、分部隔离、重复请求、部分处理和异常响应路径。

### Task 3: 管理页面整批触发并提供已有队列操作

**Files:**
- Modify: `src/components/CommunicationCenter/NotificationsTab.tsx`
- Modify: `src/app/api/notifications/[id]/resend/route.ts`

- [x] 批量创建通知时收集新建的 `queued` 记录 ID；整批创建结束后调用网页即时处理 API，并按 `remainingNotificationIds` 循环处理后续家长组。
- [x] 将通知创建数、企微待确认任务数、已确认发送数、失败数和仍待处理数分开统计，不把 `queued` 或 `processing` 显示为“待企微确认”。
- [x] 对通知记录中的 `queued` 项增加“立即创建企微任务”；现有重发 API 重新排队成功后，由页面立即调用同一调度 API。
- [x] 重发 API 拒绝清空已有企微任务编号后再次建任务，避免同一通知记录绕过家长每日一次限制。
- [x] 显示部分失败和实际错误，成功后刷新记录；不更改家长收到的通知文案。
- [x] 手动检查移动端布局、按钮加载态、失败提示和任务“待企微确认/企微已确认发送”的文案边界。

### Task 4: 变更集复核

**Files:** 上述新增及修改文件。

- [x] 逐一复核本轮明确涉及的共享队列服务、cron、网页 API、重发 API 和管理页面；未改 Prisma schema、生产 cron 配置或部署文件。工作区 `.git` 为空，无法生成 VCS diff。
- [x] 检查错误处理中不会把企微 API 成功但数据库回写失败误报为成功；此时返回 `unknown` 并提示先到企微核对。
- [x] 按工作约束不运行测试、构建、真实企微请求或部署；向用户汇报变更文件和需要上线后由员工在企微核对的操作。
