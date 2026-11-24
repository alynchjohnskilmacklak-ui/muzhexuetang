# 分册一：认证与会话

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + next-auth 5.0.0-beta.32 + Prisma 5.22/PostgreSQL + Redis + 阿里云 OSS）。
> 审查方式：只读静态审查，未启动 dev server，未对线上发起任何请求；所有"是否被调用"结论均基于全仓 grep 调用点计数。
> 范围限定：认证与会话（next-auth 配置、角色判定、密码体系、激活/重置令牌、登录限流、会话失效、proxy 拦截、死代码识别、robots）。越权对象级访问、防爬、数据窃取由其他分册覆盖。

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| A-1 | JWT 中的角色（role/division/teacherId）登录时固化，会话刷新与服务端守卫均不回库复核 | ①已具备但不完善 | 管理员在 DB 被降级/解绑后，旧 JWT 在 30 天有效期内仍持原角色通过角色守卫 | 中(1-3天) | 近期 |
| A-2 | 登录失败按"账号不存在 / 密码错误 / 身份不符 / 已停用"返回不同 code 与不同中文文案，可枚举账号是否存在及停用状态 | ①已具备但不完善 | 未登录攻击者可慢速批量探测邮箱/手机号是否注册、账号是否被停用 | 小(<1天) | 近期 |
| A-3 | 教师/家长默认初始口令为姓名拼音，且跳过密码策略校验；User 模型无强制改密标记 | ①已具备但不完善 | 初始口令可由公开姓名预测、无数字、不满足 10 位策略，首登不强制更换，弱口令长期有效 | 中(1-3天) | 近期 |
| A-4 | proxy 对"停用/踢出"状态做 5 秒内存缓存；限流与踢事件在 Redis 不可用时静默降级为单机内存 | ①已具备但不完善 | 被停用/踢出后最长 5s 旧 JWT 仍通过；多实例下限流阈值被分摊、跨实例踢推送可能收不到 | 中(1-3天) | 近期 |
| A-5 | 家长激活令牌有效期 7 天；激活密码策略（8 位+字母数字）弱于主策略；激活端点无独立限流，GET 回显家长姓名/邮箱/学员 | ①已具备但不完善 | 链接泄露后利用窗口长；8 位激活口令可在线慢速爆破；有效令牌可探测到家长身份信息 | 小(<1天) | 近期 |
| A-6 | 会话 Cookie 未使用 `__Host-` 前缀；`secure` 属性由 `NEXTAUTH_URL` 前缀推导 | ①已具备但不完善 | 同域其他路径/子域存在 Cookie 混淆面；生产 URL 误配 http 时 Cookie 明文下发 | 小(<1天) | 长期 |
| A-7 | IP 维度完全依赖 `X-Real-IP` 单头取值，防伪造以"Nginx 覆写该头"为前提 | ①已具备但不完善 | 反代若未覆写，客户端可自造 `X-Real-IP` 绕过 IP 限流并污染登录审计 IP | 小(<1天) | 近期 |
| A-8 | `detect-role` / `check-role` / `login-status` 三个预检接口返回可区分的角色/存在性/锁定状态 | ①已具备但不完善 | 配合慢速限流枚举非管理员账号是否存在、角色归属、锁定状态 | 小(<1天) | 长期 |
| B-1 | `api-rate-limit.ts` 为已废弃空壳转发，全仓 0 处业务引用 | ②完全缺失（死代码） | 命名上像独立 API 限流模块，易被误判为"已在 API 层独立生效" | 小(<1天) | 长期 |
| B-2 | `createPublicTeacherPortraitToken` 签发函数 0 处调用，验签端点却在接收令牌 | ②完全缺失（死代码/链路缺口） | 签名头像链接的签发侧未接线：要么是遗留死代码，要么公开头像签名链路缺失，状态不明 | 小(<1天) | 近期 |
| B-3 | 无密码历史复用检查、无定期轮换策略；无设备会话列表与单设备主动下线能力 | ②完全缺失 | 弱口令可反复换用；设备遗失/离职只能全局踢出，无设备级审计与撤销 | 大(>3天) | 长期 |
| B-4 | 登录链路无验证码/人机校验，管理员账号无 2FA | ②完全缺失 | 共享 NAT 出口下可绕过账号维度阈值进行慢速爆破；无第二因子兜底 | 大(>3天) | 长期 |
| C-1 | 限流/会话事件的 Redis 驱动为 auto 降级模式；本地 `.env` 未配置 `REDIS_URL`，生产实际配置待核实 | ③架构运维层 | 若生产未配置 Redis，限流与跨实例踢事件退化为单机内存，多实例部署下防护被稀释 | 中(1-3天) | 近期 |
| C-2 | `SUPER_ADMIN_EMAILS` 未出现在 `.env.example`，本地 `.env` 亦无该键；生产注入情况待核实 | ③架构运维层 | 未注入时所有管理员都无法通过超管守卫（功能静默失效）；配置漂移风险 | 小(<1天) | 近期 |
| C-3 | `initSessionEvents()` 仅在测试中调用，应用启动未初始化 Redis 订阅；跨实例 SSE 订阅靠发布时懒建立 | ③架构运维层 | 多实例下未发布过踢事件的实例不会建立订阅，其他实例的前端可能收不到即时下线提示（DB 复核兜底，不构成直接绕过） | 小(<1天) | 近期 |
| C-4 | cron / health 接口令牌走 URL query 参数 | ③架构运维层 | 令牌可能进入 Nginx 访问日志、浏览器历史、CDN/代理日志 | 小(<1天) | 近期 |
| C-5 | `robots.ts` Disallow 列表枚举了全部内部后台路由名 | ③架构运维层 | 非认证漏洞（君子协定），但向侦察者暴露内部路径结构清单 | 小(<1天) | 长期 |

### 基线确认（静态核实已真正生效，不计入问题）

- 认证提供方单一：仅 CredentialsProvider（`src\lib\auth.ts:107-151`），无 OAuth/其他 provider 接入。
- 密码哈希全量一致：全仓 18 处 `bcrypt.hash(..., 12)`，cost 统一为 12；校验侧 `verifyPassword` 对非 `$2` 前缀哈希失败关闭（`src\lib\login-accounts.ts:437-440`）。
- 会话单设备标记：登录时生成 `sessionMark = crypto.randomUUID()` 写库 `currentSessionToken` 并 `emitKick`（`src\lib\auth.ts:180-195`）；proxy、guards、get-user 三层均查库复核 `status` 与 `sessionMark` 一致性。
- 密码重置令牌：`crypto.randomBytes(32).toString('hex')`（256-bit），SHA-256 入库，30 分钟过期，一次性（`used` 标记 + 旧令牌批量失效），重置后轮换 `currentSessionToken` 撤销旧会话（`src\app\api\auth\reset-password\route.ts:28-69`）；申请侧通用文案防枚举（`forgot-password\route.ts:9, 90`）。端点仅按 IP 10rpm 限流（`rate-limit.ts:22`），无按令牌维度的尝试次数锁定；256-bit 熵使在线暴力枚举不可行，残留风险主要在令牌经日志/消息泄露后的复用窗口（见 T-6）。
- 家长激活令牌：`randomBytes(32).toString('base64url')`（256-bit），SHA-256 唯一索引存储，一次性事务占位防并发重放，重发即吊销旧令牌（`src\lib\parent-activation.ts:24-37, 73-88`）。
- 环境安全校验已接线：`assertProductionSecurityEnv` 在 `src\instrumentation.ts:3-7` 启动时调用，校验 Secret 长度≥32、双 Secret 一致性、HTTPS、双库配置（`src\lib\env-security.ts:18-53`）。
- 危险操作守卫已接线：`assertDangerAuth` 被 3 个高危管理接口引用——`data-admin\restore\route.ts:50`、`data-admin\reset\route.ts:233`、`admin\cleanup\route.ts:13`。
- IP 取值不采信 `X-Forwarded-For`，仅读 `X-Real-IP`（`src\lib\request-ip.ts:15-17`）。
- `apiHandler` 全局包裹限流、请求体大小限制、错误/查询串脱敏（`src\lib\api-handler.ts:88-143`）。
- 公开回调均有独立鉴权：企微事件签名校验（`src\app\api\qywx\event\route.ts:44-50`）、WxPusher appToken 比对（`src\app\api\wxpusher\callback\route.ts:14-17`）、cron/health 令牌比对、setup 生产环境直接 404（`src\app\api\setup\route.ts:19-21`）。
- matcher 经 Node 正则实测：全部 `/api/*`、受保护页面均被命中；`/people/*`、`/images/*`、`/avatars/*`、`/volunteer/docs/*` 等静态/公开前缀正确排除（`src\proxy.ts:201-203`）。
- 本地 `.env`：`NEXTAUTH_SECRET` 已配置（长度 46，≥32，值略）；`AUTH_TRUST_HOST=true`；`NEXTAUTH_URL=http://localhost:3000`。

## ① 已具备但不完善

### A-1 JWT 角色固化，会话刷新与守卫均不回库复核

- **证据**：
  - `src\lib\auth.ts:171-196`（jwt 回调）：角色只在 `if (user)`（登录瞬间）写入 `t.role / t.sub / t.teacherId / t.division`；后续刷新不查库、不覆盖。
  - `src\lib\auth.ts:214-227`（session 回调）：`u.role = t.role`，直接透传 token 内角色。
  - `src\lib\auth\guards.ts:28-41`（getSessionUser）：`role: u.role` 取自 session；`validateSessionMark`（57-79）只查 `status` 与 `currentSessionToken`，**不查角色**。
  - `src\lib\auth\guards.ts:85`（requireAdminUser）、`:100`（requireTeacherUser）、`:116`（requireParentUser）：角色判断全部基于 token 值。
  - `src\lib\get-user.ts:60-67`：返回的 `role` 同样来自 token。
  - 会话有效期 30 天：`src\lib\auth.ts:229-232`（`strategy: 'jwt'`，`maxAge: 30*24*60*60`）。
- **危害**：若管理员在 DB 中被降级为 parent、教师解绑 teacherId、或角色被调整，旧 JWT 在最长 30 天内仍携带原角色通过对应角色守卫；proxy 的 DB 复核只拦截停用与踢出，不拦截角色漂移。
- **利用前置条件**：攻击者持有降级/解绑前签发的有效 JWT；管理员事后在 DB 修改了角色而未轮换该用户的 `currentSessionToken`。
- **修复方案**：在 `validateSessionMark` / `getCurrentUser` 查库时一并读取最新 `role / teacherId / division`，覆盖 token 与 session；角色或绑定关系变更时（`settings/accounts`、`teacher-account-binding`、离职/停用流程）同步轮换 `currentSessionToken` 强制重登；jwt 回调在刷新时以库内角色为准。
- **工作量**：中(1-3天)
- **优先级**：近期

### A-2 登录失败文案可区分账号不存在/密码错误/停用/身份不符，存在账号枚举

- **证据**：
  - `src\lib\login-accounts.ts:470-472`：账号不存在 → `BAD_USERNAME`「用户名输入错误」；`:489`：身份不符 → `BAD_ROLE`；`:494`：停用 → `DISABLED`；`:509`：密码错 → `BAD_PASSWORD`。
  - `src\app\login\page.tsx:65-83`：前端为每个 code 映射**不同**中文文案（"账号不存在"/"密码错误"/"该账号已被停用"/"身份选择不正确"），`:571-578` 直接把 `result.code` 透传给文案表。
  - 对照：忘记密码链路已做通用文案规避（`src\app\api\auth\forgot-password\route.ts:9, 90`，无论账号是否存在都返回同一消息）。
- **危害**：未登录攻击者可通过响应 code/文案差异，批量判断邮箱或手机号是否注册、账号是否被停用、应走哪个身份入口。
- **利用前置条件**：可访问 NextAuth credentials 端点；受 IP 20rpm + 账号 10 次/5min 限流约束，可慢速进行。
- **修复方案**：`authorize` 失败统一返回 `BAD_CREDENTIALS` 单一 code，前端统一显示"账号或密码不正确"；"账号已停用""已锁定"等细分状态仅在密码校验通过后再返回；后端日志仍保留细分原因供运维排查。
- **工作量**：小(<1天)
- **优先级**：近期

### A-3 默认初始口令为姓名拼音、跳过策略校验，无首登强制改密

- **证据**：
  - 教师建号：`src\app\api\teachers\route.ts:237` `const initialPassword = pinyinName`，`:253` 直接 `bcrypt.hash(initialPassword, 12)`。
  - 账号设置：`src\app\api\settings\accounts\route.ts:247` 教师、`:287` 家长默认 `chineseToPinyin(...)`；策略校验 `getPasswordPolicyError` 仅在 `explicitPassword` 分支执行（`:249-252`、`:289-292`），拼音默认口令路径**跳过校验**。
  - 家长绑定：`src\app\api\students\[id]\link-parent\route.ts:76` `password || chineseToPinyin(student.name)`，`:92` 直接哈希入库。
  - 批量导入：`src\app\api\admin\import\route.ts:101, 176, 193` 同样以拼音为默认口令。
  - `prisma\schema.prisma:10-30` User 模型无 `mustChangePassword` / `firstLogin` 类字段；全 src grep `mustChangePassword|forcePasswordReset|firstLogin` 0 命中。
  - 主策略要求：≥10 位、含字母+数字（`src\lib\password-policy.ts:1-2, 36-47`）；拼音口令无数字、长度不足，不满足该策略。
- **危害**：初始口令可由公开教师/学员姓名拼音预测（如 `wanglaoshi`），强度低于主策略，且首次登录不强制更换，弱口令可长期有效。
- **利用前置条件**：攻击者获知教师/学员姓名（公开教师名录、家长群等渠道），按拼音规则猜测初始口令。
- **修复方案**：所有建号路径默认调用 `generateTemporaryPassword`（`src\lib\temporary-password.ts:22-33`，crypto 随机 14 位）生成一次性随机口令；User 模型增加 `mustChangePassword` 标记，首次登录强制跳转改密页；下线拼音默认口令；随机口令通过微信/线下渠道一次性交付。
- **工作量**：中(1-3天)
- **优先级**：近期

### A-4 会话状态 5 秒内存缓存窗口；限流与踢事件在 Redis 缺失时静默降级内存

- **证据**：
  - `src\proxy.ts:19-36`：`sessionCache` 按 `division:userId` 缓存库内 `currentSessionToken + status`，`SESSION_CACHE_TTL = 5_000`；`:125-138` 命中缓存则不查库。
  - `src\lib\rate-limit.ts:81-104`：Redis 初始化失败/未配置时 `_redisInitFailed` 置位并静默 `console.warn` 降级 `memCheck`（`:108, 125`）；`:131-145` auto 模式仅以 `REDIS_URL` 是否存在决定驱动。
  - `src\lib\session-events.ts:37-73`：同样逻辑，Redis 不可用降级内存 EventEmitter（`:70`）。
  - `src\lib\login-rate-limit.ts:8-12, 36-71`：IP/账号限流桶为 `globalThis` 内存 Map，本身不具备跨进程能力。
- **危害**：账号被停用或被新设备踢出后，最长 5 秒内旧 JWT 仍可通过 proxy 校验；多实例部署且 Redis 不可用时，IP/账号限流阈值被各实例分摊（实际阈值 = 单机阈值 × 实例数），跨实例踢事件推送可能延迟或丢失。
- **利用前置条件**：多实例部署；或 Redis 连接中断/未配置；缓存窗口内发起请求。
- **修复方案**：写操作接口（改密、后台管理、数据导出）绕过 5s 缓存直查库；将缓存 TTL 缩短至 1-2s，或仅缓存 `status` 而对 `currentSessionToken` 实时比对；生产将 `RATE_LIMIT_DRIVER` / `SESSION_EVENT_DRIVER` 显式设为 `redis` 并在启动时做 Redis 健康检查，拒绝静默降级；内存桶上限与清理策略保留作为兜底。
- **工作量**：中(1-3天)
- **优先级**：近期

### A-5 家长激活令牌有效期 7 天、激活口令策略偏弱、激活端点无独立限流

- **证据**：
  - 有效期：`src\lib\parent-activation.ts:5` `TOKEN_LIFETIME_MS = 7*24*60*60*1000`（7 天；对照重置令牌为 30 分钟）。
  - 激活口令策略：`:11-13` `isStrongActivationPassword` 仅要求 ≥8 位 + 字母 + 数字，弱于主策略 10 位（`password-policy.ts:36-47`）。
  - 端点限流：`src\app\api\auth\activate\[token]\route.ts:18-49` 未调用专用 `checkRateLimit`，仅走 `apiHandler` 默认 `/api` 200rpm（GET 300rpm）；`rate-limit.ts:14-36` 规则表无 `/api/auth/activate` 前缀。
  - 信息回显：GET `:25-29` 对有效令牌返回家长 `name/email` 与学员 `name/grade` 列表。
  - 令牌本身强度合格：32 字节随机、SHA-256 唯一索引、一次性事务占位（`parent-activation.ts:24, 7-9, 73-83`），令牌不可枚举；问题在有效期、口令强度与端点限流。
  - 绑定关系：令牌行仅绑定 `parentUserId`（`prisma\schema.prisma:1817-1829`），不额外绑定手机号；学员列表通过 User 关系带出（`parent-activation.ts:42-57`），换绑手机号不使旧令牌失效。
- **危害**：激活链接 7 天内有效，泄露（邮件/微信/浏览器历史/截图）后利用窗口大；8 位激活口令可在线慢速爆破；持有效令牌者可探测到家长姓名、邮箱与在读学员信息。
- **利用前置条件**：拿到激活链接（令牌 256-bit 不可暴力枚举，前提是链接泄露）。
- **修复方案**：激活有效期压缩至 24-48 小时；激活口令改用 `validatePassword` 主策略；激活端点按 IP + 令牌维度增加独立限流与失败次数锁定；GET 回显去除邮箱全名，仅返回昵称/学员数。
- **工作量**：小(<1天)
- **优先级**：近期

### A-6 会话 Cookie 未使用 `__Host-` 前缀，secure 属性由 URL 推导

- **证据**：`src\lib\auth.ts:233-243`：
  ```ts
  cookies: { sessionToken: { options: {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production' || process.env.NEXTAUTH_URL?.startsWith('https://') === true,
    maxAge: 30*24*60*60,
  } } }
  ```
  未设置 `__Host-` 前缀 Cookie 名；`secure` 依赖 `NEXTAUTH_URL` 前缀判定。
- **危害**：缺 `__Host-` 前缀时，Cookie 名与作用域约束较弱，存在同域其他路径/子域写入混淆面；若生产 `NEXTAUTH_URL` 误配为 http，secure 不生效，会话 Cookie 可能明文下发。
- **利用前置条件**：同站存在可写入 Cookie 的其他子域/路径；或生产环境 URL 配置错误。
- **修复方案**：显式配置带 `__Host-` 前缀的 Cookie 名；生产环境 `secure` 强制为 `true`，不依据 URL 前缀推导；复核 `sameSite: lax` 是否满足管理端跨站场景（敏感操作可评估 `strict`）。
- **工作量**：小(<1天)
- **优先级**：长期

### A-7 IP 取值完全依赖 X-Real-IP 单头，防伪造以反代覆写为前提

- **证据**：`src\lib\request-ip.ts:15-17` 仅 `normalizeIp(headers.get('x-real-ip')) || 'unknown'`；注释（`:9-14`）声明"Nginx overwrites X-Real-IP with its peer address"。该 IP 同时用于登录审计（`login-accounts.ts:253-268`）与各限流桶 key（`rate-limit.ts:156`、`login-rate-limit.ts:37`）。
- **危害**：若部署链路上游 Nginx 未配置 `proxy_set_header X-Real-IP $remote_addr`，客户端可自行发送 `X-Real-IP` 任意伪造 IP，使 IP 维度限流被绕过，并污染登录记录中的审计 IP。
- **利用前置条件**：反向代理未覆写/剥离客户端自带的 `X-Real-IP`。
- **修复方案**：部署 SOP 中固化 Nginx 覆写规则；应用层在确认受信代理前不采信该头（或增加受信代理网段判断）；纳入上线前配置检查清单。
- **工作量**：小(<1天)
- **优先级**：近期

### A-8 登录预检接口存在账号存在性探测面

- **证据**：
  - `src\app\api\auth\detect-role\route.ts:17-23`：返回 `{ role, division }` 或 `null`，角色可区分 teacher/parent/不存在。
  - `src\app\api\auth\check-role\route.ts:29-33`：仅隐藏 admin，teacher/parent/null 仍可区分。
  - `src\app\api\auth\login-status\route.ts:12-14`：返回 `{ locked, failCount, remaining }`，锁定/失败次数可作为存在性旁证。
  - 三接口均在 proxy 公开白名单内（`src\proxy.ts:65` `pathname.startsWith('/api/auth')`）；限流阈值见 `rate-limit.ts:15-19`（detect-role 5、login-check 20、login-status 10、check-role 10 rpm）。
- **危害**：配合慢速限流，攻击者可枚举非管理员账号是否存在、角色归属、是否处于锁定状态。
- **利用前置条件**：未登录可调用；阈值内逐账号慢速探测。
- **修复方案**：预检接口对不存在/不匹配返回统一模糊响应（固定 `ok:false`）；`detect-role` 若仅用于前端选入口，可改为纯前端字段选择；`login-status` 需登录后查询自身状态，不对匿名请求返回失败计数。
- **工作量**：小(<1天)
- **优先级**：长期

## ② 完全缺失

### B-1 `api-rate-limit.ts` 废弃空壳，全仓 0 处业务引用（死代码）

- **证据**：`src\lib\api-rate-limit.ts:1-2` 全文仅 `/** @deprecated 使用 ./rate-limit.ts 替代 */ export { checkRateLimitSync as checkRateLimit } from './rate-limit'`；全 src grep `api-rate-limit` 业务 import **0 处**（仅文件自身）。
- **危害**：文件命名像独立 API 限流模块，后续开发者或审计者易误以为"API 层已有独立限流封装"；实际限流由 `apiHandler → rate-limit.ts` 统一完成。
- **利用前置条件**：无（代码维护性问题）。
- **修复方案**：删除该空壳文件，或在 `rate-limit.ts` 注释中明确"API 限流唯一入口"；确认无外部脚本/配置引用后移除。
- **工作量**：小(<1天)
- **优先级**：长期

### B-2 公开头像签名令牌的签发函数 0 处调用（签发侧未接线）

- **证据**：
  - `src\lib\public-teacher-showcase-token.ts:14-32` `createPublicTeacherPortraitToken`（AES-256-GCM 签发，7 天 TTL）；`:34-61` `verifyPublicTeacherPortraitToken`。
  - 全 src grep `createPublicTeacherPortraitToken`：除定义处外 **0 处调用**；验签侧唯一引用为 `src\app\api\public\teacher-showcase\portrait\route.ts:44`。
  - 展示路由当前使用默认头像 URL（`src\app\api\public\teacher-showcase\route.ts:160-165`），未生成签名链接。
- **危害**：验签端点持续接收令牌，但没有任何代码签发它——要么是遗留死代码，要么公开头像签名访问链路缺失；两种状态都需要明确，避免误以为公开头像已受签名保护。
- **利用前置条件**：无。
- **修复方案**：二选一——(a) 公开头像不需要签名访问：删除 `verifyPublicTeacherPortraitToken` 端点校验与该 lib；(b) 需要签名：在 showcase 路由/静态化流程中补签发调用，并把签发链接纳入缓存与过期刷新逻辑。
- **工作量**：小(<1天)
- **优先级**：近期

### B-3 无密码历史复用/轮换策略，无设备会话列表与单设备下线

- **证据**：
  - 策略库 `src\lib\password-policy.ts:29-63` 仅校验长度/字符集/常见口令/身份信息，无历史哈希比对；User 模型（`schema.prisma:10-30`）无密码历史表关联；全 src grep 无 reuse/rotation 实现。
  - 会话模型仅单个 `currentSessionToken` 标记（`schema.prisma:25`；`auth.ts:185-193`），无设备会话表；除"新登录挤出旧设备"外，无查看已登录设备、无单设备主动下线接口（`kick-events` SSE 仅接收踢出推送，`src\app\api\auth\kick-events\route.ts:7-56`）。
- **危害**：弱口令可反复更换复用；设备遗失、人员离职后只能全局踢出或等待 30 天过期；无设备级审计台账。
- **利用前置条件**：账号被钓鱼/共享/设备遗失。
- **修复方案**：新增 `PasswordHistory` 表存最近 N 次哈希，改密时校验不复用；建立设备会话表（sessionMark、设备指纹、IP、UA、登录时间、最后活跃），前端提供设备列表与单设备撤销；超管支持强制下线任意账号。
- **工作量**：大(>3天)
- **优先级**：长期

### B-4 登录链路无验证码/人机校验，管理员无 2FA

- **证据**：src/lib 与 src/app/api 全量 grep `captcha|turnstile|geetest|recaptcha|totp|authenticator|2fa` **0 命中**；登录校验链路 `credential-auth.ts:29-50` 仅有限流 + 账号锁定，无第二因子。
- **危害**：共享 NAT/校园网出口下，账号维度 10 次/5min 的阈值仍可被多 IP 慢速爆破；管理员账号一旦口令泄露无第二道防线。
- **利用前置条件**：攻击者掌握目标账号邮箱/手机号，低速尝试口令。
- **修复方案**：连续失败 N 次后接入滑块/验证码（人机校验）；admin 角色强制 TOTP/短信 2FA；高敏操作（danger-guard 已有密码+确认短语）可叠加二次校验。
- **工作量**：大(>3天)
- **优先级**：长期

## ③ 架构性/运维层问题

### C-1 限流与会话事件的 Redis 驱动为 auto 降级模式，生产配置待核实

- **证据**：`rate-limit.ts:131-145`、`session-events.ts:77-90` 均为 auto：有 `REDIS_URL` 走 Redis，无则内存；`rate-limit.ts:96-103, 121-126` Redis 失败静默降级。本地 `.env` 键清单无 `REDIS_URL`、无 `RATE_LIMIT_DRIVER`、无 `SESSION_EVENT_DRIVER`；`.env.example:59-61` 三者均为注释/可选。
- **危害**：若生产同样未配置 Redis 或驱动未显式锁定，多实例下限流阈值被实例数稀释，踢事件跨实例不可靠。
- **修复方案**：生产环境显式配置 `REDIS_URL` 并设 `RATE_LIMIT_DRIVER=redis`、`SESSION_EVENT_DRIVER=redis`；启动时校验 Redis 连通性，失败拒绝启动而非降级内存；纳入部署 SOP 与健康检查。
- **工作量**：中(1-3天)
- **优先级**：近期

### C-2 `SUPER_ADMIN_EMAILS` 配置项在样例环境中缺失

- **证据**：`src\lib\super-admin.ts:1-11` 读取 `process.env.SUPER_ADMIN_EMAILS`；`.env.example` 键清单无此项，本地 `.env` 亦无；`src\lib\get-user.ts:79-85` `requireSuperAdmin` 在邮箱不匹配时直接抛"无权限"。
- **危害**：生产若未注入该变量，所有管理员都无法通过超管守卫（功能静默失效，不易从报错发现）；反之若邮件/文档中硬编码了超管名单需另行排查。
- **修复方案**：在 `.env.example` 补充 `SUPER_ADMIN_EMAILS` 说明；启动校验中增加"超管名单为空时生产环境告警"；核对生产实际注入值（值略）。
- **工作量**：小(<1天)
- **优先级**：近期

### C-3 应用启动未调用 `initSessionEvents`，跨实例 Redis 订阅懒建立

- **证据**：`src\lib\session-events.ts:113-117` 导出 `initSessionEvents`；grep 应用代码仅 `session-events.test.ts:18` 调用，`instrumentation.ts` 启动流程未调用。`emitKick`（`:92-110`）在发布时才 `ensureRedis()` 懒连接订阅端；某实例若从未发布踢事件，其 sub client 不会建立。
- **危害**：多实例部署下，其他实例上的 SSE 前端可能收不到即时下线推送。强制失效本身由 proxy/guards/get-user 的 DB `sessionMark` 复核兜底，不构成直接绕过，但前端可能在旧会话被服务端拒绝前仍显示已登录。
- **修复方案**：在 `src\instrumentation.ts` 的 `register()` 中启动调用 `initSessionEvents()`；验证多实例下发布/订阅链路连通。
- **工作量**：小(<1天)
- **优先级**：近期

### C-4 cron / health 令牌走 URL query 参数

- **证据**：`weekly-digest\route.ts:72-73`、`trash-cleanup\route.ts:9-10`、`archive-notifications\route.ts:13-14`、`retry-notifications\route.ts:256-257`、`daily-ops-report\route.ts:56-57`、`health\route.ts:25-27` 均从 `searchParams.get('token')` 取令牌比对；proxy 对 `/api/cron/` 放行由处理器自鉴权（`src\proxy.ts:78-80`）。
- **危害**：query 中的令牌会进入 Nginx 访问日志、浏览器历史、反向代理/CDN 日志；当前日志脱敏规则（`api-handler.ts:21-33`）覆盖 token 类 query 参数，但仅对经 `apiHandler` 与错误路径生效，cron/health 多为未包裹路由。
- **修复方案**：统一改为 `Authorization: Bearer <token>` 头传递；访问日志规则对 cron/health 路径同样脱敏；定期清理历史日志中的令牌。
- **工作量**：小(<1天)
- **优先级**：近期

### C-5 `robots.ts` 公开内部后台路由清单

- **证据**：`src\app\robots.ts:8-16` Disallow 列表包含 `/teacher-salary`、`/data-admin`、`/login-records`、`/parent-access`、`/parent-messages` 等内部路径；无密钥/令牌泄露。
- **危害**：属于君子协定层面的信息暴露——不构成认证绕过，但向侦察者提供了后台模块路径结构。
- **修复方案**：robots 仅 Disallow 明确需要的敏感根路径，不必枚举全部内部页面；内部路径的安全性完全以服务端鉴权为准（由其他分册逐条核验）。
- **工作量**：小(<1天)
- **优先级**：长期

## 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| T-1 | 生产 Nginx 已覆写 `X-Real-IP`，剥离客户端自带值 | 核对 Nginx 配置 `proxy_set_header X-Real-IP $remote_addr;`；从外部发送伪造 `X-Real-IP` 头观察登录记录/限流 key | 若未覆写，IP 限流可被任意伪造 IP 绕过，审计 IP 失真 | 上线前在部署 SOP 固化该规则；应用层增加受信代理判断 |
| T-2 | 生产已配置 `REDIS_URL` 且 `RATE_LIMIT_DRIVER`/`SESSION_EVENT_DRIVER=redis`，Redis 连通稳定 | 核对生产环境变量与 Redis 实例连接；压测观察限流桶是否跨进程生效；断 Redis 验证是否按预期拒绝启动（显式 redis 模式） | 未配置则多实例限流/踢事件退化为单机内存 | 显式锁定 redis 驱动并接入健康检查 |
| T-3 | 生产 `AUTH_SECRET`/`NEXTAUTH_SECRET` 长度≥32 且一致，`assertProductionSecurityEnv` 启动校验真实生效 | 查看启动日志（无"生产环境安全配置检查失败"）；核对两变量值一致、长度达标（值略，不落盘） | Secret 过短/不一致会导致 JWT 可被伪造或会话随机掉线 | 沿用 env-security 校验；轮换旧 Secret 后全员重登 |
| T-4 | 生产已注入 `SUPER_ADMIN_EMAILS` 且名单正确 | 核对环境变量名单（值略）；用非名单管理员账号调用 `requireSuperAdmin` 接口验证被拒 | 未注入则超管功能静默失效；名单过宽则超管面扩大 | `.env.example` 补项；超管操作留审计日志 |
| T-5 | 多实例下踢出/停用传播时效：5s 缓存窗口 + Redis Pub/Sub 推送是否符合预期 | 双实例部署，A 实例登录后在 B 实例踢号，观察两实例下旧 JWT 被拒时间；断开 Redis 观察降级行为 | 窗口内旧会话仍可访问；跨实例推送延迟 | 写接口绕过缓存；启动初始化订阅；缩短缓存 TTL |
| T-6 | 重置/激活/头像签名令牌在 Nginx 日志、WxPusher 消息、浏览器历史、OSS/CDN 缓存中的留存情况 | 抽查访问日志与推送消息内容；确认激活/重置链接未被 CDN 缓存；核对 `api-handler.ts` 脱敏覆盖未包裹路由 | 令牌经日志/缓存泄露后可被复用至过期 | 令牌短有效期；日志脱敏覆盖全路由；必要时服务端定期吊销未使用令牌 |
| T-7 | 9 条未包裹 `apiHandler` 的路由鉴权兜底是否完整（静态已逐个核对，待运行态复核） | 清单：`[...nextauth]`（框架处理器）、`cron/daily-ops-report`、`cron/retry-notifications`、`health`、`parent/students/[id]/learning-report`（`getCurrentUser`，route.ts:28）、`public/teacher-showcase`、`public/teacher-showcase/portrait`（验签）、`qywx/event`（签名）、`wxpusher/callback`（appToken） | 个别路由若自鉴权缺陷，会绕过全局限流与统一错误处理 | 运行态对每条路由做未登录/错误令牌访问回归测试 |
| T-8 | next-auth 5.0.0-beta.32（beta 版）是否存在已知认证相关缺陷 | 对照 next-auth 官方变更日志/安全公告，评估升级到稳定版或最新 beta 的成本 | beta 版本可能存在 Cookie/会话处理已知问题 | 纳入依赖升级清单，升级后回归登录/踢出/跨端会话 |
