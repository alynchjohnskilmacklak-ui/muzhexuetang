# 牧哲学堂教辅平台　安全防护审查报告

> 审查对象：edu-manage（Next.js 16 App Router + React 19 + Prisma / PostgreSQL + next-auth v5 + Redis + 阿里云 OSS）
> 部署形态：Docker + compose.production.yaml，阿里云服务器，已配置 CDN
> 审查方式：源码与配置的静态审查（只读），未对线上站点发起任何探测
> 完成时间：2026 年 11 月

# 第一部分　审查说明

## 一、审查范围

本次审查覆盖主应用的五个方向，共 86 项结论：

| 方向 | 覆盖对象 | 结论数 |
| --- | --- | --- |
| 认证与会话 | next-auth 配置、Cookie、角色来源、密码与重置/激活令牌、登录限流、会话踢出、proxy 入口 | 17 |
| 授权与越权（管理端 / 教师端） | 229 个路由文件、336 个 handler 的"会话—角色—归属"三道门 | 18 |
| 授权与越权（家长端 / 公开入口） | parent / miniapp / public / qywx / wxpusher / ai / volunteer 共 73 条路由方法 | 14 |
| 防爬与防枚举 | robots / sitemap、分页上限、枚举型接口、限流覆盖率、WAF 与 Bot 管理 | 16 |
| 防数据窃取与数据泄露 | 20 个导出下载通道 + 公开头像、OSS 签名与上传、错误与日志、构建产物、端口暴露 | 21 |

统计口径：全项目 `src\app\api` 下 343 个路由目录、296 个非测试 `route.ts`，其中 287 个经 `apiHandler` 包装，9 个未包装；第二章对 336 个 handler 逐一判定（合格 315、残缺 20、裸奔 1）。

## 二、审查方法与证据标准

1. 每条结论必须落到 **文件路径 + 行号** 或具名函数，说明"代码实际怎么做的"，不接受"可能没有校验"这类推断。
2. "某项防护是否生效"一律用 **grep 统计全项目调用点数量** 判定，不以 `src\lib` 里存在同名模块为准。本次据此认定多处"写了但没接线"的死代码。
3. 结论分为三类，全篇分别标识：**①已具备但不完善**（有防护但留有缺口，写明缺口在哪）、**②完全缺失**、**③架构性 / 运维层**（无法只靠改代码解决）。
4. 每条问题给出四项：危害、利用前置条件、修复落点、工作量级别与优先级。

## 三、本次没有做的事（结论的边界）

- 未对线上生产站点发起任何请求、扫描、爆破、越权尝试或抓取压测；所有"能否被利用"的判断均为代码与配置层面的静态推演。
- 未读取线上 OSS 对象、未导出任何真实业务数据、未连接生产数据库。
- 报告全文不含任何真实密钥、数据库口令、企业微信 Secret、AI Key 或 OSS AccessKey 的值；涉及处只标注"已配置（值略）/ 未配置"。
- 需要线上流量或线上控制台才能定论的 44 项，集中列在第五章之后的"待实测项汇总"，并写明了低风险验证方法与执行环境。

# 第二部分　总体结论

## 一、一句话判断

系统并非"没做安全"，而是**做了相当多的防护，但有几处关键的门没有关严**：认证底座（bcrypt cost 12、32 字节随机令牌 + SHA-256 入库 + 一次性 + 短有效期、JWT 配合 sessionMark 设备踢出、proxy 覆盖全部 `/api/*`、IP 只采信 `X-Real-IP`）是扎实的；授权层在 336 个 handler 中有 315 个通过了归属校验；**真正的短板在"数据被整批搬走"这条路径上**——导出与备份通道没有配额、限流存在结构性盲区、静态目录有旁路、边缘层没有 WAF 与 Bot 管理。

也就是说，当前最可能造成实质损失的风险，不是"登录被爆破"，而是**用一个普通账号、一段泄露的 token 或一条分享链接，把整库数据一批批拖走而不留痕迹**。

## 二、风险分布

| 类别 | 数量 | 含义 |
| --- | --- | --- |
| ①已具备但不完善 | 41 | 已有防护，缺口明确，多数是补一个判断、加一个上限 |
| ②完全缺失 | 19 | 该有的防护完全没有，其中 2 项已确认是可被直接利用的缺口 |
| ③架构性 / 运维层 | 26 | 需在 Nginx / CDN / 端口 / 备份策略层解决，改代码无效 |
| 合计 | 86 | — |

按处置节奏：**立刻（当天至本周）6 项、近期（1–4 周）56 项、长期（季度级）24 项**。

其中 `B-18`（Prisma raw SQL 全部参数化、无 `*Unsafe` 拼接）与 `E-17`（数据库与 Redis 未映射公网端口）是**核查通过的正面项**，列在表中备查，不计入待修问题。

## 三、必须先处理的六件事（立刻级）

| 编号 | 问题 | 一句话后果 | 落点 |
| --- | --- | --- | --- |
| B-1 | 注销教师接口只校验登录、不校验角色 | 任意教师或家长账号可注销他人教师账号，并把其课程学员转移走 | `src\app\api\teachers\[id]\route.ts` DELETE |
| E-1 | 备份导出七表全字段、无行数上限 | 一个管理员会话即可拖走两库学员/教师/缴费/报名的全部字段（含电话、邮箱、备注） | `src\app\api\settings\backup\create\route.ts` |
| E-12 | 志愿文档下载仅校验登录 | 任意家长账号可下载站内全部志愿文档 | `src\app\api\volunteer\documents\[id]\download\route.ts` |
| C-1 | 微信推送回调只用共享 appToken 做 `!==` 比对 | token 一旦泄露，可把攻击者微信绑到受害者家长账号，劫持其孩子的通知 | `src\app\api\wxpusher\callback\route.ts` |
| D-1 | 匿名教师展示接口无分页、无限流 | 一次请求即可镜像全量在职教师名册，且不需要任何账号 | `src\app\api\public\teacher-showcase\route.ts` |
| E-13 | `.gitignore` 未排除根目录 `*.sql` / `*.zip` / `_*` | 若已提交，54.7MB 生产库快照与源码压缩包随仓库扩散 | 仓库根 `.gitignore` |

## 四、按危害排序的最危险十项

1. **E-1 备份全库导出**：`settings/backup/create` 对 7 张表执行无 `select`、无 `take` 的 `findMany()` 并整体 JSON 回包；虽限定 admin，但一旦管理员会话被盗用或内部人员越界，损失是"整库"级别，且缺少行数上限约束。
2. **B-1 教师注销裸奔**：同文件 GET（`:58`）与 PATCH（`:144`）都判了 `role !== 'admin'`，唯独 DELETE（约 `:189`）只 `requireSession()`——这是本次唯一确认的"完全裸奔"写接口。
3. **E-12 志愿文档下载无角色校验**：`:11-12` 仅 `auth()`，家长账号可直接读取全部站内文档。
4. **C-1 推送回调鉴权**：`:15` 用 `appToken !== process.env.WXPUSHER_APP_TOKEN` 比对，无 HMAC、无时间戳、无待绑定票据；`extra` 直接作为用户 id 写库，双库同写。
5. **D-1 匿名名册接口**：`teacher-showcase` 未包装 `apiHandler`、无 `take`、无独立限流，是"无需任何账号即可整站镜像"的最佳入口。
6. **E-13 仓库内可能跟踪生产 dump**：`.gitignore` 未排除 `*.sql` / `*.zip` / `_*`，本地存在 54.7MB 的库快照与 `src.zip`。
7. **E-6 / E-7 对象存储与静态旁路**：`ALIYUN_OSS_PRIVATE_BUCKET` 在代码中零读取，`put` 返回未签名公网 URL；本地 driver 的历史链接 `/uploads/<key>` 落 `proxy` matcher 排除段，存在绕过 `/api/uploads` 鉴权直读的可能。
8. **D-2 分页上限缺失**：4 个后台列表的 `limit / pageSize` 未 clamp，`?limit=100000` 直达 `take`；`teachers` 另有全量 `findMany` 后内存分页。
9. **E-2 导出通道无配额**：20 个导出/下载通道仅受兜底 200/300 rpm 约束，不按用户聚合、无每日次数上限，被窃会话可反复批量导出。
10. **A-2 / D-3 账号枚举**：登录失败按"账号不存在 / 密码错 / 身份不符 / 已停用"返回不同错误码与文案；4 个预检接口未登录可探测存在性、角色与锁定状态。



# 第三部分　分方向审查明细

# 第一章　认证与会话

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + next-auth 5.0.0-beta.32 + Prisma 5.22/PostgreSQL + Redis + 阿里云 OSS）。
> 审查方式：只读静态审查，未启动 dev server，未对线上发起任何请求；所有"是否被调用"结论均基于全仓 grep 调用点计数。
> 范围限定：认证与会话（next-auth 配置、角色判定、密码体系、激活/重置令牌、登录限流、会话失效、proxy 拦截、死代码识别、robots）。越权对象级访问、防爬、数据窃取由其他章节覆盖。

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
| A-9 | `api-rate-limit.ts` 为已废弃空壳转发，全仓 0 处业务引用 | ②完全缺失（死代码） | 命名上像独立 API 限流模块，易被误判为"已在 API 层独立生效" | 小(<1天) | 长期 |
| A-10 | `createPublicTeacherPortraitToken` 签发函数 0 处调用，验签端点却在接收令牌 | ②完全缺失（死代码/链路缺口） | 签名头像链接的签发侧未接线：要么是遗留死代码，要么公开头像签名链路缺失，状态不明 | 小(<1天) | 近期 |
| A-11 | 无密码历史复用检查、无定期轮换策略；无设备会话列表与单设备主动下线能力 | ②完全缺失 | 弱口令可反复换用；设备遗失/离职只能全局踢出，无设备级审计与撤销 | 大(>3天) | 长期 |
| A-12 | 登录链路无验证码/人机校验，管理员账号无 2FA | ②完全缺失 | 共享 NAT 出口下可绕过账号维度阈值进行慢速爆破；无第二因子兜底 | 大(>3天) | 长期 |
| A-13 | 限流/会话事件的 Redis 驱动为 auto 降级模式；本地 `.env` 未配置 `REDIS_URL`，生产实际配置待核实 | ③架构运维层 | 若生产未配置 Redis，限流与跨实例踢事件退化为单机内存，多实例部署下防护被稀释 | 中(1-3天) | 近期 |
| A-14 | `SUPER_ADMIN_EMAILS` 未出现在 `.env.example`，本地 `.env` 亦无该键；生产注入情况待核实 | ③架构运维层 | 未注入时所有管理员都无法通过超管守卫（功能静默失效）；配置漂移风险 | 小(<1天) | 近期 |
| A-15 | `initSessionEvents()` 仅在测试中调用，应用启动未初始化 Redis 订阅；跨实例 SSE 订阅靠发布时懒建立 | ③架构运维层 | 多实例下未发布过踢事件的实例不会建立订阅，其他实例的前端可能收不到即时下线提示（DB 复核兜底，不构成直接绕过） | 小(<1天) | 近期 |
| A-16 | cron / health 接口令牌走 URL query 参数 | ③架构运维层 | 令牌可能进入 Nginx 访问日志、浏览器历史、CDN/代理日志 | 小(<1天) | 近期 |
| A-17 | `robots.ts` Disallow 列表枚举了全部内部后台路由名 | ③架构运维层 | 非认证漏洞（君子协定），但向侦察者暴露内部路径结构清单 | 小(<1天) | 长期 |

### 基线确认（静态核实已真正生效，不计入问题）

- 认证提供方单一：仅 CredentialsProvider（`src\lib\auth.ts:107-151`），无 OAuth/其他 provider 接入。
- 密码哈希全量一致：全仓 18 处 `bcrypt.hash(..., 12)`，cost 统一为 12；校验侧 `verifyPassword` 对非 `$2` 前缀哈希失败关闭（`src\lib\login-accounts.ts:437-440`）。
- 会话单设备标记：登录时生成 `sessionMark = crypto.randomUUID()` 写库 `currentSessionToken` 并 `emitKick`（`src\lib\auth.ts:180-195`）；proxy、guards、get-user 三层均查库复核 `status` 与 `sessionMark` 一致性。
- 密码重置令牌：`crypto.randomBytes(32).toString('hex')`（256-bit），SHA-256 入库，30 分钟过期，一次性（`used` 标记 + 旧令牌批量失效），重置后轮换 `currentSessionToken` 撤销旧会话（`src\app\api\auth\reset-password\route.ts:28-69`）；申请侧通用文案防枚举（`forgot-password\route.ts:9, 90`）。端点仅按 IP 10rpm 限流（`rate-limit.ts:22`），无按令牌维度的尝试次数锁定；256-bit 熵使在线暴力枚举不可行，残留风险主要在令牌经日志/消息泄露后的复用窗口（见 TA-6）。
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

### A-9 `api-rate-limit.ts` 废弃空壳，全仓 0 处业务引用（死代码）

- **证据**：`src\lib\api-rate-limit.ts:1-2` 全文仅 `/** @deprecated 使用 ./rate-limit.ts 替代 */ export { checkRateLimitSync as checkRateLimit } from './rate-limit'`；全 src grep `api-rate-limit` 业务 import **0 处**（仅文件自身）。
- **危害**：文件命名像独立 API 限流模块，后续开发者或审计者易误以为"API 层已有独立限流封装"；实际限流由 `apiHandler → rate-limit.ts` 统一完成。
- **利用前置条件**：无（代码维护性问题）。
- **修复方案**：删除该空壳文件，或在 `rate-limit.ts` 注释中明确"API 限流唯一入口"；确认无外部脚本/配置引用后移除。
- **工作量**：小(<1天)
- **优先级**：长期

### A-10 公开头像签名令牌的签发函数 0 处调用（签发侧未接线）

- **证据**：
  - `src\lib\public-teacher-showcase-token.ts:14-32` `createPublicTeacherPortraitToken`（AES-256-GCM 签发，7 天 TTL）；`:34-61` `verifyPublicTeacherPortraitToken`。
  - 全 src grep `createPublicTeacherPortraitToken`：除定义处外 **0 处调用**；验签侧唯一引用为 `src\app\api\public\teacher-showcase\portrait\route.ts:44`。
  - 展示路由当前使用默认头像 URL（`src\app\api\public\teacher-showcase\route.ts:160-165`），未生成签名链接。
- **危害**：验签端点持续接收令牌，但没有任何代码签发它——要么是遗留死代码，要么公开头像签名访问链路缺失；两种状态都需要明确，避免误以为公开头像已受签名保护。
- **利用前置条件**：无。
- **修复方案**：二选一——(a) 公开头像不需要签名访问：删除 `verifyPublicTeacherPortraitToken` 端点校验与该 lib；(b) 需要签名：在 showcase 路由/静态化流程中补签发调用，并把签发链接纳入缓存与过期刷新逻辑。
- **工作量**：小(<1天)
- **优先级**：近期

### A-11 无密码历史复用/轮换策略，无设备会话列表与单设备下线

- **证据**：
  - 策略库 `src\lib\password-policy.ts:29-63` 仅校验长度/字符集/常见口令/身份信息，无历史哈希比对；User 模型（`schema.prisma:10-30`）无密码历史表关联；全 src grep 无 reuse/rotation 实现。
  - 会话模型仅单个 `currentSessionToken` 标记（`schema.prisma:25`；`auth.ts:185-193`），无设备会话表；除"新登录挤出旧设备"外，无查看已登录设备、无单设备主动下线接口（`kick-events` SSE 仅接收踢出推送，`src\app\api\auth\kick-events\route.ts:7-56`）。
- **危害**：弱口令可反复更换复用；设备遗失、人员离职后只能全局踢出或等待 30 天过期；无设备级审计台账。
- **利用前置条件**：账号被钓鱼/共享/设备遗失。
- **修复方案**：新增 `PasswordHistory` 表存最近 N 次哈希，改密时校验不复用；建立设备会话表（sessionMark、设备指纹、IP、UA、登录时间、最后活跃），前端提供设备列表与单设备撤销；超管支持强制下线任意账号。
- **工作量**：大(>3天)
- **优先级**：长期

### A-12 登录链路无验证码/人机校验，管理员无 2FA

- **证据**：src/lib 与 src/app/api 全量 grep `captcha|turnstile|geetest|recaptcha|totp|authenticator|2fa` **0 命中**；登录校验链路 `credential-auth.ts:29-50` 仅有限流 + 账号锁定，无第二因子。
- **危害**：共享 NAT/校园网出口下，账号维度 10 次/5min 的阈值仍可被多 IP 慢速爆破；管理员账号一旦口令泄露无第二道防线。
- **利用前置条件**：攻击者掌握目标账号邮箱/手机号，低速尝试口令。
- **修复方案**：连续失败 N 次后接入滑块/验证码（人机校验）；admin 角色强制 TOTP/短信 2FA；高敏操作（danger-guard 已有密码+确认短语）可叠加二次校验。
- **工作量**：大(>3天)
- **优先级**：长期

## ③ 架构性/运维层问题

### A-13 限流与会话事件的 Redis 驱动为 auto 降级模式，生产配置待核实

- **证据**：`rate-limit.ts:131-145`、`session-events.ts:77-90` 均为 auto：有 `REDIS_URL` 走 Redis，无则内存；`rate-limit.ts:96-103, 121-126` Redis 失败静默降级。本地 `.env` 键清单无 `REDIS_URL`、无 `RATE_LIMIT_DRIVER`、无 `SESSION_EVENT_DRIVER`；`.env.example:59-61` 三者均为注释/可选。
- **危害**：若生产同样未配置 Redis 或驱动未显式锁定，多实例下限流阈值被实例数稀释，踢事件跨实例不可靠。
- **修复方案**：生产环境显式配置 `REDIS_URL` 并设 `RATE_LIMIT_DRIVER=redis`、`SESSION_EVENT_DRIVER=redis`；启动时校验 Redis 连通性，失败拒绝启动而非降级内存；纳入部署 SOP 与健康检查。
- **工作量**：中(1-3天)
- **优先级**：近期

### A-14 `SUPER_ADMIN_EMAILS` 配置项在样例环境中缺失

- **证据**：`src\lib\super-admin.ts:1-11` 读取 `process.env.SUPER_ADMIN_EMAILS`；`.env.example` 键清单无此项，本地 `.env` 亦无；`src\lib\get-user.ts:79-85` `requireSuperAdmin` 在邮箱不匹配时直接抛"无权限"。
- **危害**：生产若未注入该变量，所有管理员都无法通过超管守卫（功能静默失效，不易从报错发现）；反之若邮件/文档中硬编码了超管名单需另行排查。
- **修复方案**：在 `.env.example` 补充 `SUPER_ADMIN_EMAILS` 说明；启动校验中增加"超管名单为空时生产环境告警"；核对生产实际注入值（值略）。
- **工作量**：小(<1天)
- **优先级**：近期

### A-15 应用启动未调用 `initSessionEvents`，跨实例 Redis 订阅懒建立

- **证据**：`src\lib\session-events.ts:113-117` 导出 `initSessionEvents`；grep 应用代码仅 `session-events.test.ts:18` 调用，`instrumentation.ts` 启动流程未调用。`emitKick`（`:92-110`）在发布时才 `ensureRedis()` 懒连接订阅端；某实例若从未发布踢事件，其 sub client 不会建立。
- **危害**：多实例部署下，其他实例上的 SSE 前端可能收不到即时下线推送。强制失效本身由 proxy/guards/get-user 的 DB `sessionMark` 复核兜底，不构成直接绕过，但前端可能在旧会话被服务端拒绝前仍显示已登录。
- **修复方案**：在 `src\instrumentation.ts` 的 `register()` 中启动调用 `initSessionEvents()`；验证多实例下发布/订阅链路连通。
- **工作量**：小(<1天)
- **优先级**：近期

### A-16 cron / health 令牌走 URL query 参数

- **证据**：`weekly-digest\route.ts:72-73`、`trash-cleanup\route.ts:9-10`、`archive-notifications\route.ts:13-14`、`retry-notifications\route.ts:256-257`、`daily-ops-report\route.ts:56-57`、`health\route.ts:25-27` 均从 `searchParams.get('token')` 取令牌比对；proxy 对 `/api/cron/` 放行由处理器自鉴权（`src\proxy.ts:78-80`）。
- **危害**：query 中的令牌会进入 Nginx 访问日志、浏览器历史、反向代理/CDN 日志；当前日志脱敏规则（`api-handler.ts:21-33`）覆盖 token 类 query 参数，但仅对经 `apiHandler` 与错误路径生效，cron/health 多为未包裹路由。
- **修复方案**：统一改为 `Authorization: Bearer <token>` 头传递；访问日志规则对 cron/health 路径同样脱敏；定期清理历史日志中的令牌。
- **工作量**：小(<1天)
- **优先级**：近期

### A-17 `robots.ts` 公开内部后台路由清单

- **证据**：`src\app\robots.ts:8-16` Disallow 列表包含 `/teacher-salary`、`/data-admin`、`/login-records`、`/parent-access`、`/parent-messages` 等内部路径；无密钥/令牌泄露。
- **危害**：属于君子协定层面的信息暴露——不构成认证绕过，但向侦察者提供了后台模块路径结构。
- **修复方案**：robots 仅 Disallow 明确需要的敏感根路径，不必枚举全部内部页面；内部路径的安全性完全以服务端鉴权为准（由其他章节逐条核验）。
- **工作量**：小(<1天)
- **优先级**：长期

## 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| TA-1 | 生产 Nginx 已覆写 `X-Real-IP`，剥离客户端自带值 | 核对 Nginx 配置 `proxy_set_header X-Real-IP $remote_addr;`；从外部发送伪造 `X-Real-IP` 头观察登录记录/限流 key | 若未覆写，IP 限流可被任意伪造 IP 绕过，审计 IP 失真 | 上线前在部署 SOP 固化该规则；应用层增加受信代理判断 |
| TA-2 | 生产已配置 `REDIS_URL` 且 `RATE_LIMIT_DRIVER`/`SESSION_EVENT_DRIVER=redis`，Redis 连通稳定 | 核对生产环境变量与 Redis 实例连接；压测观察限流桶是否跨进程生效；断 Redis 验证是否按预期拒绝启动（显式 redis 模式） | 未配置则多实例限流/踢事件退化为单机内存 | 显式锁定 redis 驱动并接入健康检查 |
| TA-3 | 生产 `AUTH_SECRET`/`NEXTAUTH_SECRET` 长度≥32 且一致，`assertProductionSecurityEnv` 启动校验真实生效 | 查看启动日志（无"生产环境安全配置检查失败"）；核对两变量值一致、长度达标（值略，不落盘） | Secret 过短/不一致会导致 JWT 可被伪造或会话随机掉线 | 沿用 env-security 校验；轮换旧 Secret 后全员重登 |
| TA-4 | 生产已注入 `SUPER_ADMIN_EMAILS` 且名单正确 | 核对环境变量名单（值略）；用非名单管理员账号调用 `requireSuperAdmin` 接口验证被拒 | 未注入则超管功能静默失效；名单过宽则超管面扩大 | `.env.example` 补项；超管操作留审计日志 |
| TA-5 | 多实例下踢出/停用传播时效：5s 缓存窗口 + Redis Pub/Sub 推送是否符合预期 | 双实例部署，A 实例登录后在 B 实例踢号，观察两实例下旧 JWT 被拒时间；断开 Redis 观察降级行为 | 窗口内旧会话仍可访问；跨实例推送延迟 | 写接口绕过缓存；启动初始化订阅；缩短缓存 TTL |
| TA-6 | 重置/激活/头像签名令牌在 Nginx 日志、WxPusher 消息、浏览器历史、OSS/CDN 缓存中的留存情况 | 抽查访问日志与推送消息内容；确认激活/重置链接未被 CDN 缓存；核对 `api-handler.ts` 脱敏覆盖未包裹路由 | 令牌经日志/缓存泄露后可被复用至过期 | 令牌短有效期；日志脱敏覆盖全路由；必要时服务端定期吊销未使用令牌 |
| TA-7 | 9 条未包裹 `apiHandler` 的路由鉴权兜底是否完整（静态已逐个核对，待运行态复核） | 清单：`[...nextauth]`（框架处理器）、`cron/daily-ops-report`、`cron/retry-notifications`、`health`、`parent/students/[id]/learning-report`（`getCurrentUser`，route.ts:28）、`public/teacher-showcase`、`public/teacher-showcase/portrait`（验签）、`qywx/event`（签名）、`wxpusher/callback`（appToken） | 个别路由若自鉴权缺陷，会绕过全局限流与统一错误处理 | 运行态对每条路由做未登录/错误令牌访问回归测试 |
| TA-8 | next-auth 5.0.0-beta.32（beta 版）是否存在已知认证相关缺陷 | 对照 next-auth 官方变更日志/安全公告，评估升级到稳定版或最新 beta 的成本 | beta 版本可能存在 Cookie/会话处理已知问题 | 纳入依赖升级清单，升级后回归登录/踢出/跨端会话 |

# 第二章　授权与越权：管理端 / 教师端

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`，Next.js 16 App Router（route.ts）+ React 19 + Prisma/PostgreSQL + next-auth v5 + Redis + 阿里云 OSS。
> 审查方式：**纯静态审查**，未向线上站点发请求、未跑扫描器、未做越权实测；需要动态验证的假设统一列入文末「待实测项」。
> 范围：`src/app/api` 下 admin / settings / users / teachers / students / courses / class-groups / class-lessons / schedules / rooms / fees / reports / dashboard / exam-papers / grade-records / assessments / attendance / performance / materials / teacher / teacher-logs / teacher-photos / study-hall / leave-requests / makeup-requests / meals / feedback / highlights / learning-goals / parent-communications / notifications / messages / login-records / cron / setup / files / uploads。
> 不在本章：parent / miniapp / public / qywx / wxpusher / ai（其他章节负责）。

## 0. 审查基线（先核实，再逐条判定）

### 0.1 proxy.ts（Next.js 16 middleware 替代入口）实际拦了什么

- 会话校验：`src/proxy.ts:103` 调 `auth()`；未登录 API 返回 401（L106-114）；`sessionMark` 缺失返回 401（L116-120）；查库比对 `currentSessionToken`、账号停用状态（L125-156）。
- **角色校验不在 proxy**：`src/proxy.ts:180` 注释明确「Page role redirects only. API permission checks remain inside API handlers.」即 proxy 只做页面角色跳转，**API 的角色/归属校验必须由路由 handler 自己完成**。
- 放行清单（不经过 proxy 会话校验直接放行）：`/api/auth`、`/api/setup`、`/api/wxpusher/callback`、`/api/qywx/event`、`/api/ai/public-assistant`、`/api/cron/*`、`/api/volunteer/schools` 以及一批静态目录（L64-99）。
- 读库失败窗口：`src/proxy.ts:157-168`，DB 查询异常时**写操作 fail-closed**，但**读操作在失败计数 < 3 次时 fail-open**（放行请求进入 handler）。
- matcher：`src/proxy.ts:202`，静态资源段（含 `uploads`、`images` 等）被排除；`/api/uploads/...` 是否落在 matcher 内列入待实测 TB-1。

### 0.2 路由侧共用守卫（`src/lib/auth/guards.ts`、`src/lib/teacher-portal.ts`、`src/lib/get-user.ts`）

| 守卫 | 会话 | 角色 | 归属 | 说明 |
|---|---|---|---|---|
| `requireAdminUser()` | 有（查库校验 sessionMark + 停用） | 强制 admin | 学部由 `getRequestDivision` 限定 | `guards.ts` |
| `requireTeacherUser()` / `requireParentUser()` | 有 | 强制 teacher / parent | — | `guards.ts` |
| `requireRole(allowed)` | 有 | 白名单角色 | — | `guards.ts` |
| `requireSuperAdmin()` | 有 | admin + env 邮箱白名单 | — | `guards.ts` / `super-admin.ts` |
| `requireCurrentTeacher()` | 有 | 强制 teacher 并解析教师档案 | 配合 `teacherLessonWhere / teacherLessonScopeWhere / teacherStudentWhere` | `teacher-portal.ts` |
| `requireFeeAdminScope()` | 有 | admin（财务范围） | 学部 | `fee-admin-scope.ts` |
| `assertTeacherOwnsStudent()` / `assertCanAccessStudent()` / `assertCanAccessClassLesson()` / `assertCanAccessFeedback()` | — | — | 逐条查库确认对象归属当前教师/家长 | `guards.ts` / `teacher-portal.ts` |
| `getCurrentUser()` | 有（查库校验 sessionMark + 停用，失败返回 null） | 不判角色 | — | `get-user.ts:7-68` |
| 裸 `auth()` | 仅读 cookie 会话，**不查库** sessionMark/停用状态 | 不判角色 | — | 会话吊销只能依赖 proxy 兜底 |

### 0.3 已核实为合格的共性实现

- 教师端 31 个路由统一走 `requireCurrentTeacher()` + `teacherLessonScopeWhere / teacherStudentWhere` 收窄课次与学生范围（矩阵中 `teacher/...` 行）。
- 管理端写操作（考勤补交、反馈撤销、套餐调整、教师薪资、回收站、学员/家长/教师账号管理）均有 admin 角色判断 + 学部/批次范围校验。
- 导出类接口：`reports/export/[chartKey]`（L64 仅 admin，学部 + 批次裁剪）、`admin/salary/export`（L53 requireAdminUser，L58/64 学部 + 教师归属）、`settings/export/finance`、`settings/export/students`（requireAdminUser）——**未发现把全库数据无条件导出的通道**。
- Prisma raw SQL：范围内仅 `cron/weekly-digest`、`students/[id]/status` 等少数处使用 `$queryRaw`，全部为**带 `${}` 参数绑定的模板字符串**；未发现 `$queryRawUnsafe / $executeRawUnsafe`，未发现字符串拼 SQL（见 B-18）。

## 1. 路由"四道门"覆盖矩阵

判定口径：**合格**＝门1会话、门2角色、门3归属齐备（admin 全库管理类路由门3记「—」视为合格）；**残缺**＝会话在，但角色或归属校验不完善；**裸奔**＝缺会话或缺角色的破坏性操作。门1/门2/门3 列：`有` / `无` / `—`（不适用）。

| 路由 (方法) | 门1 会话 | 门2 角色 | 门3 归属 | 判定 | 证据(文件:行) |
|---|---|---|---|---|---|
| `src/app/api/admin/academic-terms/route.ts` GET | 有 | 有 | — | 合格 | admin/academic-terms/route.ts:L11；requireAdminUser；角色校验 L12 |
| `src/app/api/admin/academic-terms/route.ts` POST | 有 | 有 | — | 合格 | admin/academic-terms/route.ts:L22；requireAdminUser；角色校验 L23 |
| `src/app/api/admin/academic-terms/scope/route.ts` GET | 有 | 有 | — | 合格 | admin/academic-terms/scope/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/admin/academic-terms/scope/route.ts` POST | 有 | 有 | — | 合格 | admin/academic-terms/scope/route.ts:L16；requireAdminUser；角色校验 L17 |
| `src/app/api/admin/academic-terms/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/academic-terms/[id]/route.ts:L13；requireAdminUser；角色校验 L17 |
| `src/app/api/admin/academic-terms/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/academic-terms/[id]/route.ts:L42；requireAdminUser；角色校验 L46 |
| `src/app/api/admin/attendance/adjust/route.ts` POST | 有 | 有 | — | 合格 | admin/attendance/adjust/route.ts:L28；getCurrentUser；角色校验 L30 |
| `src/app/api/admin/attendance/submit/route.ts` POST | 有 | 有 | 有 | 合格 | admin/attendance/submit/route.ts:L21；getCurrentUser；角色校验 L23；归属 visibleStudentWhere |
| `src/app/api/admin/classroom-feedback/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/route.ts:L18；requireAdminUser；角色校验 L20 |
| `src/app/api/admin/classroom-feedback/route.ts` POST | 有 | 有 | — | 合格 | admin/classroom-feedback/route.ts:L191；auth(；角色校验 L195 |
| `src/app/api/admin/classroom-feedback/image-download/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/image-download/route.ts:L12；requireAdminUser；角色校验 L13 |
| `src/app/api/admin/classroom-feedback/[id]/detail/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/[id]/detail/route.ts:L11；requireAdminUser；角色校验 L16 |
| `src/app/api/admin/classroom-feedback/[id]/image/route.ts` GET | 有 | 有 | — | 合格 | admin/classroom-feedback/[id]/image/route.ts:L9；requireAdminUser；角色校验 L14 |
| `src/app/api/admin/cleanup/route.ts` POST | 有 | 有 | — | 合格 | admin/cleanup/route.ts:L11；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/cleanup/route.ts` GET | 有 | 有 | — | 合格 | admin/cleanup/route.ts:L18；getCurrentUser；角色校验 L20 |
| `src/app/api/admin/course-change-events/route.ts` GET | 有 | 有 | — | 合格 | admin/course-change-events/route.ts:L8；getCurrentUser；角色校验 L10 |
| `src/app/api/admin/data-admin/backup/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L33；requireSuperAdmin；角色校验 L34 |
| `src/app/api/admin/data-admin/backup/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L71；requireSuperAdmin；角色校验 L72 |
| `src/app/api/admin/data-admin/backup/route.ts` PATCH | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L104；requireSuperAdmin；角色校验 L105 |
| `src/app/api/admin/data-admin/backup/route.ts` DELETE | 有 | 有 | — | 合格 | admin/data-admin/backup/route.ts:L119；requireSuperAdmin；角色校验 L120 |
| `src/app/api/admin/data-admin/overview/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/overview/route.ts:L10；auth(；角色校验 L13 |
| `src/app/api/admin/data-admin/reset/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/reset/route.ts:L198；requireSuperAdmin；角色校验 L199 |
| `src/app/api/admin/data-admin/reset/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/reset/route.ts:L208；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/data-admin/reset/preview/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/reset/preview/route.ts:L9；requireSuperAdmin；角色校验 L10 |
| `src/app/api/admin/data-admin/restore/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/restore/route.ts:L48；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/data-admin/[entity]/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/[entity]/route.ts:L18；auth(；角色校验 L22 |
| `src/app/api/admin/data-admin/[entity]/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/[entity]/route.ts:L108；auth(；角色校验 L112 |
| `src/app/api/admin/data-admin/[entity]/batch/route.ts` POST | 有 | 有 | — | 合格 | admin/data-admin/[entity]/batch/route.ts:L27；auth(；角色校验 L30,L92 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` GET | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L21；auth(；角色校验 L24 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` PUT | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L55；auth(；角色校验 L58 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L112；auth(；角色校验 L115 |
| `src/app/api/admin/data-admin/[entity]/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/data-admin/[entity]/[id]/route.ts:L154；auth(；角色校验 L157 |
| `src/app/api/admin/data-health/route.ts` GET | 有 | 有 | — | 合格 | admin/data-health/route.ts:L9；auth(；角色校验 L11 |
| `src/app/api/admin/feedback/revoke/route.ts` POST | 有 | 有 | — | 合格 | admin/feedback/revoke/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/admin/global-search/route.ts` GET | 有 | 有 | — | 合格 | admin/global-search/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/import/route.ts` POST | 有 | 有 | — | 合格 | admin/import/route.ts:L59；auth(；角色校验 L61 |
| `src/app/api/admin/intensive-appointments/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-appointments/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/admin/intensive-history/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-history/route.ts:L32；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/intensive-history/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-history/route.ts:L114；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/intensive-reviews/route.ts` GET | 有 | 有 | — | 合格 | admin/intensive-reviews/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/admin/intensive-reviews/[id]/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-reviews/[id]/route.ts:L12；getCurrentUser；角色校验 L18 |
| `src/app/api/admin/intensive-settlement/adjust/route.ts` POST | 有 | 有 | — | 合格 | admin/intensive-settlement/adjust/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/intensive-summary/route.ts` GET | 有 | 有 | 有 | 合格 | admin/intensive-summary/route.ts:L9；requireAdminUser；角色校验 L10；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/admin/materials/lesson-previews/route.ts` GET | 有 | 有 | — | 合格 | admin/materials/lesson-previews/route.ts:L21；requireAdminUser；角色校验 L22 |
| `src/app/api/admin/materials/lesson-previews/route.ts` POST | 有 | 有 | — | 合格 | admin/materials/lesson-previews/route.ts:L136；requireAdminUser；角色校验 L137 |
| `src/app/api/admin/meal-attendance/route.ts` GET | 有 | 有 | — | 合格 | admin/meal-attendance/route.ts:L15；auth(；角色校验 L17；内联角色/归属校验（已人工复核） |
| `src/app/api/admin/meal-attendance/route.ts` PATCH | 有 | 有 | — | 合格 | admin/meal-attendance/route.ts:L88；auth(；角色校验 L90 |
| `src/app/api/admin/meal-templates/route.ts` GET | 有 | 有 | — | 合格 | admin/meal-templates/route.ts:L15；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/route.ts` POST | 有 | 有 | — | 合格 | admin/meal-templates/route.ts:L41；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/[id]/route.ts` PUT | 有 | 有 | — | 合格 | admin/meal-templates/[id]/route.ts:L15；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/meal-templates/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/meal-templates/[id]/route.ts:L46；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/parent-activation/route.ts` GET | 有 | 有 | — | 合格 | admin/parent-activation/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/parent-activation/route.ts` POST | 有 | 有 | — | 合格 | admin/parent-activation/route.ts:L36；requireAdminUser；角色校验 L37 |
| `src/app/api/admin/practice-stats/route.ts` GET | 有 | 有 | — | 合格 | admin/practice-stats/route.ts:L32；requireAdminUser；角色校验 L33 |
| `src/app/api/admin/practice-stats/[studentId]/route.ts` GET | 有 | 有 | — | 合格 | admin/practice-stats/[studentId]/route.ts:L68；requireAdminUser；角色校验 L69 |
| `src/app/api/admin/profile-completeness/route.ts` GET | 有 | 有 | — | 合格 | admin/profile-completeness/route.ts:L10；requireRole；角色校验 L11 |
| `src/app/api/admin/salary/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/route.ts:L14；requireAdminUser；角色校验 L16 |
| `src/app/api/admin/salary/route.ts` POST | 有 | 有 | — | 合格 | admin/salary/route.ts:L218；requireAdminUser；角色校验 L220 |
| `src/app/api/admin/salary/route.ts` DELETE | 有 | 有 | — | 合格 | admin/salary/route.ts:L265；requireAdminUser；角色校验 L267 |
| `src/app/api/admin/salary/config/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/config/route.ts:L29；requireAdminUser；角色校验 L31 |
| `src/app/api/admin/salary/config/route.ts` PUT | 有 | 有 | — | 合格 | admin/salary/config/route.ts:L55；requireAdminUser；角色校验 L57 |
| `src/app/api/admin/salary/export/route.ts` GET | 有 | 有 | — | 合格 | admin/salary/export/route.ts:L51；requireAdminUser；角色校验 L53 |
| `src/app/api/admin/salary/settle/route.ts` POST | 有 | 有 | — | 合格 | admin/salary/settle/route.ts:L11；requireAdminUser；角色校验 L13 |
| `src/app/api/admin/single-session-feedback/route.ts` GET | 有 | 有 | — | 合格 | admin/single-session-feedback/route.ts:L9；requireAdminUser；角色校验 L10 |
| `src/app/api/admin/student-identities/merge/route.ts` GET | 有 | 有 | — | 合格 | admin/student-identities/merge/route.ts:L14；getCurrentUser；角色校验 L16 |
| `src/app/api/admin/student-identities/merge/route.ts` POST | 有 | 有 | — | 合格 | admin/student-identities/merge/route.ts:L50；getCurrentUser；角色校验 L52 |
| `src/app/api/admin/student-profile/route.ts` GET | 有 | 有 | — | 合格 | admin/student-profile/route.ts:L9；requireRole；角色校验 L10 |
| `src/app/api/admin/students/[id]/family/route.ts` POST | 有 | 有 | — | 合格 | admin/students/[id]/family/route.ts:L13；auth(；角色校验 L17 |
| `src/app/api/admin/students/[id]/family/route.ts` DELETE | 有 | 有 | — | 合格 | admin/students/[id]/family/route.ts:L68；auth(；角色校验 L72 |
| `src/app/api/admin/students/[id]/feedback-archive/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/feedback-archive/route.ts:L18；requireAdminUser；角色校验 L23 |
| `src/app/api/admin/students/[id]/feedback-export/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/feedback-export/route.ts:L7；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/students/[id]/growth-archive/route.ts` GET | 有 | 有 | — | 合格 | admin/students/[id]/growth-archive/route.ts:L15；requireAdminUser；角色校验 L20 |
| `src/app/api/admin/teacher-messages/route.ts` POST | 有 | 有 | — | 合格 | admin/teacher-messages/route.ts:L13；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/admin/teacher-messages/route.ts` GET | — | — | — | 合格 | admin/teacher-messages/route.ts:L40；内联角色/归属校验（已人工复核） |
| `src/app/api/admin/trash/route.ts` GET | 有 | 有 | — | 合格 | admin/trash/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/trash/route.ts` POST | 有 | 有 | — | 合格 | admin/trash/route.ts:L36；getCurrentUser；角色校验 L38 |
| `src/app/api/admin/trash/preview/route.ts` GET | 有 | 有 | — | 合格 | admin/trash/preview/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/admin/trash/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | admin/trash/[id]/route.ts:L7；getCurrentUser；角色校验 L9 |
| `src/app/api/admin/trash/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | admin/trash/[id]/route.ts:L16；getCurrentUser；角色校验 L18 |
| `src/app/api/admin/volunteer-data-health/route.ts` GET | 有 | 有 | — | 合格 | admin/volunteer-data-health/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/assessments/route.ts` GET | 有 | 有 | — | 合格 | assessments/route.ts:L6；getCurrentUser；角色校验 L18 |
| `src/app/api/assessments/route.ts` POST | 有 | 有 | — | 合格 | assessments/route.ts:L52；getCurrentUser；角色校验 L54 |
| `src/app/api/attendance/route.ts` GET | 有 | 无 | — | 合格 | attendance/route.ts:L14；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/attendance/calendar/route.ts` GET | 有 | 无 | 有 | 合格 | attendance/calendar/route.ts:L11；getCurrentUser；归属 visibleClassGroupWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/attendance/export/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/export/route.ts:L14；getCurrentUser；角色校验 L17；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/attendance/history/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/history/route.ts:L11；getCurrentUser；角色校验 L21；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/attendance/today/route.ts` GET | 有 | 有 | 有 | 合格 | attendance/today/route.ts:L15；getCurrentUser；角色校验 L18；归属 parentLinkedStudentWhere |
| `src/app/api/attendance/[lessonId]/route.ts` GET | 有 | 无 | 有 | 合格 | attendance/[lessonId]/route.ts:L12；getCurrentUser；归属 visibleClassGroupWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-groups/route.ts` GET | 有 | 无 | 有 | 合格 | class-groups/route.ts:L56；getCurrentUser；归属 visibleClassGroupWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-groups/route.ts` POST | 有 | 有 | — | 合格 | class-groups/route.ts:L153；getCurrentUser；角色校验 L155 |
| `src/app/api/class-groups/check-teacher-conflict/route.ts` POST | 有 | 无 | — | 残缺 | class-groups/check-teacher-conflict/route.ts:L9；getCurrentUser；仅登录即可探测任意教师排课冲突（低敏） |
| `src/app/api/class-groups/check-teacher-conflict/batch/route.ts` POST | 有 | 无 | — | 残缺 | class-groups/check-teacher-conflict/batch/route.ts:L11；getCurrentUser；仅登录即可批量探测教师排课冲突（低敏） |
| `src/app/api/class-groups/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | class-groups/[id]/route.ts:L42；getCurrentUser；角色校验 L77；归属 visibleClassGroupWhere |
| `src/app/api/class-groups/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | class-groups/[id]/route.ts:L122；getCurrentUser；角色校验 L124 |
| `src/app/api/class-groups/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | class-groups/[id]/route.ts:L357；getCurrentUser；角色校验 L359 |
| `src/app/api/class-groups/[id]/add-teacher/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/add-teacher/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/class-groups/[id]/copy/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/copy/route.ts:L29；getCurrentUser；角色校验 L31 |
| `src/app/api/class-groups/[id]/enrollments/route.ts` GET | 有 | 有 | 有 | 合格 | class-groups/[id]/enrollments/route.ts:L26；getCurrentUser；角色校验 L29；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/class-groups/[id]/enrollments/route.ts` POST | 有 | 有 | 有 | 合格 | class-groups/[id]/enrollments/route.ts:L58；getCurrentUser；角色校验 L60；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/class-groups/[id]/enrollments/route.ts` DELETE | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/route.ts:L276；getCurrentUser；角色校验 L278 |
| `src/app/api/class-groups/[id]/enrollments/[studentId]/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/[studentId]/route.ts:L141；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/class-groups/[id]/enrollments/[studentId]/route.ts` PATCH | 有 | 有 | — | 合格 | class-groups/[id]/enrollments/[studentId]/route.ts:L156；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/class-groups/[id]/generate-lessons/route.ts` POST | 有 | 有 | 有 | 合格 | class-groups/[id]/generate-lessons/route.ts:L51；getCurrentUser；角色校验 L53；归属 visibleClassGroupWhere |
| `src/app/api/class-groups/[id]/lessons/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/lessons/route.ts:L23；getCurrentUser；角色校验 L25 |
| `src/app/api/class-groups/[id]/replace-teacher/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/replace-teacher/route.ts:L18；getCurrentUser；角色校验 L20 |
| `src/app/api/class-groups/[id]/start/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/start/route.ts:L11；getCurrentUser；角色校验 L13 |
| `src/app/api/class-groups/[id]/sync-hours/route.ts` POST | 有 | 有 | — | 合格 | class-groups/[id]/sync-hours/route.ts:L14；getCurrentUser；角色校验 L19 |
| `src/app/api/class-lessons/route.ts` GET | 有 | 无 | 有 | 合格 | class-lessons/route.ts:L14；getCurrentUser；归属 parentLinkedStudentWhere,visibleClassGroupWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/class-lessons/add-day/route.ts` POST | 有 | 有 | — | 合格 | class-lessons/add-day/route.ts:L14；getCurrentUser；角色校验 L16 |
| `src/app/api/class-lessons/copy-friday-to-saturday/route.ts` POST | 有 | 有 | — | 合格 | class-lessons/copy-friday-to-saturday/route.ts:L33；getCurrentUser；角色校验 L35 |
| `src/app/api/class-lessons/postpone-all/route.ts` POST | 有 | 有 | 有 | 合格 | class-lessons/postpone-all/route.ts:L86；getCurrentUser；角色校验 L88；归属 visibleClassGroupWhere |
| `src/app/api/class-lessons/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | class-lessons/[id]/route.ts:L15；getCurrentUser；角色校验 L17 |
| `src/app/api/courses/route.ts` GET | 有 | 无 | — | 残缺 | courses/route.ts:L9；getCurrentUser；仅登录即返回课程目录（含教师姓名），低敏 |
| `src/app/api/courses/route.ts` POST | 有 | 有 | — | 合格 | courses/route.ts:L27；getCurrentUser；角色校验 L29 |
| `src/app/api/cron/archive-notifications/route.ts` GET | 有 | 有 | — | 合格 | cron/archive-notifications/route.ts:L12；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/daily-ops-report/route.ts` GET | 有 | 有 | — | 合格 | cron/daily-ops-report/route.ts:L55；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/retry-notifications/route.ts` GET | 有 | 有 | — | 合格 | cron/retry-notifications/route.ts:L255；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/trash-cleanup/route.ts` GET | 有 | 有 | — | 合格 | cron/trash-cleanup/route.ts:L8；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/cron/weekly-digest/route.ts` GET | 有 | 有 | — | 合格 | cron/weekly-digest/route.ts:L71；Bearer token 自校验（proxy 放行 /api/cron/*） |
| `src/app/api/dashboard/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/route.ts:L60；getCurrentUser；角色校验 L62；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/dashboard/appointment-detail/route.ts` GET | 有 | 有 | — | 合格 | dashboard/appointment-detail/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/dashboard/class-detail/route.ts` GET | 有 | 有 | — | 合格 | dashboard/class-detail/route.ts:L8；requireAdminUser；角色校验 L9 |
| `src/app/api/dashboard/closed-loop/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/closed-loop/route.ts:L36；getCurrentUser；角色校验 L38；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/dashboard/teacher-compliance/route.ts` GET | 有 | 有 | 有 | 合格 | dashboard/teacher-compliance/route.ts:L27；getCurrentUser；角色校验 L29；归属 visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/exam-papers/route.ts` GET | 有 | 无 | 有 | 合格 | exam-papers/route.ts:L16；getCurrentUser；归属 parentVisibleExamPaperWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/exam-papers/route.ts` POST | 有 | 有 | 有 | 合格 | exam-papers/route.ts:L98；getCurrentUser；角色校验 L100；归属 assertCanAccessClassLesson,assertCanAccessStudent |
| `src/app/api/exam-papers/recognize/route.ts` POST | 有 | 有 | — | 合格 | exam-papers/recognize/route.ts:L82；getCurrentUser；角色校验 L84 |
| `src/app/api/exam-papers/stats/route.ts` GET | 有 | 有 | — | 合格 | exam-papers/stats/route.ts:L11；getCurrentUser；角色校验 L13 |
| `src/app/api/exam-papers/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | exam-papers/[id]/route.ts:L12；getCurrentUser；角色校验 L18；归属 parentVisibleExamPaperWhere |
| `src/app/api/exam-papers/[id]/route.ts` PATCH | 有 | 有 | 有 | 合格 | exam-papers/[id]/route.ts:L80；getCurrentUser；角色校验 L124；归属 parentVisibleExamPaperWhere |
| `src/app/api/exam-papers/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | exam-papers/[id]/route.ts:L162；getCurrentUser；角色校验 L164 |
| `src/app/api/exam-papers/[id]/comment/route.ts` POST | 有 | 有 | — | 残缺 | exam-papers/[id]/comment/route.ts:L9；getCurrentUser；角色校验 L31；门3 无归属：教师不核 paper.teacherId、家长不核 paper.studentId |
| `src/app/api/exam-papers/[id]/publish/route.ts` POST | 有 | 有 | — | 合格 | exam-papers/[id]/publish/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/exam-papers/[id]/questions/route.ts` PUT | 有 | 有 | — | 合格 | exam-papers/[id]/questions/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/exam-papers/[id]/react/route.ts` POST | 有 | 无 | — | 残缺 | exam-papers/[id]/react/route.ts:L8；getCurrentUser；门3 无归属：任意登录用户可对任意试卷反应 |
| `src/app/api/feedback/route.ts` GET | 有 | 有 | — | 合格 | feedback/route.ts:L43；auth(,requireCurrentTeacher；角色校验 L69,L108,L149 |
| `src/app/api/feedback/route.ts` POST | 有 | 有 | — | 合格 | feedback/route.ts:L180；auth(,requireCurrentTeacher；角色校验 L242 |
| `src/app/api/feedback/route.ts` PATCH | 有 | 无 | 有 | 合格 | feedback/route.ts:L451；auth(；归属 parentLinkedStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/feedback/bonus-preview/route.ts` POST | 有 | 有 | — | 合格 | feedback/bonus-preview/route.ts:L14；requireCurrentTeacher；角色校验 L15 |
| `src/app/api/feedback/[id]/messages/route.ts` GET | 有 | 有 | — | 合格 | feedback/[id]/messages/route.ts:L9；getCurrentUser；角色校验 L15；内联角色/归属校验（已人工复核） |
| `src/app/api/feedback/[id]/messages/route.ts` POST | 有 | 有 | — | 合格 | feedback/[id]/messages/route.ts:L48；getCurrentUser；角色校验 L54 |
| `src/app/api/fees/route.ts` GET | 有 | 有 | — | 合格 | fees/route.ts:L116；requireFeeAdminScope；角色校验 L118 |
| `src/app/api/fees/route.ts` POST | 有 | 有 | — | 合格 | fees/route.ts:L186；requireFeeAdminScope；角色校验 L191 |
| `src/app/api/fees/fee-types/route.ts` GET | 有 | 有 | — | 合格 | fees/fee-types/route.ts:L16；requireFeeAdminScope；角色校验 L17 |
| `src/app/api/fees/students/route.ts` GET | 有 | 有 | — | 合格 | fees/students/route.ts:L32；requireFeeAdminScope；角色校验 L34 |
| `src/app/api/fees/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | fees/[id]/route.ts:L21；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/fees/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | fees/[id]/route.ts:L82；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/files/view/route.ts` GET | 有 | 无 | — | 合格 | files/view/route.ts:L13；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/files/[id]/route.ts` GET | 有 | 无 | — | 合格 | files/[id]/route.ts:L10；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/grade-records/route.ts` POST | 有 | 有 | — | 合格 | grade-records/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/grade-records/trend/route.ts` GET | 有 | 无 | 有 | 合格 | grade-records/trend/route.ts:L8；getCurrentUser；归属 assertCanAccessStudent；内联角色/归属校验（已人工复核） |
| `src/app/api/grade-records/[id]/push-to-parent/route.ts` POST | 有 | 有 | — | 合格 | grade-records/[id]/push-to-parent/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/highlights/route.ts` GET | 有 | 无 | — | 残缺 | highlights/route.ts:L7；getCurrentUser；门2 无角色、门3 无归属；可按 studentId/groupId 遍历全部学员亮点 |
| `src/app/api/highlights/route.ts` POST | 有 | 有 | — | 合格 | highlights/route.ts:L36；getCurrentUser；角色校验 L38 |
| `src/app/api/highlights/[id]/push/route.ts` PATCH | 有 | 有 | — | 合格 | highlights/[id]/push/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/leave-requests/route.ts` GET | 有 | 有 | 有 | 合格 | leave-requests/route.ts:L9；auth(,requireCurrentTeacher；角色校验 L11,L27；归属 teacherStudentWhere |
| `src/app/api/leave-requests/[id]/route.ts` PATCH | 有 | 有 | 有 | 合格 | leave-requests/[id]/route.ts:L10；auth(,requireCurrentTeacher；角色校验 L14,L30；归属 teacherStudentWhere |
| `src/app/api/login-records/route.ts` GET | 有 | 有 | — | 合格 | login-records/route.ts:L69；auth(；角色校验 L72 |
| `src/app/api/makeup-requests/route.ts` GET | 有 | 有 | 有 | 合格 | makeup-requests/route.ts:L7；getCurrentUser；角色校验 L10；归属 visibleStudentWhere |
| `src/app/api/makeup-requests/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | makeup-requests/[id]/route.ts:L6；getCurrentUser；角色校验 L8 |
| `src/app/api/materials/route.ts` GET | 有 | 无 | 有 | 合格 | materials/route.ts:L16；auth(；归属 parentVisibleMaterialWhere,teacherVisibleMaterialWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/route.ts` DELETE | 有 | 有 | — | 合格 | materials/route.ts:L63；auth(；角色校验 L65 |
| `src/app/api/materials/oss-signature/route.ts` GET | — | — | — | 残缺 | materials/oss-signature/route.ts:L11；GET 未校验会话即返回 isOssEnabled 布尔（信息泄露，低敏） |
| `src/app/api/materials/oss-signature/route.ts` POST | 有 | 有 | — | 合格 | materials/oss-signature/route.ts:L15；auth(；角色校验 L22 |
| `src/app/api/materials/upload/route.ts` POST | 有 | 无 | — | 合格 | materials/upload/route.ts:L33；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/upload/route.ts` PUT | 有 | 无 | — | 合格 | materials/upload/route.ts:L124；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/materials/[id]/view/route.ts` GET | 有 | 有 | 有 | 合格 | materials/[id]/view/route.ts:L69；auth(；角色校验 L81；归属 parentVisibleMaterialWhere,teacherLessonWhere,teacherVisibleMaterialWhere |
| `src/app/api/meals/menu/route.ts` GET | 有 | 无 | — | 合格 | meals/menu/route.ts:L10；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/meals/menu/route.ts` POST | 有 | 有 | — | 合格 | meals/menu/route.ts:L55；auth(；角色校验 L57 |
| `src/app/api/meals/menu/[id]/route.ts` PUT | 有 | 有 | — | 合格 | meals/menu/[id]/route.ts:L11；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/meals/menu/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | meals/menu/[id]/route.ts:L31；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/meals/report/route.ts` GET | 有 | 有 | — | 合格 | meals/report/route.ts:L11；auth(,requireCurrentTeacher；角色校验 L27 |
| `src/app/api/meals/report/route.ts` POST | 有 | 有 | — | 合格 | meals/report/route.ts:L117；requireCurrentTeacher；角色校验 L119 |
| `src/app/api/meals/report/[id]/route.ts` PUT | 有 | 有 | — | 合格 | meals/report/[id]/route.ts:L6；requireCurrentTeacher；角色校验 L8 |
| `src/app/api/meals/summary/route.ts` GET | 有 | 有 | — | 合格 | meals/summary/route.ts:L10；auth(；角色校验 L12 |
| `src/app/api/messages/route.ts` GET | 有 | 无 | — | 合格 | messages/route.ts:L14；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/route.ts` POST | 有 | 有 | — | 合格 | messages/route.ts:L106；getCurrentUser；角色校验 L111 |
| `src/app/api/messages/read-all/route.ts` PATCH | 有 | 无 | — | 合格 | messages/read-all/route.ts:L8；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/unread-count/route.ts` GET | 有 | 无 | — | 合格 | messages/unread-count/route.ts:L14；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/[id]/route.ts` GET | 有 | 无 | — | 合格 | messages/[id]/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/messages/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | messages/[id]/route.ts:L81；getCurrentUser；角色校验 L84 |
| `src/app/api/messages/[id]/remind/route.ts` POST | 有 | 有 | — | 合格 | messages/[id]/remind/route.ts:L13；getCurrentUser；角色校验 L19 |
| `src/app/api/messages/[id]/reply/route.ts` POST | 有 | 有 | — | 合格 | messages/[id]/reply/route.ts:L13；getCurrentUser；角色校验 L16 |
| `src/app/api/notifications/route.ts` GET | 有 | 有 | — | 合格 | notifications/route.ts:L14；auth(；角色校验 L16 |
| `src/app/api/notifications/route.ts` POST | 有 | 有 | — | 合格 | notifications/route.ts:L40；auth(；角色校验 L42 |
| `src/app/api/notifications/stats/route.ts` GET | 有 | 有 | — | 合格 | notifications/stats/route.ts:L8；auth(；角色校验 L10 |
| `src/app/api/notifications/students/route.ts` GET | 有 | 有 | — | 合格 | notifications/students/route.ts:L7；auth(；角色校验 L9 |
| `src/app/api/notifications/[id]/resend/route.ts` POST | 有 | 有 | — | 合格 | notifications/[id]/resend/route.ts:L10；auth(；角色校验 L14 |
| `src/app/api/parent-communications/route.ts` GET | 有 | 有 | — | 合格 | parent-communications/route.ts:L69；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` POST | 有 | 有 | 有 | 合格 | parent-communications/route.ts:L271；归属 visibleClassGroupWhere,visibleStudentWhere；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` PATCH | 有 | 有 | — | 合格 | parent-communications/route.ts:L338；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/parent-communications/route.ts` DELETE | 有 | 有 | — | 合格 | parent-communications/route.ts:L394；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/performance/route.ts` GET | 有 | 有 | 有 | 合格 | performance/route.ts:L26；auth(；角色校验 L32；归属 parentActiveStudentWhere,parentVisiblePerformancePostWhere |
| `src/app/api/performance/route.ts` POST | 有 | 有 | 有 | 合格 | performance/route.ts:L116；auth(；角色校验 L120；归属 assertTeacherOwnsStudent |
| `src/app/api/performance/badges/route.ts` GET | 有 | 有 | — | 残缺 | performance/badges/route.ts:L8；auth(；角色校验 L25；教师分支 where 未带 teacherId/学生归属，可按 studentId 读任意学员徽章 |
| `src/app/api/performance/read/route.ts` POST | 有 | 有 | 有 | 合格 | performance/read/route.ts:L10；auth(；角色校验 L14；归属 parentVisiblePerformancePostWhere |
| `src/app/api/performance/[id]/route.ts` GET | 有 | 有 | 有 | 合格 | performance/[id]/route.ts:L14；getCurrentUser；角色校验 L20；归属 parentLinkedStudentWhere |
| `src/app/api/performance/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | performance/[id]/route.ts:L81；auth(；角色校验 L85,L92 |
| `src/app/api/performance/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | performance/[id]/route.ts:L118；auth(；角色校验 L122,L129 |
| `src/app/api/performance/[id]/comment/route.ts` POST | 有 | 有 | — | 合格 | performance/[id]/comment/route.ts:L11；auth(；角色校验 L23 |
| `src/app/api/performance/[id]/react/route.ts` POST | 有 | 有 | — | 合格 | performance/[id]/react/route.ts:L23；auth(；角色校验 L27 |
| `src/app/api/performance/[id]/react/route.ts` DELETE | 有 | 有 | — | 合格 | performance/[id]/react/route.ts:L43；auth(；角色校验 L47 |
| `src/app/api/reports/attendance-stats/route.ts` GET | 有 | 有 | — | 合格 | reports/attendance-stats/route.ts:L12；getCurrentUser；角色校验 L14 |
| `src/app/api/reports/export/[chartKey]/route.ts` GET | 有 | 有 | — | 合格 | reports/export/[chartKey]/route.ts:L58；getCurrentUser；角色校验 L64 |
| `src/app/api/reports/paper-stats/route.ts` GET | 有 | 有 | — | 残缺 | reports/paper-stats/route.ts:L11；getCurrentUser；角色校验 L13；教师可读本学部全库试卷/掌握度聚合，未按本人教师裁剪（聚合，低敏） |
| `src/app/api/reports/parent-engagement/route.ts` GET | 有 | 有 | — | 残缺 | reports/parent-engagement/route.ts:L11；getCurrentUser；角色校验 L13；教师可读全库互动率聚合，未按本人教师裁剪（聚合，低敏） |
| `src/app/api/reports/parent-logins/route.ts` GET | 有 | 有 | — | 合格 | reports/parent-logins/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/reports/students/route.ts` GET | 有 | 有 | — | 合格 | reports/students/route.ts:L10；getCurrentUser；角色校验 L12 |
| `src/app/api/reports/summary/route.ts` GET | 有 | 有 | — | 合格 | reports/summary/route.ts:L47；getCurrentUser；角色校验 L52 |
| `src/app/api/reports/teachers/route.ts` GET | 有 | 有 | — | 合格 | reports/teachers/route.ts:L10；getCurrentUser；角色校验 L12；内联角色/归属校验（已人工复核） |
| `src/app/api/reports/volunteer-stats/route.ts` GET | 有 | 有 | — | 残缺 | reports/volunteer-stats/route.ts:L8；getCurrentUser；角色校验 L10；教师可读志愿者日志聚合计数，未按本人裁剪（聚合，低敏） |
| `src/app/api/rooms/route.ts` GET | 有 | 无 | — | 合格 | rooms/route.ts:L8；auth(；内联角色/归属校验（已人工复核） |
| `src/app/api/rooms/route.ts` POST | 有 | 有 | — | 合格 | rooms/route.ts:L17；auth(；角色校验 L22 |
| `src/app/api/rooms/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | rooms/[id]/route.ts:L9；auth(；角色校验 L12 |
| `src/app/api/rooms/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | rooms/[id]/route.ts:L27；auth(；角色校验 L30 |
| `src/app/api/schedules/route.ts` POST | 有 | 有 | — | 合格 | schedules/route.ts:L24；auth(；角色校验 L27 |
| `src/app/api/schedules/check-conflict/route.ts` GET | 有 | 无 | — | 残缺 | schedules/check-conflict/route.ts:L9；getCurrentUser；仅登录即可探测任意教师排课冲突（低敏） |
| `src/app/api/schedules/daily/route.ts` GET | 有 | 无 | — | 残缺 | schedules/daily/route.ts:L15；getCurrentUser；门2/门3 未按角色裁剪：家长/教师可读当天全部课次及学员名单 |
| `src/app/api/schedules/one-on-one/route.ts` POST | 有 | 有 | — | 合格 | schedules/one-on-one/route.ts:L15；getCurrentUser；角色校验 L18 |
| `src/app/api/schedules/overview/route.ts` GET | 有 | 无 | — | 残缺 | schedules/overview/route.ts:L14；getCurrentUser；仅登录即返回跨角色聚合计数（低敏） |
| `src/app/api/schedules/teacher-week/route.ts` GET | 有 | 无 | — | 残缺 | schedules/teacher-week/route.ts:L11；getCurrentUser；门3 IDOR：teacherId 参数未校验是否本人，非 admin 可读任意教师周课次 |
| `src/app/api/schedules/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | schedules/[id]/route.ts:L18；getCurrentUser；角色校验 L21 |
| `src/app/api/schedules/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | schedules/[id]/route.ts:L342；getCurrentUser；角色校验 L344 |
| `src/app/api/settings/route.ts` GET | 有 | 无 | — | 残缺 | settings/route.ts:L10；getCurrentUser；仅登录即读取系统配置，未做角色收口（低敏） |
| `src/app/api/settings/route.ts` PATCH | 有 | 有 | — | 合格 | settings/route.ts:L24；getCurrentUser；角色校验 L29 |
| `src/app/api/settings/accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/accounts/route.ts:L106；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` POST | 有 | 有 | — | 合格 | settings/accounts/route.ts:L219；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` PATCH | 有 | 有 | — | 合格 | settings/accounts/route.ts:L358；角色校验 L430,L456,L477；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/accounts/route.ts` DELETE | 有 | 有 | — | 合格 | settings/accounts/route.ts:L500；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/admins/route.ts` GET | 有 | 有 | — | 合格 | settings/admins/route.ts:L20；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/admins/route.ts` POST | 有 | 有 | — | 合格 | settings/admins/route.ts:L43；requireSuperAdmin；角色校验 L45 |
| `src/app/api/settings/backup/create/route.ts` POST | 有 | 有 | — | 合格 | settings/backup/create/route.ts:L8；getCurrentUser；角色校验 L11 |
| `src/app/api/settings/export/finance/route.ts` GET | 有 | 有 | — | 合格 | settings/export/finance/route.ts:L13；requireAdminUser；角色校验 L14 |
| `src/app/api/settings/export/students/route.ts` GET | 有 | 有 | — | 合格 | settings/export/students/route.ts:L13；requireAdminUser；角色校验 L14 |
| `src/app/api/settings/fee-types/route.ts` GET | 有 | 无 | — | 合格 | settings/fee-types/route.ts:L8；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/fee-types/route.ts` POST | 有 | 有 | — | 合格 | settings/fee-types/route.ts:L17；getCurrentUser；角色校验 L20 |
| `src/app/api/settings/fee-types/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | settings/fee-types/[id]/route.ts:L8；getCurrentUser；角色校验 L14 |
| `src/app/api/settings/fee-types/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | settings/fee-types/[id]/route.ts:L22；getCurrentUser；角色校验 L28 |
| `src/app/api/settings/logs/route.ts` GET | 有 | 有 | — | 合格 | settings/logs/route.ts:L8；getCurrentUser；角色校验 L11 |
| `src/app/api/settings/notify/route.ts` GET | 有 | 有 | — | 合格 | settings/notify/route.ts:L8；getCurrentUser；角色校验 L12 |
| `src/app/api/settings/notify/route.ts` PATCH | 有 | 有 | — | 合格 | settings/notify/route.ts:L22；getCurrentUser；角色校验 L26 |
| `src/app/api/settings/parent-accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/parent-accounts/route.ts:L14；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/settings/roles/route.ts` GET | 有 | 有 | — | 合格 | settings/roles/route.ts:L8；getCurrentUser；角色校验 L12 |
| `src/app/api/settings/roles/route.ts` PATCH | 有 | 有 | — | 合格 | settings/roles/route.ts:L22；getCurrentUser；角色校验 L26 |
| `src/app/api/settings/schedule-periods/route.ts` GET | 有 | 无 | — | 合格 | settings/schedule-periods/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/schedule-periods/route.ts` PUT | 有 | 有 | — | 合格 | settings/schedule-periods/route.ts:L17；getCurrentUser；角色校验 L20 |
| `src/app/api/settings/subjects/route.ts` GET | 有 | 无 | — | 合格 | settings/subjects/route.ts:L10；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/settings/subjects/route.ts` POST | 有 | 有 | — | 合格 | settings/subjects/route.ts:L24；getCurrentUser；角色校验 L27 |
| `src/app/api/settings/subjects/reorder/route.ts` PATCH | 有 | 有 | — | 合格 | settings/subjects/reorder/route.ts:L9；auth(；角色校验 L14 |
| `src/app/api/settings/subjects/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | settings/subjects/[id]/route.ts:L10；getCurrentUser；角色校验 L16 |
| `src/app/api/settings/subjects/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | settings/subjects/[id]/route.ts:L49；getCurrentUser；角色校验 L55 |
| `src/app/api/settings/teacher-accounts/route.ts` GET | 有 | 有 | — | 合格 | settings/teacher-accounts/route.ts:L14；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/setup/route.ts` GET | — | — | — | 合格 | setup/route.ts:L18；生产环境禁用 + token 校验 |
| `src/app/api/students/route.ts` GET | 有 | 有 | — | 合格 | students/route.ts:L43；auth(；角色校验 L50 |
| `src/app/api/students/route.ts` POST | 有 | 有 | — | 合格 | students/route.ts:L280；auth(；角色校验 L288 |
| `src/app/api/students/grade-counts/route.ts` GET | 有 | 无 | — | 残缺 | students/grade-counts/route.ts:L10；auth(；仅登录即返回各年级人数聚合（低敏） |
| `src/app/api/students/[id]/route.ts` GET | 有 | 有 | — | 合格 | students/[id]/route.ts:L17；getCurrentUser；角色校验 L68 |
| `src/app/api/students/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | students/[id]/route.ts:L189；auth(；角色校验 L193 |
| `src/app/api/students/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | students/[id]/route.ts:L261；auth(；角色校验 L266 |
| `src/app/api/students/[id]/link-parent/route.ts` POST | 有 | 有 | — | 合格 | students/[id]/link-parent/route.ts:L12；auth(；角色校验 L19,L72 |
| `src/app/api/students/[id]/link-parent/route.ts` DELETE | 有 | 有 | — | 合格 | students/[id]/link-parent/route.ts:L132；auth(；角色校验 L139 |
| `src/app/api/students/[id]/parent/route.ts` POST | 有 | 有 | — | 合格 | students/[id]/parent/route.ts:L9；auth(；角色校验 L18,L32 |
| `src/app/api/students/[id]/status/route.ts` PATCH | 有 | 有 | — | 合格 | students/[id]/status/route.ts:L15；auth(；角色校验 L19 |
| `src/app/api/study-hall/route.ts` GET | 有 | 有 | — | 合格 | study-hall/route.ts:L109；requireAuthenticatedUser；角色校验 L111 |
| `src/app/api/study-hall/route.ts` POST | 有 | 有 | — | 合格 | study-hall/route.ts:L168；requireAuthenticatedUser；角色校验 L170 |
| `src/app/api/study-hall/route.ts` PUT | 有 | 有 | — | 合格 | study-hall/route.ts:L192；requireAuthenticatedUser；角色校验 L194 |
| `src/app/api/study-hall/route.ts` PATCH | 有 | 有 | — | 合格 | study-hall/route.ts:L224；requireAuthenticatedUser；角色校验 L226 |
| `src/app/api/study-hall/closures/route.ts` POST | 有 | 有 | — | 合格 | study-hall/closures/route.ts:L9；requireAuthenticatedUser；角色校验 L11 |
| `src/app/api/study-hall/closures/route.ts` DELETE | 有 | 有 | — | 合格 | study-hall/closures/route.ts:L59；requireAuthenticatedUser；角色校验 L61 |
| `src/app/api/teacher/ai-feedback/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/ai-feedback/route.ts:L359；requireCurrentTeacher；角色校验 L360；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/ai-feedback/article/route.ts` POST | 有 | 有 | — | 合格 | teacher/ai-feedback/article/route.ts:L16；requireCurrentTeacher；角色校验 L17 |
| `src/app/api/teacher/ai-feedback/chat/route.ts` POST | 有 | 有 | — | 合格 | teacher/ai-feedback/chat/route.ts:L36；requireCurrentTeacher；角色校验 L39 |
| `src/app/api/teacher/attendance/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/attendance/route.ts:L28；requireCurrentTeacher；角色校验 L30；归属 teacherLessonScopeWhere,visibleStudentWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/attendance/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/attendance/route.ts:L210；auth(,getCurrentUser,requireCurrentTeacher；角色校验 L271；归属 teacherLessonScopeWhere,visibleClassGroupWhere,visibleStudentWhere |
| `src/app/api/teacher/benefits/route.ts` GET | 有 | 有 | — | 合格 | teacher/benefits/route.ts:L9；requireCurrentTeacher；角色校验 L11 |
| `src/app/api/teacher/classroom-feedback/route.ts` GET | 有 | 有 | — | 合格 | teacher/classroom-feedback/route.ts:L49；requireCurrentTeacher；角色校验 L50 |
| `src/app/api/teacher/classroom-feedback/route.ts` POST | 有 | 有 | — | 合格 | teacher/classroom-feedback/route.ts:L64；requireCurrentTeacher；角色校验 L67 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` GET | — | — | — | 残缺 | teacher/classroom-feedback/single-session/route.ts:L66；toStudentOptions 列出本学部全部学生（家长姓名/电话尾号），未限本人授课学生 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` POST | 有 | 有 | — | 合格 | teacher/classroom-feedback/single-session/route.ts:L92；requireCurrentTeacher；角色校验 L93 |
| `src/app/api/teacher/classroom-feedback/single-session/route.ts` PATCH | 有 | 有 | 有 | 合格 | teacher/classroom-feedback/single-session/route.ts:L190；归属 visibleStudentWhere；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/classroom-feedback/today-status/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/classroom-feedback/today-status/route.ts:L12；requireCurrentTeacher；角色校验 L13；归属 teacherLessonWhere,visibleStudentWhere |
| `src/app/api/teacher/classroom-feedback/[id]/route.ts` GET | 有 | 有 | — | 合格 | teacher/classroom-feedback/[id]/route.ts:L8；requireCurrentTeacher；角色校验 L13 |
| `src/app/api/teacher/dashboard/route.ts` GET | 有 | 有 | — | 合格 | teacher/dashboard/route.ts:L8；requireCurrentTeacher；角色校验 L10 |
| `src/app/api/teacher/dashboard/route.ts` POST | 有 | 有 | — | 合格 | teacher/dashboard/route.ts:L30；requireCurrentTeacher；角色校验 L32 |
| `src/app/api/teacher/feedback-context/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/feedback-context/route.ts:L17；requireCurrentTeacher；角色校验 L18；归属 teacherLessonScopeWhere,teacherStudentWhere,visibleStudentWhere |
| `src/app/api/teacher/feedback-draft/route.ts` GET | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L79；requireCurrentTeacher；角色校验 L80 |
| `src/app/api/teacher/feedback-draft/route.ts` PUT | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L92；requireCurrentTeacher；角色校验 L93 |
| `src/app/api/teacher/feedback-draft/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/feedback-draft/route.ts:L117；requireCurrentTeacher；角色校验 L118 |
| `src/app/api/teacher/intensive-lessons/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/intensive-lessons/route.ts:L28；requireCurrentTeacher；角色校验 L29；归属 visibleStudentWhere |
| `src/app/api/teacher/intensive-lessons/route.ts` POST | 有 | 有 | — | 合格 | teacher/intensive-lessons/route.ts:L261；requireCurrentTeacher；角色校验 L262 |
| `src/app/api/teacher/intensive-lessons/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/intensive-lessons/[id]/route.ts:L47；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/intensive-lessons/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/intensive-lessons/[id]/route.ts:L152；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/learning-goals/route.ts` GET | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L13；requireCurrentTeacher；角色校验 L14 |
| `src/app/api/teacher/learning-goals/route.ts` POST | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L27；requireCurrentTeacher；角色校验 L28 |
| `src/app/api/teacher/learning-goals/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L62；requireCurrentTeacher；角色校验 L63 |
| `src/app/api/teacher/learning-goals/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/learning-goals/route.ts:L100；requireCurrentTeacher；角色校验 L101 |
| `src/app/api/teacher/lessons/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/lessons/route.ts:L10；requireCurrentTeacher；角色校验 L11；归属 teacherLessonScopeWhere,visibleStudentWhere |
| `src/app/api/teacher/materials/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/materials/route.ts:L20；requireCurrentTeacher；角色校验 L21；归属 teacherVisibleMaterialWhere；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/materials/route.ts` POST | 有 | 有 | — | 合格 | teacher/materials/route.ts:L46；requireCurrentTeacher；角色校验 L47 |
| `src/app/api/teacher/materials/lesson-previews/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/materials/lesson-previews/route.ts:L20；requireCurrentTeacher；角色校验 L21；归属 teacherLessonWhere,visibleStudentWhere |
| `src/app/api/teacher/materials/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/materials/[id]/route.ts:L20；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/materials/[id]/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/materials/[id]/route.ts:L42；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/messages/route.ts` GET | 有 | 有 | — | 合格 | teacher/messages/route.ts:L7；requireCurrentTeacher；角色校验 L8；内联角色/归属校验（已人工复核） |
| `src/app/api/teacher/messages/[id]/read/route.ts` POST | 有 | 有 | — | 合格 | teacher/messages/[id]/read/route.ts:L7；requireCurrentTeacher；角色校验 L8 |
| `src/app/api/teacher/papers/route.ts` GET | 有 | 有 | — | 合格 | teacher/papers/route.ts:L18；requireCurrentTeacher；角色校验 L19 |
| `src/app/api/teacher/papers/route.ts` POST | 有 | 有 | 有 | 合格 | teacher/papers/route.ts:L30；requireCurrentTeacher；角色校验 L31；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/performance-posts/route.ts` GET | 有 | 有 | — | 合格 | teacher/performance-posts/route.ts:L9；requireCurrentTeacher；角色校验 L10 |
| `src/app/api/teacher/performance-posts/route.ts` POST | 有 | 有 | — | 合格 | teacher/performance-posts/route.ts:L27；本地 requireAdmin/守卫包装（见行号） |
| `src/app/api/teacher/salary/route.ts` GET | 有 | 有 | — | 合格 | teacher/salary/route.ts:L10；requireCurrentTeacher；角色校验 L11 |
| `src/app/api/teacher/schedule/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/schedule/route.ts:L10；requireCurrentTeacher；角色校验 L11；归属 teacherLessonScopeWhere |
| `src/app/api/teacher/stage-summary/route.ts` GET | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L52；requireCurrentTeacher；角色校验 L53 |
| `src/app/api/teacher/stage-summary/route.ts` POST | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L80；requireCurrentTeacher；角色校验 L81 |
| `src/app/api/teacher/stage-summary/route.ts` PATCH | 有 | 有 | — | 合格 | teacher/stage-summary/route.ts:L145；requireCurrentTeacher；角色校验 L146 |
| `src/app/api/teacher/stats/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/stats/route.ts:L8；requireCurrentTeacher；角色校验 L9；归属 teacherLessonScopeWhere,teacherStudentWhere |
| `src/app/api/teacher/students/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/students/route.ts:L11；requireCurrentTeacher；角色校验 L12；归属 teacherLessonScopeWhere,teacherStudentWhere |
| `src/app/api/teacher/students/[id]/context/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/students/[id]/context/route.ts:L8；requireCurrentTeacher；角色校验 L10；归属 assertTeacherOwnsStudent |
| `src/app/api/teacher/trends/route.ts` GET | 有 | 有 | 有 | 合格 | teacher/trends/route.ts:L16；requireCurrentTeacher；角色校验 L17；归属 teacherLessonScopeWhere |
| `src/app/api/teacher/weaknesses/route.ts` GET | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L11；requireCurrentTeacher；角色校验 L12 |
| `src/app/api/teacher/weaknesses/route.ts` POST | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L26；requireCurrentTeacher；角色校验 L27 |
| `src/app/api/teacher/weaknesses/route.ts` DELETE | 有 | 有 | — | 合格 | teacher/weaknesses/route.ts:L129；requireCurrentTeacher；角色校验 L130 |
| `src/app/api/teacher-logs/route.ts` GET | 有 | 有 | — | 合格 | teacher-logs/route.ts:L20；requireAdminUser；角色校验 L22 |
| `src/app/api/teacher-logs/alerts/route.ts` GET | 有 | 有 | — | 合格 | teacher-logs/alerts/route.ts:L9；getCurrentUser；角色校验 L11 |
| `src/app/api/teacher-logs/alerts/route.ts` POST | 有 | 有 | — | 合格 | teacher-logs/alerts/route.ts:L24；getCurrentUser；角色校验 L26 |
| `src/app/api/teacher-logs/check-alerts/route.ts` POST | 有 | 有 | — | 合格 | teacher-logs/check-alerts/route.ts:L8；requireAdminUser；角色校验 L10 |
| `src/app/api/teacher-logs/[teacherId]/route.ts` GET | 有 | 有 | 有 | 合格 | teacher-logs/[teacherId]/route.ts:L9；requireAdminUser；角色校验 L11；归属 teacherLessonScopeWhere |
| `src/app/api/teacher-photos/route.ts` GET | 有 | 无 | — | 合格 | teacher-photos/route.ts:L9；getCurrentUser；内联角色/归属校验（已人工复核） |
| `src/app/api/teachers/route.ts` GET | 有 | 无 | — | 残缺 | teachers/route.ts:L17；auth(；门2 无角色校验；L68 未做字段裁剪，L145 `...teacher` 全量返回 phone/email/学历 |
| `src/app/api/teachers/route.ts` POST | 有 | 有 | — | 合格 | teachers/route.ts:L161；auth(；角色校验 L168 |
| `src/app/api/teachers/options/route.ts` GET | 有 | 有 | — | 合格 | teachers/options/route.ts:L8；requireAdminUser；角色校验 L10 |
| `src/app/api/teachers/stats/route.ts` GET | 有 | 无 | — | 残缺 | teachers/stats/route.ts:L8；auth(；仅登录即返回教师数量/均分等跨角色聚合（低敏） |
| `src/app/api/teachers/[id]/route.ts` GET | 有 | 有 | — | 合格 | teachers/[id]/route.ts:L54；角色校验 L58（内联 admin 判断） |
| `src/app/api/teachers/[id]/route.ts` PATCH | 有 | 有 | — | 合格 | teachers/[id]/route.ts:L140；角色校验 L144（内联 admin 判断） |
| `src/app/api/teachers/[id]/route.ts` DELETE | — | — | — | 裸奔 | teachers/[id]/route.ts:L189；仅 requireSession，无角色/归属校验（对照 GET L58、PATCH L144 有 admin 校验） |
| `src/app/api/uploads/sign/route.ts` POST | 有 | 无 | — | 合格 | uploads/sign/route.ts:L22；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/uploads/[filename]/route.ts` GET | 有 | 无 | — | 合格 | uploads/[filename]/route.ts:L63；requireAuthenticatedUser；内联角色/归属校验（已人工复核） |
| `src/app/api/users/[id]/status/route.ts` PATCH | 有 | 有 | — | 合格 | users/[id]/status/route.ts:L10；requireAdminUser；角色校验 L14 |

## 2. 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
|---|---|---|---|---|---|
| B-1 | 注销教师接口 DELETE 仅校验会话、无角色判断，教师/家长账号可注销任意教师并转移课程学员 | ② 完全缺失 | 高（破坏性写操作 + 业务数据转移） | 小 | 立刻 |
| B-2 | `teachers` 列表接口仅校验登录，无角色判断且未做字段裁剪，全量返回教师 phone/email/学历/合同结束日期 | ② 完全缺失 | 中（教师通讯录与隐私字段泄露） | 小 | 近期 |
| B-3 | `highlights` 列表仅校验登录，未按角色/归属收窄，可按 studentId/groupId 遍历全部学员亮点 | ② 完全缺失 | 中（跨学员隐私内容泄露） | 小 | 近期 |
| B-4 | `schedules/teacher-week` 教师周课次接口：teacherId 参数未校验是否本人，非 admin 可读任意教师周课次与学员名单 | ② 完全缺失 | 中（跨教师 IDOR） | 小 | 近期 |
| B-5 | `schedules/daily` 当日课次接口未按角色裁剪，家长/教师可读当天全部课次及 enrollment 学员 id 名单、教师名 | ② 完全缺失 | 中（跨角色名单泄露） | 小 | 近期 |
| B-6 | 试卷评论接口不校验归属：教师不核 paper.teacherId、家长不核 paper.studentId，可对任意试卷留言 | ① 已具备但不完善 | 低-中（越权留言 + 可遍历试卷） | 小 | 近期 |
| B-7 | 试卷反应（点赞/表情）接口无归属校验，任意登录用户可对任意试卷操作反应 | ① 已具备但不完善 | 低 | 小 | 长期 |
| B-8 | 学员徽章接口教师分支 where 未带教师/学生归属，可按 studentId 读任意学员徽章 | ① 已具备但不完善 | 低 | 小 | 近期 |
| B-9 | 教师端聚合报表（paper-stats / parent-engagement / volunteer-stats）允许教师读取本学部全库聚合，未按本人教师裁剪 | ① 已具备但不完善 | 低（聚合值，无 PII） | 中 | 长期 |
| B-10 | 单次课反馈学生检索 `toStudentOptions` 列出本学部全部学生（含家长姓名/电话尾号），未限定本人授课学生 | ① 已具备但不完善 | 低-中（跨学员档案预览） | 中 | 近期 |
| B-11 | 一组只读探测类接口（overview / check-conflict / 冲突批量 / teachers-stats / grade-counts / courses 目录）仅校验登录即可跨角色读取 | ① 已具备但不完善 | 低（聚合/目录信息） | 小 | 长期 |
| B-12 | 家长沟通通知已读/删除标记 `userId` 错写成操作者本人 id，条件永不命中（逻辑缺陷，非越权） | ① 已具备但不完善 | 低（功能失效） | 小 | 近期 |
| B-13 | `settings` GET 向所有登录角色返回系统配置全量行（组织信息、作息时段、权益文案） | ① 已具备但不完善 | 低 | 小 | 长期 |
| B-14 | `materials/oss-signature` GET 未校验会话即返回 OSS 是否启用（布尔） | ① 已具备但不完善 | 低（配置探测） | 小 | 长期 |
| B-15 | 大量路由裸用 `auth()` 或本地 `requireAdmin()`，会话吊销/停用校验完全依赖 proxy 兜底；proxy 读操作存在 fail-open 窗口 | ③ 架构运维层 | 中（兜底失效时会话吊销不生效） | 中 | 近期 |
| B-16 | `api-rate-limit.ts` 为 156 字节空壳，范围内写/导出接口未接入限流 | ③ 架构运维层 | 低-中（枚举/爬取无节流） | 中 | 长期 |
| B-17 | cron 接口 Bearer token 走 URL query string，且 archive/retry 同时接受 CRON_SECRET 与 HEALTH_TOKEN，易进访问日志 | ③ 架构运维层 | 低-中（凭据泄露面） | 小 | 长期 |
| B-18 | Prisma raw SQL 盘点：全部参数化模板绑定，未发现 Unsafe 拼接 SQL（合格项，归档备查） | ③ 架构运维层 | — | — | 长期 |

## 3. ② 完全缺失

### B-1 注销教师接口缺角色校验（破坏性写操作裸奔）

- **证据**：`src/app/api/teachers/[id]/route.ts:189-191`
  ```ts
  export const DELETE = apiHandler(async (req, { params }) => {
    const session = await requireSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // 此处之后无任何 role === 'admin' 判断
  ```
  同文件对照：`GET` L57-58 有 `if (role !== 'admin') return 403`；`PATCH` L143-144 同样有 admin 判断；**唯独 DELETE 漏掉**。
  后续逻辑 L198-220 按 `id` 直接 `teacher.findUnique`，L225 起按 `transferTo` 转移课程/课次/学员归属，并删除作品、试卷、反馈等关联数据（全文 L225-320）。
- **危害**：任意已登录账号（教师或家长）构造 `DELETE /api/teachers/{id}?transferTo=...` 即可注销一名教师、把其名下课程与学员转移给他人，并级联清理其作品/试卷/反馈，属于破坏性越权写操作。
- **利用前置条件**：一个有效登录态（教师或家长账号即可，无需 admin）；知道或可枚举目标教师 `id`（CUID，可由 B-2 的列表接口批量获取）。
- **修复方案**：在 `teachers/[id]/route.ts` DELETE 开头补 `if ((session.user as {role?:string}).role !== 'admin') return NextResponse.json({error:'无权限'},{status:403})`，与 GET/PATCH 对齐；建议复用 `requireAdminUser()`；同时补目标教师与操作者学部一致性校验（L204 仅取 session.division，未校验 `teacher.division`）。
- **工作量**：小。**优先级**：立刻。

### B-2 教师列表全字段泄露（无角色校验 + 无字段裁剪）

- **证据**：`src/app/api/teachers/route.ts:17-19` 仅 `auth()` 判登录，无角色判断；L68 `prisma.teacher.findMany({ where: { id: { in: pageTeacherIds } } })` **未指定 select 字段**；L144-145 `teachers.map((teacher) => ({ ...teacher, _count: ... }))` 全量展开返回。Teacher 模型含 `phone`(schema.prisma:136)、`email`(137)、`contractEnd`(144)、`education`(145)、`university`(146)、`major`(147) 等隐私字段。
- **危害**：家长或教师账号翻页调用 `GET /api/teachers?q=&page=&limit=` 即可导出本学部全部教师的手机号、邮箱、学历、毕业院校、专业、合同结束日期等隐私字段，并附带带班人数/课次统计。
- **利用前置条件**：任意有效登录态；无需特殊角色。
- **修复方案**：L17 后补角色判断（admin 全量；teacher/parent 仅返回公开展示字段）；L68 查询按角色 `select` 裁剪，家长/教师视角剔除 phone/email/education/university/major/contractEnd；列表页若只需要公开信息，默认走精简 select。
- **工作量**：小。**优先级**：近期。

### B-3 学员亮点跨角色遍历（无归属校验）

- **证据**：`src/app/api/highlights/route.ts:7-23`
  ```ts
  const user = await getCurrentUser()
  if (!user) return 401
  const where: Record<string, unknown> = {}
  if (studentId) where.studentId = studentId
  if (groupId) where.groupId = groupId
  if (user.role === 'admin') { where.student = { division } }   // 非 admin 分支无任何收窄
  ```
  L25-33 `findMany` 返回学员姓名、教师姓名、亮点内容。
- **危害**：教师/家长账号可遍历全部学员亮点卡片；按 `studentId` 可逐个探测任意学员的课堂亮点内容，形成跨学员隐私泄露。
- **利用前置条件**：任意有效登录态；可枚举/猜测 studentId（B-2 类列表接口可能附带 id）。
- **修复方案**：非 admin 分支补归属 where——教师按 `teacherId: user.teacherId` 或已授课程次收窄；家长按 `student.parentUserId / parentId` 收窄；与 `class-groups/route.ts:82-101` 的角色过滤写法对齐。
- **工作量**：小。**优先级**：近期。

### B-4 教师周课次跨教师 IDOR

- **证据**：`src/app/api/schedules/teacher-week/route.ts:11` `getCurrentUser()` 仅判登录；L17 读取 `teacherId` 查询参数；L37-49 where 子句直接按该 `teacherId` 过滤，**没有 `user.role === 'admin' || user.teacherId === teacherId` 之类的本人校验**。返回内容含课次学员 id 名单、课程、教室、时间。
- **危害**：非 admin 用户传入任意 `teacherId`，即可读取该教师整周课表与上课学员名单。
- **利用前置条件**：任意有效登录态；需目标教师 id（可枚举或经其他列表获得）。
- **修复方案**：where 构造前判断：`const isAdmin = user.role === 'admin'`；非 admin 强制 `teacherId = user.teacherId`，传入他人 id 时返回 403。
- **工作量**：小。**优先级**：近期。

### B-5 当日课次名单全量可见（未按角色裁剪）

- **证据**：`src/app/api/schedules/daily/route.ts:15-17` `getCurrentUser()` 仅判登录；L30-55 where 只按学部/日期/课型过滤，无 admin/teacher/parent 分支；返回的课次 include enrollment 学员 id 名单与教师信息。对照 `attendance/today/route.ts:18-55` 同口径数据是按 admin/teacher/parent 三分支收窄的。
- **危害**：家长或教师可读取当日本学部全部班课的学员名单与教师安排，突破其可见范围。
- **利用前置条件**：任意有效登录态；调整 `date` 查询参数可遍历历史/未来日期。
- **修复方案**：参照 `attendance/today` 增加角色分支：admin 全量；教师按授课教师/带课分组收窄；家长仅保留自家学员所在课次；未匹配角色返回 403。
- **工作量**：小。**优先级**：近期。

## 4. ① 已具备但不完善

### B-6 试卷评论不校验对象归属

- **证据**：`src/app/api/exam-papers/[id]/comment/route.ts:9-24`，`getCurrentUser()` 后直接 `examPaper.findUnique({ where: { id } })` 并创建评论；教师分支未核对 `paper.teacherId === teacher.id`，家长分支未核对 `paper.studentId` 属于自家孩子。对照 `performance/[id]/comment/route.ts:23-28` 评论前先 `findFirst` 做归属匹配。
- **危害**：教师可对其他教师试卷留言，家长可对其他学员试卷留言；结合试卷详情接口可遍历他人试卷并评论。
- **利用前置条件**：任意有效登录态；试卷 `id`。
- **修复方案**：创建评论前复用 `assertCanAccessStudent` / 教师授课关系校验，归属不符返回 403；评论作者角色与试卷归属在事务内二次核对。
- **工作量**：小。**优先级**：近期。

### B-7 试卷反应（点赞/表情）无归属校验

- **证据**：`src/app/api/exam-papers/[id]/react/route.ts:8-25`，`getCurrentUser()` 后按 `paperId` 直接 toggle reaction，无试卷归属核对。
- **危害**：任意登录用户可对任意试卷增加/取消反应，污染点赞数据；反应记录挂在当前用户名下，越权读取面有限。
- **利用前置条件**：任意有效登录态；试卷 `id`。
- **修复方案**：与 B-6 共用归属校验；至少限制 reaction 仅在本人可见试卷上可用。
- **工作量**：小。**优先级**：长期。

### B-8 学员徽章跨教师读取

- **证据**：`src/app/api/performance/badges/route.ts:19-30`，parent 分支核对了 `parentId/parentUserId`；L25 放行 admin/teacher 后，L29-30 `where: { studentId }` **未带 teacherId 或授课关系条件**。
- **危害**：教师传入任意 `studentId` 即可读取该学员的获奖徽章列表与授牌教师姓名。
- **利用前置条件**：教师登录态；目标学员 `id`。
- **修复方案**：教师分支补 `assertTeacherOwnsStudent(teacher.id, studentId, prisma)` 或在 where 中叠加授课分组/课次关系。
- **工作量**：小。**优先级**：近期。

### B-9 教师端聚合报表未按本人教师裁剪

- **证据**：
  - `reports/paper-stats/route.ts:11-49`：L13 放行 admin/teacher，但 L35-48 各 count/groupBy 只按 `termId/status` 过滤，无 `teacherId` 条件。
  - `reports/parent-engagement/route.ts:11-39`：L13 放行 admin/teacher，L33-38 全库聚合，无教师条件。
  - `reports/volunteer-stats/route.ts:8-26`：L10 放行 admin/teacher，L22-25 全库计数。
- **危害**：教师可看到本学部全库试卷量、掌握率、薄弱知识点、互动率、志愿者咨询量等跨班聚合指标。返回为聚合数值、无 PII，危害偏低。
- **利用前置条件**：教师登录态。
- **修复方案**：教师分支在各 count/groupBy 的 where 叠加 `teacherId`（或授课分组关系）；admin 保留全库口径。
- **工作量**：中。**优先级**：长期。

### B-10 单次课反馈学生检索未限本人授课学生

- **证据**：`src/app/api/teacher/classroom-feedback/single-session/route.ts:23-41` `toStudentOptions` 按学部 + 家长绑定关系检索学生（含家长姓名、电话尾号），L93 `requireSingleSessionActor` 后直接使用；未限定该教师本人授课/带过课的学生范围。
- **危害**：教师在单次课反馈的学生下拉中可检索到本学部其他学生档案（姓名、年级、家长姓名、电话尾号）。
- **利用前置条件**：教师登录态；姓名关键字模糊检索。
- **修复方案**：`toStudentOptions` 增加教师授课关系过滤（本人授课分组/课次在册学生）；手动填写姓名路径不回显档案；电话尾号在非 admin 视角进一步脱敏。
- **工作量**：中。**优先级**：近期。

### B-11 只读探测类接口仅登录即可跨角色读取

- **证据**（均为 `getCurrentUser()` / `auth()` 判登录后无角色分支）：
  - `schedules/overview/route.ts:14-21`：今日/本周课次、教室、教师、在读分组计数。
  - `schedules/check-conflict/route.ts:9-24`：按 teacherId/日期探测排课冲突及冲突明细。
  - `class-groups/check-teacher-conflict/route.ts:9-20`、`class-groups/check-teacher-conflict/batch/route.ts:11`：批量探测教师排课冲突。
  - `teachers/stats/route.ts:8`：教师数量、均分等统计。
  - `students/grade-counts/route.ts:10`：各年级人数计数。
  - `courses/route.ts:9-21`：活跃课程目录（含教师姓名）。
- **危害**：低敏聚合/目录信息可被家长或教师跨角色拉取；冲突探测可间接推断其他教师排课安排。
- **利用前置条件**：任意有效登录态。
- **修复方案**：区分只读目录（课程/教师公开名片可对登录用户开放）与内部统计（概览、冲突探测、人数/均分统计），后者收口为 admin/teacher 且教师按本人范围；目录类接口补字段裁剪。
- **工作量**：小。**优先级**：长期。

### B-12 通知已读/删除标记 userId 错用操作者本人（逻辑缺陷）

- **证据**：`src/app/api/parent-communications/route.ts:366`、L385、L406
  ```ts
  where: { id: item.id, userId: user.id, user: { division: user.division }, status: 'ACTIVE', read: false }
  ```
  这三处是对**目标家长**的通知做已读/删除标记，`userId` 应为通知接收家长的账号 id，代码写成了操作者（admin）本人 id，`updateMany` 条件永不命中。
- **危害**：管理端代家长标记已读/删除实际不生效；非越权漏洞，但会造成通知状态与前端展示不一致。
- **利用前置条件**：不涉及利用；属功能缺陷。
- **修复方案**：三处 where 改为按通知记录自身 `userId`（或先查出通知的接收人 id 再更新），不要用 `user.id`。
- **工作量**：小。**优先级**：近期。

### B-13 settings GET 向所有角色返回系统配置全量行

- **证据**：`src/app/api/settings/route.ts:10-20`，`getCurrentUser()` 判登录后 `systemConfig.findUnique` 全字段返回（组织名称、电话、地址、作息时段 `schedulePeriods`、权益文案等；schema.prisma:1389-1402，模型内未见密钥字段）。
- **危害**：低敏；主要是内部作息配置与经营文案对家长/教师可见。
- **利用前置条件**：任意有效登录态。
- **修复方案**：按角色返回子集（公开信息 vs 内部配置），`schedulePeriods`、内部权益文案仅 admin/teacher 可见。
- **工作量**：小。**优先级**：长期。

### B-14 OSS 开关探测接口未鉴权

- **证据**：`src/app/api/materials/oss-signature/route.ts:11-13` GET 直接返回 `{ enabled: isOssEnabled() }`，无会话校验；同文件 POST L20-24 有 admin 校验。
- **危害**：未登录即可探测文件存储后端是否为 OSS（辅助攻击者判断上传链路）；仅布尔值，危害低。
- **利用前置条件**：无（接口在 proxy 对未登录 API 返回 401 的前提下，仍属应在 handler 内收口的接口；待 TB-1 确认 proxy 覆盖）。
- **修复方案**：GET 复用 POST 的 admin/教师角色校验，或改为静态配置常量前端读取。
- **工作量**：小。**优先级**：长期。

## 5. ③ 架构性 / 运维层问题

### B-15 会话吊销校验过度依赖 proxy 兜底，且读操作存在 fail-open 窗口

- **证据**：
  - 范围内大量管理端路由使用裸 `auth()`（如 `admin/teacher-messages/route.ts:7`、`meals/menu/route.ts:2`、`rooms/route.ts:2`、`messages/[id]/route.ts:3` 等）或本地 `requireAdmin()` 包装（`admin/meal-templates/route.ts:12`、`parent-communications/route.ts:12`、`meals/menu/[id]/route.ts:6`、`settings/accounts/route.ts:105` 等），handler 自身**不查库**校验 `currentSessionToken` 与停用状态。
  - 兜底在 `src/proxy.ts:125-156`；L157-168 读库异常时，读操作在失败计数 < 3 时放行（fail-open）。
  - 对照 `getCurrentUser()`（`get-user.ts:17-25`）是查库 fail-closed 的；走裸 `auth()` 的路由在 proxy 失效/被绕过/matcher 漏配时，停用账号、被踢下线会话仍可能进入 handler。
- **危害**：兜底链路单点；一旦 proxy 缓存、DB 抖动或 matcher 漏配，已停用/已吊销会话在窗口期内可访问 API。
- **修复方案**：统一收敛到 `requireAdminUser / requireTeacherUser / getCurrentUser` 这类查库 fail-closed 守卫；本地 `requireAdmin()` 包装改为复用 `guards.ts`；评估把 proxy 读操作的 fail-open 改为 fail-closed（或仅对静态资源放行）。
- **工作量**：中。**优先级**：近期。

### B-16 限流空壳，写/导出接口未接入节流

- **证据**：`src/lib/api-rate-limit.ts` 仅 156 字节（空壳）；范围内路由 grep 未发现调用 `api-rate-limit`。`src/lib/rate-limit.ts` 仅登录接口使用；`teacher-ai-rate-limit.ts` 仅 AI 助手使用。管理端写操作、报表导出、批量名单接口无速率限制。
- **危害**：持有一个低权账号即可高频枚举学员/教师 id、批量拉导出、反复提交写操作，缺乏节流缓冲。
- **修复方案**：在 `apiHandler` 基类或守卫层接入按用户 id + 路由的限流（登录/查询/写操作/导出分档）；先覆盖导出类与批量写接口。
- **工作量**：中。**优先级**：长期。

### B-17 cron Bearer token 经 query 传递，且接受双 token

- **证据**：`src/app/api/cron/archive-notifications/route.ts:14`、`daily-ops-report/route.ts:55`、`retry-notifications/route.ts:255`、`trash-cleanup/route.ts:8`、`weekly-digest/route.ts:71` 均从 query/header 取 Bearer；`retry-notifications` 同时比对 `CRON_SECRET` 与 `HEALTH_TOKEN`。proxy 对 `/api/cron/*` 放行（`proxy.ts:80`），handler 自校验。
- **危害**：query 中的 token 易进入 Web 服务器访问日志、浏览器历史、代理日志；双 token 扩大凭据面。
- **修复方案**：cron 凭据改走 `Authorization: Bearer` header；收敛为单一 secret；日志脱敏；定期轮换。
- **工作量**：小。**优先级**：长期。

### B-18 Prisma raw SQL 盘点（合格项归档）

- **证据**：范围内检索 `$queryRaw / $executeRaw / $queryRawUnsafe / $executeRawUnsafe`，命中仅 `cron/weekly-digest/route.ts`、`students/[id]/status/route.ts:95` 等，全部为 Prisma 带参数模板（`${parentId}` 等由驱动绑定）；**未发现 Unsafe 变体，未发现字符串拼接用户输入进 SQL**。
- **结论**：本批未发现 SQL 注入面；后续新增 raw 查询时应继续禁止 `*Unsafe` 并强制参数绑定。
- **优先级**：长期（基线保持）。

## 6. 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
|---|---|---|---|---|
| TB-1 | `/api/uploads/[filename]`、`/api/files/...` 是否落在 proxy matcher 内；matcher L202 排除了静态 `uploads` 段，需确认 API 路径未被一并绕过 | 在测试环境用已退出登录会话直接请求未授权 `/api/uploads/xxx`、`/api/files/view?path=xxx`，观察是否 401；核对 matcher 正则分段 | 若绕过，文件访问仅靠 handler 内 `assertCanAccessFileAsset` 兜底，停用/吊销会话校验缺失 | 用 `requireAuthenticatedUser` + access lib 双保险；matcher 显式包含 `/api/` 前缀 |
| TB-2 | 双库模式下 division 隔离是否真正生效：低权账号能否通过查询参数跨学部读取 | 测试环境准备 JUNIOR/SENIOR 两个账号，交叉请求带 `division=SENIOR` 的学员/课次/费用接口，核对返回行数与库来源 | 跨学部数据泄露 | 复核 `getRequestDivision`（division.ts 已忽略外部 division 入参）与 `getPrismaForDivision` 调用点；跨库访问补显式断言 |
| TB-3 | proxy 读操作 fail-open 窗口（L157-168，失败计数 <3）内，已停用/被踢下线会话是否仍可读取 API | 测试环境模拟 DB 不可用，停用账号后请求 GET 接口，观察是否放行 | 会话吊销延迟生效 | 关键读接口 handler 内复用 `getCurrentUser()` 查库校验；评估读操作改 fail-closed |
| TB-4 | 反馈导出图片 7 天 HMAC token 是否绑定学部/学员，能否跨对象访问 | 用 A 学员导出 token 改 `assetId` 访问 B 学员图片链接（`classroom-feedback/export-image-url.ts` 签名覆盖 assetId:division:expires） | 跨学员图片越权查看 | 实测确认 division 与 assetId 均入签；必要时缩短 TTL |
| TB-5 | `messages/[id]`、`messages/read-all`、`messages/unread-count` 的 `getAccessibleParentMessageWhere` 是否对 teacher/admin/parent 三类都正确收口 | 测试环境分别用家长/教师账号请求他人会话 id 与 read-all，核对 403 与返回范围 | 跨会话消息泄露 | 若存在空 where 兜底，补角色默认拒绝 |
| TB-6 | 单次课反馈手动填写姓名路径（`single-session` manual）是否绕过学生归属与家长通知边界 | 教师端走手动学生姓名 + 非在册学生生成反馈，检查是否向不存在/他人家长推送通知 | 误推送、数据污染 | 手动路径禁止关联真实 studentId；通知前二次校验在册与归属 |
| TB-7 | B-1 注销教师链路在无角色校验时，`transferTo` 目标教师是否校验同学部、同批次 | 代码走查 + 测试环境构造跨学部 transferTo，核对课程/学员转移结果 | 跨学部数据错乱 | 补目标教师学部/批次校验与事务内二次断言 |
| TB-8 | 管理端本地 `requireAdmin()` 包装在 DB 异常时的返回行为（是否 fail-open 返回 null 后被当作 403，还是误放行） | 模拟 DB 异常调用各本地包装接口，核对状态码与放行情况 | 兜底失效时越权 | 包装函数复用 guards 查库逻辑，异常统一 503 |

## 7. 覆盖说明

- 范围内共枚举 **229 个 `route.ts` 文件、336 个 handler（GET/POST/PUT/PATCH/DELETE）**，矩阵逐条列出；统计：合格 315、残缺 20、裸奔 1。
- 深读取证：管理端 admin 目录全部 80+ 路由逐一核对角色守卫；教师端 `teacher/` 31 个路由逐一核对 `requireCurrentTeacher` 与归属 where；报表/导出/文件访问/费用/考勤/反馈/试卷/亮点/课表等高风险目录逐条精读。
- 抽样说明：`settings` 下纯配置读写、`meals`/`rooms`/`subjects`/`fee-types` 等基础数据 CRUD 路由，以「守卫调用 + 角色判断行号」为抽样规则核对了入口守卫与写操作角色判断；其内部字段级归属因属 admin 全库管理范畴，未逐字段展开。
- 未覆盖（其他章节）：`parent`、`miniapp`、`public`、`qywx`、`wxpusher`、`ai` 目录，以及 auth 登录链路本身。
- 本报告不含任何真实密钥/密码/Secret/Token 值；所有凭据引用均为环境变量名。

# 第三章　授权与越权：家长端 / 小程序 / 公开入口

> 审查范围：`src/app/api` 下 `parent`、`miniapp`、`public`、`qywx`、`wxpusher`、`ai`（含 public-assistant）、`volunteer`、`schools`、`weather`、`telemetry`、`health`、`auth`（激活/回调/令牌类）路由。
> 审查方式：纯静态只读审查，未请求线上站点、未调用小程序接口、未伪造回调。需动态验证的假设统一列入文末"待实测项"。
> 基线：Next.js 16 App Router + next-auth v5（JWT 会话，`sessionMark` 单点登录标记）+ Prisma/PostgreSQL + Redis。家长身份来自 `ParentActivationToken` 激活流程，家长↔学员绑定关系存库（`User.parentId` / `User.parentUserId`，谓词见 `src/lib/business-visibility.ts:84-90`）。
> 判定口径：**合格**＝身份/角色/归属三道门齐备；**残缺**＝某道门存在但不完整（含依赖中间件兜底、角色校验缺失、常量时间比较缺失等）；**裸奔**＝敏感动作/数据在缺少有效身份或归属校验下可被触发。

## 路由"四道门"覆盖矩阵

| 路由 (方法) | 身份来源 | 门2 角色 | 门3 归属 | 判定 | 证据(文件:行) |
|---|---|---|---|---|---|
| parent/children (GET) | next-auth session | 未显式校验 parent | 有：`getParentChildren(prisma, user.id)` 按 parentId 过滤 | 残缺 | `src/app/api/parent/children/route.ts:12-16`；`src/lib/parent-children.ts:6-35` |
| parent/hour-records (GET) | session | 有：`role !== 'parent' → 403` | 有：`parentLinkedStudentWhere(user.id)` + `findParentChild` 逐个校验 | 合格 | `src/app/api/parent/hour-records/route.ts:13,15,24,43-46`；`src/lib/business-visibility.ts:84-90`；`src/lib/parent-children.ts:37-41` |
| parent/hours-leaderboard (GET) | session | 有：parent 限定 | 有：`findParentChild`；同班同学姓名脱敏（`maskNameForParent`） | 合格 | `src/app/api/parent/hours-leaderboard/route.ts:34-36,39,50-51` |
| parent/leave (POST) | session | **未显式校验 parent**，仅判登录 | 有：`findParentChild` 校验 childId 属当前家长；写库前复用同一谓词 | 残缺 | `src/app/api/parent/leave/route.ts:22-25,51-53,122` |
| parent/materials (GET) | session | 有：parent 限定 | 不按学员 id；材料受众限定 `PUBLISHED + STUDENT/BOTH` | 合格 | `src/app/api/parent/materials/route.ts:11-12`；`src/lib/material-visibility.ts:7-12` |
| parent/materials/lesson-previews (GET) | session | 有：parent 限定 | 有：学员名列表仅取 `parentStudentIds` 内 | 合格 | `src/app/api/parent/materials/lesson-previews/route.ts:11-12,77-84` |
| parent/meal-choice (GET) | session | **未显式校验 parent** | 有：`parentLinkedStudentWhere(userId)` 过滤学员与已选餐记录 | 残缺 | `src/app/api/parent/meal-choice/route.ts:17-21,32-46` |
| parent/meal-choice (POST) | session | **未显式校验 parent** | 有：`student.parentId === userId \|\| student.parentUserId === userId` 显式比对 | 残缺 | `src/app/api/parent/meal-choice/route.ts:61-65,72-76,79-89` |
| parent/notifications/mark-read (POST) | session | 有：parent 限定 | 有：`where: { userId, id }` | 合格 | `src/app/api/parent/notifications/mark-read/route.ts:15,18,139` |
| parent/notifications/read-all (PATCH) | session | 有：parent 限定 | 有：`where: { userId }` | 合格 | `src/app/api/parent/notifications/read-all/route.ts:10,13,37` |
| parent/notifications/unread-count (GET) | session | **未显式校验 parent** | 有：`where: { userId }` 计数 | 残缺 | `src/app/api/parent/notifications/unread-count/route.ts:9,16` |
| parent/practice-bank (GET) | session | **未显式校验 parent** | 有：`findParentChild` 校验 childId | 残缺 | `src/app/api/parent/practice-bank/route.ts:16,26` |
| parent/practice-results (GET) | session | **未显式校验 parent** | 有：`findParentChild`；`submissionId` 经 `recordIds.includes(attempt.studentId)` 交叉校验 | 残缺 | `src/app/api/parent/practice-results/route.ts:94-97,108-112,116-119` |
| parent/practice-results (POST) | session | **未显式校验 parent** | 有：`findParentChild` + 已存在提交 `recordIds` 交叉校验 | 残缺 | `src/app/api/parent/practice-results/route.ts:191-194,219-223,228-230` |
| parent/profile (GET) | session | **未显式校验 parent** | 有：`findParentChild` | 残缺 | `src/app/api/parent/profile/route.ts:11-12,15-19` |
| parent/students/[id]/archive (GET) | session | 由归档库按 `viewer.role` 裁决 | 有：`parentStudentIds.includes(studentId)`，跨部拒绝 | 合格 | `src/app/api/parent/students/[id]/archive/route.ts:12-13,18-23,31`；`src/lib/student-archive.ts:159-166,200-204` |
| parent/students/[id]/growth-report (GET) | session | 有：`requireParentUser` | 有：成长档案库按 parent 归属校验 | 合格 | `src/app/api/parent/students/[id]/growth-report/handler.ts:30,41`；`src/lib/student-growth/archive.ts:132-135` |
| parent/students/[id]/learning-report (POST) | session | **未显式校验 parent** | 有：`findParentChild` 校验 id 属当前家长 | 残缺 | `src/app/api/parent/students/[id]/learning-report/route.ts:28-29,33-35` |
| parent/study-hall (GET) | session | 有：`requireParentUser` | 有：`parentLinkedStudentWhere` | 合格 | `src/app/api/parent/study-hall/route.ts:10-11` |
| parent/study-hall (PATCH) | session | 有：`requireParentUser` | 有：`updateMany.where` 复用 `parentLinkedStudentWhere` | 合格 | `src/app/api/parent/study-hall/route.ts:59` |
| parent/today (GET) | session | **未显式校验 parent** | 有：`parentLinkedStudentWhere(userId)` | 残缺 | `src/app/api/parent/today/route.ts:24,31` |
| parent/unread-counts (GET) | session | 有：parent 限定 | 有：`parentLinkedStudentWhere` + `where: { userId }` | 合格 | `src/app/api/parent/unread-counts/route.ts:13-16,22,42,81` |
| parent/unread-counts/read-all (POST) | session | 有：parent 限定 | 有：`parentLinkedStudentWhere` + `where: { userId }` | 合格 | `src/app/api/parent/unread-counts/read-all/route.ts:17-19,23,49` |
| parent/wechat/unbind (POST) | session | 有：parent 限定 | 有：`where: { id: userId }` 只改本人 | 合格 | `src/app/api/parent/wechat/unbind/route.ts:7-9` |
| parent/weekly-report (GET) | session | **未显式校验 parent** | 有：`findParentChild`（childId 可选，缺省取全部绑定学员） | 残缺 | `src/app/api/parent/weekly-report/route.ts:19,26` |
| public/teacher-showcase (GET) | 无需登录（设计公开） | N/A（公开营销页） | N/A；响应不返回教师 id，姓名仅回姓氏标签，bio 姓名替换脱敏 | 合格（设计公开） | `src/app/api/public/teacher-showcase/route.ts:63-69,82-108,150-169`；`src/proxy.ts:44-46,77` |
| public/teacher-showcase/portrait (GET) | 无需登录；AES-256-GCM 签名令牌（teacherId+division+7d 过期，随机 IV + AuthTag） | N/A | 令牌绑定 teacherId；DB 按 teacherId+division+ACTIVE 复核；上传真人头像马赛克化；存储 key 校验 `..`/`\\`；路径穿越复核；nosniff | 合格（设计公开） | `src/lib/public-teacher-showcase-token.ts:14-61`；`src/app/api/public/teacher-showcase/portrait/route.ts:14-19,33,37-39,43-60,63,69-75,81` |
| qywx/bind (POST) | session | 有：仅 admin/teacher；parent 被拒 | 有：admin 选目标时目标必须是同 division 的 admin/teacher；teacher 只能绑自己 | 合格 | `src/app/api/qywx/bind/route.ts:18-19,33-36,44-54` |
| qywx/bind (GET) | session | 登录即可 | 有：只查 `where: { id: user.id }` | 合格 | `src/app/api/qywx/bind/route.ts:92-100` |
| qywx/bind-management (GET) | session | 有：仅 admin | 有：家长列表按 division 过滤 | 合格 | `src/app/api/qywx/bind-management/route.ts:26,30,39-55` |
| qywx/bind-management (POST) | session | 有：仅 admin | 有：联系人须在发送成员客户列表内、`type===1`、重复绑定冲突校验、Serializable 事务 | 合格 | `src/app/api/qywx/bind-management/route.ts:101,111-142,145-169` |
| qywx/bind-management (DELETE) | session | 有：仅 admin | 有：目标家长限定 division | 合格 | `src/app/api/qywx/bind-management/route.ts:186-199` |
| qywx/event (GET) | 企微回调签名（SHA1(sort(TOKEN,timestamp,nonce,echostr))，`timingSafeEqual`）+ AES-256-CBC 解密 + corpId 校验 | N/A | N/A；**未校验 timestamp 新鲜度、未记录 nonce 防重放** | 残缺 | `src/app/api/qywx/event/route.ts:15-16,39-40,44-50,59-78` |
| qywx/event (POST) | 同上签名 + 解密 | N/A | N/A；**未校验 timestamp/nonce**；handler 仅解密回 `success`，不解析事件内容、不改库 | 残缺 | `src/app/api/qywx/event/route.ts:81-98` |
| qywx/test-send (POST) | session | 有：仅 admin/teacher | parent 通道只能发配置的 `QYWX_TEST_SCHOOL_PARENT_ID`；member 通道发给本人；链接 origin 白名单校验防开放重定向 | 合格 | `src/app/api/qywx/test-send/route.ts:18-19,34-49,58-63,65-69` |
| wxpusher/callback (POST) | 仅校验请求体 `appToken === WXPUSHER_APP_TOKEN`（共享密钥，非恒定时间比较） | **无角色校验** | **无归属/待绑定会话校验**：`extra`（用户 id）直接作为 `where: { id: extra }` 写 `wxpusherUid` | 裸奔 | `src/app/api/wxpusher/callback/route.ts:7-8,14-17,19-35` |
| wxpusher/qrcode (GET) | session | 登录即可 | 有：`extra = session.user.id`，不接受前端传 userId | 合格 | `src/app/api/wxpusher/qrcode/route.ts:8-9,19-25` |
| wxpusher/unbind (POST) | session | 登录即可 | 有：`where: { id: userId }` 只解绑本人 | 合格 | `src/app/api/wxpusher/unbind/route.ts:7-8,12-16` |
| ai/chat (POST) | session | 角色映射进 system prompt；digest 按角色取数 | 家长 digest 只含本人学员；教师/管理员 digest 各自作用域 | 合格（限流缺陷见 C-6） | `src/app/api/ai/chat/route.ts:211,120,281`；`src/lib/ai/system-context.ts:53-130` |
| ai/public-assistant (POST) | 无需登录（设计公开） | N/A | N/A；**无任何 DB/工具检索路径**，仅把提问拼进 user 消息；输入去控制字符、限 300 字；IP 限流 5 次/分钟 | 合格（设计公开；无日额度见 C-11） | `src/app/api/ai/public-assistant/route.ts:10,44-52,61-74,76-90` |
| ai/recent-alerts (GET) | session | 家长分支 `requireParentUser`；教师/管理员分支按 userId | 有：家长只查 `parentId/userId` 绑定学员；员工只查本人通知 | 合格 | `src/app/api/ai/recent-alerts/route.ts:143-159,179-181` |
| ai/system-digest (GET) | session | 由 `buildSystemDigest(user)` 按角色分叉 | 家长分支不进入全库统计；员工/管理员分支取本角色作用域 | 合格 | `src/app/api/ai/system-digest/route.ts:9-15`；`src/lib/ai/system-context.ts:53,240-247` |
| volunteer (GET) | session | admin/teacher 取管理版指南，其余取家长版（仅 `isPublished`） | N/A | 合格 | `src/app/api/volunteer/route.ts:11-17`；`src/lib/volunteer.ts:217-238` |
| volunteer (PATCH) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/route.ts:20-26` |
| volunteer/consultation (GET) | session | parent 按 `parentId` 过滤；非 parent（teacher/admin）看全部并含家长姓名 | 有：家长只看自己提交的咨询 | 合格 | `src/app/api/volunteer/consultation/route.ts:8-21` |
| volunteer/consultation (POST) | session | 有：仅 parent | 有：`create.data.parentId = user.id` | 合格 | `src/app/api/volunteer/consultation/route.ts:24-40` |
| volunteer/consultation/[id] (DELETE) | session | parent 可删自己的；admin/teacher 可删任意 | 有：`consultation.parentId === user.id` 否则要求员工角色 | 合格 | `src/app/api/volunteer/consultation/[id]/route.ts:9,15-17,20` |
| volunteer/consultation/[id]/reply (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/consultation/[id]/reply/route.ts:9-12,20-28` |
| volunteer/documents (GET) | session（任意登录角色） | 不区分角色 | N/A；返回志愿指南文档（设计上家长可见） | 合格（设计公开资料） | `src/app/api/volunteer/documents/route.ts:12-18` |
| volunteer/documents (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/documents/route.ts:22-26` |
| volunteer/documents/[id] (DELETE) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/documents/[id]/route.ts:10-13,17` |
| volunteer/documents/[id]/download (GET) | session（任意登录角色） | 不区分角色 | fileUrl 仅校验前缀 `/volunteer/docs/`，**未做 `path.join` 后目录规范化复核**；未设 `X-Content-Type-Options: nosniff` | 残缺 | `src/app/api/volunteer/documents/[id]/download/route.ts:11-29` |
| volunteer/quota (GET) | session（任意登录角色） | 不区分角色 | N/A；公开招生计划/录取分数（家长志愿页使用） | 合格（设计公开数据） | `src/app/api/volunteer/quota/route.ts:9-11,19-35` |
| volunteer/quota (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/quota/route.ts:38-44` |
| volunteer/quota/import (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/quota/import/route.ts:11-17` |
| volunteer/schools (GET) | **无需登录**（proxy 白名单第 96 行放行） | N/A | N/A；高中公开招生信息（地址/电话/学费/录取率/来源链接）+ 公开分配名额与一分一档，无学员家长数据 | 合格（设计公开） | `src/app/api/volunteer/schools/route.ts:16-57,101-103,139`；`src/proxy.ts:96` |
| volunteer/steps (GET) | session | 非编辑角色仅返回 `isPublished: true` | N/A | 合格 | `src/app/api/volunteer/steps/route.ts:15-17,22` |
| volunteer/steps (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/steps/route.ts:28-32` |
| volunteer/steps/reorder (POST) | session | 有：仅 admin/teacher | N/A | 合格 | `src/app/api/volunteer/steps/reorder/route.ts:9-13` |
| volunteer/steps/[id] (PATCH) | session | 有：`requireEditor`（admin/teacher） | N/A | 合格 | `src/app/api/volunteer/steps/[id]/route.ts:9-15,17-20,28-38` |
| volunteer/steps/[id] (DELETE) | session | 有：`requireEditor`（admin/teacher） | N/A | 合格 | `src/app/api/volunteer/steps/[id]/route.ts:44-50` |
| volunteer/yifenyidang (GET) | **handler 内无任何会话校验**；未登录请求由 proxy 中间件拦截 401 | N/A | N/A；公开中考一分一档统计（教育局公开数据） | 残缺（鉴权依赖 proxy，handler 未自包含） | `src/app/api/volunteer/yifenyidang/route.ts:7-15`；`src/proxy.ts:106-108` |
| schools (GET) | session（任意登录角色，含家长） | 未做角色区分 | N/A；响应含 `updatedBy`（管理员用户 id）内部审计字段 | 残缺 | `src/app/api/schools/route.ts:10-11,55` |
| schools/[id] (PUT) | session | 有：仅 admin | N/A；更新字段白名单 | 合格 | `src/app/api/schools/[id]/route.ts:61,65-69,76-82,94-96` |
| weather/xinle (GET) | session（任意登录角色） | 不区分角色 | N/A；调用高德预报，内部 Key 不回传 | 合格 | `src/app/api/weather/xinle/route.ts:9-11` |
| telemetry/client-performance (POST) | session | 登录即可 | 有：上报字段白名单正则 + 2KB 上限，只记路由名与耗时，不落用户/学员标识 | 合格 | `src/app/api/telemetry/client-performance/route.ts:9-31` |
| health (GET) | `?token=HEALTH_TOKEN` 探针；未带 token 只回 `{status:'ok'}` | N/A | N/A；token 用 `!==` 非常量时间比较；未走 apiHandler（无全局限流） | 残缺 | `src/app/api/health/route.ts:24-28,30-64` |
| auth/activate/[token] (GET) | 能力令牌（32 字节随机，sha256 存库，7 天有效） | N/A | 令牌即凭证；命中才回家长姓名/邮箱/学员列表，未命中 404 通用文案 | 合格（设计公开，令牌即凭证） | `src/app/api/auth/activate/[token]/route.ts:18-30`；`src/lib/parent-activation.ts:15-37,39-60` |
| auth/activate/[token] (POST) | 同上能力令牌 | N/A | 事务内 `updateMany({usedAt:null})` 防重复激活；密码策略校验；激活后 `currentSessionToken` 置空撤销旧会话 | 合格（设计公开） | `src/app/api/auth/activate/[token]/route.ts:32-49`；`src/lib/parent-activation.ts:62-93` |
| auth/change-password (POST) | session | 登录即可 | 有：先 `bcrypt.compare(oldPassword)` 验旧密码；改密后 `currentSessionToken` 轮换撤销旧会话 | 合格 | `src/app/api/auth/change-password/route.ts:11,32-33,36-51` |
| auth/check-role (POST) | 未登录 | N/A | 按 email 反查 role 并回传（admin 被隐藏为 null） | 残缺（角色/账号枚举） | `src/app/api/auth/check-role/route.ts:13-33` |
| auth/detect-role (POST) | 未登录 | N/A | 按 email/手机号反查 role + division 并回传（admin 隐藏） | 残缺（角色/账号枚举） | `src/app/api/auth/detect-role/route.ts:7-23`；`src/lib/login-accounts.ts:356-415` |
| auth/forgot-password (POST) | 未登录 | N/A | 通用文案防枚举；32 字节随机重置令牌 sha256 存库、30 分钟有效、旧令牌作废；限流 5 次/分钟 | 合格 | `src/app/api/auth/forgot-password/route.ts:9,34-41,63-76,78-87,90`；`src/lib/rate-limit.ts:21` |
| auth/kick-events (GET) | session SSE | 登录即可 | 有：订阅频道 `kick:${userId}`，只收本人踢线事件 | 合格 | `src/app/api/auth/kick-events/route.ts:8-13,36-41` |
| auth/log-device (POST) | session | 登录即可 | 有：只更新本人最近一条成功登录记录 | 合格 | `src/app/api/auth/log-device/route.ts:12-13,17,22-39` |
| auth/login-check (POST) | 未登录 | N/A | 仅回 `ok:true/false`；内部 `BAD_USERNAME / BAD_ROLE / LOCKED` 错误码在路由层被归一化为通用文案，对外不可区分；`ok:true` 仍可确认账号存在且入口角色匹配 | 残缺（弱枚举） | `src/app/api/auth/login-check/route.ts:14-29`；`src/lib/login-accounts.ts:569-602` |
| auth/login-status (POST) | 未登录 | N/A | 按 email 回传 `locked / failCount / remaining`，暴露账号锁定状态与失败次数节奏 | 残缺（枚举） | `src/app/api/auth/login-status/route.ts:7-15`；`src/lib/login-accounts.ts:230-251` |
| auth/reset-password (POST) | 能力令牌（sha256 比对、未过期、未使用） | N/A | 禁用账号拒绝；重置后令牌作废、`currentSessionToken` 轮换撤销全部旧会话 | 合格 | `src/app/api/auth/reset-password/route.ts:20-40,46-69`；`src/lib/rate-limit.ts:22` |
| auth/session-ping (GET) | session | 登录即可 | 有：`sessionMark` 与库内 `currentSessionToken` 比对，不一致回 `kicked` | 合格 | `src/app/api/auth/session-ping/route.ts:13-18,22-35` |
| auth/[...nextauth] (GET/POST) | next-auth 核心；CredentialsProvider | authorize 内限定 `admin/teacher/parent` | 登录成功才签发 JWT，写入 sessionMark 并踢掉旧会话 | 合格（框架基线） | `src/app/api/auth/[...nextauth]/route.ts:5`；`src/lib/auth.ts:117-150,171-196,229-232` |
| miniapp/* | — | — | — | **空壳目录**：`src/app/api/miniapp/auth/login/` 下无 `route.ts`，当前不存在小程序服务端接口、自定义 token 或 openid 绑定逻辑；全仓未检出 `wx.login / jscode2session / openid` 服务端实现 | 目录列举结果；全仓 grep 无命中 |
| students/[id]/parent (POST) | session | 有：仅 admin（本章边界外，管理端路由，顺带核验） | 有：学员存在性校验；事务内绑定 `parentId/parentUserId` 并写 activityLog；初始密码取姓名拼音或自定义 | 合格（边界外，归管理端章节复核） | `src/app/api/students/[id]/parent/route.ts:15-18,22-23,48-84` |
| students/[id]/link-parent (POST) | session | 有：仅 admin（边界外，顺带核验） | 有：学员存在性校验；事务内重绑家长账号并记录日志 | 合格（边界外，归管理端章节复核） | `src/app/api/students/[id]/link-parent/route.ts:18-23` |

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
|---|---|---|---|---|---|
| C-1 | wxpusher/callback 仅靠共享 appToken 比对即可把任意家长账号的推送通道绑到攻击者 UID，无 HMAC、无待绑定会话校验、无归属校验 | ②完全缺失 | appToken 一旦泄露（日志、前端、第三方平台泄露），攻击者可劫持课堂反馈、平安回家通知推送，接收他人孩子的敏感通知 | 中 | 立刻 |
| C-2 | 家长端 10 个文件（12 个 handler）只校验登录、未显式校验 `role==='parent'`，归属防护完全依赖"非家长绑定为空→查不到数据"的兜底 | ①已具备但不完善 | 一旦数据模型允许员工账号挂学员绑定，或后续复用公共查询函数放宽谓词，兜底消失即变成跨角色越权读/写 | 小 | 近期 |
| C-3 | check-role / detect-role 未登录即可探测账号存在性与角色/学部；login-status 暴露锁定状态与失败次数；login-check 仅 `ok:true/false` 弱枚举 | ①已具备但不完善 | 配合字典批量探测可绘出系统账号与角色清单，并获知目标账号锁定节奏，辅助定向爆破 | 小 | 近期 |
| C-4 | qywx/event 回调未校验 timestamp 偏移、未存 nonce 防重放 | ①已具备但不完善 | 现 handler 不改库，重放暂无实际动作；未来若在该端点落地事件状态变更，捕获报文即可重放触发 | 小 | 近期 |
| C-5 | health 探针 token 用 `!==` 比较（非常量时间），且未走 apiHandler、无全局限流 | ①已具备但不完善 | 理论上可通过响应时序逐字节推断 token；高频探测可拿到 DB 延迟/uptime/内存等内部运行指标 | 小 | 近期 |
| C-6 | ai/chat 限流为进程内内存 Map，不进 Redis | ③架构运维层 | 多实例部署各自计数、进程重启清零，登录用户可绕过分钟/日额度刷量消耗大模型 API 额度 | 中 | 近期 |
| C-7 | schools GET 向登录家长返回 `updatedBy`（管理员用户 id） | ①已具备但不完善 | 家长可枚举维护人内部 id，为后续针对内部账号的攻击提供信息 | 小 | 近期 |
| C-8 | documents/[id]/download 未做路径规范化复核，缺 nosniff 响应头 | ①已具备但不完善 | 当前 fileUrl 仅服务端写入，风险低；若未来允许前端传文件名，存在目录穿越读文件面；缺少 nosniff 浏览器可能按内容嗅探执行 | 小 | 长期 |
| C-9 | yifenyidang 等 handler 自身无会话校验，鉴权完全依赖 proxy 中间件白名单 | ③架构运维层 | 若 proxy matcher 调整、handler 被直连调用或被其他路由复用，未登录即可拉取全量一分一档数据 | 中 | 近期 |
| C-10 | 限流驱动 Redis 故障时 auto 模式降级内存桶，仅本地 console.warn、无 Sentry/告警上报与熔断 | ③架构运维层 | 公开接口在 Redis 故障窗口内失去分布式限流，可被慢速/分布式刷量击穿成本 | 小 | 近期 |
| C-11 | public-assistant 仅有 5 次/IP/分钟限流，无每日总额度与黑名单 | ③架构运维层 | 无 DB 检索，不构成数据外泄；但可持续调用大模型产生 API 费用（内存降级下更易绕过） | 小 | 近期 |
| C-12 | qywx/event、wxpusher/callback、health、public/teacher-showcase（含 portrait）、parent/learning-report 等 handler 未包裹 apiHandler | ③架构运维层 | 不享受统一 body 大小限制、IP 提取与全局限流，回调/公开端点缺少一致的防爆破基线 | 小 | 长期 |
| C-13 | `/volunteer/docs/` 静态目录在 proxy 白名单内公开，上传附件凭文件名可直下 | ③架构运维层 | 若误传学员材料、内部文档，静态目录不做鉴权即可被遍历下载 | 小 | 近期 |
| C-14 | miniapp 为空壳，无小程序鉴权/token 体系 | ③架构运维层 | 未来接入微信小程序时若沿用"前端传 openid 即信"的做法，将出现身份伪造；需在接入前定方案 | 中 | 长期（接入前必须完成） |

## ① 已具备但不完善

### C-2 家长端多个接口缺显式角色校验，归属校验退化为绑定兜底

- **证据**：`src/app/api/parent/leave/route.ts:22-25`（仅 `if (!session?.user) 401`，无 role 判断）；同类写法见 `parent/meal-choice/route.ts:17-18,61-62`、`parent/notifications/unread-count/route.ts:9`、`parent/practice-bank/route.ts:16`、`parent/practice-results/route.ts:94-97,191-194`、`parent/profile/route.ts:11-12`、`parent/students/[id]/learning-report/route.ts:28-29`、`parent/today/route.ts:24`、`parent/weekly-report/route.ts:19`、`parent/children/route.ts:12-16`。归属侧统一走 `findParentChild` / `parentLinkedStudentWhere`：
  ```ts
  // parent-children.ts:6-35,37-41 —— 非家长 userId 查不到任何绑定学员，兜底返回 null/空集
  export async function getParentChildren(prisma, parentId) { /* parentStudentHistoryWhere(parentId) */ }
  export function findParentChild(children, requested) {
    return children.find((child) => requested && child.recordIds.includes(requested)) || null
  }
  ```
- **危害**：现状下员工账号查不到绑定学员，兜底有效；但这些接口把"角色门"完全押在"绑定为空"这一隐含前提上。一旦后续公共查询函数被复用放宽（例如员工视图也能挂学员）、数据模型允许双角色，或未来新增按手机号而非 userId 取学员的逻辑，越权读成绩/考勤/反馈、越权写请假/反馈将直接暴露。
- **利用前置条件**：需要一个已登录的员工/管理员会话；当前静态代码下因绑定为空尚无法直接读到他人孩子数据。
- **修复方案**：上述 handler 入口统一改用 `requireParentUser()`（`src/lib/auth/guards.ts:114-121`），先验角色再验归属；与现有 `findParentChild` 双层防护，避免单兜底失效。
- **工作量**：小（逐接口加一行角色断言，共 10 个文件、12 个 handler）。
- **优先级**：近期。

### C-3 未登录身份探测接口存在账号/角色/锁定状态枚举

- **证据**：
  - `src/app/api/auth/check-role/route.ts:24-33`：按 email `findUnique` 回传 `role`（admin 置 null），teacher/parent 账号存在性可由 `role` 是否非 null 探测。
  - `src/app/api/auth/detect-role/route.ts:22-23` → `src/lib/login-accounts.ts:356-415`：按 email/手机号返回 `{role, division}`，可同时探测角色与学部归属。
  - `src/app/api/auth/login-check/route.ts:21-29`：路由层把 `precheckLoginAccount` 的所有失败结果归一化为通用 `LOGIN_CHECK_FAILED`（`route.ts:16,24`），对外只见 `ok:true/false`；内部 `BAD_USERNAME / BAD_ROLE / LOCKED`（`src/lib/login-accounts.ts:585,590,598`）不直接回显，但 `ok:true` 仍可确认账号存在且入口角色匹配。
  - `src/app/api/auth/login-status/route.ts:12-15` → `src/lib/login-accounts.ts:230-251`：按 email 回传 `failCount`、`remaining`、`locked` 实时计数，失败次数与剩余次数对外可见。
  - 限流基线：check-role 10rpm、detect-role 5rpm、login-check 20rpm、login-status 10rpm（`src/lib/rate-limit.ts:15-22`），按 IP 计数。
- **危害**：攻击者用字典批量请求可列出系统内 teacher/parent 账号、对应学部与角色；`login-status` 进一步暴露目标账号失败/锁定节奏，为定向撞库、密码喷洒提供情报。
- **利用前置条件**：无需登录；可分布式换 IP 绕过单 IP 限流。
- **修复方案**：
  1. `login-status` 仅回 `locked` 布尔，不回 `failCount/remaining`；`login-check` 维持错误码归一化，并在 `ok:false` 时对存在/角色/锁定走同一响应。
  2. `check-role / detect-role` 在未登录时只回通用角色缺失结果，不回 division；角色探测改由登录态后调用。
  3. 上述接口的限流叠加"按账号维度"计数，避免换 IP 刷账号字典。
- **工作量**：小。
- **优先级**：近期。

### C-4 企微回调未校验 timestamp 新鲜度与 nonce 防重放

- **证据**：`src/app/api/qywx/event/route.ts:44-50` 签名仅做 SHA1 比对与 `timingSafeEqual`；`timestamp` 未解析为时间戳、未与服务器当前时间做 ±5 分钟窗口校验；`nonce` 未落 Redis/DB，不做一次性去重：
  ```ts
  const str = [TOKEN, timestamp, nonce, encrypt].sort().join('')
  const sha = crypto.createHash('sha1').update(str).digest('hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  ```
- **危害**：当前 POST handler（`route.ts:81-98`）只解密回 `success`，不解析事件、不改库，重放不产生内部动作；但签名方案里缺少时间窗口与 nonce 去重，后续若在该端点落地"通讯录变更→自动改绑"等状态动作，捕获一次合法回调即可重放触发。
- **利用前置条件**：需要捕获到一条合法签名回调报文（具备 TOKEN 才能伪造新报文，本端点不能被任意伪造）。
- **修复方案**：校验 `Math.abs(Date.now() - timestamp*1000) < 5*60*1000`；用 Redis `SETNX nonce:timestamp 1 EX 300` 做 nonce 一次性校验，失败回 403。
- **工作量**：小。
- **优先级**：近期。

### C-5 health 探针 token 非常量时间比较，且未纳入统一限流

- **证据**：`src/app/api/health/route.ts:26`：`if (token !== process.env.HEALTH_TOKEN)`；handler 为裸 `export async function GET`，未走 `apiHandler`（对比 `src/lib/api-handler.ts:88-120` 的限流/IP 提取/body 上限），探针命中后返回 `uptime / memory / 双库延迟 / db 状态`（`route.ts:38-63`）。
- **危害**：`!==` 走 JS 字符串短路比较，理论上可通过响应时序逐字节推断 token；无上限的探测还会持续执行 `SELECT 1` 探针并回传内部运行指标。另需注意：当 `HEALTH_TOKEN` 环境变量未配置时，`route.ts:26` 两侧均为 `undefined`，未带 token 的请求也会落入详细探针分支返回 uptime/内存/双库延迟。
- **利用前置条件**：能访问 `/api/health`；注意 proxy 白名单未放行该路径，未登录请求在部署态会被中间件 401，但 handler 自身不依赖 proxy（见 C-9 同类问题）。
- **修复方案**：用 `crypto.timingSafeEqual`（等长后比较）；包一层 `apiHandler` 或显式 `checkRateLimit`；未配置 `HEALTH_TOKEN` 时直接关闭详细探针分支。
- **工作量**：小。
- **优先级**：近期。

### C-7 schools GET 向家长暴露内部审计字段 `updatedBy`

- **证据**：`src/app/api/schools/route.ts:18-56` 查询 select 含 `updatedBy`（`:55`），家长端志愿页 `src/app/parent/volunteer/schools/page.tsx:434` 直接调用本接口；接口仅判登录（`route.ts:10-11`），不区分家长/员工角色。
- **危害**：家长可见每条学校资料最后维护人的内部用户 id，可作为内部账号枚举线索。
- **利用前置条件**：普通家长登录态。
- **修复方案**：家长视图 select 剔除 `updatedBy`（或映射为"管理员维护"文案）；该字段仅在 admin 管理端接口返回。
- **工作量**：小。
- **优先级**：近期。

### C-8 文档下载路径规范化复核缺失，缺 `nosniff`

- **证据**：`src/app/api/volunteer/documents/[id]/download/route.ts:18-29`：仅校验 `doc.fileUrl.startsWith('/volunteer/docs/')`，随后 `path.join(process.cwd(), 'public', doc.fileUrl)` 直接 `readFile`，join 后未复核结果仍在 `public/volunteer/docs/` 目录内；响应未设 `X-Content-Type-Options: nosniff`，非 xlsx 一律 `text/plain`。
- **危害**：当前 `fileUrl` 由上传接口服务端拼时间戳写入（`documents/route.ts:57`），前端不可控，目录穿越暂不可直接利用；若后续放开文件名来源，`/volunteer/docs/../../xxx` 可绕过前缀校验；缺 nosniff 时浏览器可能按内容嗅探处理上传文件。
- **利用前置条件**：需要能控制 DB 中 `fileUrl` 值（当前需 admin/teacher 上传权限）。
- **修复方案**：join 后 `resolved.startsWith(path.join(publicDir,'volunteer','docs'))` 复核；统一加 `X-Content-Type-Options: nosniff`，按扩展名映射 MIME。
- **工作量**：小。
- **优先级**：长期。

## ② 完全缺失

### C-1 WxPusher 回调缺少签名/待绑定会话/归属校验，推送通道可被伪造绑定

- **证据**：`src/app/api/wxpusher/callback/route.ts:7-17,19-35`：
  ```ts
  const uid  = body?.data?.uid  || body?.uid
  const extra = body?.data?.extra || body?.extra
  const appToken = body?.data?.appToken || body?.appToken
  if (!appToken || appToken !== process.env.WXPUSHER_APP_TOKEN) { /* 403 */ }
  // 之后直接：
  await prisma.user.update({ where: { id: extra }, data: { wxpusherUid: uid } })
  ```
  三个关键校验全部缺失：
  1. **无 HMAC/签名**：WxPusher 回调体不携带平台签名，当前唯一凭证是 `appToken`（与主动发消息共用同一共享密钥，见 `src/lib/wxpusher.ts:10-17`），且用 `!==` 非常量时间比较。
  2. **无待绑定会话/二维码校验**：`extra` 是系统用户 id，回调不校验该 id 是否对应一张未使用的绑定二维码（`createBindQrcode` 生成二维码时把 `userId` 放进 `extra`，`src/lib/wxpusher.ts:85-109`），也不校验该用户当前未绑定其他 UID。
  3. **无归属/角色校验，也不校验目标存在性与既有绑定**：登录态不参与（proxy 白名单 `src/proxy.ts:74` 放行）；`update` 全部挂 `.catch(() => null)`（`route.ts:23,30,33`），`extra` 不存在时静默成功，目标已绑定其他 UID 时直接覆盖，不做互斥检查；双库模式下 junior/senior 两库同时被写（`route.ts:27-34`）。
- **危害**：一旦 `WXPUSHER_APP_TOKEN` 泄露（日志打印、WxPusher 平台侧、配置外泄），攻击者可构造 `{data:{uid:"攻击者UID", extra:"受害者家长id", appToken:"泄露token"}}` POST 到 `/api/wxpusher/callback`，把攻击者微信绑定到受害者家长账号。此后课堂反馈、平安回家、通知类推送（`src/lib/wxpusher.ts:59-79`）全部发到攻击者微信，构成他人孩子敏感通知外泄；反向也可解绑受害者的推送通道。`extra` 为 UUID，盲绑不可枚举，但只要拿到/猜到用户 id（例如其他接口回显）即可定向利用。
- **利用前置条件**：掌握 `WXPUSHER_APP_TOKEN`；知晓目标家长用户 id；回调端点公网可达。
- **修复方案**：
  1. 新增"待绑定记录"表（或复用二维码 extra 机制）：服务端生成绑定票据（一次性、10 分钟有效、sha256 存库），回调只接受票据换取 uid，写库后作废；`extra` 不再直接作为用户 id。
  2. 绑定前校验目标用户当前 `wxpusherUid` 为空、角色为 parent（或按业务允许范围），并与 `qywxExternalUserId` 等通道互斥检查。
  3. appToken 比较改 `timingSafeEqual`；密钥与主动发消息密钥分离；回调接 `apiHandler` 限流。
  4. 绑定动作写 `activityLog`，记录 actor、uid、extra。
- **工作量**：中。
- **优先级**：立刻。

## ③ 架构性/运维层问题

### C-6 AI 对话限流为进程内内存桶，多实例/重启可绕过

- **证据**：`src/app/api/ai/chat/route.ts:28` 定义模块级 `rateLimitBuckets = new Map()`；`checkRateLimit`（`route.ts:141-172`）按 `sessionUser.id` 存分钟/日计数，进程内存保存，不写 Redis。对照公开侧 `checkRateLimit`（`src/lib/rate-limit.ts:47-70`）支持 Redis/memory 双驱动。
- **影响**：多实例部署时各实例独立计数，攻击者轮换落到不同实例即可放大额度；实例重启/扩缩容后桶清空，日额度失效。
- **建议**：把 chat 限流迁入 `checkRateLimit` Redis 驱动（租户键 `ai-chat:${userId}`），保留内存桶仅作本地兜底；日额度持久化到 Redis。
- **工作量**：中。**优先级**：近期。

### C-9 部分 handler 鉴权依赖 proxy 中间件，自身未自包含校验

- **证据**：`src/app/api/volunteer/yifenyidang/route.ts:7-15` 无 `auth()`/角色调用；`volunteer/documents/[id]/download/route.ts:11-12`、`volunteer/quota/route.ts:9-11` 等同样只做登录态判断。未登录拦截由 `src/proxy.ts:103-108` 统一完成：
  ```ts
  const session = await auth()
  if (!user) { if (apiRequest) return jsonUnauthorized('Unauthorized') ... }
  ```
  proxy 白名单（`proxy.ts:64-99`）显式放行 auth、wxpusher/callback、qywx/event、public-assistant、teacher-showcase、volunteer/schools 等。
- **影响**：handler 不感知自身访问控制，一旦 `config.matcher`（`proxy.ts:201-203`）收窄、新增部署形态绕过中间件、或 handler 被其他服务端逻辑直接 import 复用，未登录即可拉取数据。纵深防御断裂。
- **建议**：所有需登录 handler 入口至少保留 `requireAuthenticatedUser()`；公开 handler 在代码注释与路由层标注"设计公开"，便于审计区分；proxy 只做会话状态校验，不承担角色/归属裁决。
- **工作量**：中。**优先级**：近期。

### C-10 限流驱动 Redis 故障时降级为内存桶，auto 模式仅有本地 warn、无上报

- **证据**：`src/lib/rate-limit.ts:96-103` Redis 初始化失败：显式 `RATE_LIMIT_DRIVER=redis` 抛错拒绝降级（`:98-100`），`auto` 模式落 `console.warn` 后返回 null 走内存；`121-126` Redis 请求失败时 auto 模式同样回退 `memCheck`；`131-145` 驱动由配置/`REDIS_URL` 决定。降级路径无 Sentry/告警上报、无熔断阈值。
- **影响**：Redis 抖动期间（auto 模式），所有按 IP 的限流（含 public-assistant 5rpm、登录探测接口）退化为单机内存计数，多实例下等于未限流。
- **建议**：降级时上报 Sentry/告警通道；公开接口在 Redis 不可用时收紧为更保守的内存阈值；定期巡检 `RATE_LIMIT_DRIVER` 与 `REDIS_URL` 配置。
- **工作量**：小。**优先级**：近期。

### C-11 公开 AI 助手无每日总额度与调用方黑名单

- **证据**：`src/app/api/ai/public-assistant/route.ts:44-52` 仅 `checkRateLimit(clientIp, path, 'public-home-assistant', 5)`（5 次/分钟/IP）；`79-86` 每次命中真实调用 DeepSeek（maxTokens 500，25s 超时）。全流程无 DB/工具检索（`route.ts` 未 import prisma），提示注入读不到内部数据，但无日额度、无连续异常 IP 拉黑。
- **影响**：不构成数据外泄；主要是成本面：分布式换 IP 可慢速刷量持续产生大模型费用。
- **建议**：加 IP 日额度（如 100 次/天）与连续超限冷却；接入 WxPusher/IP 黑名单；`getCuratedParentFaq` 命中时优先走本地问答，减少模型调用。
- **工作量**：小。**优先级**：近期。

### C-12 公开/回调 handler 未包裹 apiHandler，缺少统一基线

- **证据**：经全量扫描（`import { apiHandler }` 与 `apiHandler(` 调用双重核对），范围内未包裹 `apiHandler` 的 handler 为：`qywx/event/route.ts`、`wxpusher/callback/route.ts`、`health/route.ts`、`public/teacher-showcase/route.ts`、`public/teacher-showcase/portrait/route.ts`、`parent/students/[id]/learning-report/route.ts`。`volunteer/schools`、`volunteer/yifenyidang` 实际已包裹 apiHandler（`volunteer/schools/route.ts:1,16`、`volunteer/yifenyidang/route.ts:2,7`），不计入本项。统一基线（`src/lib/api-handler.ts:88-120`）包含 IP 提取、全局规则限流、body 大小上限、错误归一化与 Sentry 上报；上述 handler 各自手写解析与响应。其中 `parent/students/[id]/learning-report/route.ts:58` 是登录家长可触发的 DeepSeek 调用，归属校验在位（`:33-34`），但未包 apiHandler 也无独立限流，重复调用会持续消耗大模型额度。
- **建议**：评估把回调类 handler 包入 apiHandler（回调解析逻辑保留），公开 GET 端点至少显式声明限流规则与 body 大小上限。
- **工作量**：小。**优先级**：长期。

### C-13 `/volunteer/docs/` 静态目录公开可直下，需约束上传内容

- **证据**：`src/proxy.ts:81-92` 把 `/people/`、`/teacher-portraits/`、`/avatars/`、`/volunteer/picture/`、`/volunteer/docs/` 等静态目录列入白名单，免会话直下。其中 `/volunteer/docs/` 由上传接口落盘 `public/volunteer/docs/`（`src/app/api/volunteer/documents/route.ts:57`），文件名 `时间戳-原文件名`；`/people/` 下为拼音命名的捆绑教师头像（`src/app/api/teacher-photos/route.ts:18` 同样按文件名列出）。目录不做鉴权遍历，但已知/可猜文件名可直接下载。
- **影响**：`/volunteer/docs/` 语义是"公开志愿资料"，若误传学员名单、内部反馈截图等，静态层不拦截即可外泄；`/people/` 拼音文件名可与教师姓名对应，需确认这些捆绑图为插画/默认图而非真人证件照。
- **建议**：上传时做类型/内容审查与目录隔离；内部敏感材料改走带归属校验的签名 URL 下载；定期巡检上述静态目录内容。
- **工作量**：小。**优先级**：近期。

### C-14 miniapp 空壳：小程序鉴权体系尚未落地，接入前须定方案

- **证据**：`src/app/api/miniapp/auth/login/` 目录存在但无 `route.ts`；全仓 grep `openid / wx.login / jscode2session / js_code / miniapp` 无服务端实现命中。当前小程序若有入口，只能复用 next-auth Web 会话。
- **接入前必须明确**：
  1. 登录态用 `wx.login` code → 微信 `jscode2session` 换 openid/session_key，服务端签发自有不透明 token（随机 ≥32 字节、绑定 openid+用户 id、设过期时间、可撤销），**禁止前端直接传 openid 即信**。
  2. token 与家长账号绑定关系落库；接口归属校验复用 `findParentChild` / `parentLinkedStudentWhere` 同一套谓词。
  3. token 存 Redis（带过期与刷新），泄露可踢线；限流按 openid 维度。
- **工作量**：中（接入时）。**优先级**：长期（接入前必须完成）。

## 待实测项

| 编号 | 待验证假设 | 验证方法 | 风险 | 建议 |
|---|---|---|---|---|
| TC-1 | proxy 中间件在生产是否真的拦截所有非白名单 `/api/**` 未登录请求（yifenyidang、quota、documents 等 handler 自不含鉴权） | 测试环境不带 Cookie 直接 `curl GET /api/volunteer/yifenyidang`、`/api/volunteer/quota`、`/api/volunteer/documents`，确认返回 401；并临时注释 proxy 白名单复现 handler 直连 | 若中间件未生效，公开统计/资料接口被未登录拉取 | 按 C-9 在 handler 内补自包含鉴权后复测 |
| TC-2 | 生产限流是否走 Redis（而非静默 memory 降级）；public-assistant / 登录探测接口的分钟与日额度是否生效 | 查 `RATE_LIMIT_DRIVER`/`REDIS_URL` 配置与 Redis `rate:*` 键；脚本同 IP 连续打 public-assistant 6 次看第 6 次是否 429；重启进程后内存桶是否清零 | 限流失效导致大模型费用被刷、账号被批量探测 | 确认 Redis 驱动生效；按 C-10 加降级告警 |
| TC-3 | wxpusher/callback 在 token 已知条件下能否把攻击者 uid 绑到指定家长 id（静态推断可行，需用测试账号实测写库行为） | 测试环境用测试 appToken 构造 `{data:{uid:testUid, extra:测试家长id, appToken:testToken}}` POST，查该家长 `wxpusherUid` 是否被改写；再验证双库模式 junior/senior 是否同时被写 | 推送通道劫持、他人孩子通知外泄 | 落地 C-1 票据化绑定前，禁止在生产启用 WxPusher 回调；实测后复测 |
| TC-4 | qywx/event 重放是否被服务端拒绝（当前预期：不被拒绝，但因 handler 不改库而无实际动作） | 抓一条合法回调报文，间隔 10 分钟重放 POST，观察是否仍回 200；检查库内是否有任何状态字段变化 | 未来事件落地后重放触发状态变更 | 按 C-4 加 timestamp 窗口 + nonce 去重后复测 |
| TC-5 | `AUTH_SECRET`/`NEXTAUTH_SECRET` 长度 ≥32 且两者一致；`HEALTH_TOKEN`、`WXPUSHER_APP_TOKEN`、`QYWX_CALLBACK_TOKEN/AES_KEY` 已在生产环境注入且未写入仓库/日志 | 对照 `src/lib/env-security.ts:26-32` 基线核对环境变量；grep 仓库与日志历史是否出现真实密钥 | JWT 可伪造、回调可被伪造、探针可被猜解 | 不满足则轮换全部密钥；报告内不记录任何真实密钥值 |
| TC-6 | `/volunteer/docs/`、`/people/`、`/volunteer/picture/` 等免鉴权静态目录下是否存在学员名单、内部反馈、合同、真人证件照等非公开文件 | 列目录与文件名清单，抽样核对文件内容；检查上传接口历史落盘记录与 `/people/` 图片是否为真人照片 | 静态目录未鉴权导致内部材料/真人头像外泄 | 按 C-13 清理并隔离，敏感材料改签名 URL |
| TC-7 | ai/chat 内存限流在多实例/重启下的绕过幅度 | 压测：多实例轮换请求观察分钟/日计数；重启后日计数是否清零 | 登录用户绕过额度刷大模型费用 | 按 C-6 迁入 Redis 后复测 |
| TC-8 | teacher-showcase 分享令牌在 7 天过期后是否真的失效；篡改 teacherId/division 后 AES-GCM AuthTag 是否拒绝 | 测试环境生成令牌，过期后访问 portrait；篡改密文 1 字节再访问，确认返回 403 | 分享链接可越权访问其他教师头像 | 若可通过则检查 token 校验分支与 `AUTH_SECRET` 配置 |
| TC-9 | 家长会话被改密/重置后，旧 JWT 是否在 session-ping/kick-events 链路被立即判 `kicked` | 登录后记录会话，另一处改密，再用旧 Cookie 调 `/api/auth/session-ping`，确认回 `kicked` 401 | 旧会话残留导致账号共享 | 若未失效，排查 `currentSessionToken` 同步与 JWT 刷新路径 |

# 第四章　防爬与防枚举

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + React 19 + Prisma 5.22/PostgreSQL + next-auth 5.0.0-beta.32 + Redis + 阿里云 OSS，Docker 部署于阿里云，已配 CDN）。
> 审查方式：**只读静态审查**，未启动 dev server，未对线上站点做任何爬取、压测、批量枚举或 UA 伪装；所有"是否被调用 / 覆盖多少路由"的结论均基于全仓 grep 调用点计数。需要线上流量才能确认的假设一律进入文末"待实测项"。
> 范围限定：爬虫可见面（robots/sitemap/静态资源/UA 策略）、分页与批量拉取上限、存在性枚举接口、公开 API 可抓取性、限流体系真实覆盖率、WAF/CDN/Bot 管理与验证码现状。认证码流、会话固化、越权对象级访问、上传越权由第一章/其他章节覆盖，本章仅在交叉处引用。

## 4.1 结论摘要（最要命的 5 条）

1. **唯一匿名可批量抓取的教师名册接口 `/api/public/teacher-showcase` 既无分页（`findMany` 不带 `take`），也未挂任何限流**：该路由未走 `apiHandler`、未调用 `checkRateLimit`，匿名一次请求即可拉全量在职教师的对外展示字段（姓氏+老师称呼、层级、科目、简介、院校、学历、头像种子/类型；全名、性别原值、手机号、邮箱不下发，见 `src\app\api\public\teacher-showcase\route.ts:157-169`）。
2. **4 个后台列表接口的 `limit/pageSize` 未做上限 clamp**，`?limit=100000` 会被原样送入 Prisma `take`：`teachers`、`notifications`、`leave-requests`、`settings/logs`；其中 `teachers` 还先做了一次不带 `take` 的全量 `findMany` 再在内存里排名分页（`src\app\api\teachers\route.ts:29-30, 50-53`）。前置条件是已登录会话（`teachers` GET 未做角色守卫，其余需 admin/teacher），被拖走的是教师、通知、请假、日志全量字段。
3. **登录链路与 4 个预检接口的响应可区分"账号不存在 / 存在但密码错 / 已停用 / 已锁定"**，限流只按共享 IP 桶（20/10/5 rpm），没有按被探测账号聚合的慢速探测防护；慢速换 IP 即可逐条捞"哪些手机号/邮箱注册了系统"（证据见 4.4，与第一章 A-2/A-8 交叉）。
4. **限流体系存在真实覆盖盲区**：296 个非测试 `route.ts` 中 287 个走 `apiHandler` 获得兜底限流，9 个未包装；未包装里 `teacher-showcase`（匿名）、`parent/students/[id]/learning-report`、两个 cron、`health`、两个 webhook、`portrait` 均未挂应用层限流。`src\lib\api-rate-limit.ts`（156 字节）为废弃空壳，全仓 0 处业务引用。
5. **代码与部署配置层面未见任何 WAF、CDN Bot 管理、边缘 `limit_req`、验证码/滑块/turnstile/hCaptcha/极验**；`deploy\nginx\edu-manage.conf` 仅做反向代理、头转发与证书跳转，无 Bot/UA/ACL 规则。线上 CDN 是否在控制台另配了 Bot 策略，代码库无证据，归入 ③ 架构运维层待核实。

## 4.2 robots / sitemap / 静态面暴露

### 4.2.1 robots.ts 实际输出规则

文件：`src\app\robots.ts`（App Router 生成，`public` 下不存在静态 `robots.txt`）。

- `robots.ts:6-7`：`userAgent: '*'`，Allow `/`、`/images/`、`/marketing/`；`:18` Sitemap 指向 `https://muzhexuetang.xyz/sitemap.xml`。
- `robots.ts:8-16`：Disallow 前缀清单（逐条核对源码）：
  - `/api/`、`/login`、`/reset-password`、`/activate/`、`/parent/`、`/teacher/`；
  - `/dashboard`、`/academic-terms`、`/ai`、`/attendance`、`/classroom-feedback`、`/communications`、`/courses`、`/data-admin`、`/fees`、`/grades`、`/lesson-previews`、`/login-records`、`/materials`、`/meals`、`/notifications`、`/parent-access`、`/parent-messages`、`/performance`、`/phet`、`/reports`、`/schedule`、`/services`、`/settings`、`/student-archive`、`/students`、`/study-hall`、`/teacher-logs`、`/teacher-salary`、`/teachers`、`/trash`、`/volunteer`、`/volunteer-sim`。

**判定**：
- 家长端 `/parent/*`、教师端 `/teacher/*`、管理端主要列表页均在 Disallow 内；`/api/` 整体禁止。
- 比对 `src\app` 下全部 `page.tsx`（剥离 `(main)` 路由组前缀后），**有 9 个认证页前缀未出现在 Disallow 清单**（均为登录后页面，proxy 会把匿名请求重定向/401，风险为"君子协定"级别）：
  `/appointment-detail`、`/class-detail`、`/closed-loop`、`/communication-center`、`/daily-class`、`/feedback-performance`、`/single-session-feedback`、`/teacher-compliance`、`/volunteer-center`。
- 一致性小瑕疵：`robots.ts:13` Disallow 了 `/services`，但 `src\proxy.ts:89` 把 `/services/` 前缀列入匿名公开白名单，`next.config.ts:77` 也有 `/business-assets/services/* → /services/*` 的 rewrite；robots 禁止抓取的目录在应用层却是公开静态资源，两条规则对 `/services/*` 的意图需要对齐。
- **注意**：robots 只是给合规爬虫看的提示，不构成任何访问控制；匿名 API 的真实拦截在 `src\proxy.ts:64-97` 的公开白名单内（见 4.5/4.6）。

### 4.2.2 sitemap.ts 覆盖范围

文件：`src\app\sitemap.ts:5-6`，只输出两条 URL：首页 `/`（`monthly`）与 `/about`（`weekly`）。

**判定**：
- sitemap **没有**提交家长端、管理端、教师端页面，也没有提交任何带 `[id]` 的详情页（学生档案、教师详情、课时详情、反馈详情等均不在内）。这一点是安全的。
- 唯一需注意：`/about` 由 `next.config.ts:74` rewrite 到 `public\about.html`，静态页内含有机构联系电话（`public\about.html:34, 973-975`），属于对外宣传信息，预期公开。

### 4.2.3 public 目录静态线索盘点

`public\` 共 525 个文件。按扩展名分组（实测）：png 255、webp 170、jpg 43、svg 30、gif 8、txt 5、html 4、pdf 3、ico 1、js 1、json 1、mjs 1、mp4 1、xlsx 1、xml 1。其中 html/txt/xml/js/mjs 多为搜索引擎验证文件（`baidu_verify_codeva-*.html`、`BingSiteAuth.xml`、`ByteDanceVerify.html`、`shenma/sogou/WW_verify/*.txt`、`0a03….txt`）与前端库（`echarts.min.js`、`pdf.worker.min.mjs`），属预期公开。

**已核对无以下高危静态线索**（`Select-String`/扩展名扫描）：
- 无 `.env` / `.env.*`、无 `.map` source map、无 `.sql`、无 `.bak/.backup`、无 `.zip/.tar/.gz`、无 `.log`、无数据库转储、无调试 HTML 页。
- `.dockerignore:20-21` 在构建上下文中排除了 `.env`、`.env.*`（`:22` 保留 `.env.example`）；`.dockerignore:32` 排除 `public/uploads`，`:33-36` 排除 `public/services`、`marketing`、`business-assets`、`volunteer/docs`（这些目录在生产由 compose `:68-73` 的主机共享挂载提供）。

**仍可被直接访问的静态业务素材**：
| 路径 | 类型/大小 | 判定 |
| --- | --- | --- |
| `public\volunteer\docs\2025-allocation-quota.xlsx` | xlsx，志愿配额表 | 业务数据素材，公开目录可直接下载，可被整站镜像 |
| `public\volunteer\docs\2022-plan-explanation.txt` | txt，政策说明 | 公开素材，预期内 |
| `public\volunteer\docs\` 目录 | 上传的指南文档 | `src\proxy.ts:92` 对 `/volunteer/docs/*` 放行匿名访问；文档按文件名可直链下载（文件名含时间戳+UUID，不可顺序猜测，但泄露链接即永久可达，无签名/过期）；该目录已被 `.dockerignore:36` 排除出镜像构建，线上内容来自 compose `:73` 主机共享挂载，是否存在待实测 TD-7 |
| `public\uploads\` 根目录 9 个历史上传文件（3 组 `admin_material`/`meal_image`/`teacher_upload`，各含原图 png/jpg + 预览 webp + 缩略图 webp） | 本地历史上传残留 | 本地 dev 残留；`.dockerignore:32` 已排除出生产构建，线上由 compose `:69` 主机共享挂载提供，是否仍存在待实测 TD-7 |
| `public\uploads\materials\test-shuxue.pdf` / `test-yuwen.pdf` / `test-yingyu.pdf` | 462-463 字节测试 PDF | 测试残留，体积极小，无数据泄露，但应清理 |
| `public\home.html`、`public\about.html` | 静态营销页，含联系电话（`home.html:38, 1529-1541, 2055`） | 对外宣传信息，预期公开 |
| `public\manifest.json` | PWA 清单，`start_url: /login` | 无敏感信息 |

### 4.2.4 UA / Bot 策略

- 全仓 `src\` 下 UA 仅被解析用于设备指纹记录：`src\lib\auth.ts:126-128`、`src\app\api\auth\log-device\route.ts:18-30`、`src\app\api\auth\session-ping\route.ts:39-46`（经 `src\lib\device.ts:1` `parseUserAgent` 拆出 device/os/browser）；**没有任何基于 UA 的拒绝、降级或拦截逻辑**（`src\proxy.ts:56` 仅为注释，不含 UA 判断）。
- 未发现 `robots` 之外的爬虫识别（无 UA 黑名单、无无头浏览器指纹识别、无行为风控）。

## 4.3 分页与全量拉取风险表

> 扫描口径：`src\app\api` 下 343 个目录、296 个非测试 `route.ts`。参数解析方式逐条精读；`take` 为固定值或角色作用域收敛的标注为"风险低"。鉴权层级以路由内实际 `auth()/getCurrentUser/requireAdminUser/requireCurrentTeacher/requireParent` 为准；proxy 白名单见 `src\proxy.ts:64-97`。

### 4.3.1 参数未 clamp / 未带上限的接口

| 路由 | 参数 | 是否有上限 | 实现方式（文件:行） | 能否被用来全量拖库 | 工作量 |
| --- | --- | --- | --- | --- | --- |
| `GET /api/teachers` | `limit`（默认 100）、`page` | **否，未 clamp**；且另有一次全量 `findMany` 内存排名 | `src\app\api\teachers\route.ts:29-30` `const limit = parseInt(searchParams.get('limit') \|\| '100')`；`:50-53` `tierRows` 不带 `take`；`:59-65` 内存 `slice` 分页；`:41-46` 支持按姓名/手机号/科目模糊搜索；GET 仅校验会话（`:18-19`），无 admin 角色守卫 | 前置：任意已登录会话（GET 未限制 admin 角色）。`?limit=100000` 直达 `take`；`tierRows` 先全表载入内存排名，教师表不大但模式可复制到更大的表 | 小 |
| `GET /api/notifications` | `limit`（默认 20）、`page` | **否，未 clamp** | `src\app\api\notifications\route.ts:22-23` `parseInt` 无 `Math.min`；`:32-33` `skip/take: limit`；角色：`admin`（`:16-18`） | 前置：管理员。`?limit=100000` 单请求拉全量通知（含学员姓名、发送对象） | 小 |
| `GET /api/leave-requests` | `limit`（默认 20）、`page` | **否，未 clamp** | `src\app\api\leave-requests\route.ts:17-18` `parseInt` 无 clamp；`:36-45` `take: limit`；角色：admin/teacher，teacher 按本人学员作用域（`:26-30`） | 前置：管理员或教师。管理员可跨校区全量拉请假记录；教师受本人学员作用域收敛 | 小 |
| `GET /api/settings/logs` | `pageSize` | **否，未 clamp** | `src\app\api\settings\logs\route.ts:17` `parseInt` 无 clamp；`:35-36` `take: pageSize`；角色：admin（`:11` `role !== 'admin'` 403） | 前置：管理员。`?pageSize=100000` 拉全量审计日志（含操作人、动作、目标、时间） | 小 |
| `GET /api/admin/students/[id]/feedback-archive` | `pageSize` | 路由层未 clamp，**但 lib 层兜底 clamp 20-100** | `src\app\api\admin\students\[id]\feedback-archive\route.ts:29-30` 原始透传；`src\lib\classroom-feedback\archive.ts:361-362` `clampPositiveInteger(pageSize, 20, 100)` | 不能超 100；风险已被 lib 兜底，属写法不一致（路由裸传、lib 兜底） | 小（收口到路由层） |
| `GET /api/volunteer/quota` | 无入参分页 | 固定 `take: 2000` | `src\app\api\volunteer\quota\route.ts:24-28`；鉴权：仅要求登录（`:10-11`），parent 角色也能读 | 前置：任意已登录账号（含家长）。单请求最多 2000 条配额记录（学校名、区县、各类计划数、备注） | 小 |

### 4.3.2 不带 `take` 的 `findMany`（按鉴权与作用域分级）

| 路由 | 鉴权/作用域 | 实现方式（文件:行） | 全量拖库风险 | 工作量 |
| --- | --- | --- | --- | --- |
| `GET /api/public/teacher-showcase` | **匿名**（GET/HEAD 放行，proxy 白名单 `src\proxy.ts:44-46, 77`），无 apiHandler、无限流 | `src\app\api\public\teacher-showcase\route.ts:91-108` 双库 `teacher.findMany({ where:{status:'ACTIVE'} })` 无 `take`；内部 select 含全名/性别/院校/简介（`:95-106`），公开输出 `publicTeachers`（`:157-169`）仅保留姓氏称呼、层级、科目、脱敏简介（`:63-80`）、院校、学历、头像种子/类型；响应 `Cache-Control: public, max-age=0, s-maxage=0, must-revalidate`（`:174`） | **高**：一次请求拉全量在职教师对外名册；无分页契约、无独立限流、无每日总量；全名与联系方式不下发，残留风险为半公开画像整表镜像 | 小 |
| `GET /api/volunteer/schools` | **匿名**（proxy 白名单 `src\proxy.ts:96`），走 apiHandler（规则 500 rpm/IP） | `src\app\api\volunteer\schools\route.ts:18-57` 学校全量；`:102` 配额全量；`:103` 一分一档 2025/2026 全量；均无 `take` | **中高**：单请求镜像学校基础信息+招生电话+地址+学费+高考率+官网+配额+一分一档；500 rpm/IP 阈值偏宽 | 小 |
| `GET /api/schools` | 任意登录用户（仅 `auth()`，无角色判断，`:10-11`） | `src\app\api\schools\route.ts:14-57` `highSchoolInfo.findMany` 无 `take`，select 含电话（`:49`）、地址（`:27`）、学费（`:43`）、高考率（`:45`）、官网（`:48`）、来源 URL（`:50`）；`Cache-Control: private, no-store`（`:106`） | 中：家长登录后即可拉全量学校档案表；属数据治理问题（公开业务资产还是内部数据需产品确认） | 小 |
| `GET /api/rooms` | 任意登录用户 | `src\app\api\rooms\route.ts:10-15` 教室配置全量，无 `take` | 低：配置表，行数少 | 小 |
| `GET /api/courses` | 管理员（`src\app\api\courses\route.ts:29`） | `src\app\api\courses\route.ts` `course.findMany` 无 `take`，含教师姓名、科目、类型、状态 | 低：管理员作用域内的课程目录，行数有限 | 小 |
| `GET /api/reports/teachers` | 管理员（`src\app\api\reports\teachers\route.ts:12-13`） | `src\app\api\reports\teachers\route.ts` 教师绩效汇总 `findMany` 无 `take` | 中：管理员作用域；绩效含课时/收入维度的口径需在数据治理章节复核 | 中 |
| `GET /api/highlights` | 任意登录用户（`getCurrentUser`） | `src\app\api\highlights\route.ts` 亮点配置全量，无 `take` | 低：运营配置表 | 小 |
| `GET /api/volunteer/documents` | 任意登录用户 | `src\app\api\volunteer\documents\route.ts` 指南文档清单全量，无 `take`；文件本体在 `/volunteer/docs/` 静态公开目录 | 低-中：清单可被枚举文件名后直链下载 | 小 |
| `GET /api/volunteer/steps` | 登录；parent 仅见 `isPublished: true`，admin/teacher 见全部 | `src\app\api\volunteer\steps\route.ts:21-22` `guideStep.findMany` 无 `take` | 低：步骤配置表 | 小 |
| `GET /api/teacher/students` | 教师，按本人学员作用域 `teacherStudentWhere` | `src\app\api\teacher\students\route.ts:18-30`，无 `take` | 低：作用域收敛到本人学员 | 小 |
| `GET /api/teacher/messages` | 教师，仅未读 | `src\app\api\teacher\messages\route.ts`，无 `take`，未读收件箱 | 低：未读集合天然有限 | 小 |
| `GET /api/teacher/salary` | 教师，按 `teacherId` 作用域 | `src\app\api\teacher\salary\route.ts:20-22`，无 `take` | 低：本人交易记录 | 小 |
| `GET /api/teacher/schedule` | 教师，按本人排课 | `src\app\api\teacher\schedule\route.ts:25-34`，无 `take`，日期区间收敛 | 低 | 小 |
| `GET /api/teacher/trends` | 教师，按本人近 6 个月 | `src\app\api\teacher\trends\route.ts:29-38`，无 `take`，时间区间收敛 | 低 | 小 |
| `GET /api/parent/today` | 家长，仅本人子女 `parentLinkedStudentWhere(userId)` | `src\app\api\parent\today\route.ts:28-31`，无 `take` | 低：作用域收敛到本人子女 | 小 |
| `GET /api/messages` | 登录，按 `getAccessibleParentMessageWhere` 作用域 | `src\app\api\messages\route.ts:68` 固定 `take: 100` | 低：有固定上限 | — |
| `GET /api/settings/export/students` | 管理员，设计为全量导出 | `src\app\api\settings\export\students\route.ts:19-23` `student.findMany` 无 `take`；`:45-48` 写审计日志 `EXPORT_STUDENTS`；`Cache-Control: no-store, private` | 中：导出接口按设计全量；有审计但无导出冷却/次数上限（见 D-10） | 小 |

### 4.3.3 已正确 clamp 的接口（基线确认）

| 路由 | 上限 | 实现方式（文件:行） |
| --- | --- | --- |
| `GET /api/students` | 500 | `src\app\api\students\route.ts:62-64` `Math.min(500, Math.max(1, requestedLimit))`；管理员（`:48-50`） |
| `GET /api/fees` | 200 | `src\app\api\fees\route.ts:125-126` `Math.min(200, Math.max(1, ...))` |
| `GET /api/fees/students` | 100 | `src\app\api\fees\students\route.ts:36` `Math.min(100, Math.max(10, ...))` |
| `GET /api/login-records` | 100 | `src\app\api\login-records\route.ts:77-78` |
| `GET /api/materials` | 200 | `src\app\api\materials\route.ts:46-47` |
| `GET /api/parent-communications` | 100 | `src\app\api\parent-communications\route.ts:79` |
| `GET /api/performance` | 50 | `src\app\api\performance\route.ts:41-42` |
| `GET /api/teacher/classroom-feedback` | 50 | `src\app\api\teacher\classroom-feedback\route.ts:51` |
| `GET /api/feedback` | 200 | `src\app\api\feedback\route.ts:55` clamp、`:119` `take: limit`；`all=1`（`:53`）仅放宽日期过滤，`take` 仍受限 |
| `GET /api/admin/classroom-feedback` | 200 | `src\app\api\admin\classroom-feedback\route.ts:32` |
| `GET /api/admin/salary` | 200 | `src\app\api\admin\salary\route.ts:38-39` |
| `GET /api/admin/data-admin/[entity]` | 100 | `src\app\api\admin\data-admin\[entity]\route.ts:38-39` |
| `GET /api/admin/course-change-events` | 100 | `src\app\api\admin\course-change-events\route.ts:13-14` |

### 4.3.4 分页后门排查

- 全仓未发现 `?all=true` / `?all=100000` 这类绕过分页的布尔后门；`all=1` 仅出现在 `feedback`、`admin/classroom-feedback`，作用是放宽**日期过滤**，`take` 上限仍在（`src\app\api\feedback\route.ts:53, 55`；`src\app\api\admin\classroom-feedback\route.ts:25, 32`）。
- 未发现 `take: undefined` 显式绕过；未发现 `findMany()` 不带任何 `where` 的裸全量查询（所有无 `take` 的查询均带角色/校区/时间作用域或属公开配置表）。

## 4.4 枚举型接口清单

> 判据：① 返回是否区分"不存在"与"存在但无权限/密码错"；② 是否按输入回显身份信息；③ 是否有频率限制（证据到文件:行）。登录口令爆破与账号锁定细节见第一章 A-2/A-3/A-8，本章从"逐条探测存在性"角度复核。

| 编号 | 接口 | 可枚举对象 | 响应是否可区分存在/不存在 | 有无频率限制（证据） | 危害 |
| --- | --- | --- | --- | --- | --- |
| ENUM-1 | `POST /api/auth/detect-role` | 手机号/邮箱/账号 → 角色与校区 | **是**：命中返回 `role/division/emailPrefix`，未命中 `role: null`（`src\app\api\auth\detect-role\route.ts:17-23`；解析逻辑 `src\lib\login-accounts.ts:356-435`）。管理员账号被静默返回 null | 有，IP 5 rpm（`src\lib\rate-limit.ts:15`）；无按输入账号维度的探测计数 | 慢速换 IP 可逐条探测"该手机号是否注册、属于教师/家长/管理员"；管理员被隐藏但普通账号可枚举 |
| ENUM-2 | `POST /api/auth/login-check` | 邮箱/手机号 + 角色 → 预检是否可登录 | **是**：`{ok:true}` 200（`:29`）与 `{ok:false,error}` 400（`:23-26`）两态可直接区分；错误文案统一为"账号信息暂不可用…"，但 `ok` 布尔值泄露存在性 | 有，IP 20 rpm（`src\lib\rate-limit.ts:16`） | 配合账号字典批量探测有效账号；无需尝试口令即可确认存在 |
| ENUM-3 | `POST /api/auth/check-role` | 邮箱 → 角色 | **是**：返回 `role` 或 `null`（`src\app\api\auth\check-role\route.ts:24-33`）；管理员被抑制为 null | 有，IP 10 rpm（`src\lib\rate-limit.ts:19`） | 探测角色归属；可与 ENUM-1 交叉验证 |
| ENUM-4 | `POST /api/auth/login-status` | 邮箱 → 锁定状态/失败次数/剩余次数 | **弱信号可区分**：不存在账号 `failCount=0, locked=false, remaining=5`；存在且近期失败的账号 `failCount>0`（`src\app\api\auth\login-status\route.ts:12-14`） | 有，IP 10 rpm（`src\lib\rate-limit.ts:18`） | 可侧信道识别"正在被攻击/近期失败"的账号；响应时延差未核实（待实测 TD-5） |
| ENUM-5 | NextAuth 凭证登录 `POST /api/auth/callback/credentials` | 账号 + 口令 | **是，区分最细**：错误码 `BAD_USERNAME`（账号不存在）/ `BAD_PASSWORD`（密码错）/ `BAD_ROLE`（身份不符）/ `DISABLED`（已停用）/ `LOCKED`（已锁定），码源 `src\lib\login-accounts.ts:471-515, 558-598`；失败计数在 `src\lib\credential-auth.ts:52-54`；文案映射 `src\app\login\page.tsx:65-83` | 有：共享 IP 20 rpm（`src\lib\rate-limit.ts:17`；`credential-auth.ts:29-32`）；内存账号桶 10 次/5 分钟、锁 15 分钟（`src\lib\login-rate-limit.ts:16-18, 37`）；另有 DB 持久化锁 5 次/30 分钟、锁 30 分钟（`login-accounts.ts:30-31, 232-249`） | 不仅能枚举账号存在性，还能区分"已停用/已锁定"；账号维度锁定只保护已知账号，对字典首探无效 |
| ENUM-6 | `POST /api/auth/forgot-password` | 邮箱/手机号 → 重置邮件 | **文案已统一**：无论存在与否都返回通用提示（`src\app\api\auth\forgot-password\route.ts:39-90`），不回显存在性；**残留时序侧信道**：仅命中账号才走库查询/发信，响应时延可能不同 | 有，IP 5 rpm（`src\lib\rate-limit.ts:21`） | 需计时攻击或邮件投递侧泄露；静态无法确认时延差（待实测 TD-6） |
| ENUM-7 | `GET /api/teachers`（搜索 `q`） | 教师姓名/手机号/科目 | 登录即可达（GET 仅校验会话 `src\app\api\teachers\route.ts:18-19`，未做 admin 角色守卫）；返回命中列表，空结果与有权限无命中不可对匿名区分 | 走 apiHandler 兜底 200/300 rpm；无搜索关键字维度限流 | 前置：任意已登录会话。可按姓名/手机号模糊批量拉取教师名册（与 D-1/D-2 合并治理） |
| ENUM-8 | `GET /api/students`（搜索 `q`） | 学员姓名/家长姓名/家长手机号 | 仅管理员可达（`src\app\api\students\route.ts:48-50`）；`OR` 模糊匹配姓名/电话/家长名/家长电话（`:108-113`）；上限 500（`:62-64`） | 兜底限流；无关键字维度限流 | 前置：管理员。可按手机号反查家长-学员绑定关系 |
| ENUM-9 | `GET /api/admin/global-search` | 姓名关键字（跨用户/教师/学员/家长） | 仅管理员；每类 `take: 8`（`src\app\api\admin\global-search\route.ts:28-35`） | 兜底限流 | 前置：管理员；结果条数受限 |
| ENUM-10 | `GET /api/teachers/options` | 在职教师姓名/科目 | 仅管理员（`src\app\api\teachers\options\route.ts:10` `requireAdminUser`）；全量 active 教师，无 `take`（`:12-16`） | 兜底限流 | 前置：管理员；用于下拉选项，名册可整表导出 |
| ENUM-11 | `POST /api/teachers`（创建冲突响应） | 教师手机号 | 写接口；手机号已存在返回 409 `TEACHER_PHONE_EXISTS`，错误文案回显提交的手机号与已存在教师姓名（`src\app\api\teachers\route.ts:217-222`） | 兜底限流 | 前置：管理员；可用于手机号存在性反向核对，但前置门槛高 |
| ENUM-12 | `GET /api/auth/activate/[token]` | 激活令牌 | 非法/过期 404，有效 200 并回显家长姓名/邮箱/学员（`src\app\api\auth\activate\[token]\route.ts:25-35`）；令牌 `randomBytes(32)` 256-bit 熵（见第一章 A-5） | 无独立令牌维度限流；走兜底 | 令牌熵足够使在线枚举不可行；风险在链接泄露后的复用窗口 |
| ENUM-13 | `GET/POST /api/volunteer/consultation` | 家长留言线索（姓名/电话/学员） | 登录用户；parent 仅见本人 `parentId`，admin 见全部（`src\app\api\volunteer\consultation\route.ts:9-11,16`）；`take: 100`（`:19`） | 兜底限流 | 低：属业务线索表，非账号体系 |
| ENUM-14 | `GET /api/schools` | 学校档案（电话/地址/学费/官网） | 任意登录用户可读全量（`src\app\api\schools\route.ts:10-11` 鉴权、`:14-57` 查询），不区分角色 | 兜底限流 | 非账号枚举，但家长角色可批量拉取学校商业信息 |

### 4.4.1 短信/推送发送侧

- 未发现独立的"发送短信验证码 / 发送推送"面向匿名用户的接口；家长通知与企微推送由后台任务与管理员/教师动作触发（`src\app\api\notifications\route.ts`、`src\lib\wxpusher.ts`、`src\lib\qywx.ts`）。
- WxPusher 回调 `src\app\api\wxpusher\callback\route.ts:14-17` 校验 `appToken`；企微事件 `src\app\api\qywx\event\route.ts:44-50` 校验签名与 CorpId。未发现可被匿名利用的"按手机号触发推送"接口。

## 4.5 限流真实覆盖率

### 4.5.1 lib 模块覆盖表

| lib 模块 | 文件大小 | 导出的函数 | 全项目调用点数量（非测试） | 实际保护的路由 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `src\lib\rate-limit.ts` | 5982 B | `checkRateLimit`、`checkRateLimitSync`、`getRule` | 直接 import 5 个非测试文件：`lib\api-handler.ts:3`、`lib\credential-auth.ts:10`、`app\api\ai\public-assistant\route.ts:4`、`lib\teacher-ai-rate-limit.ts:1`、`lib\api-rate-limit.ts:2`（转发）；`app\api\ai\chat\route.ts` 不直接 import 本 lib，其进程内 Map 桶见 D-5/D-14 | 287 个经 `apiHandler` 包装的路由（兜底桶）+ 3 个直接调用点（public-assistant、credential-auth、teacher-ai） | **生效（核心限流）**；Redis 在线时跨进程共享，`REDIS_URL` 未配置时降级内存（`src\lib\rate-limit.ts:1-9, 47-60`） |
| `src\lib\api-rate-limit.ts` | 156 B | 旧版 `deprecatedRateLimiter` 风格转发（纯 re-export） | **0 处业务引用**（grep 全仓非测试文件无 import） | 无 | **空壳/死代码**，易被误判为"API 层独立限流已生效"；与第一章 B-1 同一项 |
| `src\lib\login-rate-limit.ts` | 2856 B | `checkCredentialRateLimit`、`recordCredentialFailure`、`clearCredentialFailures`、`buildCredentialAccountKey` | 1 处：`lib\credential-auth.ts` | 仅 NextAuth 凭证登录；内存账号桶 10 次/5 分钟、锁 15 分钟（`:16-18`）；另有 DB 持久化锁 5 次/30 分钟、锁 30 分钟（`login-accounts.ts:30-31,232-249`） | **生效（仅登录链路）**；内存桶随重启清空；不覆盖注册、预检、找回密码等其他枚举面 |
| `src\lib\teacher-ai-rate-limit.ts` | 374 B | `checkTeacherAiRateLimit` | 2 处：`app\api\teacher\ai-feedback\article\route.ts`、`app\api\teacher\ai-feedback\chat\route.ts` | 2 个教师 AI 反馈接口 | **生效（2 个接口）**；按 `teacher:${teacherId}` 键 2 次/分钟（`teacher-ai-rate-limit.ts:3,6-12`），内部复用 `rate-limit.ts` |
| `src\lib\request-ip.ts` | 664 B | `getTrustedClientIp` | 5 处：`lib\api-handler.ts`、`lib\auth.ts`、`app\api\ai\public-assistant\route.ts`、`app\api\auth\log-device\route.ts`、`app\api\auth\session-ping\route.ts` | 所有 IP 维度限流与审计取 IP | **生效**；仅读 `X-Real-IP`，不采信 `X-Forwarded-For`（`src\lib\request-ip.ts:15-17`）；信任前提见 D-15 |

### 4.5.2 包装覆盖率与未包装路由清单

- 扫描口径：`src\app\api` 下 **343 个目录、296 个非测试 `route.ts`**（另有 56 个 `route.test.ts`）。
- **287 个**路由经 `apiHandler` 包装，在入口统一执行 `checkRateLimit`（`src\lib\api-handler.ts:97-110`）；**9 个**未包装。
- `RATE_RULES` 共 **21 条前缀规则**（`src\lib\rate-limit.ts:15-35`），兜底 `/api` 200 rpm；`GET/HEAD` 在 apiHandler 内被放宽到 300 rpm（`src\lib\api-handler.ts:101-103`）。

**未包装的 9 个路由逐个定性**：

| 路由 | 自身鉴权 | 是否有应用层限流 | 定性 |
| --- | --- | --- | --- |
| `api\auth\[...nextauth]\route.ts` | NextAuth provider；`credential-auth.ts` 内挂 `checkRateLimit` + `checkCredentialRateLimit` | 有（登录双限流） | 生效，未走包装但已自行接线 |
| `api\cron\daily-ops-report\route.ts` | URL query `CRON_SECRET`/`HEALTH_TOKEN` 比对（`:56-58`） | 无 | 令牌保护；无速率限制，令牌泄露后可被高频触发 |
| `api\cron\retry-notifications\route.ts` | 同上（`:256-258`） | 无 | 同上 |
| `api\health\route.ts` | 未带 `HEALTH_TOKEN` 仅回 `{status:'ok'}`（`:26-28`）；带 token 才返回 DB 延迟/内存/uptime | 无 | 匿名侧不泄露内部指标；带 token 详情无节流 |
| `api\parent\students\[id]\learning-report\route.ts` | `getCurrentUser` 鉴权（`:28-29`），家长按本人子女作用域 | **无**（未走 apiHandler） | 登录后接口；AI 调用按 AI 限流规则兜底（前缀 `/api/ai` 之外，走 200 rpm 兜底） |
| `api\public\teacher-showcase\route.ts` | **匿名**（proxy 白名单） | **无**（未走包装、未调 `checkRateLimit`） | **最高优先盲区**：匿名全量名册 + 无限流 + 无分页 |
| `api\public\teacher-showcase\portrait\route.ts` | 匿名但需公开头像令牌 `verifyPublicTeacherPortraitToken`（`:43-48`） | 无 | 令牌保护；头像出站经马赛克处理（`:14-19, 69-75`） |
| `api\qywx\event\route.ts` | 签名 + CorpId 校验 | 无 | webhook；签名通过前不落地业务 |
| `api\wxpusher\callback\route.ts` | `appToken` 比对（`:14-17`） | 无 | webhook；令牌校验通过前不落地业务 |

### 4.5.3 公开 API 可抓取性与单 IP 额度复核

| 接口 | 匿名可达 | 限流证据 | 返回资产 | 镜像评估 |
| --- | --- | --- | --- | --- |
| `POST /api/ai/public-assistant` | 是（`src\proxy.ts:76`） | `checkRateLimit(ip, 'public-home-assistant', 5)`，5 rpm/IP（`src\app\api\ai\public-assistant\route.ts:44-52`）；无每日总量上限 | 营销问答文本（DeepSeek 调用） | 单 IP 5 次/分钟；无日配额，存在成本侧被反复调用的风险；限流键为 IP |
| `GET /api/public/teacher-showcase` | 是（GET/HEAD，`src\proxy.ts:44-46, 77`） | **无**（4.5.2 已列） | 全量在职教师对外展示集合（姓氏称呼/层级/科目/院校/学历/脱敏简介/头像种子，无全名与联系方式） | 一次请求整表镜像；无分页、无 ETag 契约、无每日上限、无服务端长缓存 |
| `GET /api/volunteer/schools` | 是（`src\proxy.ts:96`） | apiHandler 规则 500 rpm/IP（`src\lib\rate-limit.ts:31`）；`Cache-Control: no-store` | 学校档案 + 配额 + 一分一档 | 500 rpm 阈值明显高于其他公开接口；单请求数据量大，适合加缓存与分页 |
| `GET /api/volunteer/yifenyidang` | 否（不在 proxy 白名单，需登录；路由内无角色判断，`:7-15`） | apiHandler 兜底 200 rpm；`Cache-Control: public, max-age=3600, stale-while-revalidate=300`（`src\app\api\volunteer\yifenyidang\route.ts:31`）；按 `year` 过滤、无 `take` | 全年一分一档表 | 登录后可拉全表；有浏览器/CDN 缓存削峰 |
| `GET /api/volunteer/quota` | 否（需登录，任意角色） | apiHandler 兜底 200 rpm；固定 `take: 2000` | 配额记录 | 家长账号即可拉 2000 条 |
| `/volunteer/docs/*` 静态目录 | 是（`src\proxy.ts:92`） | 无应用层限流；由 Nginx/CDN 缓存层承担 | 指南文档、xlsx、txt | 文件名可被清单接口（`/api/volunteer/documents`）枚举后直链下载 |

### 4.5.4 IP 取值与绕过面

- `src\lib\request-ip.ts:15-17`：仅取 `X-Real-IP`，`X-Forwarded-For` 完全不解析；这一设计避免了"攻击者换 XFF 第一个值绕过 IP 限流"。
- 残留前提：`X-Real-IP` 必须由上层 Nginx/CDN **覆写**，不能透传客户端自带的值。当前 Nginx 配置 `proxy_set_header X-Real-IP $remote_addr`（`deploy\nginx\edu-manage.conf:12, :53`），本机直连场景正确；CDN 回源后该头是否被覆写为真实访客 IP，代码库无证据（待实测 TD-4）。若 CDN 未覆写，所有匿名请求将归并到 CDN 出口 IP，限流要么集体误伤、要么按错误 IP 分桶。

## 4.6 WAF / CDN / Bot 管理现状（配置证据）

### 4.6.1 已核配置文件清单

| 文件 | 与防爬/Bot 相关的内容 | 结论 |
| --- | --- | --- |
| `deploy\nginx\edu-manage.conf` | 63 行，三个 server 块（80 代理、80→443 跳转、443 SSL 代理）：`proxy_pass http://127.0.0.1:3000`（`:9, :50`）；`proxy_set_header X-Real-IP $remote_addr`（`:12, :53`）；`X-Forwarded-For` 追加（`:13, :54`）。**全文无 `limit_req_zone` / `limit_req`，无 `map` UA 黑名单，无 WAF 模块（lua/modsecurity），无 `allow/deny` ACL，无 Bot 识别规则，无静态文件缓存段** | Nginx 层未见限流与 Bot 管理 |
| `deploy\nginx\old-cutover-proxy.conf` | 旧切换代理配置，仅 `proxy_pass` 与头转发，同样无 `limit_req`/Bot 规则 | 遗留配置，不生效 |
| `compose.production.yaml` | 服务端口 `127.0.0.1:3000:3000`（`:65-66`）；无独立边缘网关/WAF/限流容器；无 `traefik/nginx-ingress` 限流注解 | 应用层直挂本机回环，边缘防护不在 compose 内 |
| `next.config.ts:82-159` | 仅安全响应头（CSP、HSTS、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`）与静态/API 缓存头；无 Bot/UA/频率相关配置 | 无 Bot 规则 |
| `Dockerfile` / `Dockerfile.runtime` | 纯 Next standalone 运行时构建，无网络层规则；`public` 静态目录拷贝进镜像（`Dockerfile:56-59`） | 无 WAF/限流 |
| `docs\production-safety.md:37-64` | 仅应用层限流说明（Redis 降级、IP 取头、CDN 回源需覆写真实 IP 的注意事项）；**无 WAF、CDN Bot 管理、边缘 ACL、验证码章节** | 文档层未规划边缘防护 |
| `阿里云预构建部署说明.md` | 构建/产物/部署流程说明；**未出现 CDN 域名回源、WAF、Bot 管理、边缘限流、UA 拦截的配置步骤** | 运维层策略未落文档 |

### 4.6.2 验证码 / 人机校验排查

- 全仓 `src\` 与 `package.json` 关键字 `captcha / turnstile / hcaptcha / recaptcha / geetest / slider / 滑块 / verification code`：**0 处人机校验命中**（唯一 `slider` 字样是 `globals.css:7833` 的 slick 轮播样式类 `slick-slider`，与验证码无关）。
- 结论：登录、预检、找回密码、公开 AI 问答、留言提交等所有面向匿名/弱鉴权的环节，**均无图形验证码、滑块、Cloudflare Turnstile、hCaptcha、极验等人机校验**；也无设备指纹之外的行为风控。

### 4.6.3 CDN 侧现状（证据边界）

- 已知事实：生产已配 CDN（任务背景与 `docs\production-safety.md:41` 关于 CDN 回源真实 IP 的提示互证）。
- 代码库与仓库内配置中**未发现** CDN 侧 Bot 管理、UA 黑名单、边缘 `limit_req`、URL ACL、静态目录鉴权签名的任何痕迹；线上 CDN 控制台是否另配了上述策略，仓库无法证实或证伪，归入 ③ D-13，待运维在控制台核对（待实测 TD-3）。

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| D-1 | 匿名接口 `/api/public/teacher-showcase` 无分页、无独立限流，一次请求镜像全量在职教师名册 | ①已具备但不完善 | 教师对外资料被整站批量爬取；公开 AI 问答与展示页成为数据出口 | 小(<1天) | 立刻 |
| D-2 | 4 个后台列表 `limit/pageSize` 未 clamp（teachers/notifications/leave-requests/settings/logs），`?limit=100000` 直达 `take`；teachers 另有全量 `findMany` 内存分页 | ①已具备但不完善 | 已登录的管理员/教师可单请求拖全量通知/请假/日志/教师数据；大 `take` 可造成 DB 与内存压力 | 小(<1天) | 近期 |
| D-3 | 登录与 4 个预检接口响应区分存在性/停用/锁定，限流仅按共享 IP，无被探测账号维度聚合 | ①已具备但不完善 | 慢速换 IP 逐条枚举注册手机号/邮箱及账号状态；字典首探不触发账号锁定 | 小(<1天) | 近期 |
| D-4 | 9 个路由未走 `apiHandler`；其中 teacher-showcase（匿名）、learning-report、cron、health、两个 webhook 未挂应用层限流 | ①已具备但不完善 | 限流覆盖存在结构性盲区；匿名接口与内部任务端点不受统一桶约束 | 小(<1天) | 近期 |
| D-5 | 兜底限流 200 rpm、GET 300 rpm 偏宽；公开 AI 助手 5 rpm/IP 但无日配额；Redis 降级内存；ai/chat 为进程内 Map | ①已具备但不完善 | 高频批量拉取与 AI 成本滥用；多实例/重启后限流状态失真 | 中(1-3天) | 近期 |
| D-6 | robots.ts 遗漏 9 个认证页前缀；`/services` 规则与静态 rewrite 意图不一致 | ①已具备但不完善 | 仅君子协定级别风险；向侦察者暴露路径结构的代价有限 | 小(<1天) | 长期 |
| D-7 | `/volunteer/docs/*` 静态目录匿名公开，上传文档按文件名直链可达，无签名/过期；public 内存量 xlsx/测试 PDF 残留 | ①已具备但不完善 | 文档链接泄露后永久可下载；测试残留混淆生产资产清单 | 小(<1天) | 近期 |
| D-8 | 全链路无验证码/滑块/turnstile/hCaptcha/极验，无 Bot 指纹与行为风控 | ②完全缺失 | 换 IP 慢速枚举、接口薅取、AI 成本滥用无人机校验兜底 | 大(>3天) | 长期 |
| D-9 | 无跨接口按"被探测账号/手机号/关键字"聚合的频率限制 | ②完全缺失 | 同一手机号可在 detect-role、login-check、check-role、login-status、登录、找回密码之间被分散探测，单接口阈值都不超限 | 中(1-3天) | 近期 |
| D-10 | 全量导出接口无冷却期与每日次数上限，仅受兜底 200 rpm 约束 | ②完全缺失 | 管理员账号（或被窃会话）可反复导出全量学员/费用表；审计日志有记录但无事前节流 | 小(<1天) | 近期 |
| D-11 | 公开数据接口无分页契约/ETag/分片返回，名册类资源一次响应整表 | ②完全缺失 | 降低爬取成本，整站镜像无需翻页 | 中(1-3天) | 长期 |
| D-12 | Nginx 无 `limit_req`、无 UA/Bot 黑名单、无 ACL；仓库未见 WAF 模块与规则 | ③架构运维层 | 应用层桶被绕过（直连回环/多 IP）后无第二道边缘防线 | 中(1-3天) | 近期 |
| D-13 | CDN 侧 Bot 管理/边缘限流/ACL 在代码与文档中无证据，线上配置待核实 | ③架构运维层 | 若 CDN 未配边缘规则，所有防爬压力都压在应用单机桶上 | 中(1-3天) | 近期 |
| D-14 | 限流驱动 auto 降级内存；ai/chat 桶为进程内 Map；多实例下阈值被分摊、重启清零 | ③架构运维层 | 分布式部署时限流阈值失真；重启后被封账号/IP 记录清空 | 中(1-3天) | 近期 |
| D-15 | IP 维度唯一信任 `X-Real-IP`，前提是上层 Nginx/CDN 覆写该头；CDN 回源透传情况待核实 | ③架构运维层 | 若回源未覆写，限流按错误 IP 分桶（误伤或失效），审计 IP 失真 | 小(<1天) | 近期 |
| D-16 | 未见异常 UA、高频 401、单 IP 大流量下载的日志审计与告警配置 | ③架构运维层 | 批量爬取/枚举行为无可观测信号，事后无法回溯定位 | 中(1-3天) | 长期 |

## ① 已具备但不完善

### D-1 匿名教师名册接口无分页、无独立限流

- **证据**：
  - `src\app\api\public\teacher-showcase\route.ts:91-108`：双库 `teacher.findMany({ where: { status: 'ACTIVE' } })`，**无 `take`、无 `skip`**；内部 select 含全名、性别、院校、简介（`:95-106`）。
  - 公开输出在 `:157-169` 的 `publicTeachers` 映射中收敛为：姓氏+老师称呼、层级、科目、脱敏简介、院校、学历、头像种子/类型；全名、性别原值、手机号、邮箱不下发；简介经 `getPublicTeacherBio`（`:63-80`）剥离收费/单位/带生数量与全名。
  - 该路由不在 `apiHandler` 包装内，全文未出现 `checkRateLimit`（4.5.2 清单第 6 行）。
  - 匿名放行：`src\proxy.ts:44-46, 77` 对 GET/HEAD 放行 `/api/public/teacher-showcase`；响应 `Cache-Control: public, max-age=0, s-maxage=0, must-revalidate`（`:174`），即 CDN/浏览器不做长缓存，每次都回源。
- **危害**：匿名攻击者单次请求即可拉取全部在职教师的对外展示集合（姓氏称呼、层级、科目、院校、学历、简介、头像种子）；无翻页、无每日上限、无服务端长缓存，配合公开 AI 问答与展示页可构成半公开教师画像出口。全名与联系方式虽不下发，但科目/院校/层级/简介组合仍可被用于人物关联测绘。
- **利用前置条件**：匿名即可，无需登录。
- **修复方案**：
  1. 在 `src\app\api\public\teacher-showcase\route.ts` 入口加 `checkRateLimit(getTrustedClientIp(req.headers), '/api/public/teacher-showcase', 30)`（参照 `public-assistant\route.ts:44-52` 的写法），或直接改为 `apiHandler` 包装并在 `RATE_RULES` 增加前缀规则。
  2. 给 `findMany` 加 `take`（如 100）与分页参数；对外名册字段进一步收敛（去掉 `university/bio` 等非展示必需项，以页面实际渲染字段为准）。
  3. 为该静态名册加 `s-maxage` 服务端缓存（如 300s），避免每次请求回源全表。
- **工作量**：小(<1天)
- **优先级**：立刻

### D-2 后台列表分页上限未 clamp，大 `take` 直达 Prisma

- **证据**：
  - `src\app\api\teachers\route.ts:29-30`：`const limit = parseInt(searchParams.get('limit') || '100')`，无 `Math.min/Math.max`；`:50-53` `tierRows = teacher.findMany({ ... })` 不带 `take`；`:59-65` 在内存中 `slice` 分页。
  - `src\app\api\notifications\route.ts:22-23`：`parseInt` 无 clamp；`:32-33` `take: limit`；角色 admin（`:16-18`）。
  - `src\app\api\leave-requests\route.ts:17-18`：`parseInt` 无 clamp；`:36-45` `take: limit`；admin/teacher，teacher 按本人学员作用域（`:26-30`）。
  - `src\app\api\settings\logs\route.ts:17`：`pageSize = parseInt(...)` 无 clamp；`:31-37` `take: pageSize`；admin。
  - 对照已正确写法：`src\app\api\students\route.ts:61-64` `Math.min(500, Math.max(1, requestedLimit))`。
- **危害**：持有登录会话（或被窃会话）后，`?limit=100000` 可单请求拉全量通知、请假记录、审计日志；`teachers` 的全表 `findMany` 先把教师表载入内存排名，大表场景存在 DB/内存压力；`parseInt` 未指定 radix 且未处理 `NaN`，异常值还可能让 `take/skip` 落入非预期分支。
- **利用前置条件**：已登录会话；`notifications/settings/logs` 需 admin，`leave-requests` 需 admin/teacher，`teachers` GET 未做角色守卫（登录即可达）。匿名仍被 proxy 白名单拦截。
- **修复方案**：在上述 4 个路由的参数解析处统一改为 `Math.min(上限, Math.max(1, Number(...) || 默认值))`，建议上限：teachers 200、notifications 200、leave-requests 100、settings/logs 200；`teachers:50-53` 的全量 `tierRows` 改为 DB 端排序 + `take/skip`，或先 `count` 再分页加载；`parseInt` 补 radix 10 并对 `NaN` 兜底。可在 `src\lib\` 新增 `clampListParams(searchParams, {defaultLimit, maxLimit})` 复用，收口所有裸 `parseInt`。
- **工作量**：小(<1天)
- **优先级**：近期

### D-3 预检/登录接口响应可区分账号存在性，缺少被探测账号维度聚合限流

- **证据**：
  - `src\app\api\auth\detect-role\route.ts:17-23`：命中返回角色，未命中 `role: null`；规则 5 rpm/IP（`src\lib\rate-limit.ts:15`）。
  - `src\app\api\auth\login-check\route.ts:21-29`：`ok: true/false` 两态；规则 20 rpm/IP（`:16`）。
  - `src\app\api\auth\check-role\route.ts:24-33`：`role` 或 `null`；规则 10 rpm/IP（`:19`）。
  - `src\app\api\auth\login-status\route.ts:12-14`：返回 `failCount/locked/remaining`；规则 10 rpm/IP（`:18`）。
  - 登录错误码分流：码源 `src\lib\login-accounts.ts:471-515, 558-598`，失败计数 `src\lib\credential-auth.ts:52-54`；前端文案映射 `src\app\login\page.tsx:65-83`；账号维度锁定为内存桶 10 次/5 分钟锁 15 分钟（`login-rate-limit.ts:16-18`）+ DB 持久化 5 次/30 分钟锁 30 分钟（`login-accounts.ts:30-31,232-249`），均只在失败发生后生效，字典首探不计入。
- **危害**：攻击者用账号字典 + 轮换 IP，可在每个接口 5-20 rpm 的共享桶内慢速探测"哪些手机号/邮箱注册了系统、属于什么角色、是否被停用/锁定"；现有账号维度锁定只保护已被撞过的账号，首次探测不计入。
- **利用前置条件**：匿名；需要 IP 池或慢速单 IP（受 5-20 rpm 约束）。
- **修复方案**：
  1. 响应收敛：`login-check` 的 `ok` 布尔改为与登录一致的通用错误（存在/不存在同态响应）；`check-role` 对未命中与无权限返回相同结构；`login-status` 对不存在账号返回与存在账号相同的 `remaining` 区间，隐藏 `failCount` 差值。
  2. 在 `src\lib\login-rate-limit.ts` 增加"按被探测标识（手机号/邮箱规范化后的 hash）聚合"的计数：跨 detect-role/login-check/check-role/login-status/登录/找回密码共享同一把"标识维度"桶（如 20 次/天/标识），与现有 IP 桶取交集。
  3. 统一认证侧响应时延：未命中账号走一次恒定耗时的空哈希比较，抹平时序差。
- **工作量**：小(<1天)
- **优先级**：近期

### D-4 未走 apiHandler 的路由未挂统一限流，存在覆盖盲区

- **证据**：296 个非测试 `route.ts` 中 9 个未包装（4.5.2 清单）；`teacher-showcase`、`portrait`、`learning-report`、两个 cron、`health`、两个 webhook 未调用任何限流函数。
- **危害**：统一桶约束不到这些端点；匿名 `teacher-showcase` 是最直接的数据出口，cron/health 令牌泄露后也无速率兜底。
- **利用前置条件**：teacher-showcase 匿名；其余需令牌或登录。
- **修复方案**：
  1. `learning-report` 改为 `apiHandler` 包装（保留现有 `getCurrentUser` 守卫）。
  2. `cron/*`、`health` 在令牌校验通过后补一个低频 IP 桶（如 30 rpm），防止令牌泄露后的高频触发。
  3. 两个 webhook 保持签名校验不变；可在签名校验前加匿名 IP 桶（如 60 rpm）抑制伪造报文冲击。
  4. 在 `scripts\security-check.mjs` 增加一条检查：所有 `route.ts` 必须 import `apiHandler` 或显式调用限流函数，未接线的列入告警（当前脚本未覆盖此项）。
- **工作量**：小(<1天)
- **优先级**：近期

### D-5 兜底阈值偏宽，AI 公开接口无日配额，降级路径风险

- **证据**：
  - 兜底 `/api` 200 rpm，`GET/HEAD` 放宽 300 rpm（`src\lib\rate-limit.ts:35`；`src\lib\api-handler.ts:101-103`）。
  - 公开 AI：5 rpm/IP、无每日上限（`src\app\api\ai\public-assistant\route.ts:44-52`）；登录 AI 聊天 `ai/chat\route.ts:136-163` 为进程内 `Map` 桶，默认 10 次/分钟、100 次/天，重启清零。
  - 驱动降级：`src\lib\rate-limit.ts:1-9`，`REDIS_URL` 未配置时走内存 `memBuckets`。
- **危害**：200/300 rpm 的兜底桶对列表与导出类接口偏宽；公开 AI 接口无日配额，单 IP 可长期持续消耗 DeepSeek 调用成本；多实例部署时内存桶各自为政，阈值被分摊；重启后失败计数与封禁状态清空。
- **利用前置条件**：匿名（公开 AI）；已登录（其他接口）。
- **修复方案**：
  1. 对列表/搜索/导出前缀在 `RATE_RULES` 单独设更低阈值（如 30-60 rpm），兜底桶只用于写操作与高频轮询。
  2. `public-assistant` 增加按 IP 的每日配额（复用 Redis 计数或 `ai/chat` 的日桶结构）。
  3. 推动 `ai/chat` 桶切换到 Redis 驱动，与 `rate-limit.ts` 统一；`memBuckets` 超过容量时的淘汰策略保留，但生产必须强制 Redis。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-6 robots 清单遗漏认证页前缀，规则与 rewrite 存在不一致

- **证据**：`src\app\robots.ts:8-16` 未覆盖 `/appointment-detail`、`/class-detail`、`/closed-loop`、`/communication-center`、`/daily-class`、`/feedback-performance`、`/single-session-feedback`、`/teacher-compliance`、`/volunteer-center`；`robots.ts:13` Disallow `/services`，而 `src\proxy.ts:89` 匿名放行 `/services/`、`next.config.ts:77` 有对应 rewrite。
- **危害**：robots 是君子协定，proxy 仍在匿名访问时拦截；遗漏的代价主要是路径结构暴露给侦察者，不构成直接数据泄露。
- **利用前置条件**：无（仅影响合规爬虫行为）。
- **修复方案**：把 9 个遗漏前缀补进 `robots.ts`；明确 `/services` 是公开营销页（应 Allow）还是内部页（应在 rewrite 处加鉴权），消除两条规则的矛盾。
- **工作量**：小(<1天)
- **优先级**：长期

### D-7 公开静态目录可直链下载上传文档，public 存在测试残留

- **证据**：
  - `src\proxy.ts:92`：`/volunteer/docs/` 前缀匿名放行。
  - `src\app\api\volunteer\documents\route.ts`：文档清单登录可读，文件本体在静态目录按文件名访问；`public\volunteer\docs\2025-allocation-quota.xlsx` 已在目录内。
  - 测试残留：`public\uploads\materials\test-shuxue.pdf`、`test-yuwen.pdf`、`test-yingyu.pdf`（462-463 B）；`public\uploads\` 根目录 9 个历史上传文件（3 组原图/预览/缩略图，本地残留，`.dockerignore:32` 已排除出镜像构建，线上由 compose `:69` 共享挂载提供，待实测 TD-7）。
- **危害**：指南/配额文档链接一旦泄露即永久可达，无签名、无过期、无访问计数；测试 PDF 与历史上传残留混淆生产资产清单。
- **利用前置条件**：知道或枚举出文件名（清单接口需登录）。
- **修复方案**：
  1. 上传文档迁出 `public` 目录，改走带签名 URL 的私有对象存储（与现有 `src\lib\storage.ts` 上传链路一致），签名带过期时间。
  2. 删除 3 个测试 PDF 与 `uploads/uploads` 本地残留；在 `.dockerignore` 已有排除的前提下，确认生产镜像内不存在这些文件（待实测 TD-7）。
  3. 对必须公开的 xlsx/txt 素材，在文件名与目录清单上明确标注"公开"。
- **工作量**：小(<1天)
- **优先级**：近期

## ② 完全缺失

### D-8 全链路无人机校验（验证码/滑块/Turnstile/hCaptcha/极验），无 Bot 指纹风控

- **证据**：`src\` 与 `package.json` 对 `captcha/turnstile/hcaptcha/recaptcha/geetest/slider/滑块` 0 命中；UA 仅在 `auth.ts:126-128`、`log-device\route.ts:18-30`、`session-ping\route.ts:39-46` 被解析为设备指纹，不参与拦截决策。
- **危害**：登录爆破、账号枚举、公开接口薅取、AI 成本滥用都没有第二道人机关卡；换 IP + 慢速请求即可绕过应用层 IP 桶。
- **利用前置条件**：匿名；脚本化请求。
- **修复方案**：
  1. 优先在登录与预检接口接入无感校验（Cloudflare Turnstile 或 hCaptcha），失败多次/高频后强制弹出；公开 AI 问答与留言提交可接入轻量 Turnstile。
  2. 补充基础风控信号：UA 一致性、请求间隔分布、单 IP 401/403 比例，命中阈值后要求人机校验。
  3. 选型与接入点写入 `docs\production-safety.md`，避免只在前端校验（校验结果必须服务端复核）。
- **工作量**：大(>3天)
- **优先级**：长期

### D-9 无跨接口按被探测标识聚合的枚举防护

- **证据**：现有限流键为 IP（`rate-limit.ts`）与登录账号（`login-rate-limit.ts`）；detect-role/login-check/check-role/login-status/登录/找回密码各自独立分桶，没有"同一手机号/邮箱被反复探测"的聚合计数（4.4 ENUM-1~ENUM-6）。
- **危害**：攻击者把同一标识分散到 6 个接口探测，单接口都不超阈值，整体却完成了账号存在性测绘。
- **利用前置条件**：匿名；持有手机号/邮箱字典。
- **修复方案**：在 `src\lib\` 新增 `identity-pivot-limit.ts`：对规范化后的标识 hash 计数（如 20 次/天/标识、5 次/小时/标识），上述 6 个接口在解析出标识后统一调用；超限返回通用 429。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-10 全量导出接口无冷却期与每日次数上限

- **证据**：`src\app\api\settings\export\students\route.ts:19-23` 全量 `findMany`；`:45-48` 写审计日志 `EXPORT_STUDENTS`；仅受 apiHandler 兜底 200 rpm 约束，接口内无"每日 N 次 / 两次间隔 ≥ X 分钟"限制。同类导出（费用、登录记录、反馈归档）同口径。
- **危害**：管理员账号或被窃会话可在一天内反复导出全量学员/费用/日志表；审计日志能事后追责，但没有事前节流，数据泄露窗口内可被多次拉走。
- **利用前置条件**：管理员会话。
- **修复方案**：在 `src\lib\` 新增导出限流 helper：按 `userId + 导出类型` 计数（如 10 次/天、间隔 ≥ 5 分钟），Redis 持久化；超限 429 并记审计日志；大表导出改为异步任务 + 下载链接签名过期。
- **工作量**：小(<1天)
- **优先级**：近期

### D-11 公开/半公开数据接口无分页契约与防镜像响应设计

- **证据**：`teacher-showcase`、`volunteer/schools`、`schools`、`volunteer/quota` 等整表返回（4.3.2、4.5.3）；响应无 `nextCursor/ETag` 分页契约，`schools` 等接口 `Cache-Control` 策略未统一。
- **危害**：爬取方一次请求即可整表镜像，无需翻页尝试；缺少 ETag 也使缓存重验证无法削减重复拉取。
- **利用前置条件**：匿名或低权限账号。
- **修复方案**：名册/目录类接口统一游标分页（`cursor` 或 `page+pageSize`）；为稳定数据加 `ETag`/`s-maxage` 缓存；公开接口响应字段与页面实际渲染字段对齐，不输出多余列。
- **工作量**：中(1-3天)
- **优先级**：长期

## ③ 架构性/运维层问题（WAF、CDN Bot 管理、端口、日志审计）

### D-12 Nginx 层无 `limit_req`、无 Bot/UA 黑名单、无 ACL；仓库未见 WAF 规则

- **证据**：`deploy\nginx\edu-manage.conf:1-63` 仅反向代理、头转发与证书跳转，全文无 `limit_req_zone/limit_req`、无 UA `map`、无 `allow/deny`、无 WAF 模块；`compose.production.yaml:65-66` 仅绑定 `127.0.0.1:3000`，无边缘网关容器。
- **危害**：应用层 IP 桶是唯一防线；直连回环（若被内网触达）、多 IP 轮换、恶意 UA 脚本都没有第二道边缘拦截。
- **利用前置条件**：网络可达应用端口或绕过应用层逻辑。
- **修复方案**：
  1. 在 Nginx 增加 `limit_req_zone`（按 IP）对 `/api/` 粗粒度兜底（如 100 r/s、burst 20），与应用层桶形成两层；静态资源目录单独限额。
  2. 对已知攻击 UA/无头浏览器特征做 `map` 拦截或降级；保留对正常搜索引擎 UA 的放行名单。
  3. 评估接入阿里云 WAF 或 Nginx 层面的基础规则集；规则配置纳入 `deploy\nginx\` 版本管理。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-13 CDN 侧 Bot 管理 / 边缘限流 / ACL 配置在仓库中无证据，待控制台核对

- **证据**：`docs\production-safety.md`、`阿里云预构建部署说明.md`、`compose.production.yaml`、`next.config.ts` 均未出现 CDN Bot 管理、边缘限流、UA 拦截、URL ACL、静态签名的配置；线上 CDN 已配置属任务背景事实，但其规则无法从仓库证实。
- **危害**：若 CDN 未配边缘规则，所有防爬压力集中在应用单机桶；CDN 缓存未覆盖的动态接口会被直接回源打到应用。
- **利用前置条件**：匿名。
- **修复方案**：运维在阿里云 CDN/DCDN 控制台核对并归档：Bot 管理（搜索引擎放行、恶意脚本拦截）、边缘限流规则、动态接口缓存策略、`/volunteer/docs/` 等静态目录的访问控制；把规则截图/导出写入 `docs\`，使代码库与线上配置可对照审计。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-14 限流驱动 auto 降级内存，多实例/重启场景防护失真

- **证据**：`compose.production.yaml:59` 已注入 `REDIS_URL=redis://redis:6379`，`docs\production-safety.md:39,43` 说明 `RATE_LIMIT_DRIVER=auto` 在 Redis 连接/命令失败时静默降级为进程内存；`src\lib\rate-limit.ts:1-9, 47-60` 内存桶 `memBuckets`；`src\app\api\ai\chat\route.ts:28, 145-167` 桶为进程内 `Map`，**不走 Redis**，重启清零。
- **危害**：Redis 故障期间限流退化为单机内存，多实例下阈值被实例数分摊；`ai/chat` 的分钟/日配额始终在进程内，重启即清空；生产发布重启后失败计数、封禁状态、AI 日配额丢失。
- **利用前置条件**：Redis 不可用/重启；或生产扩为多实例；频繁发布重启。
- **修复方案**：在启动校验（`src\lib\env-security.ts` 类似机制）中要求生产 `REDIS_URL` 可用，Redis 故障时拒绝降级内存或显式告警；`ai/chat` 桶迁移到 Redis 与主限流统一；内存驱动仅保留给本地 dev，并在启动日志中明确告警"限流运行在内存模式"；监控 `[rate-limit] Redis 不可用，降级为内存限流` 日志（`docs\production-safety.md:43`）。
- **工作量**：中(1-3天)
- **优先级**：近期

### D-15 IP 取信依赖 `X-Real-IP` 被上层覆写，CDN 回源透传情况待核实

- **证据**：`src\lib\request-ip.ts:15-17` 只读 `X-Real-IP`；`deploy\nginx\edu-manage.conf:12, :53` `proxy_set_header X-Real-IP $remote_addr`；`docs\production-safety.md:41` 已提示 CDN 回源需覆写真实 IP。
- **危害**：若 CDN/多层代理未覆写 `X-Real-IP` 而是透传客户端自带值，攻击者可自造该头绕过 IP 限流并污染登录审计 IP；若 CDN 把所有请求写成自己的出口 IP，则匿名限流集体误伤、无法按真实访客分桶。
- **利用前置条件**：链路中存在未正确覆写头的代理层。
- **修复方案**：在 Nginx/CDN 层确认 `X-Real-IP`（或统一改造为校验后的 XFF 最右可信段）由边缘覆写；应用侧可在配置中声明可信代理网段，只接受可信代理传入的 IP 头；上线前用 TD-4 方法实测。
- **工作量**：小(<1天)
- **优先级**：近期

### D-16 缺少异常爬取/枚举行为的日志审计与告警

- **证据**：仓库内未发现针对异常 UA、高频 401、单 IP 大流量下载、批量导出的日志聚合或告警规则；`scripts\security-check.mjs` 覆盖的是代码静态检查，不含运行时行为审计。
- **危害**：批量爬取、账号枚举、导出滥用在发生时无可观测信号，事后只能靠 DB 审计日志回溯，发现滞后。
- **利用前置条件**：—
- **修复方案**：在 apiHandler 限流命中、401/403 集中、导出接口调用处增加结构化日志（IP、接口、标识 hash、UA、命中桶）；接入日志告警（单 IP 分钟级 401 超阈值、单用户导出超阈值、匿名接口流量突增）。
- **工作量**：中(1-3天)
- **优先级**：长期

## 待实测项

> 以下假设静态代码无法确认，**禁止对线上站点做爬取、压测、批量枚举或 UA 伪装**；验证一律在本机 dev 环境低频、单点、可回滚地进行，或由运维在控制台/日志侧核对。

| 编号 | 待验证假设 | 验证方法（低频、单点、可回滚） | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| TD-1 | `/api/public/teacher-showcase` 实际返回条数与响应体积，以及在无限流情况下连续 3 次请求是否均 200 | 本机 `next dev` 启动后，仅用 `curl` 请求 3 次该接口，记录返回 JSON 的教师条数与字节数；不并发、不翻页 | 仅打本机 dev 库，无线上影响 | 确认量级后决定分页大小与缓存策略（D-1） |
| TD-2 | 4 个未 clamp 接口在 dev 库下 `?limit=1000` 是否被 Prisma 接受并返回超量数据 | 本机登录测试账号，逐个请求 `teachers/notifications/leave-requests/settings/logs?limit=1000`，观察返回条数；验证完即关 dev server | 仅本机 dev 库；不指向线上 | 验证 D-2 修复前的真实行为，作为回归基线 |
| TD-3 | 阿里云 CDN 控制台是否已配 Bot 管理、边缘限流、UA 拦截、动态缓存规则 | 运维登录 CDN/DCDN 控制台导出规则清单，与本报告 4.6 对照；不触发任何线上探测 | 只读控制台操作 | 归档规则到 `docs\`；缺失项按 D-13 补齐 |
| TD-4 | CDN 回源后 `X-Real-IP` 是否为真实访客 IP；应用拿到的 IP 是否与访问日志一致 | 在 dev/预发环境经 Nginx 发起请求，对比 `logDeviceFingerprint` 记录的 IP 与 Nginx `$remote_addr`；线上仅核对日志字段，不构造伪造头请求 | 低频单次；伪造头测试只在本机直连场景做 | 确认 D-15 信任链；必要时调整边缘头覆写 |
| TD-5 | ENUM-4 `login-status` 对存在/不存在账号的响应时延差是否可被计时区分 | 本机 dev 环境分别用存在与不存在的测试邮箱各请求 5 次，记录响应时间分布；不做批量字典 | 本机 dev；请求量极小 | 若存在显著时延差，按 D-3 第 3 条抹平 |
| TD-6 | `forgot-password` 对存在/不存在账号的响应时延差，以及发信失败是否回显差异 | 本机 dev 关闭真实发信（使用 mock/无效 SMTP 配置），两类邮箱各请求 3 次计时；核对响应体完全一致 | 本机 dev；不向真实邮箱发信 | 确认文案统一之外是否还需恒定时延处理 |
| TD-7 | 生产共享挂载目录内是否残留 `public/uploads/` 9 个历史上传文件与 3 个测试 PDF；`/volunteer/docs/` 线上文件清单 | 运维在服务器上列主机 `/srv/edu-manage/shared/public/uploads` 与 `/volunteer/docs` 目录（compose `:69, :73` 挂载）；不通过 URL 逐个访问线上文件 | 只读主机目录 | 按 D-7 清理残留；公开素材登记造册 |
| TD-8 | 生产 Redis 是否在线、限流是否走 Redis 驱动；`ai/chat` 进程内桶重启后是否清空 | compose 已注入 `REDIS_URL`（`compose.production.yaml:59`），运维核对运行时 Redis 连通性与降级日志；在预发环境触发 429 后重启实例，观察主限流桶是否保留、`ai/chat` 日配额是否重置 | 配置只读核对 + 预发低频验证 | 按 D-14 将 AI 桶迁移 Redis，并对内存降级加告警 |
| TD-9 | robots/sitemap 线上实际输出与静态分析是否一致（含 9 个遗漏前缀是否被搜索引擎收录） | 用 `curl https://域名/robots.txt`、`/sitemap.xml` 各取一次；搜索引擎收录情况通过站长工具后台查看，不做主动提交 | 单次只读 GET | 按 D-6 补齐 Disallow 清单 |

## 覆盖说明（扫描口径与覆盖数，不作为结论本身）

- **路由覆盖**：`Get-ChildItem src\app\api -Recurse -Filter route.ts`，共 **296 个非测试路由文件**、**343 个 api 目录**；另有 56 个 `route.test.ts` 未纳入业务结论。
- **分页参数扫描**：正则 `searchParams\.get\('(limit|pageSize|page)'\)` 命中 17 个路由文件；逐个精读参数解析行与 `take/skip/slice` 用法，分类结果见 4.3.1-4.3.3。
- **全量查询扫描**：正则 `findMany\(` 与 `take:` 计数比对，筛出"含 `findMany` 但无 `take:`"的 97 个文件（含主查询与嵌套 include 子查询）；其中列表/查询型接口逐个核对鉴权角色与作用域（4.3.2），配置表/小表/作用域收敛项已标注低风险。
- **枚举接口扫描**：目录名匹配 `search|options|activate|check|exists|verify|phone|login|detect|forgot|reset|sms|push|consult`，共命中 20+ 路由；精读登录、预检、搜索、创建冲突、激活令牌、留言 14 项（4.4 ENUM-1~ENUM-14）。
- **限流引用扫描**：对 `rate-limit / api-rate-limit / login-rate-limit / teacher-ai-rate-limit / request-ip` 五个 lib 名称做全仓 import/调用点计数（排除 `*.test.ts`），结果见 4.5.1；`apiHandler` 包装覆盖率按文件级 `Select-String "apiHandler"` 判定（287/296）。
- **WAF/验证码扫描**：在 `src\`、`package.json`、`deploy\`、`docs\`、根目录 `*.yaml/*.ts/*.md` 内 grep `waf|cdn|acl|bot|ratelimit|limit_req|captcha|turnstile|hcaptcha|geetest|slider|recaptcha`；命中项均为注释/文档提示，未发现生效规则或依赖。
- **静态面扫描**：`public\` 全量 525 个文件按扩展名分组；高危扩展名（`.env/.map/.sql/.bak/.backup/.zip/.tar/.gz/.log/.db`）0 命中；可疑 xlsx/pdf/txt/html 逐个核对用途。
- 未覆盖：前端页面内的客户端搜索/下拉拉取逻辑、对象存储（OSS）桶策略与 CDN 缓存键规则、线上真实流量分布；这些分别由前端代码审查章节、运维配置核对与待实测项 TD-3/TD-7 覆盖。

# 第五章　防数据窃取与数据泄露

> 审查对象：`D:\01muzhexuetang\muzhexuetang\coding\edu-manage`（Next.js 16.4.3 App Router + React 19.2.4 + Prisma 5.22/PostgreSQL 15 + next-auth 5.0.0-beta.32 + Redis 6.2.1 + ali-oss 6.23 + sharp + mammoth，Docker 部署于阿里云，已配 CDN）。
> 审查方式：**只读静态审查**，未启动 dev server，未请求线上站点、未读取线上 OSS 对象、未下载任何真实业务数据；所有"防护是否被真正调用 / 覆盖多少路由"的结论均基于全仓 grep 调用点计数与逐行精读。需要线上运行态才能确认的假设一律进入文末"待实测项"。
> 范围限定：服务端导出/下载通道、OSS 签名与上传校验、错误响应与日志脱敏、Sentry 上送面、构建产物与静态资源泄露、备份目录与本地文件读取路由、数据库/Redis 端口暴露。认证码流、会话固化、对象级越权、爬虫枚举、SSRF 主体由第一章/二/三/四覆盖，本章仅在交叉处引用。
> 依赖版本证据：`package.json:87` 服务端 Excel 库为 `xlsx`（SheetJS 0.20.3，CDN tgz）；`:64` html2canvas 1.4.1、`:65` jspdf 4.2.1、`:68` modern-screenshot 4.7.0 均为**客户端浏览器侧**依赖；`:55` @sentry/nextjs 11.9.0；`:56` ali-oss 6.23.0；`:67` mammoth 1.12.0；`:78` redis 6.2.1。全仓**未发现** exceljs / pdfkit / puppeteer 服务端渲染依赖；服务端 PDF 压缩脚本为 `scripts/compress-pdf.py`（Dockerfile:62 拷贝进 runner）。

## 5.1 结论摘要（最要命的 5 条）

1. **`/api/settings/backup/create` 是当前最宽的一条整库级回包通道**：仅 `admin` 单角色鉴权（`src\app\api\settings\backup\create\route.ts:11`），但 `students / teachers / courses / classGroups / fees / enrollments / makeupRequest` 七个 `findMany()` **无 `select`、无 `take` 上限**（`:16-25`），全标量行随 JSON 整体回包（`:44`），其中包含手机号、家长手机号、邮箱、备注自由文本；仅 `attendance` 限 5000 条、`examPaper` 限 1000 条（`:22-23`）。双库模式按 session division 选库，单库模式下存在跨部回包风险。审计日志只有一条笼统的"导出了业务数据"（`:47-49`），无字段级、无行数明细之外的约束。
2. **全部服务端导出/下载通道没有一条专用限流规则，也没有按用户/按日的导出配额与冷却期**：`RATE_RULES` 21 条规则（`src\lib\rate-limit.ts:14-36`）中不存在 export / finance / salary / students / backup 前缀；导出 GET 命中通用 `/api` 200 rpm，GET/HEAD 被放宽到 300 rpm（`src\lib\api-handler.ts:97-104`，`:103`），限流键为 `IP:路径前缀`（`src\lib\rate-limit.ts:156`），不按被登录用户聚合。20 个导出/下载路由里只有 `settings/export/students`、`settings/export/finance` 两处写了 `EXPORT_STUDENTS / EXPORT_FINANCE` 审计（带 rowCount），其余 18 处（报表导出、考勤导出、薪资流水、反馈档案、原图下载、志愿文档下载、备份 JSON 等）均无独立审计条目。
3. **OSS 私有 bucket 开关在代码里从未被读取**：`ALIYUN_OSS_PRIVATE_BUCKET` 只出现在 `src\lib\storage\index.ts:13` 的注释中，全 src grep 仅命中该注释；`put()` 成功后直接拼公网 baseUrl + 对象名返回**未签名**公网 URL（`src\lib\storage\index.ts:219-225`，`:274-277`）。bucket 到底是 public-read 还是私有，代码无法判定，取决于 OSS 控制台配置，归入待实测。本地 driver 下历史 `legacyUrl` 形如 `/uploads/<key>`（`src\app\api\upload\route.ts:224`），而 proxy matcher 显式排除了 `uploads`、`volunteer` 前缀（`src\proxy.ts:202`），该静态旁路是否被 Nginx/CDN 直出需线上核对。
4. **上传校验"图片严、文档松"**：图片通道有 magic bytes 校验（JPEG/PNG/GIF/WebP/HEIC/HEIF/AVIF，`src\app\api\upload\route.ts:29-45,108-113`），材料通道有 15 类扩展名 + 文件头双校验（`src\lib\material-file.ts:1-5,22-41`）；但通用上传的**文档类只做扩展名正则、不校验文件头**（`src\app\api\upload\route.ts:51-53`），志愿文档通道 17 类扩展名 + 20MB、**同样无 magic bytes**（`src\app\api\volunteer\documents\route.ts:35,40`）。`.html/.svg/.js` 不在任何白名单内会被拒；但文档容器内的恶意内容（宏、脚本、伪装扩展名）无第二道防线。
5. **Sentry 接入但未做任何 PII 脱敏配置**：`sentry.server.config.ts:3-8` 与 `sentry.client.config.ts:3-10` 只有 dsn / environment / tracesSampleRate（生产 0.1）/ replay 采样（session 0.1、error 1.0）；全 src grep **0 处** `beforeSend / beforeBreadcrumb / sendDefaultPii / maskAll / blockAll`，未显式关闭默认 PII 上送，client replay 未配 masking。统一错误处理在生产环境把 500 脱敏为通用文案（`src\lib\api-handler.ts:136-140`），query 参数做了脱敏（`:21,36-55`），但**未对 request body / cookie 做脱敏**；上传失败时把 `uploadErr.message` 原样拼进前端响应（`src\app\api\upload\route.ts:239-243`）。

## 5.2 导出通道清单

> 角色口径：`admin` = 管理员；`teacher` = 教师；`parent` = 家长；`登录` = 任意已认证角色。限流证据统一指向 `src\lib\api-handler.ts:97-104`（`checkRateLimit` 调用点）与 `src\lib\rate-limit.ts:14-36`（规则表）；除特别注明外，所有路由均经 `apiHandler` 包装，获得通用兜底限流，**无导出专用规则**。
> 服务端 Excel 生成方式：`XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })` 全部在内存 buffer 完成，不落临时盘；品牌水印由 `src\lib\export-xlsx-brand-server.ts:10-22` 从 `public/brand/` 读 logo/watermark 后在内存叠加。服务端未发现 `fs.writeFile` 把导出产物写到 `public/` 下的路由。

| 导出接口 | 可调用角色 | 数据范围是否按权限裁剪 | 频率限制(证据) | 敏感字段 | 风险等级 | 证据(文件:行) |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/reports/export/[chartKey]` 报表 Excel 导出 | admin（`:64` 非 admin 403） | 是。division + 当前 term 裁剪（`:69-73`）；7 个 chartKey 分支全部 `groupBy/count/金额聚合`，无个人行 | 通用 `/api` 200 rpm，GET 放宽 300 rpm；无专用规则（`rate-limit.ts:35`，`api-handler.ts:103`）；无审计 | 仅阶段人数、掌握程度、留存率、互动率、月度金额、考勤状态计数、操作次数；无姓名/电话/邮箱 | 低 | `src\app\api\reports\export\[chartKey]\route.ts:4,47-56,64,69-73,76-165`；默认分支 400（`:164-165`）；文件名固定图表标签 + ISO 日期（`:81,88,101,121,138,155,162`），chartKey 走 switch，不可参数控文件名 |
| `GET /api/reports/students` 学员概览 | admin（`:12`） | 是。division + term 裁剪（`:22-25`）；`take: 300`（`:31`） | 通用限流；无专用规则；无审计 | 行字段 id/name/grade/school/parentName/status/attendanceCount（`:45-53`）；**不含** phone/parentPhone/email | 低-中 | `src\app\api\reports\students\route.ts:12,16-17,21-32,45-53` |
| `GET /api/reports/teachers` 教师概览 | admin（`:12`） | 是。division 裁剪（`:22`）；无 `take` 上限（教师表量级小） | 通用限流；无专用规则；无审计 | 行字段 id/name/subjects/employmentType/monthlyHours/studentCount/monthFeedback/rating（`:35-44`）；无电话/邮箱 | 低 | `src\app\api\reports\teachers\route.ts:12,16,21-25,35-44` |
| `GET /api/reports/parent-logins` 家长登录排行 | admin（`:11`） | 是。division 裁剪（`:24`）；`parentUsers` select 仅 id/name（`:25`）；排行 `take: 10`（`:45`） | 通用限流；无专用规则；无审计 | 排行仅 name/count/lastAt（`:66-73`）；无 IP、无电话、无邮箱 | 低 | `src\app\api\reports\parent-logins\route.ts:11,15,23-26,39-47,51-54,66-73` |
| `GET /api/reports/parent-engagement` 家长互动 | admin / teacher（`:13`） | 部分。teacher 限定当前活跃 term + division（`:20-23`）；纯聚合计数（`:25-39`） | 通用限流；无专用规则；无审计 | 仅推送数/已读率/反应率/评论率/咨询回复率；无个人字段 | 低 | `src\app\api\reports\parent-engagement\route.ts:13,19-23,25-39,45-52` |
| `GET /api/reports/attendance-stats` 考勤统计 | admin / teacher（`:14`） | 是。teacher 限定本人课次（`:36-41`）；纯聚合（`:48-64`） | 通用限流；无专用规则；无审计 | 仅出勤/请假/旷课/补课计数与比率；无个人行 | 低 | `src\app\api\reports\attendance-stats\route.ts:14,20-29,32-43,48-64` |
| `GET /api/reports/paper-stats` 试卷薄弱点 | admin / teacher（`:13`） | **部分缺口**。division + term 裁剪（`:19-23`），但 **teacher 未按本人课次/本人学生裁剪**，可见整 division 该 term 的薄弱知识点 Top10（`:42-48`） | 通用限流；无专用规则；无审计 | 仅科目/知识点 + 计数；无学生姓名 | 中 | `src\app\api\reports\paper-stats\route.ts:13,19-23,35-48,51-58` |
| `GET /api/reports/volunteer-stats` 志愿填报统计 | admin / teacher（`:10`） | **否**。查询无 division / term 过滤（`:22-25`），跨学部计数 | 通用限流；无专用规则；无审计 | 仅 guideViews/docDownloads/consultations/quotaQueries 四个计数（`:28-33`） | 中（跨部） | `src\app\api\reports\volunteer-stats\route.ts:10,15-26,28-33` |
| `GET /api/reports/summary` 数据总览 KPI | admin（`:52`） | 是。division + term 裁剪（`:55-59`）；聚合 KPI 与月度财务金额（`:129-147`） | 通用限流；无专用规则；无审计；响应 `Cache-Control: private, no-store`（`:179`） | 计数、掌握率、金额聚合；无个人行 | 低 | `src\app\api\reports\summary\route.ts:47-59,82-99,129-147,162-181` |
| `GET /api/attendance/export` 考勤 Excel 导出 | admin / teacher（`:17`） | 部分。teacher 限定本人班级（`:36-41`）；student select 仅 name（`:56`）；**无 `take` 上限**（`:53-60`） | 通用限流；无专用规则；无审计；内存 XLSX（`:76`）；文件名固定日期（`:82`） | 列：班级/日期/学员/状态/扣课时（`:65-71`）；无电话/邮箱 | 中 | `src\app\api\attendance\export\route.ts:17,24-29,31-45,53-60,65-71,73-84` |
| `GET /api/settings/export/students` 学员全量 Excel | admin（`requireAdminUser` `:14`） | 是。division 裁剪（`:20`）；include enrollments+fees（`:21`）但回包剥离电话/邮箱；**无 `take` 上限**（`:19-23`） | 通用限流；无专用规则；**有审计** `EXPORT_STUDENTS` + rowCount（`:45-48`）；no-store + nosniff（`:53-54`） | 行字段：姓名/性别/年级/学校/剩余课时/总课时/状态/报名课程/缴费总额/注册日期（`:28-33,37`）；不含 phone/parentPhone/email | 中 | `src\app\api\settings\export\students\route.ts:14,17,19-23,25-34,36-44,45-48,49-56` |
| `GET /api/settings/export/finance` 财务 Excel 导出 | admin（`:14`） | 是。year + division 裁剪（`:17-21`）；**无 `take` 上限**（`:20-24`） | 通用限流；无专用规则；**有审计** `EXPORT_FINANCE` + rowCount（`:43-46`）；no-store + nosniff（`:51-52`） | 行含学员名/类型/金额/状态/日期/**notes 备注自由文本**（`:26-32,35`）——notes 可能夹带家长留言、联系方式等 PII | 中 | `src\app\api\settings\export\finance\route.ts:14,17-24,26-37,41-46,47-55` |
| `GET /api/admin/salary/export` 教师薪资流水 Excel | admin（`requireAdminUser` `:53`） | 是。teacherId 校验属于当前 division（`:63-67`）；student select 仅 id/name（`:112-115`），无电话；行含学生姓名/金额/课时/科目（`:130-185`） | 通用限流；**无审计日志、无独立限流**；内存 workbook（`:196-204`）；文件名经 `safeFilenamePart` 清洗 `\/:*?"<>|` 并截 40 字（`:40-42,205`）；`ADMIN_UNAUTHORIZED` 403（`:215-217`） | 学生姓名、科目、课时、金额、反馈次数；无家长联系方式 | 中 | `src\app\api\admin\salary\export\route.ts:53,55-67,71-74,112-115,130-185,196-213,215-217`；workbook 生成 `src\lib\salary-export.ts:307` |
| `GET /api/admin/students/[id]/feedback-export` 单学生反馈档案 Markdown | admin（`requireAdminUser` `:42`） | 是。按 studentId 加载归档（`:45-50`）；图片链接走签名 token（`:54-57`）；文件名 = 学生名 + 固定后缀（`:59`）；`Cache-Control: private, no-store`（`:65`） | 通用限流；无独立审计 | 单学生反馈全文（文本/评语）；图片经 `/api/files/view` 签名通道 | 低-中 | `src\app\api\admin\students\[id]\feedback-export\handler.ts:42,45-50,51-58,59-67`；route.ts 为薄包装 |
| `GET /api/admin/classroom-feedback/image-download` 反馈原图下载 | admin（`requireAdminUser` `:13`） | 是。asset 按 DB id 查（`:17-25`）；`safeDownloadName` 去换行/引号/反斜杠/斜杠（`:8-10,30`）；attachment（`:35`）；私有 no-store（`:36`） | 通用限流；无独立审计 | 反馈原图文件体；元数据不含电话 | 低 | `src\app\api\admin\classroom-feedback\image-download\route.ts:13,17-25,29-38` |
| `GET /api/volunteer/documents/[id]/download` 志愿文档下载 | **仅 `auth()` 登录，无角色校验**（`:11-12`），家长可调 | 部分。fileUrl 必须 `/volunteer/docs/` 前缀（`:18`）；`path.join(public, fileUrl)` 后 `readFile`（`:20-21`）；前缀来自 DB，**未见 `safeRelativePath` 归一化**（对比 `src\app\api\uploads\[filename]\route.ts:41-46`） | 通用限流（`/api/volunteer` 10 MB body 限制 `api-handler.ts:17`）；无独立审计 | 文档文件体（政策说明/配额表/压缩包/文本） | 中 | `src\app\api\volunteer\documents\[id]\download\route.ts:11-12,16-21,23-30` |
| `GET /api/files/view` 反馈图片签名/登录通道 | HMAC token 有效则免 session（`:16-22`），否则 `requireAuthenticatedUser`（`:22`） | 是。token 通道按签名 division 选库（`:25-26`）；DB 查 asset（`:28-39`）；非 token 通道走 `canAccessFeedbackImage`（`:47-54`）；nosniff（`:71`） | 通用限流；无独立审计 | 图片文件体；元数据 select 不含电话 | 低 | `src\app\api\files\view\route.ts:14-22,25-39,42-55,57-73` |
| `GET /api/files/[id]` 文件元数据 | 登录（`:12`） | 是。feedback 走 `canAccessFeedbackImage`（`:37-44`），其余走 `assertCanAccessFileAsset`（`:48-55`）；**仅回元数据，不回文件体**（`:58-68`） | 通用限流；无独立审计 | filename/originalName/mimeType/size/url/ownerType/createdAt；不含电话/邮箱 | 低 | `src\app\api\files\[id]\route.ts:12,16-24,30-45,47-56,58-68` |
| `GET /api/materials/[id]/view` 讲义/资料预览下载 | 登录（`:74`）+ audience 校验（`:86`）+ 教师/家长 visibility 二次校验（`:92-123`） | 是。本地路径 `..`/绝对路径拦截（`:153-155`）+ publicRoot 前缀校验（`:157-160`）；docx 预览 HTML 转义 + 紧 CSP `default-src 'none'; style-src 'unsafe-inline'; img-src data:`（`:27,33`） | 通用限流；无独立审计 | 讲义文件体（PDF/图片/Word）；按 audience 隔离 | 低 | `src\app\api\materials\[id]\view\route.ts:73-88,91-123,130-147,152-160,162-186` |
| `POST /api/settings/backup/create` 业务数据 JSON 备份 | admin（`:11`） | **否**。七个 `findMany()` 无 select、无 take（`:16-25`）；双库按 session division 选库；回包 `data` 全标量（`:44`）；`restorable: false`（`:29`）；审计仅一条笼统记录（`:47-49`） | 通用限流；无专用规则；无 rowCount 之外的导出约束 | students/teachers/fees/enrollments/makeups 全标量行，含 phone/parentPhone/email/notes；attendance 5000、examPaper 1000 封顶 | **高** | `src\app\api\settings\backup\create\route.ts:8-12,14-25,27-45,47-51` |
| `GET /api/public/teacher-showcase/portrait` 公开教师头像 | 公开 token 校验（`:43-48`），无 session | 是。`data:image` base64 限 8MB（`:26`）；`/avatars//people/` 走 publicRoot 前缀校验（`:31-33`）；其余 key 拒 `..`/反斜杠（`:38`）；上传头像强制马赛克（`:14-19,69-75`）；webp 320×320（`:67,73,75`） | 未走 apiHandler（与第四章 D-4 一致），无应用层限流；nosniff（`:81`） | 仅头像图像；不上传教师电话/邮箱 | 低 | `src\app\api\public\teacher-showcase\portrait\route.ts:21-40,42-48,50-60,62-75,77-83` |

### 5.2.1 报表/列表型接口中的数据面补充（非文件导出）

- `GET /api/admin/data-admin/[entity]`：admin（`src\app\api\admin\data-admin\[entity]\route.ts:22-23`），limit 已 clamp 到 1–100（`:39`），division 作用域（`:45`），返回前经 `sanitizeDataAdminRecord` 按 key 名剥离 password/sessionToken/access_token/refresh_token/hashedPassword/secret/apiKey/token/credential（`src\lib\data-admin\entities.ts:158-177`）；**但 phone/parentPhone/email 不在剥离名单**（学生可搜字段含 parentPhone/phone，`:39`；教师可搜 phone/email，`:49`），admin 可在后台分页看到联系方式，属预期内的管理员可见面，问题在于该通道同样无导出审计与按用户配额。
- `GET /api/admin/data-admin/overview`：admin（`src\app\api\admin\data-admin\overview\route.ts:13`），仅 7 个计数（`:34-41`），无个人行。
- 服务端 PDF：`src\lib\export-report-pdf.ts:40-41`、`src\lib\classroom-feedback\parent-pdf.ts:651-652` 使用 jsPDF，调用点均在客户端组件（`src\app\parent\archive\client.tsx:29`、`src\app\(main)\students\[id]\page.tsx:478,521`），**在浏览器内生成**，不经服务端文件落盘。

## 5.3 OSS 签名/上传安全

> 调用点计数口径：签名下载 URL 由 `generateOssSignedUrl`（`src\lib\storage\index.ts:476-482`）→ `AliyunOssDriver.generateSignedUrl`（`:314-337`）；浏览器直传签名由 `generateOssPostSignature`（`:467-473`）→ `:280-311`；反馈图片 HMAC 签名由 `createFeedbackExportImageUrl` / `verifyFeedbackExportImageToken`（`src\lib\classroom-feedback\export-image-url.ts:21-66`）。访问鉴权链：`src\lib\upload-policy.ts:3-19`（角色×类型矩阵）、`src\lib\upload-access.ts:41-110`（文件资产全链校验）、`:113-149`（按 url/key/storageKey/previewUrl/thumbnailUrl 反查 FileAsset）、`:156-187`（关联归属校验）。

| 项目 | 现值 | 是否合理 | 证据(文件:行) |
| --- | --- | --- | --- |
| OSS PostObject 签名有效期 | 默认 **300 秒**（`expireSeconds ?? 300`）；materials 直传签名同样 **300 秒** | 基本合理（5 分钟直传窗口），偏短但安全侧可接受 | `src\lib\storage\index.ts:285,288,310`；`src\app\api\materials\oss-signature\route.ts:44` |
| OSS 私有对象签名下载 URL 有效期 | storage 层默认 **300 秒**（`expireSeconds ?? 300`）；`/api/uploads/sign` 通道用 **3600 秒（1 小时）**，签名结果缓存 **50 分钟**（`SIGNED_URL_CACHE_MS = 50*60*1000`） | 1 小时偏长；同一对象签名被进程内 Map 缓存 50 分钟，缓存期内复用同一过期时间戳 URL | `src\lib\storage\index.ts:326,328`；`src\app\api\uploads\sign\route.ts:12-14,66-80` |
| 反馈导出图片 HMAC 签名有效期 | 默认 **7×24×60×60 = 604800 秒（7 天）**；HMAC-SHA256，消息体 `assetId:division:expires`；division 仅 JUNIOR/SENIOR；过期校验 + `timingSafeEqual` 恒时比较 | **偏长**：反馈档案 Markdown 分享后图片链接 7 天内可重放；secret 缺失时**降级为未签名** `/api/files/view?id=` 裸链（无 fail-closed） | `src\lib\classroom-feedback\export-image-url.ts:3,16-18,32-33,37,56,59,62-65` |
| objectKey 可控性（越权签别人文件） | `/api/uploads/sign`：keys 截 **50 个**（`:27`）；先 `canAccessFeedbackImage`（`:38-42`）再 `assertCanAccessStoredFileAsset` 按 DB 反查（`:49`）；对象在 FileAsset/反馈策略内解析不到则 404，**不能签任意 key**。材料 PUT 通道 key 正则 `^materials/material-\d+-[0-9a-f-]+\.[a-z0-9]+$`（`:148`），且扩展名与 key 扩展名必须一致（`:148`）。PostObject policy 条件为精确 `{ key }`（非 prefix 通配） | 合理：签名键受 DB 归属约束；但 sign 通道缓存键为 `key`（`storage:key`），跨用户复用同一签名 URL 时未在缓存键中混入 userId | `src\app\api\uploads\sign\route.ts:25-30,37-59,66-80`；`src\lib\storage\index.ts:290-297`；`src\app\api\materials\upload\route.ts:146-150` |
| 目录前缀与用户隔离 | 文件名由 `safeFilename` 生成 `{prefix}-{timestamp}-{uuid}.{ext}`（`:363-369`），ext 仅留 `a-z0-9.`、超过 8 字符降 `.bin`（`:364-365`）；前缀取自 ownerType（`teacher-feedback / parent_upload / admin_material / avatar / meal_image / parent_message`），**目录前缀不含 userId**；隔离依赖 FileAsset 的 visibility/ownerType/studentId/lessonId/postId 归属链，而非对象路径 | 部分合理：随机化到位，但路径层无用户命名空间；一旦鉴权链某一环漏判，同前缀对象之间无目录隔离兜底 | `src\lib\storage\index.ts:363-369`；`src\app\api\upload\route.ts:88,123`；`src\lib\upload-access.ts:41-110,113-149`；`src\lib\upload-policy.ts:21-31` |
| MIME / 扩展名白名单（通用上传） | 图片 ext：jpg/jpeg/png/gif/webp/heic/heif/avif（`:48`）；文档 ext：pdf/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z（`:51-53`）；`.html/.svg/.js` 不在列表被拒 | 图片白名单合理；文档白名单含压缩包（zip/rar/7z）需结合 magic bytes 与下载 nosniff 评估 | `src\app\api\upload\route.ts:47-53` |
| MIME / 扩展名白名单（材料通道） | 15 类：pdf/jpg/jpeg/png/gif/webp/doc/docx/xls/xlsx/ppt/pptx/zip/rar/7z（`:1-5`）；OSS 直传签名仅 7 类文档：pdf/doc/docx/xls/xlsx/ppt/pptx（`oss-signature:8`） | 合理；直传签名收窄到文档，图片走服务端中转 | `src\lib\material-file.ts:1-5,9-11`；`src\app\api\materials\oss-signature\route.ts:8,34-37` |
| 大小上限（通用上传，按类型） | teacher-feedback **20MB**、parent-upload **10MB**、admin-material **50MB**、avatar **5MB**、parent-message **10MB**、default **10MB**（`:18-27`）；网关 body 上限：lesson-previews 210MB、materials/upload 210MB、/api/upload 30MB、exam-papers 10MB、volunteer 10MB、默认 5MB（`api-handler.ts:12-18`） | 阈值分层清晰；admin-material 50MB 与网关 210MB 之间余量充足 | `src\app\api\upload\route.ts:18-27`；`src\lib\api-handler.ts:9-19,112-120` |
| 大小上限（材料/志愿/识别） | 材料：OSS **200MB** / local **50MB**（`materials/upload:70`）；PUT 元数据通道 fileSize ≤ **200MB**（`:142,157`）；OSS 直传签名 **200MB**（`oss-signature:9`）；志愿文档 **20MB**（`documents:40`）；试卷识别单图 **3MB**、base64 总量 **10MB**、最多 **4 张**（`recognize:12-14`） | 200MB 材料上限偏大，压缩包/文档场景需配合服务端解压审计；其余合理 | `src\app\api\materials\upload\route.ts:70-74,142-144,157-159`；`src\app\api\materials\oss-signature\route.ts:9`；`src\app\api\volunteer\documents\route.ts:40-41`；`src\app\api\exam-papers\recognize\route.ts:12-14` |
| magic bytes（图片） | JPEG `FF D8 FF`、PNG `89 50 4E 47`、GIF `GIF87a/89a`、WebP `RIFF....WEBP`、HEIC/HEIF/AVIF `....ftyp` + brand 白名单（`:31-43`） | 合理；图片通道不信 Content-Type | `src\app\api\upload\route.ts:29-45,108-113` |
| magic bytes（材料） | pdf `%PDF`；jpg/jpeg/png/gif/webp/rar/7z 各自签名；zip/docx/xlsx/pptx 校验 PK(03 04/05 06/07 08)；doc/xls/ppt 校验 OLE(`D0 CF 11 E0…`)；未知 ext 返回 false（`:26-41`） | 合理；PUT 直传后还回读 OSS 对象前 16 字节做二次签名校验（`materials/upload:153-162`） | `src\lib\material-file.ts:22-42`；`src\app\api\materials\upload\route.ts:76-79,152-162` |
| magic bytes（文档类 / 志愿文档） | **缺失**：通用上传文档分支只走 ext 正则（`upload:51-53`）；志愿文档 17 类 ext + 20MB，无文件头校验（`documents:35-41`） | **不合理**：可上传伪装扩展名的文档/压缩包；下载时若 Content-Type 宽松存在混淆风险 | `src\app\api\upload\route.ts:51-53,103-105`；`src\app\api\volunteer\documents\route.ts:35-41,45-49` |
| 危险扩展名（html/svg/js） | 图片/文档/材料三个白名单均不含 `.html/.svg/.js/.mjs/.htm`；`.svg` 也不在图片白名单（`upload:48`） | 合理：存储型 XSS 面被扩展名层关闭；但需注意若 OSS bucket 与站点同域且允许上传 html 会形成同源脚本执行——当前白名单已排除 | `src\app\api\upload\route.ts:48,51-53`；`src\lib\material-file.ts:1-5`；`src\app\api\volunteer\documents\route.ts:35` |
| bucket 域名关系 / 公开读 | `put()` 成功后 URL = `ALIYUN_OSS_PUBLIC_BASE_URL || https://{bucket}.{endpoint}` + `/` + 对象名，**不带签名**（`:219-225`）；`getUrl` 同样拼公网 baseUrl（`:274-277`）。`protectedUploadFallback` 对私有 OSS 不走裸公网，回落 `/api/uploads/<key>` 代理（`upload-url.ts:31-36`）。`ALIYUN_OSS_PRIVATE_BUCKET` 仅注释（`storage:13`），**代码零读取** | **待实测**：bucket ACL、CDN 回源域名、是否与站点同域，代码无法证实；若 bucket 为 public-read 且对象 key 可枚举/泄露，裸公网 URL 可直接读 | `src\lib\storage\index.ts:13,216-229,274-277,462-464`；`src\lib\upload-url.ts:31-36`；`src\app\api\upload\route.ts:179,211-213,222-224` |
| 文件名随机化 | 服务端中转通道：`safeFilename` UUID（`storage:363-369`）；志愿文档 POST：`{Date.now()}-{file.name}`，非单词字符替换 `_`（`documents:46`），**保留原始文件名、无 UUID** | 志愿文档文件名可预测（时间戳 + 原名），且落在 `public/volunteer/docs/` 静态目录 | `src\lib\storage\index.ts:363-369`；`src\app\api\volunteer\documents\route.ts:46-49,57` |
| OSS 故障本地回落 | `uploadBuffer` 在 `allowLocalFallback: true` 时 OSS 配置错误可落本地持久存储（`storage:392-399`）；sign 通道对象不可用回落 `/api/uploads/`（`sign:73-75,85`）；materials PUT 失败抛 `StorageConfigurationError`（`materials/upload:90-97,163-167`） | 回落保证可用性，但本地路径受 proxy matcher 排除影响（见 5.4 / 待实测 TE-3） | `src\lib\storage\index.ts:383-401`；`src\app\api\uploads\sign\route.ts:61-76,81-86` |
| MIME 取值来源 | `mimeType` 取自客户端 `file.type`（`upload:175,228`），未由服务端按文件头反推 | 部分依赖客户端声明；下载通道按 ext 映射 Content-Type（`material-file.ts:55-73`），nosniff 兜底 | `src\app\api\upload\route.ts:122,175,228`；`src\lib\material-file.ts:55-73` |

## 5.4 错误响应 / 日志 / 构建产物泄露

### 5.4.1 统一错误处理（前端可见面）

- 生产环境 500 统一脱敏：`isDev = NODE_ENV !== 'production'`；生产只回 `"服务器错误，请稍后重试"`，dev 才回 `err.message`（`src\lib\api-handler.ts:136-140`）。**不向前端返回 stack trace、Prisma/SQL 原文、内部路径**——该结论由 catch 分支逐行确认：返回体只有 `{ error: message }`（`:140`）。
- 业务异常分类回前端：`AuthError` 回 `err.message` + `err.status`（`:124-126`）；`TEACHER_UNAUTHORIZED / ADMIN_UNAUTHORIZED / 无权限` 统一回 403"无权限"（`:127-129`）；`ValidationError` 回校验消息 400（`:130-131`）。
- 上送 Sentry 的是脱敏后 error + 脱敏 url：`sanitizeUrlForLog` 剥用户名密码、把敏感 query 名置 `[REDACTED]`、清空 hash（`:36-55`）；`sanitizeErrorForLog` 对 message/stack/cause 递归做敏感 query 正则替换，深度上限 5 层（`:57-82`）；`Sentry.captureException(safeError, { extra: { url: requestUrl } })`（`:133-135`）。
- **脱敏缺口**：
  1. 脱敏正则 `SENSITIVE_QUERY_PARAM` 只覆盖 query 参数名（`token/secret/password/passwd/authorization/auth/api_key/signature/credential/code`，`:21`），**未对 request body、cookie、header 做脱敏**；全 src grep 未发现读取/记录 body 或 cookie 入日志的业务代码（cookie 读取仅 `parent-portal-theme.ts:13`、若干 parent 页面读 `PARENT_ACTIVE_CHILD_COOKIE` 做 UI 子级切换，不入日志），但 Sentry 默认是否携带 body/cookie 取决于 SDK 配置（见 5.4.3）。
  2. 上传通道把内部错误消息原样吐给前端：`catch (uploadErr) { const msg = uploadErr instanceof Error ? uploadErr.message : ...; return { error: \`上传失败：${msg || code || '未知错误'}\` } }`（`src\app\api\upload\route.ts:239-243`）；OSS 错误经 `classifyOssError` 归类后仍可能带 SDK 消息片段（`storage:114-131`）。材料中转通道同类问题：`StorageConfigurationError` 的 `err.message` 直接回前端（`materials/upload:91-94,165`）。
  3. 试卷识别上游 AI 错误回显前 **120 字符**：`AI 识别失败：${detail.slice(0, 120) || res.status}`（`recognize:125-127`），可能带出上游网关/鉴权内部细节。
- 控制台日志：`console.error('[API Error]', sanitizeUrlForLog(req?.url), safeError)`（`api-handler.ts:139`）；上传失败、OSS 初始化失败等旁路日志带 `message/stack`（`storage:204-207,319-323,330-334`；`upload:196-202,242`），这些只落服务器进程日志，不直接回前端。

### 5.4.2 日志文件扫描（只读确认"有没有"，不抄原文）

- `security.log`（29 行）、`security-final.log`（29 行）：敏感词（password / secret / token / accessKey / Bearer / PRIVATE）词面各命中 8 处、分布在 6 行，逐行核对均为 **PASS 检查项的描述句**（如"…does not expose passwords…"、"…hardcoded password removed…"、"…password verification requires bcrypt hash…"、"…production requires HTTPS and strong auth secret…"）；手机号 `1[3-9]\d{9}`、AccessKey、私钥段命中 0，**未发现真实手机号、密码明文、AccessKey、Token、私钥原文**。
- 根目录另有数十个运行/构建日志（`dev-server.log`、`_dev4.log`、`build-*.log`、`vitest*.log`、`docker-buildx-*.log` 等），均被 `.dockerignore:23` `*.log` 排除出构建上下文、被 `.gitignore:64` `*.log` 排除出版本库；本次未逐行展开其内容（遵守"不抄原文"约束），建议运维在服务器上确认这些日志不含 DB 连接串/请求体（待实测 TE-8）。
- 生产启动安全校验：`src\lib\env-security.ts:18-46` 校验 `AUTH_SECRET/NEXTAUTH_SECRET ≥32 字符`（`:28`）、两 secret 一致（`:31`）、`NEXTAUTH_URL` 必须 https（`:37`）、双库 URL 存在（`:42-43`）；本地 `local-docker` 豁免（`:3-16,22`）；`src\instrumentation.ts:1-7` 在 nodejs runtime 启动时调用 `assertProductionSecurityEnv`。
- 危险操作二次鉴权：`src\lib\danger-guard.ts:25-59`，SUPER_ADMIN + bcrypt 校验本人密码（`:49`）+ 逐字确认短语（`:35`）；代码注释明确"绝不硬编码密码"（`:23`），全仓未发现硬编码密码常量。

### 5.4.3 Sentry 上送面

- `sentry.server.config.ts:3-8`：仅 dsn / environment / `tracesSampleRate`（生产 0.1，dev 1.0）/ `enabled`；**无 `beforeSend`、无 `beforeBreadcrumb`、未显式 `sendDefaultPii: false`**。
- `sentry.client.config.ts:3-10`：同上，另配 `replaysSessionSampleRate: 0.1`（`:7`）、`replaysOnErrorSampleRate: 1.0`（`:8`）；**未配 replay mask/block 选项**（全 src grep `maskAll/blockAll` 0 命中）。
- 判定：代码层未做事件清洗；是否实际收到 cookie/body/DOM 文本取决于 Sentry 项目后台配置与 SDK 默认行为，代码库无证据关闭，归入待实测 TE-6。错误事件经 `api-handler.ts:133-135` 上送时 error 已脱敏、url 已脱敏，但 Sentry SDK 默认捕获的 request 上下文（headers/cookies/body）不在该脱敏链路内。

### 5.4.4 响应头 / Source Map / 构建产物

- `next.config.ts:35`：`output: 'standalone'`（独立运行目录，免服务器 npm install/build）；全文件 **未出现 `productionBrowserSourceMaps`**（grep 0 命中），即默认 false，浏览器侧不发布 `.map`。
- 安全响应头（`next.config.ts:6-31`，全局 `/:path*` `:84-87`）：
  - `X-Content-Type-Options: nosniff`（`:7`）；`X-Frame-Options: SAMEORIGIN`（`:8`）；`Referrer-Policy: strict-origin-when-cross-origin`（`:9`）；`Permissions-Policy: camera=(), microphone=(), geolocation=()`（`:10`）。
  - CSP（`:11-27`）：`default-src 'self'`；`script-src 'self' 'unsafe-inline'`（dev 再加 `'unsafe-eval'`，`:15`）；`style-src 'self' 'unsafe-inline'`；`img-src` 含 self/data/blob/`*.aliyuncs.com`/`wxpusher.zjiecode.com`（`:17`）；`connect-src` 含 Moonshot/DeepSeek/WxPusher/aliyuncs（`:19`）；`frame-src` 一组教育站点（`:20`）；`frame-ancestors 'self'`（`:21`）；`object-src 'none'`（`:22`）；`base-uri 'self'`（`:23`）；`form-action 'self'`（`:24`）；生产 `upgrade-insecure-requests`（`:25`）。
  - HSTS 仅生产：`max-age=31536000; includeSubDomains; preload`（`:28-30`）。
  - API 路由 `Cache-Control: no-store`（`:89-93`）+ `X-Content-Type-Options: nosniff`（`:154-158`）。
  - **缺口**：`script-src` 含 `'unsafe-inline'`（`:15`）；**未配 COOP / COEP**（grep `Cross-Origin-Opener|Cross-Origin-Embedder` 0 命中）；`poweredByHeader: false`（`:38`）。
- 上传/文件通道的 nosniff 覆盖不齐：
  - 有 nosniff：`files/view:71`、`students/export:54`、`finance/export:52`、materials view CSP（`:33`）、portrait（`:81`）、uploads thumbnail（`uploads/[filename]:110`）。
  - **缺 nosniff**：uploads OSS fallback 响应（`uploads/[filename]:125-131`）、本地原图响应（`:157-164`）；材料本地/OSS 响应仅 `X-Frame-Options`，未带 nosniff（`materials/[id]/view:140-147,179-186`）；志愿文档下载按 ext 映射 Content-Type，未带 nosniff（`volunteer/documents/[id]/download:25-29`）；反馈原图下载仅 Content-Type/Content-Length/Content-Disposition/no-store，未带 nosniff（`admin/classroom-feedback/image-download:31-37`）。

### 5.4.5 镜像构建 / .dockerignore / .gitignore / public 目录

- `Dockerfile`（runner 阶段 `:44-79`）：仅 COPY `.next/standalone`（`:56`）、`.next/static`（`:57`）、`public/`（`:58`）、4 个备份/压缩脚本（`:59-62`）、`package.json/package-lock.json`（`:69`）、`.prisma`（`:75`）；**未 COPY `.env`**，环境变量由 compose `env_file: .env`（`compose.production.yaml:46-47`）注入；runner 降权 `USER node`（`:77`）、`EXPOSE 3000`（`:78`）。builder 阶段 `COPY . .`（`:27`）但受 `.dockerignore` 先行过滤。
- `.dockerignore` 已排除：`.env` / `.env.*`（保留 `.env.example`，`:20-22`）、`*.log`（`:23`）、`*.tar/*.tar.gz`（`:24-25`）、`*.zip`（`:26,63`）、`*.pem`（`:27`）、`*.db`（`:28-29`）、`release`（`:9`）、`tmp`（`:10`）、`output/outputs`（`:11-12`）、`docs`（`:31`）、`public/uploads|services|marketing|business-assets|volunteer/docs`（`:32-36`）、`*.dump`（`:42`）、`backups`（`:43`）、`/*.sql`（`:54`）、`/_*`（`:65`）、`compose.production.yaml`（`:49`）、根 `*.js/*.cjs/*.py/*.ps1/*.bat/*.txt/*.html/*.png/*.jpg`（`:52-62`）。
  - **缺口**：`data/` 目录**未列入** `.dockerignore`；但 runner 阶段不 COPY `data/`，实际不进运行镜像（builder trace 只打包被 import 的代码，`data/volunteer/*.json` 仅由 `package.json:37,39` 的本地 import 脚本消费，非运行时路由）。
- `.gitignore`：已排除 `.env*`（保留 example，`:35-36`）、`*.log`（`:64`）、`/release/`（`:57`）、`/output/`（`:61`）、`tmp/`（`:73`）、`exports/`（`:67`）、`*.tar/*.tar.gz`（`:55-56`）、`outputs/`（`:80`）。
  - **缺口**：**未排除根目录 `*.sql`、`*.zip`、`/_*`、`data/`、`backups/`**。本地工作区实测存在：`_prod_chuzhong.sql` **54,700,566 B**、`_prod_gaozhong.sql` 92,874 B、`_q_local.sql` 与 `_q7~_q27.sql`、`_truncate.sql` 等共 **25 个 SQL**；`src.zip` 1,742,805 B、`prisma.zip` 99,935 B、`scripts.zip` 97,913 B；数十个 `_*.js/_*.py/_*.cjs/_*.mjs` 调试脚本。这些文件是否被 git 跟踪，本机 git CLI 不在 PATH，**未能核验**（待实测 TE-4）。
- `public/` 扫描（扩展名分组）：未发现 `.env`、数据库转储、备份目录、调试 HTML、`.map` source map、`.zip/.tar`。可被静态直连的业务素材：
  - `public/volunteer/docs/2025-allocation-quota.xlsx`（12,218 B）、`2022-plan-explanation.txt`：志愿配额/政策素材，proxy 白名单 `/volunteer/docs/` 放行匿名（`proxy.ts:92`）。
  - `public/uploads/materials/test-*.pdf`（约 463 B 测试件）：测试残留，体积极小、无数据泄露，建议清理。
  - `public/images/practice/*.svg` 100 个、`public/people/default-teacher.svg`、`public/file.svg`（391 B）：提交的静态教学素材，非用户上传。
  - `echarts.min.js`（1,030,855 B）、`pdf.worker.min.mjs`（1,265,413 B）：前端库；`about.html/home.html/manifest.json/搜索引擎验证 html` 为预期公开。
- 本地 scratch 目录体量（实测，均不在 runner COPY 清单内）：`backups/` 7 文件 **55.19 MB**（含 `edu_manage_chuzhong_*.dump` 6.29 MB、`edu_manage_gaozhong_*.dump` 284 KB、`shared-public.tar.gz` 51.30 MB 及 sha256）；`data/` 21 文件 **3.31 MB**（教材目录/题库 JSON、志愿录取参考 CSV/JSON）；`output/` 1 文件 0.21 MB；`release/` 43 文件 **1494.15 MB**（两个构建镜像 tar：973.70 MB + 518.39 MB）；`tmp/` 58 文件 **641.81 MB**；`exports/`、`outputs/` 不存在。

### 5.4.6 环境变量持有情况（只记键名/是否已配置，值略）

- `.env`（已配置，值略）：`DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`AUTH_TRUST_HOST`、`WXPUSHER_APP_TOKEN`、`QYWX_ENABLED`、`QYWX_CORP_ID`、`QYWX_AGENT_ID`、`QYWX_AGENT_SECRET`、`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、`MIMO_API_KEY`、`MIMO_BASE_URL`、`MIMO_MODEL`、`KIMI_API_KEY`、`KIMI_BASE_URL`、`KIMI_MODEL`、`KIMI_VISION_MODEL`、`AI_TIMEOUT_MS`、`AUTH_URL`。
- `.env.local`（已配置，值略）：`AMAP_WEATHER_KEY`、`DOUBAO_MODEL`、`ARK_API_KEY`、`STORAGE_DRIVER`（长度 5 = local）、`ALIYUN_OSS_REGION/BUCKET/ENDPOINT/ACCESS_KEY_ID/ACCESS_KEY_SECRET/PUBLIC_BASE_URL/PRIVATE_BUCKET`（PRIVATE_BUCKET 长度 4）。
- `.env.example`：上述键均为 2 字符或短占位值。
- 生产服务器实际 `STORAGE_DRIVER`、bucket ACL、CDN 回源策略在仓库内无法确认（待实测 TE-1/TE-2/TE-5）。

## 5.5 端口暴露与基础设施

| 服务 | 是否映射公网端口 | 密码/认证 | 证据 |
| --- | --- | --- | --- |
| Redis | **否**。`compose.production.yaml:4-15` 无 `ports:` 段，仅挂 `internal` bridge（`:14-15`） | **无密码**：command `redis-server --save "" --appendonly no --maxmemory 128mb --maxmemory-policy allkeys-lru`（`:7`），**未带 `--requirepass`**；`REDIS_URL=redis://redis:6379`（`:59`）连接串无认证段。限流/会话事件缓存依赖内网隔离 | `compose.production.yaml:4-15,59`；`src\lib\rate-limit.ts:81-104`；`docs\production-safety.md:43,47` |
| PostgreSQL | **否**。`:17-36` 无 `ports:` 段，仅挂 `internal` bridge（`:35-36`） | 有密码：`POSTGRES_USER: edu_admin`（`:21`）、`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?...}` 必填 env（`:22`）；应用连接串按双库注入 `muzhe_chuzhong / muzhe_gaozhong`（`:49-51`） | `compose.production.yaml:17-36,49-51` |
| App（Next.js） | 仅绑宿主机回环：`127.0.0.1:3000:3000`（`:66`），不暴露 0.0.0.0；另挂 `internal`（`:83-84`） | 会话认证在应用层（next-auth + sessionMark 比对 DB `currentSessionToken`，`proxy.ts:125-156`）；env_file 注入 `.env`（`:46-47`）；容器内 `HOSTNAME=0.0.0.0` 仅指容器网卡（Dockerfile:53） | `compose.production.yaml:38-84`；`src\proxy.ts:103-114,125-169`；`Dockerfile:51-55,77-79` |
| Migrate（迁移工具） | 无 `ports:`；`profiles: ["tools"]` 默认不启动（`:93`）；`internal`（`:106-107`） | 复用 DB 密码 env（`:97-99`） | `compose.production.yaml:86-107` |
| 网络 | 单一 `internal` bridge driver（`:113-115`）；无独立外网 overlay | — | `compose.production.yaml:113-115` |

- 数据库直读路由面：全 src grep `sendFile / createReadStream` **0 命中**；`readFile/readFileSync` 生产路由命中点已逐个核对：志愿文档下载（`volunteer/documents/[id]/download:21`）、识别读图（`recognize:74`）、uploads 本地原图（`uploads/[filename]:156`）、公开头像（`portrait:34`）、材料预览（`materials/[id]/view:164`）、备份标签文件（`data-admin/backup:21`）、恢复 env 兜底（`data-admin/restore:23`）、服务文案（`service-content.ts:12`，路径来自服务端目录配置，无用户输入）、志愿配额参考表（`volunteer.ts:134-139`，调用点 `:210` 用默认路径，无用户路径参数）；其余 `readFileSync` 均在 `*.test.ts`。未发现把任意本地路径直接回给客户端的路由。
- 备份/恢复路由面：`data-admin/backup` 全部 `requireSuperAdmin`（`route.ts:34,72,105,120`）；`BACKUP_DIR` env 兜底 `/data/backups/edu-manage`（`:15`）；脚本路径受控（`:36`）；`resolveBackupDirectory` + 前缀 + `isValidBackupId` 校验（`:51-58,109-110,123-126`）；**无 dump 下载端点**；标签文件 0600 写入（`:29`）。`data-admin/restore` 先 `assertDangerAuth`（`restore:50`），backupId 目录前缀校验（`:58-70`），`findDump` 真实前缀 + `isFile` 校验（`:32-39`），恢复前 `pg_restore --list` 预检（`:88`），单事务保护 + 部分完成上报（`:96-111`）；`loadEnv` 兜底读 cwd `.env`（`:17-30`）。

## 摘要表

| 编号 | 问题 | 类别 | 危害 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| E-1 | `settings/backup/create` 七表无 select/无 take 全标量回包 | ①已具备但不完善·导出通道 | 单个 admin 会话即可拖走两库学员/教师/缴费/报名/补课全字段（含电话、邮箱、备注），无行数上限约束 | 中 | 立刻 |
| E-2 | 导出通道无专用限流、无按用户/按日配额 | ①已具备但不完善·限流 | 被盗用的 admin/teacher 凭证可高频重复拉取报表/Excel/JSON，IP 桶 200/300 rpm 不按人聚合 | 中 | 近期 |
| E-3 | 18/20 导出下载路由无独立审计条目 | ①已具备但不完善·审计 | 批量导出发生时无行为留痕，事后无法定位是谁、何时、导了哪批数据 | 小 | 近期 |
| E-4 | paper-stats 教师未按本人课次裁剪；volunteer-stats 跨部不裁剪 | ①已具备但不完善·授权裁剪 | 教师可见整 division 薄弱点排行；跨学部计数互漏（数据面为聚合，无个人行） | 小 | 近期 |
| E-5 | finance notes 自由文本随表导出；考勤/学员/薪资导出无 take 上限 | ①已具备但不完善·字段裁剪/分页 | 备注夹带的 PII 被带走；大库下表全量回包，单次响应体积与内存压力不可控 | 小 | 近期 |
| E-6 | OSS 私有 bucket 开关代码未接线，put 返回未签名公网 URL | ①已具备但不完善·对象存储 | 若 bucket 为 public-read，泄露 key/URL 即可裸读对象；私有判定完全依赖控制台 | 中 | 近期 |
| E-7 | 本地 legacyUrl `/uploads/<key>` 静态旁路，proxy matcher 排除 uploads/volunteer | ①已具备但不完善·访问控制 | 本地 driver 下历史链接可能绕过 `/api/uploads` 鉴权直读静态文件；是否被 Nginx/CDN 直出待核 | 中 | 近期 |
| E-8 | Sentry 无 beforeSend/无 PII 显式关闭、replay 无 masking | ①已具备但不完善·遥测泄露 | 异常事件可能携带 cookie/body/DOM 文本上报第三方；100% 错误 replay 录制整页 DOM | 小 | 近期 |
| E-9 | 文档类上传无 magic bytes；志愿文档通道无文件头校验 | ①已具备但不完善·上传校验 | 伪装扩展名的文档/压缩包可入库；混淆下载场景下内容类型不可信 | 中 | 近期 |
| E-10 | 请求 body/cookie 未纳入脱敏；upload 错误消息内部外泄；识别上游细节回显 120 字符 | ①已具备但不完善·错误/日志 | 内部 SDK/路径/SQL 片段可能经错误响应或遥测外泄；body 内敏感字段未在日志层兜底 | 小 | 近期 |
| E-11 | 部分上传/下载响应缺 nosniff；CSP script-src unsafe-inline；无 COOP/COEP | ①已具备但不完善·响应头 | 浏览器 MIME 嗅探混淆；内联脚本面被放开；跨域隔离纵深缺失 | 小 | 长期 |
| E-12 | 志愿文档下载仅登录、无角色校验 | ②完全缺失·授权 | 家长账号可调 `/volunteer/documents/[id]/download` 读取站内所有志愿文档 | 小 | 立刻 |
| E-13 | `.gitignore` 未排除根 `*.sql/*.zip/_*`；54.7MB 生产 dump 跟踪状态未核 | ②完全缺失·仓库泄露 | 若被 git 跟踪，生产库快照/源码压缩包随仓库分发；协作/备份/CI 场景扩散面大 | 小 | 立刻 |
| E-14 | 反馈图片签名 secret 缺失时降级未签名裸链；7 天 TTL 偏长 | ②完全缺失·签名机制 | 配置缺失时 fail-open；档案分享链接一周内可重放 | 小 | 近期 |
| E-15 | 无上传内容恶意扫描/病毒检测（magic bytes 之外） | ②完全缺失·上传校验 | 含宏/恶意脚本的 Office、压缩包、伪装文档可入库并被其他角色下载 | 中 | 长期 |
| E-16 | Redis 内网无密码 | ②完全缺失·基础设施 | 内网任意可达容器/主机可读写限流计数、会话缓存；依赖"内网隔离"单道防线 | 小 | 近期 |
| E-17 | db/redis 未映射公网端口（正面），但 Redis 无密码 + 单实例内网假设 | ③架构运维·网络隔离 | 公网面收敛到位；风险集中在内网横向与单实例降级 | — | 近期 |
| E-18 | 本地 scratch 体量巨大（release 1494MB / tmp 642MB / backups 55MB）；data/ 未进 dockerignore | ③架构运维·构建上下文 | 构建上下文臃肿；若误把本地目录挂进静态根或打包流程，存在快照/中间产物扩散风险 | 中 | 长期 |
| E-19 | 生产备份以文档 cron 约定为准，仓库内无 cron 安装证据；应用 JSON 导出非 DB 备份 | ③架构运维·备份策略 | 若每日 pg dump cron 未落地，数据库故障恢复依赖单次手动 dump；离线异地备份仅文档提及 | 中 | 近期 |
| E-20 | OSS ACL / CDN 回源缓存 / Nginx 是否直出 uploads 均为线上配置，仓库无证据 | ③架构运维·CDN/对象存储 | 静态旁路、签名 URL 被 CDN 长缓存、同域存储型 XSS 等风险无法在代码层闭环 | 中 | 近期 |
| E-21 | 多组第三方凭证已配置（DB/next-auth/WxPusher/企微/AI Key/OSS AK），仓库无轮换台账与 AK 最小权限证据 | ③架构运维·密钥管理 | 凭证分散在两份 env 与服务器 `.env`；AK 权限范围、轮换记录不可见；泄露后无法快速定位禁用 | 中 | 近期 |

## ① 已具备但不完善

### E-1 业务备份 JSON 通道七表全字段、无行数上限回包

- **证据**：`src\app\api\settings\backup\create\route.ts:11` 仅校验 `user.role !== 'admin'`；`:16-25` 并行 `findMany()`，其中 `students/teachers/courses/classGroups/fees/enrollments/makeupRequest` 七个查询**无 `select`、无 `take`**，`attendance take: 5000`（`:22`）、`examPaper take: 1000`（`:23`）；`:44` `data: { students, teachers, courses, classGroups, fees, enrollments, attendances, examPapers, makeups }` 全量标量入回包；`:30` 标注"不包含账号、完整课堂反馈、上传照片文件"；审计仅 `导出了 ${students} 名学员等数据（非恢复备份）`（`:47-49`）。
- **危害**：单个 admin 会话一次 POST 即可拿到当前库内学员/教师/缴费/报名/补课的全部标量行——含手机号、家长手机号、邮箱、备注；无字段裁剪、无行数封顶、无导出冷却。大库下响应体与服务端内存同时承压。
- **利用前置条件**：有效 admin 会话（被窃取的 admin cookie/密码即可触发）；无需跨部权限技巧，双库模式按 session division 选库。
- **修复方案**：(1) 七表查询显式 `select` 白名单（去除 phone/parentPhone/email/notes 或按导出用途分组）；(2) 补 `take` 上限（如 2000/表）+ 分页或异步生成下载文件；(3) 审计升级为 `BACKUP_JSON_EXPORT`，记录每表 rowCount 与导出者；(4) 该通道与 `data-admin/backup`（SuperAdmin + danger-guard）对齐角色强度。
- **工作量**：中（2-3 天，含导出分页改造）
- **优先级**：立刻

### E-2 导出通道挂通用限流，但无专用规则、无业务级配额

- **证据**：`src\lib\api-handler.ts:97-104` 所有包装路由统一 `checkRateLimit(ip, path, undefined, GET/HEAD 300rpm)`；`src\lib\rate-limit.ts:14-36` 规则表 21 条（`:15-35`），前缀为 auth 8 条 / ai / teacher/ai-feedback / recognize / class-groups / admin/attendance / feedback / upload / materials/upload / volunteer/schools / parent/unread-counts / parent/today / teacher/dashboard /`/api`，**无 export/finance/salary/students/backup 前缀**；`:35` 兜底 `/api` 200 rpm；`:156` 键 `` `${ip}:${segment}` ``，不混入 userId。
- **危害**：被盗用的高权限凭证可按 200–300 rpm 高频重复拉取 20 个导出/下载通道；IP 轮换即可绕过 IP 桶；无"每用户每日导出 N 次/每表 M 行"的业务配额。
- **利用前置条件**：任一可调用导出通道的角色会话；批量脚本 + 代理池。
- **修复方案**：在 `RATE_RULES` 增 `/api/reports/export`、`/api/settings/export`、`/api/admin/salary/export`、`/api/attendance/export`、`/api/settings/backup` 等前缀（建议 10–20 rpm）；限流键追加 userId；新增导出配额（每日次数 + 单次行数 + 冷却期），超限写审计并返回 429。
- **工作量**：中（2-3 天，配额计数需 Redis）
- **优先级**：近期

### E-3 导出审计覆盖不全：仅学员/财务两处落审计

- **证据**：审计调用点 grep 结果——`EXPORT_STUDENTS`：`settings/export/students/route.ts:45-48`（division + rowCount）；`EXPORT_FINANCE`：`settings/export/finance/route.ts:43-46`（year + division + rowCount）。其余导出/下载路由（reports 7 类、attendance/export、salary/export、feedback-export、image-download、files/view、files/[id]、materials view、volunteer download、backup/create）**均无 `createActivityLog` 调用**；backup/create 仅有一条笼统记录（`backup/create:47-49`）。
- **危害**：批量拖库、高频下载原图/档案、越权拉取志愿文档发生后，审计链无法回答"谁在什么时间导了哪批数据、多少行"。
- **利用前置条件**：已登录的有权限账号。
- **修复方案**：在每个导出 handler 成功回包前写 `createActivityLog`（动作 `EXPORT_<CHANNEL>`，对象 division/term/teacherId/studentId，rowCount/fileSize）；报表聚合导出记录参数与命中条数；审计日志单独保留、不可在后台页面删除。
- **工作量**：小（1 天内，逐路由补一行日志）
- **优先级**：近期

### E-4 教师侧两处权限裁剪缺口：试卷薄弱点不按本人课次、志愿统计跨部

- **证据**：`reports/paper-stats/route.ts:13` admin/teacher 均可；`:19-23` division+term 裁剪后，`:42-48` `weaknessRecord.groupBy` 仅按 termId，**未叠加教师本人课次/学生条件**；`reports/volunteer-stats/route.ts:10` admin/teacher 均可；`:22-25` 四个 `count` 查询**无 division、无 term where**，跨学部计数。
- **危害**：教师可见本学部整批学生的薄弱知识点排行（聚合面，无姓名，但属教学数据越界）；志愿咨询/配额计数跨学部互漏。
- **利用前置条件**：有效 teacher 会话。
- **修复方案**：paper-stats 教师分支叠加 `paper: { lesson: { group: { OR 本人教师条件 } } }`（参照 `attendance-stats:36-41` 的 `teacher.id / teacherAssignments` 条件）；volunteer-stats 两分支补 division where（管理员可选全部，教师/默认按本部）。
- **工作量**：小（半天）
- **优先级**：近期

### E-5 财务备注自由文本随表导出；多处导出无行数上限

- **证据**：`settings/export/finance/route.ts:26-32,35` 行含 `f.notes || ''`（备注自由文本）；`:20-24` `fee.findMany` 无 take。`attendance/export:53-60` `attendance.findMany` 无 take；`settings/export/students:19-23` 无 take；`admin/salary/export:71-74` 流水按 teacherId+term 收敛，但无 take 上限。
- **危害**：家长在备注里留下的电话、微信、住址、其他学生姓名等随财务表被一并导出；大库下考勤/学员表全量回包，响应体积与内存不可控。
- **利用前置条件**：admin 会话。
- **修复方案**：finance 导出对 notes 做长度截断 + PII 正则脱敏（手机号/身份证/邮箱）或整列移除；三处无 take 查询补分页/上限；行量级写入审计 rowCount。
- **工作量**：小（半天-1 天）
- **优先级**：近期

### E-6 OSS 私有 bucket 开关代码未接线，put 返回未签名公网 URL

- **证据**：`src\lib\storage\index.ts:13` 注释列出 `ALIYUN_OSS_PRIVATE_BUCKET`；全 src grep 该键仅命中此注释，**运行时无人读取**。`:219-225` `client.put` 后 URL = `ALIYUN_OSS_PUBLIC_BASE_URL || https://{bucket}.{host}` + `/` + `result.name`；`:274-277` `getUrl` 同样拼公网 baseUrl；`:314-337` 签名下载 URL 只在显式调用 `generateOssSignedUrl` 时生成；`upload-url.ts:31-36` `protectedUploadFallback` 仅在 key 存在时回落代理。另：`:347-356` `getDriver()` 遇到未知 `STORAGE_DRIVER` 静默降级 local（`:354` 仅 console.warn），配置拼写错误不会在启动期 fail-closed。
- **危害**：bucket 若为 public-read，任意拿到对象 key/URL 的人可裸读；若为私有，部分历史记录里的裸公网 URL 会 403，但代码也没有按私有策略主动转签名。bucket 真实 ACL 代码无法判定。
- **利用前置条件**：对象 key/URL 泄露（页面缓存、日志、前端历史记录、越权列表接口）；bucket public-read。
- **修复方案**：(1) 在 storage factory 读取 `PRIVATE_BUCKET`，私有模式下 `put/getUrl` 一律返回 `/api/uploads/<key>` 代理路径或签名 URL，不拼裸公网；(2) 控制台确认 bucket ACL 为私有并归档到 `docs/`；(3) 历史 FileAsset 裸公网 URL 迁移到 `protectedUploadFallback` 链路。
- **工作量**：中（2-3 天，含历史 URL 兼容）
- **优先级**：近期

### E-7 本地 legacyUrl `/uploads/<key>` 静态旁路，proxy matcher 排除上传前缀

- **证据**：`src\app\api\upload\route.ts:222-224` `legacyUrl = result.url.replace('/api/uploads/', '/uploads/')`；`src\proxy.ts:202` matcher 排除清单含 `uploads`、`volunteer`；`:81-92` 白名单放行 `/people/ /avatars/ /teacher-portraits/ /services/ /business-assets/ /images/ /volunteer/docs/`；`src\lib\upload-url.ts:1-7` `normalizeUploadUrl` 把 `/uploads/` 改写到 `/api/uploads/`，但 DB 历史记录里的 `/uploads/` 原样保留。compose 本地上传目录挂在 `/app/public/uploads`（`compose.production.yaml:58,69`）。
- **危害**：本地 driver 下，若 Nginx/Next 把 `/uploads/<key>` 当 public 静态文件直出，将绕过 `/api/uploads` 的 `requireAuthenticatedUser` + FileAsset 归属校验（`uploads/[filename]:64,77-94`）；对象 key 可预测性依赖 `safeFilename` UUID（`storage:363-369`）。
- **利用前置条件**：生产 STORAGE_DRIVER=local（本地实测 `.env.local` 长度 5 = local，生产值待核）；静态文件由 Next/Nginx 直出；key 已知或可枚举。
- **修复方案**：(1) proxy matcher 不再排除 `uploads`，或在 Next/nginx 层把 `/uploads/(?!api)` 强制 302/代理到 `/api/uploads/`；(2) 历史 `legacyUrl` 入库即归一化为 `/api/uploads/`；(3) 对照 `docs\production-safety.md:76`"Nginx 不得直出 `/uploads/`"在 nginx conf 落一条 `location /uploads/ { proxy_pass 应用; }`。
- **工作量**：中（1-2 天，含静态链路验证）
- **优先级**：近期

### E-8 Sentry 未做事件脱敏，replay 未配 masking

- **证据**：`sentry.server.config.ts:3-8`、`sentry.client.config.ts:3-10`；全 src grep `beforeSend|beforeBreadcrumb|sendDefaultPii|maskAll|blockAll` **0 命中**；client replay 采样 session 0.1 / error 1.0（`:7-8`）。
- **危害**：异常请求的 headers/cookies/body、页面 DOM 文本（家长留言、学生评语、联系电话）可能随错误事件或 100% 错误 replay 上送 Sentry 项目；第三方 SaaS 形成第二份数据副本。
- **利用前置条件**：应用触发异常；Sentry 项目未在后台另配 PII 过滤（代码库无证据）。
- **修复方案**：server/client 两侧补 `beforeSend`（剥离 cookies/authorization/body 敏感键、脱敏手机号/邮箱）、`beforeBreadcrumb`（剔除导航/输入类面包屑）；显式 `sendDefaultPii: false`；replay 配 `maskAllText: true, blockAllMedia: true`；核对 Sentry 后台数据保留周期与成员权限。
- **工作量**：小（半天-1 天）
- **优先级**：近期

### E-9 文档类与志愿文档上传无文件头（magic bytes）校验

- **证据**：`src\app\api\upload\route.ts:51-53` 文档分支仅 `/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i`；`:103-105` 非图片且不允许文档类型才拒绝；图片头校验在 `:108-113`，文档不经过 `isValidImageBuffer`。`src\app\api\volunteer\documents\route.ts:35-41` 17 类 ext + 20MB，无 buffer 头校验；`:45-49` 直接 `writeFile`。材料通道已有完整头校验（`material-file.ts:22-42`）可复用。
- **危害**：伪装成 pdf/doc/zip 的可执行/脚本/HTML 内容可入库；下载时若 Content-Type 宽松或被嗅探，存在混淆打开风险；压缩包内结构无审计。
- **利用前置条件**：具备上传权限的角色（admin/teacher/parent 按类型矩阵）。
- **修复方案**：把 `hasValidMaterialFileSignature` 扩展覆盖通用上传文档类型；志愿文档通道入库前读前 16 字节校验；对 zip/rar/7z 记录内部条目数与解压后大小上限；拒绝双扩展名与空文件。
- **工作量**：中（2 天，含压缩包审计）
- **优先级**：近期

### E-10 脱敏只覆盖 query；body/cookie 未兜底，上传错误消息外泄前端

- **证据**：query 脱敏 `api-handler.ts:21,36-55`；错误脱敏 `:57-82`；未发现 body/cookie 脱敏函数。上传错误回包 `upload/route.ts:239-243` `上传失败：${msg || code || '未知错误'}`；材料通道 `materials/upload:91-94,165` 回 `err.message`；识别上游 `recognize:127` 回 `detail.slice(0, 120)`。
- **危害**：OSS SDK 消息、内部路径、上游网关报错片段可能进入前端响应；若后续某路由把 body 打日志，敏感字段（密码、留言、联系方式）无统一脱敏兜底。
- **利用前置条件**：构造触发错误的上传/识别请求。
- **修复方案**：(1) catch 分支统一回通用文案，内部 err.message 只落服务端日志；(2) 增加 `sanitizeSensitiveBody`（按键名脱敏 + 手机号/邮箱/身份证正则），在日志/Sentry 调用前对 body 副本处理；(3) 上游错误只回 HTTP 状态码与通用提示。
- **工作量**：小（1 天）
- **优先级**：近期

### E-11 部分文件响应缺 nosniff；CSP 保留 unsafe-inline；无跨域隔离头

- **证据**：缺 nosniff 通道：`uploads/[filename]:125-131`（OSS fallback）、`:157-164`（本地原图）、`materials/[id]/view:140-147,179-186`、`volunteer/documents/[id]/download:23-30`。CSP `script-src 'self' 'unsafe-inline'`（`next.config.ts:15`）；grep COOP/COEP 0 命中。
- **危害**：浏览器对未知/宽松 Content-Type 做嗅探，文档/图片被当 HTML 解析时混淆执行；内联脚本允许削弱 CSP 对注入脚本的拦截；无 COOP/COEP 时跨域窗口/进程隔离纵深不足。
- **利用前置条件**：上传或服务端页面被注入可被嗅探执行的内容。
- **修复方案**：所有文件响应头统一加 `X-Content-Type-Options: nosniff`（抽一个 `fileResponseHeaders()` 工具复用）；逐步移除 `'unsafe-inline'`（nonce/hash 改造）；评估加 `Cross-Origin-Opener-Policy: same-origin`、`Cross-Origin-Embedder-Policy: require-corp`（注意与 phet/geogebra 等 frame 嵌入的兼容性）。
- **工作量**：小-中（1-3 天，unsafe-inline 移除工作量偏大）
- **优先级**：长期

## ② 完全缺失

### E-12 志愿文档下载接口无角色校验，家长可读全部站内志愿文档

- **证据**：`src\app\api\volunteer\documents\[id]\download\route.ts:11-12` 仅 `const session = await auth(); if (!session?.user) 401`，**未读 role、未比对 admin/teacher**；对比 POST 通道 `volunteer/documents/route.ts:26` 明确 `['admin','teacher']` 403。`:18` 前缀校验 `/volunteer/docs/`，`:20-21` `path.join(public, fileUrl)` + `readFile`；`:25-29` 按 ext 映射 Content-Type。
- **危害**：任意已登录家长账号，枚举/获取文档 id 后可下载站内全部志愿政策、配额表、压缩包；文档内容为招生参考资料，泄露面限于该目录，但角色边界完全缺失。
- **利用前置条件**：有效 parent 会话；文档 id 可通过 `GET /api/volunteer/documents`（`documents/route.ts:12-19`，同样仅登录）批量获得。
- **修复方案**：download 与列表 GET 补角色/可见性校验（家长仅可见 `PUBLISHED/STUDENT` audience 文档，admin/teacher 全量）；fileUrl 经 `safeRelativePath` 归一化（对齐 `uploads/[filename]:41-46`）后再 join publicRoot。
- **工作量**：小（半天）
- **优先级**：立刻

### E-13 `.gitignore` 未排除根目录 SQL dump / zip / 下划线调试文件，生产库快照跟踪状态未核

- **证据**：`.gitignore:35-36` 排 `.env*`、`:64` 排 `*.log`、`:57` `/release/`、`:61` `/output/`、`:73` `tmp/`；**无 `/*.sql`、无 `/*.zip`、无 `/_*`、无 `/backups/`、无 `/data/`**。`.dockerignore:54,63,65` 已排 `/*.sql/*.zip/_*`（构建上下文侧）。实测根目录：`_prod_chuzhong.sql` 54,700,566 B、`_prod_gaozhong.sql` 92,874 B、`_q*.sql`/`_truncate.sql` 共 25 个、`src.zip` 1,742,805 B、`prisma.zip` 99,935 B、`scripts.zip` 97,913 B。本机 git CLI 不可用，`git ls-files` 未能核验跟踪状态。
- **危害**：若已被 git 跟踪，生产库完整快照（学员/家长/缴费/账号哈希）与源码压缩包随仓库历史、克隆镜像、CI 缓存扩散；删除工作区文件无法清除历史记录。
- **利用前置条件**：仓库被克隆/共享/备份；或 git 历史已推送远端。
- **修复方案**：(1) `.gitignore` 补 `/*.sql`、`/*.dump`、`/*.zip`、`/backups/`、`/data/`、`/_*`；(2) 在有 git 的环境执行 `git ls-files | Select-String '\.(sql|zip|dump)$|^_'` 核验；(3) 已跟踪则从索引移除（保留本地文件）并评估历史清理（filter-repo/ BFG）；(4) 54.7MB dump 确认不含账号明文密码后本地安全删除。
- **工作量**：小-中（历史清理视仓库是否已推送而定）
- **优先级**：立刻

### E-14 反馈图片签名 secret 缺失时 fail-open 降级裸链，7 天 TTL 无收紧机制

- **证据**：`src\lib\classroom-feedback\export-image-url.ts:7` secret 取 `AUTH_SECRET || NEXTAUTH_SECRET`；`:32-33` secret 为空时直接返回未签名 `/api/files/view?id=`；`:3` `DEFAULT_TTL_SECONDS = 7*24*60*60 = 604800`，`:37` 调用未传 `ttlSeconds` 即走默认；`:27` ttlSeconds 为可选参数；校验侧 `:58` secret 缺失直接 false（fail-closed，但生成侧已给裸链）。
- **危害**：部署/配置异常导致 secret 缺失时，反馈档案内图片链接退化为仅靠 `/api/files/view` 登录态校验的普通链接，链接随 Markdown 外发后一周内可被有权限者重放；裸链不带 division 签名约束。
- **利用前置条件**：secret 未配置（env-security 生产校验 `≥32` 字符，`env-security.ts:28`，正常部署不易触发）；或签名链接被转发。
- **修复方案**：secret 缺失时生成侧抛错/fail-closed，不产出裸链；TTL 收到 2–24 小时并按用途区分（档案导出短链、在线预览更短）；链接中 division 已签名，校验侧保持现状。
- **工作量**：小（半天）
- **优先级**：近期

### E-15 上传文件无恶意内容扫描/病毒检测（magic bytes 之外）

- **证据**：上传链路校验项为 ext 白名单 + 大小 + 图片/材料文件头（`upload/route.ts:18-27,29-45,108-113`；`material-file.ts:22-42`）；全仓 grep 无 antivirus/clamav/malware scan/office macro 解析依赖；压缩包仅记录扩展名与大小，不解压审计条目数/嵌套深度。
- **危害**：带宏的 Office 文档、伪装压缩包、恶意 PDF 可入库并被教师/家长下载；服务端预览链路（mammoth 提取 docx 文本、sharp 解码图片）本身也是解析攻击面。
- **利用前置条件**：具备上传权限的角色；下载方打开文件。
- **修复方案**：短期：压缩包限条目数/解压后大小、Office 文档剥离宏标记检查；中期：接入 ClamAV/云查杀对入库文件异步扫描，命中后隔离 FileAsset 并通知管理员；图片解码走 sharp 已有 fail-on 容错（`portrait:65`），上传通道补解码失败回滚。
- **工作量**：中-大（接入扫描服务）
- **优先级**：长期

### E-16 Redis 内网无密码，仅靠网络隔离单道防线

- **证据**：`compose.production.yaml:7` redis command 无 `--requirepass`；`:59` `REDIS_URL=redis://redis:6379` 无 `:password@`；`:14-15,83-84` 仅 internal bridge。限流键、会话事件缓存存于 Redis；`rate-limit.ts:92` 客户端连接串直接取 `REDIS_URL`。
- **危害**：internal bridge 内任一被攻破容器（含未来接入的其他服务）可直连 Redis，读取/篡改限流计数与会话缓存键；无认证也无法在日志层面区分来源。
- **利用前置条件**：内网横向可达（另一容器 RCE、配置错误把端口发布到宿主机）。
- **修复方案**：compose 增加 `REDIS_PASSWORD` env，redis command 加 `--requirepass $REDIS_PASSWORD`，`REDIS_URL` 带密码；评估 Redis 命名空间/键前缀隔离；监控非 internal 网络的 6379 访问。
- **工作量**：小（半天，compose + 环境变量）
- **优先级**：近期

## ③ 架构性 / 运维层问题（端口、备份策略、CDN、镜像构建）

### E-17 公网端口面收敛到位，但内网隔离假设偏强，单实例降级风险未在架构层兜底

- **证据**：`compose.production.yaml:4-15` redis 无 ports、`:17-36` db 无 ports、`:66` app 仅 `127.0.0.1:3000:3000`、`:113-115` 单一 internal bridge。`docs\production-safety.md:43` auto 模式 Redis 故障降级进程内存、`:47,64` 明确单实例约束、重启清零限流/锁定计数；`rate-limit.ts:121-126` 内存兜底、`:98-100,122-124` 显式 redis 模式拒绝降级。
- **判定**：公网暴露面控制是正向现状；风险在"内网无密码 Redis + 限流可降级内存 + 单实例"三者叠加，横向移动与重启后防护失真缺乏架构层冗余。
- **建议**：补 Redis 密码（E-16）；生产 `RATE_LIMIT_DRIVER=redis` 并对 Redis 连通性做启动探活；内存降级只允许 dev 环境；文档中的单实例约束写入部署 runbook，扩容前必须先完成 Redis 化改造。

### E-18 本地 scratch 体量巨大，构建上下文与静态根边界需在运维流程上固化

- **证据**：实测 `release/` 43 文件 1494.15 MB（两个构建镜像 tar 973.70 MB + 518.39 MB）、`tmp/` 58 文件 641.81 MB、`backups/` 7 文件 55.19 MB、`data/` 21 文件 3.31 MB、`output/` 1 文件 0.21 MB；`.dockerignore:9-12,43` 排 release/tmp/output/outputs/backups，但 `data/` 未列；`Dockerfile:56-75` runner 只拷 standalone/static/public/脚本/lock/.prisma，不拷这些目录。compose 卷挂载清单 `:68-74` 仅挂 shared public 子目录与 `/data/backups/edu-manage`。
- **风险**：若部署脚本误把本地 `release/`（历史构建产物/压缩包）或 `backups/`（dump）挂进 Nginx 静态根或容器 public 目录，将形成快照直读面；当前代码与 compose 配置未见该错误挂载，但流程上无强制校验。
- **建议**：`.dockerignore` 补 `data/`；部署脚本增加静态根目录白名单校验；定期清理本地 release/tmp；服务器上核对 `/srv/edu-manage/shared/` 与 `/data/backups/edu-manage` 的目录权限（0700，对齐 `production-safety.md:13`）。

### E-19 数据库备份以文档 cron 约定为准，仓库内无落地证据；应用 JSON 导出不是 DB 备份

- **证据**：`docs\production-safety.md:5-21` 约定每日 02:00 `backup-db.sh` pg dump 到 `/data/backups/edu-manage`；`:30-35` 离线备份 OSSUTIL/RSYNC 仅为可选项；`settings/backup/create:29-30` 自身标注 `restorable: false`、"不是数据库恢复备份"、"最多 5000 条考勤和 1000 份试卷"；`data-admin/backup` 脚本路径受控（`backup/route.ts:36`）但仓库内不含 cron 安装单元。
- **风险**：若服务器 cron 未实际安装或每日 dump 失败无告警，数据库故障只能依赖历史手动 dump；备份无异地副本时，主机/磁盘故障即数据丢失。
- **建议**：运维核对服务器 `crontab -l` 含两条备份/清理 cron；备份目录加完整性校验（sha256 已有，`backups/.../*.sha256`）与保留周期；补一份定期恢复演练记录；离线异地备份落地（OSS 或 rsync 备机）。

### E-20 OSS ACL / CDN 缓存键 / Nginx 静态直出策略均为线上配置，代码层无法闭环

- **证据**：`storage:219-225,274-277` 公网 URL 拼接逻辑；`proxy.ts:81-97,202` 静态白名单与 matcher 排除；`docs\production-safety.md:68-78` 约定部署包排除 `public/uploads`、Nginx 不直出 `/uploads/`、长期目标私有 OSS + 签名 URL；`deploy\nginx\edu-manage.conf:8-12,49-53` 仅一条 `location /` 反代 `127.0.0.1:3000`，无独立 uploads 静态 root/alias。
- **风险**：CDN 是否缓存 API 响应/签名 URL、是否把 `/uploads/`、`/volunteer/docs/` 回源到应用、bucket 是否与站点同域，均需控制台核对；若 CDN 长缓存签名 URL 或 public-read 对象，签名有效期与代理鉴权都会被绕过。
- **建议**：导出 CDN 缓存规则与 bucket ACL 归档到 `docs/`；API 与签名 URL 配置 `no-store`/短 TTL；上传目录不走 CDN 缓存；定期巡检 OSS 对象列表与访问日志。

### E-21 环境密钥持有面：多组第三方凭证已配置，需确认注入路径与轮换记录

- **证据**：`.env` 持有 DB 连接串、next-auth secret、WxPusher token、企业微信 CorpID/AgentID/AgentSecret、DeepSeek/MIMO/KIMI API Key（键名见 5.4.6，值略）；`.env.local` 持有高德 Key、ARK Key、OSS AccessKeyId/Secret、bucket/endpoint/公网域名；compose `env_file: .env`（`:46-47`）注入容器；Dockerfile 未 COPY `.env`；`.gitignore:35-36`、`.dockerignore:20-22` 排除 env 文件。
- **风险**：密钥分散在本地两份 env 与服务器 `.env`；仓库无密钥轮换/过期记录；OSS AccessKey 权限范围（是否可写其他 bucket/列出对象）代码层不可见。
- **建议**：核对 OSS AK 为最小权限（限本 bucket 读写、禁 list/删其他资源）；建立密钥轮换台账；本地 `.env.local` 不随备份包上传；异常 AK（疑似泄露）可在阿里云控制台直接禁用。

## 待实测项

> 以下假设静态代码无法确认，**禁止对线上站点做爬取、压测、批量下载或 UA 伪装**；验证一律在本机 dev 环境低频、单点、可回滚地进行，或由运维在控制台/容器/日志侧只读核对。

| 编号 | 待验证假设 | 验证方法（低风险、单点、可回滚） | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| TE-1 | 生产 `STORAGE_DRIVER` 实际值（本地 `.env.local` 长度 5 = local；生产 compose 未覆盖该变量） | 运维在服务器 `docker exec edu-manage-app printenv STORAGE_DRIVER` 只读查看；不发起对象读写 | 只读容器环境变量 | 确认走本地文件还是 OSS；决定 E-6/E-7 修复优先级 |
| TE-2 | OSS bucket ACL 是 public-read 还是私有；对象能否用裸公网 URL 直读 | 运维在 OSS 控制台查看 bucket 读写权限与对象 ACL；挑 1 个已知测试对象核对，不遍历列表 | 只读控制台 | 若 public-read，按 E-6 转私有 + 签名 URL |
| TE-3 | `/uploads/<key>` 与 `/volunteer/docs/*` 在 Nginx/CDN 下是否绕过鉴权直连 | 本机 dev 启动后，用未登录会话直接 GET 一个已知本地测试文件路径，观察 200 静态直出还是 302/401；线上仅由运维核对 nginx `location` 与 CDN 回源规则，不构造批量请求 | 本机 dev 低频；线上只读配置 | 按 E-7/E-12 收敛静态旁路 |
| TE-4 | 根目录 `*.sql / *.zip / _*` 是否被 git 跟踪 | 在装有 git 的环境执行 `git ls-files` 过滤 `\.(sql|zip|dump)$` 与 `^_`；不提交、不推送任何文件 | 只读索引查询 | 已跟踪则按 E-13 从索引移除并评估历史清理 |
| TE-5 | CDN 是否缓存 API 响应、签名 URL、上传目录 | 运维在 CDN 控制台查看缓存键规则与命中日志；抽查响应 `Cache-Control`/`Age` 头，不主动刷缓存 | 只读配置 | 签名 URL/API 配 no-store；上传目录排除缓存 |
| TE-6 | Sentry 项目实际是否收到 cookie/request body/replay DOM 文本 | 运维在 Sentry 后台查看最近错误事件的 request 上下文与 replay 样本；必要时在预发环境触发一次受控 500 观察上送内容 | 预发单次受控触发 | 按 E-8 补 beforeSend/masking 后复测 |
| TE-7 | Redis 内网是否有其他容器/主机可连；6379 是否仅 internal 可达 | 运维核对 compose 网络与宿主机防火墙；从另一容器 `redis-cli ping` 验证连通性，不写入键 | 内网只读探测 | 补 requirepass（E-16）；收紧网络策略 |
| TE-8 | 服务器上 `release/ tmp/ backups/ data/` 是否被其他服务或 Nginx 静态根覆盖；历史日志是否含 DB 连接串/请求体 | 运维 `docker exec`/`ls` 核对目录位置与权限；抽样 grep 服务器日志中的连接串/手机号模式，不导出日志到外部 | 只读容器与服务器文件系统 | 按 E-18 固化目录边界；清理残留日志 |
| TE-9 | 生产模式 500 是否真的不返回 `err.message`/stack | 本机以 `NODE_ENV=production` 启动 dev/预发，触发一次受控异常（如临时断库），观察响应体仅含通用文案；验证后恢复配置 | 本机/预发单次；不指向线上 | 若回显内部消息，按 E-10 收紧 catch 分支 |
| TE-10 | 材料/讲义静态目录（`public/services marketing business-assets`）线上文件清单是否含用户上传残留 | 运维在容器 `public/` 下列目录核对；不通过 URL 逐个访问 | 只读容器文件系统 | 清理 test-*.pdf 等测试残留；公开素材登记造册 |

## 覆盖说明（扫描口径与覆盖数，不作为结论本身）

- **导出/下载路由覆盖**：`src\app\api\reports\*` 9 个、`attendance/export`、`settings/export/students|finance`、`admin/salary/export`、`admin/students/[id]/feedback-export`、`admin/classroom-feedback/image-download`、`volunteer/documents/[id]/download`、`files/view`、`files/[id]`、`materials/[id]/view`、`settings/backup/create`、`public/teacher-showcase/portrait`，共 21 个通道（20 个导出/下载路由 + 1 个公开头像）逐个精读角色/裁剪/字段/限流/审计/文件名。
- **限流引用扫描**：对 `checkRateLimit` 做全仓调用点计数；`apiHandler` 包装覆盖率沿用第四章结论（296 个非测试路由中 287 个包装）；`RATE_RULES` 21 条前缀逐条核对，确认无导出/财务/薪资/学员专用规则。
- **上传链路覆盖**：`upload-policy.ts`（角色×类型矩阵 3-19）、`upload-access.ts`（资产校验 41-110、DB 反查 113-149、关联校验 156-187）、`upload-url.ts`（归一化/回落 1-43）、`material-file.ts`（白名单/文件头 1-80）、`storage/index.ts`（local/OSS 双驱动 133-338、工厂与安全文件名 340-401）、`/api/upload`、`/api/uploads/sign`、`/api/uploads/[filename]`、`/api/materials/oss-signature`、`/api/materials/upload`、`/api/volunteer/documents` 逐个核对 ext 白名单、大小、文件头、文件名、回落路径。
- **文件读取扫描**：全 src grep `sendFile|createReadStream|readFile(|readFileSync(`，生产路由命中 10 处（见 5.5 列表），其余均在 `*.test.ts`；未发现任意路径直读路由。
- **错误/日志/Sentry 扫描**：精读 `api-handler.ts` 全量 catch/脱敏链路；grep `beforeSend|beforeBreadcrumb|sendDefaultPii|maskAll|blockAll|setUser|cookies()`；扫描 `security.log / security-final.log` 敏感正则命中并逐行定性；env 文件只统计键名与值长度特征，未抄录任何 secret/key 原文。
- **构建产物扫描**：精读 `Dockerfile`（deps/builder/migrator/runner 四阶段）、`.dockerignore`、`.gitignore`、`next.config.ts` 全量头/缓存/rewrite 配置；`public/` 全量按扩展名分组；根目录与 scratch 目录按文件数/体积实测；`compose.production.yaml` 逐服务核对 ports/networks/command/env。
- 未覆盖：前端页面内客户端 jspdf/modern-screenshot 生成逻辑的数据面（浏览器本地，不经服务端落盘）、OSS 桶策略与 RAM 权限、CDN/Nginx 线上实际规则、Sentry 后台数据保留策略；这些分别由前端代码审查、运维配置核对与待实测 TE-1~TE-10 覆盖。

# 第六章　分级处置方案

> 处置原则：系统已上线并承载三端业务，所有改动只做"加校验、加白名单、加上限、加签名"，不改数据模型、不改接口契约、不动既有权限边界。除特别说明，均不需要停机。

## 一、立刻做（当天至本周，共 6 项）

| 序 | 编号 | 改哪里 | 怎么改 | 工作量 | 不破坏业务的前提 |
| --- | --- | --- | --- | --- | --- |
| 1 | B-1 | `src\app\api\teachers\[id]\route.ts` 的 DELETE | 在 `requireSession()` 之后补 `if (role !== 'admin') return 403`，与同文件 GET/PATCH 同构 | 小 | 前端教师端无"注销教师"入口，仅管理端调用，补 403 不影响正常路径 |
| 2 | E-12 | `src\app\api\volunteer\documents\[id]\download\route.ts` | 把"仅登录"升级为"admin 或文档归属人"，按文档的 owner / 学部收口 | 小 | 家长端本不该下载站内文档，需先确认前端是否有合法调用点 |
| 3 | E-1 | `src\app\api\settings\backup\create\route.ts` | 7 张表的 `findMany()` 全部加 `select` 白名单与 `take` 上限；导出改为"生成文件 + 短时下载链接"，并加二次确认 | 中 | 备份用途是运维归档，改成分文件下载不影响恢复流程 |
| 4 | C-1 | `src\app\api\wxpusher\callback\route.ts` | 停用"凭 `extra` 直接写 uid"；改为已登录家长会话发起的一次性绑定票据 + 回调仅更新既有绑定；比对改 `timingSafeEqual` | 中 | 若推送当前未启用，可直接先关闭该路由，待票据方案上线再开 |
| 5 | D-1 | `src\app\api\public\teacher-showcase\route.ts` | 加 `take` 上限（如 100）与独立限流（如 30–50 rpm/IP），公开页加短缓存 | 小 | 首页展示教师数量有限，分页/限量不影响展示 |
| 6 | E-13 | 仓库根 `.gitignore` | 增 `*.sql`、`*.zip`、`_*`、`data/`、`backups/`；先 `git ls-files` 核实是否已跟踪，已跟踪的用 `git rm --cached` 移出索引 | 小 | 只改索引不改磁盘文件；历史清理需单独评估 |

## 二、近期做（1–4 周）

### 2.1 认证与会话

| 编号 | 事项 | 落点 | 要点 |
| --- | --- | --- | --- |
| A-2 | 登录失败文案与错误码统一 | `src\lib\login-accounts.ts`、`src\app\login\page.tsx` | 对外统一为单一文案，细分错误码只进服务端日志 |
| A-3 | 初始口令改随机 + 首登强制改密 | `src\app\api\teachers`、`students` 的建号路径、`src\lib\password-policy.ts` | 姓名拼音口令可被公开信息预测，且跳过了策略校验 |
| A-7 | 受信代理下的 IP 采信 | `src\lib\request-ip.ts` | 只在"请求来自受信代理"时才接受 `X-Real-IP`，否则取连接地址 |
| A-5 | 家长激活令牌有效期由 7 天收紧 | `src\lib\...` 激活令牌生成处 | 同时给激活端点加独立限流 |
| A-1 | 关键守卫回库复核角色 | `src\lib\guards.ts`、`src\get-user` 一类取用户函数 | 降级/解绑后旧 JWT 在 30 天内仍持原角色，至少管理端守卫要实时查库 |

### 2.2 授权与越权

| 编号 | 事项 | 落点 | 要点 |
| --- | --- | --- | --- |
| B-2 | 教师列表加 admin 守卫 + 字段裁剪 | `src\app\api\teachers\route.ts` | 现仅校验登录，全量返回 phone / email / 学历 / 合同日期 |
| B-3 / B-4 / B-5 | 补归属校验 | `highlights`、`schedules/teacher-week`、`schedules/daily` | 分别补"学员归属""teacherId 是否本人""按角色裁剪名单" |
| C-2 | 家长端补显式角色门 | 家长端 10 个文件 12 个 handler | 现在靠"非家长绑定为空→查不到"兜底，模型一变即失效 |
| C-9 | 关键 handler 自带会话校验 | `volunteer/yifenyidang` 等依赖 proxy 白名单的接口 | 不依赖单一中间件，做纵深防御 |

### 2.3 防爬与防枚举

| 编号 | 事项 | 落点 | 要点 |
| --- | --- | --- | --- |
| D-2 | 4 个列表补 clamp | `teachers` / `notifications` / `leave-requests` / `settings/logs` | 参照 `students` 的 `Math.min(500, ...)` 写法 |
| D-9 | 账号维度聚合限流 | `src\lib\rate-limit.ts` | 以"被探测的手机号/邮箱"为 key，跨 detect-role / login-check / check-role / login-status / 登录 / 找回密码 统一计数 |
| D-4 | 9 个未包装路由纳入 `apiHandler` | 回调、health、teacher-showcase、learning-report 等 | 统一 body 上限、IP 提取与限流基线 |
| D-5 | 收紧兜底阈值 | `src\lib\rate-limit.ts` 的 `RATE_RULES` | 200/300 rpm 偏宽，公开接口按路径单独定档 |

### 2.4 防数据窃取

| 编号 | 事项 | 落点 | 要点 |
| --- | --- | --- | --- |
| E-2 / E-3 | 导出加"按人配额 + 审计" | 20 个导出路由 | 每用户每日次数上限；每次导出写一条可检索的审计记录（谁、何时、导了哪批） |
| E-4 | 教师端报表按本人裁剪 | `paper-stats` / `volunteer-stats` 等 | 现在教师可见本学部全库聚合 |
| E-6 / E-7 | OSS 私有化与静态旁路 | `src\lib\upload-url.ts`、`storage` 驱动、`proxy` matcher | 接线 `ALIYUN_OSS_PRIVATE_BUCKET`；本地链接统一走鉴权路由 |
| E-8 | Sentry 脱敏 | `sentry.client.config.ts` / `sentry.server.config.ts` | 补 `beforeSend`、关 PII、replay 加 masking |
| E-9 | 文档上传补 magic bytes | `src\lib\upload-policy.ts` 与通用上传路由 | 目前"图片严、文档松"，文档仅验扩展名 |
| E-16 | Redis 加口令 | `compose.production.yaml` | 现内网无密码，唯一防线是网络隔离 |
| E-14 | 反馈图签名不再 fail-open | `src\lib\classroom-feedback\export-image-url.ts` | secret 缺失时拒绝签发，而非降级裸链 |

### 2.5 边缘与运维（与代码同步推进）

| 编号 | 事项 | 落点 | 要点 |
| --- | --- | --- | --- |
| D-12 / D-13 | Nginx 与 CDN 的边缘规则 | Nginx conf、阿里云 CDN/DCDN 控制台 | 补 `limit_req`、UA 黑名单、Bot 管理、敏感路径 ACL |
| A-13 / D-14 | 限流驱动显式锁 Redis | 环境变量与 `rate-limit.ts` | 现为 auto 降级，Redis 故障时静默退化为单机内存且只 `console.warn` |
| E-19 / E-21 | 备份落地与密钥台账 | cron、运维文档 | 确认每日 pg dump 真实执行；补 AK 最小权限与轮换台账 |

## 三、长期做（季度级）

| 编号 | 事项 | 说明 |
| --- | --- | --- |
| D-8 | 人机校验 / Bot 指纹 | 全链路目前无任何验证码、滑块、Turnstile、极验；换 IP 慢速枚举无兜底 |
| A-12 | 管理员 2FA | 高权限账号缺少第二因子 |
| A-11 | 密码历史与设备会话管理 | 无密码复用检查、无设备列表与单设备下线 |
| C-14 | 小程序鉴权体系 | `miniapp` 目前是空壳，接入前必须先定 token 方案，避免"前端传 openid 即信" |
| E-15 | 上传内容恶意扫描 | magic bytes 之外的宏/脚本/压缩包检测 |
| D-16 | 爬取与枚举告警 | 异常 UA、高频 401、单 IP 大流量下载无可观测信号，事后无法回溯 |
| E-18 | 构建上下文与目录边界 | `release` 1494MB / `tmp` 642MB / `backups` 55MB，`data/` 未进 dockerignore |

## 四、改动后的回归清单

任何一项落地后，至少回归以下路径，确认没有把既有业务挡在门外：

1. 三端登录与踢出（含改密后旧会话失效）。
2. 家长端按学员查看：成绩、考勤、课表、档案、反馈、消息。
3. 教师端：我的课次、我的学生、单次课反馈、试卷批注。
4. 管理端：导出学员 / 费用 / 薪资、备份、教师与学员增删改。
5. 公开页：首页教师展示、公开 AI 问答、志愿数据查询。

# 第七章　待实测项汇总（44 项）

以下 7 组共 44 项，**均为静态审查无法定论、必须实测或查运维配置才能确认的事项**。逐项的验证方法与风险等级见各章末尾"待实测项"表；下表只做归并与排序建议。

| 组 | 涉及项 | 要回答的关键问题 | 建议执行环境 |
| --- | --- | --- | --- |
| 边缘与网络身份 | TA-1、TD-3、TD-4、TD-9、TE-5 | Nginx 是否覆写 `X-Real-IP`；CDN 是否配了 Bot / 边缘限流 / 缓存键；线上 robots 实际输出 | 运维只读控制台 + 本机 dev 单次请求 |
| Redis 与限流驱动 | TA-2、TC-2、TC-7、TD-8、TE-7 | 生产是否真的走 Redis；Redis 挂了是拒绝还是静默降级；`ai/chat` 内存桶重启是否清零 | 运维查环境变量 + 预发低频验证 |
| 生产环境变量与密钥 | TA-3、TA-4、TC-5 | `AUTH_SECRET` 长度与一致性；`SUPER_ADMIN_EMAILS` 是否注入；回调 token 是否已配置 | 运维只读（不落盘、不外传） |
| 会话与令牌 | TA-5、TA-6、TB-3、TC-9 | 多实例踢出传播时效；令牌在日志/CDN 的留存；改密后旧 JWT 是否立即失效 | 预发双实例 + 日志抽查 |
| 静态目录与构建产物 | TE-3、TE-4、TE-8、TE-10、TD-7 | `/uploads/` 与 `/volunteer/docs/` 是否被 Nginx/CDN 直出；根目录 dump 是否被 git 跟踪；镜像内是否有残留 | 本机 dev 单次 GET + `git ls-files` |
| 上传 / 对象存储 / 遥测 | TE-1、TE-2、TE-6、TE-9 | 生产 `STORAGE_DRIVER` 实际值；bucket ACL 是否 public-read；Sentry 是否真的收到 cookie/body/replay；生产 500 是否回 `err.message` | 运维只读 + 预发受控触发 |
| 权限回归与依赖 | TA-7、TA-8、TB-1、TB-2、TB-4、TB-5、TB-6、TB-7、TB-8、TC-1、TC-3、TC-4、TC-6、TC-8、TD-1、TD-2、TD-5、TD-6 | 9 条未包装路由的运行态鉴权；proxy matcher 边界；双库 division 隔离；回调写库行为 | 测试环境构造账号 + 本机 dev |

# 第八章　因为未做线上实测而无法确定的结论

以下判断**在本报告中只给出"静态可行"的结论，不宣称已在线上成立**，请勿据此直接对外定性：

1. **限流是否真的在分布式生效**：代码为 auto 降级模式，本地 `.env` 未见 `REDIS_URL`。生产若未配置 Redis，所有按 IP / 账号的限流都退化为单机内存，多实例部署下阈值被成倍稀释。此项未验证前，"限流已生效"不能作为结论。
2. **按 IP 的限流是否可被绕过**：应用只采信 `X-Real-IP`，前提是 Nginx 覆写该头。若回源未覆写，攻击者自造该头即可换桶。Nginx 配置不在本仓库内，无法确认。
3. **`/uploads/<key>` 与 `/volunteer/docs/` 的静态旁路是否真实可达**：取决于 Nginx `location` 与 CDN 回源规则，代码层只能看到 proxy matcher 排除了这些段。
4. **OSS 对象是否可被裸 URL 直读**：取决于 bucket ACL，代码中 `ALIYUN_OSS_PRIVATE_BUCKET` 零读取，私有化完全依赖控制台设置。
5. **生产错误响应是否泄露内部细节**：本次只能确认统一错误处理器做了脱敏，生产分支是否仍回 `err.message` 需以 `NODE_ENV=production` 触发一次受控异常验证。
6. **Sentry 实际收到了什么**：是否有 `beforeSend`、是否上报 cookie/body、replay 是否录了 DOM 文本，取决于项目后台配置与 SDK 默认行为。
7. **仓库是否已跟踪生产 dump 与源码包**：报告的结论是"`.gitignore` 未排除"，是否已被提交需 `git ls-files` 核实后才能定性。
8. **CDN 侧是否有 Bot 管理 / WAF / 边缘限流**：仓库与文档中找不到任何痕迹，但控制台可能另配了规则。本报告据此只写"代码库无证据"，不写"没有配置"。
9. **next-auth 5.0.0-beta.32 的已知缺陷**：beta 版本，需对照官方安全公告评估，本报告不作安全定性。

# 附录 A　覆盖统计

| 项目 | 数量 | 说明 |
| --- | --- | --- |
| `src\app\api` 路由目录 | 343 | 全量枚举 |
| 非测试 `route.ts` | 296 | 其中 287 个经 `apiHandler` 包装，9 个未包装 |
| 管理端 / 教师端 handler 判定 | 336 | 合格 315、残缺 20、裸奔 1 |
| 家长端 / 公开入口路由方法判定 | 73 | 逐条判定身份来源、角色、归属、公开边界 |
| 导出 / 下载通道 | 20 + 1 | 20 个导出下载 + 1 个公开头像通道 |
| 限流规则条目 | 21 | `RATE_RULES` 全表核对 |
| 本次结论总数 | 86 | ①41 / ②19 / ③26 |

# 附录 B　问题索引（86 项）

| 编号 | 问题（截断） | 类别 | 工作量 | 优先级 | 章节 |
| --- | --- | --- | --- | --- | --- |
| A-1 | JWT 中的角色（role/division/teacherId）登录时固化，会话刷新与服务端守卫均不回库复核 | ①已具备但不完善 | 中(1-3天) | 近期 | 第1章 |
| A-2 | 登录失败按"账号不存在 / 密码错误 / 身份不符 / 已停用"返回不同 code 与不同中文文案，可枚举账号是否存在及停用状态 | ①已具备但不完善 | 小(<1天) | 近期 | 第1章 |
| A-3 | 教师/家长默认初始口令为姓名拼音，且跳过密码策略校验；User 模型无强制改密标记 | ①已具备但不完善 | 中(1-3天) | 近期 | 第1章 |
| A-4 | proxy 对"停用/踢出"状态做 5 秒内存缓存；限流与踢事件在 Redis 不可用时静默降级为单机内存 | ①已具备但不完善 | 中(1-3天) | 近期 | 第1章 |
| A-5 | 家长激活令牌有效期 7 天；激活密码策略（8 位+字母数字）弱于主策略；激活端点无独立限流，GET 回显家长姓名/邮箱/学员 | ①已具备但不完善 | 小(<1天) | 近期 | 第1章 |
| A-6 | 会话 Cookie 未使用 `__Host-` 前缀；`secure` 属性由 `NEXTAUTH_URL` 前缀推导 | ①已具备但不完善 | 小(<1天) | 长期 | 第1章 |
| A-7 | IP 维度完全依赖 `X-Real-IP` 单头取值，防伪造以"Nginx 覆写该头"为前提 | ①已具备但不完善 | 小(<1天) | 近期 | 第1章 |
| A-8 | `detect-role` / `check-role` / `login-status` 三个预检接口返回可区分的角色/存… | ①已具备但不完善 | 小(<1天) | 长期 | 第1章 |
| A-9 | `api-rate-limit.ts` 为已废弃空壳转发，全仓 0 处业务引用 | ②完全缺失（死代码） | 小(<1天) | 长期 | 第1章 |
| A-10 | `createPublicTeacherPortraitToken` 签发函数 0 处调用，验签端点却在接收令牌 | ②完全缺失（死代码/链路缺口） | 小(<1天) | 近期 | 第1章 |
| A-11 | 无密码历史复用检查、无定期轮换策略；无设备会话列表与单设备主动下线能力 | ②完全缺失 | 大(>3天) | 长期 | 第1章 |
| A-12 | 登录链路无验证码/人机校验，管理员账号无 2FA | ②完全缺失 | 大(>3天) | 长期 | 第1章 |
| A-13 | 限流/会话事件的 Redis 驱动为 auto 降级模式；本地 `.env` 未配置 `REDIS_URL`，生产实际配置待核实 | ③架构运维层 | 中(1-3天) | 近期 | 第1章 |
| A-14 | `SUPER_ADMIN_EMAILS` 未出现在 `.env.example`，本地 `.env` 亦无该键；生产注入情况… | ③架构运维层 | 小(<1天) | 近期 | 第1章 |
| A-15 | `initSessionEvents()` 仅在测试中调用，应用启动未初始化 Redis 订阅；跨实例 SSE 订阅靠发布时… | ③架构运维层 | 小(<1天) | 近期 | 第1章 |
| A-16 | cron / health 接口令牌走 URL query 参数 | ③架构运维层 | 小(<1天) | 近期 | 第1章 |
| A-17 | `robots.ts` Disallow 列表枚举了全部内部后台路由名 | ③架构运维层 | 小(<1天) | 长期 | 第1章 |
| B-1 | 注销教师接口 DELETE 仅校验会话、无角色判断，教师/家长账号可注销任意教师并转移课程学员 | ② 完全缺失 | 小 | 立刻 | 第2章 |
| B-2 | `teachers` 列表接口仅校验登录，无角色判断且未做字段裁剪，全量返回教师 phone/email/学历/合同结束日期 | ② 完全缺失 | 小 | 近期 | 第2章 |
| B-3 | `highlights` 列表仅校验登录，未按角色/归属收窄，可按 studentId/groupId 遍历全部学员亮点 | ② 完全缺失 | 小 | 近期 | 第2章 |
| B-4 | `schedules/teacher-week` 教师周课次接口：teacherId 参数未校验是否本人，非 admin 可… | ② 完全缺失 | 小 | 近期 | 第2章 |
| B-5 | `schedules/daily` 当日课次接口未按角色裁剪，家长/教师可读当天全部课次及 enrollment 学员 id… | ② 完全缺失 | 小 | 近期 | 第2章 |
| B-6 | 试卷评论接口不校验归属：教师不核 paper.teacherId、家长不核 paper.studentId，可对任意试卷留言 | ① 已具备但不完善 | 小 | 近期 | 第2章 |
| B-7 | 试卷反应（点赞/表情）接口无归属校验，任意登录用户可对任意试卷操作反应 | ① 已具备但不完善 | 小 | 长期 | 第2章 |
| B-8 | 学员徽章接口教师分支 where 未带教师/学生归属，可按 studentId 读任意学员徽章 | ① 已具备但不完善 | 小 | 近期 | 第2章 |
| B-9 | 教师端聚合报表（paper-stats / parent-engagement / volunteer-stats）允许教师… | ① 已具备但不完善 | 中 | 长期 | 第2章 |
| B-10 | 单次课反馈学生检索 `toStudentOptions` 列出本学部全部学生（含家长姓名/电话尾号），未限定本人授课学生 | ① 已具备但不完善 | 中 | 近期 | 第2章 |
| B-11 | 一组只读探测类接口（overview / check-conflict / 冲突批量 / teachers-stats / … | ① 已具备但不完善 | 小 | 长期 | 第2章 |
| B-12 | 家长沟通通知已读/删除标记 `userId` 错写成操作者本人 id，条件永不命中（逻辑缺陷，非越权） | ① 已具备但不完善 | 小 | 近期 | 第2章 |
| B-13 | `settings` GET 向所有登录角色返回系统配置全量行（组织信息、作息时段、权益文案） | ① 已具备但不完善 | 小 | 长期 | 第2章 |
| B-14 | `materials/oss-signature` GET 未校验会话即返回 OSS 是否启用（布尔） | ① 已具备但不完善 | 小 | 长期 | 第2章 |
| B-15 | 大量路由裸用 `auth()` 或本地 `requireAdmin()`，会话吊销/停用校验完全依赖 proxy 兜底；pr… | ③ 架构运维层 | 中 | 近期 | 第2章 |
| B-16 | `api-rate-limit.ts` 为 156 字节空壳，范围内写/导出接口未接入限流 | ③ 架构运维层 | 中 | 长期 | 第2章 |
| B-17 | cron 接口 Bearer token 走 URL query string，且 archive/retry 同时接受 C… | ③ 架构运维层 | 小 | 长期 | 第2章 |
| B-18 | Prisma raw SQL 盘点：全部参数化模板绑定，未发现 Unsafe 拼接 SQL（合格项，归档备查） | ③ 架构运维层 | — | 长期 | 第2章 |
| C-1 | wxpusher/callback 仅靠共享 appToken 比对即可把任意家长账号的推送通道绑到攻击者 UID，无 HM… | ②完全缺失 | 中 | 立刻 | 第3章 |
| C-2 | 家长端 10 个文件（12 个 handler）只校验登录、未显式校验 `role==='parent'`，归属防护完全依赖… | ①已具备但不完善 | 小 | 近期 | 第3章 |
| C-3 | check-role / detect-role 未登录即可探测账号存在性与角色/学部；login-status 暴露锁定状… | ①已具备但不完善 | 小 | 近期 | 第3章 |
| C-4 | qywx/event 回调未校验 timestamp 偏移、未存 nonce 防重放 | ①已具备但不完善 | 小 | 近期 | 第3章 |
| C-5 | health 探针 token 用 `!==` 比较（非常量时间），且未走 apiHandler、无全局限流 | ①已具备但不完善 | 小 | 近期 | 第3章 |
| C-6 | ai/chat 限流为进程内内存 Map，不进 Redis | ③架构运维层 | 中 | 近期 | 第3章 |
| C-7 | schools GET 向登录家长返回 `updatedBy`（管理员用户 id） | ①已具备但不完善 | 小 | 近期 | 第3章 |
| C-8 | documents/[id]/download 未做路径规范化复核，缺 nosniff 响应头 | ①已具备但不完善 | 小 | 长期 | 第3章 |
| C-9 | yifenyidang 等 handler 自身无会话校验，鉴权完全依赖 proxy 中间件白名单 | ③架构运维层 | 中 | 近期 | 第3章 |
| C-10 | 限流驱动 Redis 故障时 auto 模式降级内存桶，仅本地 console.warn、无 Sentry/告警上报与熔断 | ③架构运维层 | 小 | 近期 | 第3章 |
| C-11 | public-assistant 仅有 5 次/IP/分钟限流，无每日总额度与黑名单 | ③架构运维层 | 小 | 近期 | 第3章 |
| C-12 | qywx/event、wxpusher/callback、health、public/teacher-showcase（含 … | ③架构运维层 | 小 | 长期 | 第3章 |
| C-13 | `/volunteer/docs/` 静态目录在 proxy 白名单内公开，上传附件凭文件名可直下 | ③架构运维层 | 小 | 近期 | 第3章 |
| C-14 | miniapp 为空壳，无小程序鉴权/token 体系 | ③架构运维层 | 中 | 长期（接入前必须完成） | 第3章 |
| D-1 | 匿名接口 `/api/public/teacher-showcase` 无分页、无独立限流，一次请求镜像全量在职教师名册 | ①已具备但不完善 | 小(<1天) | 立刻 | 第4章 |
| D-2 | 4 个后台列表 `limit/pageSize` 未 clamp（teachers/notifications/leave-… | ①已具备但不完善 | 小(<1天) | 近期 | 第4章 |
| D-3 | 登录与 4 个预检接口响应区分存在性/停用/锁定，限流仅按共享 IP，无被探测账号维度聚合 | ①已具备但不完善 | 小(<1天) | 近期 | 第4章 |
| D-4 | 9 个路由未走 `apiHandler`；其中 teacher-showcase（匿名）、learning-report、c… | ①已具备但不完善 | 小(<1天) | 近期 | 第4章 |
| D-5 | 兜底限流 200 rpm、GET 300 rpm 偏宽；公开 AI 助手 5 rpm/IP 但无日配额；Redis 降级内存… | ①已具备但不完善 | 中(1-3天) | 近期 | 第4章 |
| D-6 | robots.ts 遗漏 9 个认证页前缀；`/services` 规则与静态 rewrite 意图不一致 | ①已具备但不完善 | 小(<1天) | 长期 | 第4章 |
| D-7 | `/volunteer/docs/*` 静态目录匿名公开，上传文档按文件名直链可达，无签名/过期；public 内存量 xl… | ①已具备但不完善 | 小(<1天) | 近期 | 第4章 |
| D-8 | 全链路无验证码/滑块/turnstile/hCaptcha/极验，无 Bot 指纹与行为风控 | ②完全缺失 | 大(>3天) | 长期 | 第4章 |
| D-9 | 无跨接口按"被探测账号/手机号/关键字"聚合的频率限制 | ②完全缺失 | 中(1-3天) | 近期 | 第4章 |
| D-10 | 全量导出接口无冷却期与每日次数上限，仅受兜底 200 rpm 约束 | ②完全缺失 | 小(<1天) | 近期 | 第4章 |
| D-11 | 公开数据接口无分页契约/ETag/分片返回，名册类资源一次响应整表 | ②完全缺失 | 中(1-3天) | 长期 | 第4章 |
| D-12 | Nginx 无 `limit_req`、无 UA/Bot 黑名单、无 ACL；仓库未见 WAF 模块与规则 | ③架构运维层 | 中(1-3天) | 近期 | 第4章 |
| D-13 | CDN 侧 Bot 管理/边缘限流/ACL 在代码与文档中无证据，线上配置待核实 | ③架构运维层 | 中(1-3天) | 近期 | 第4章 |
| D-14 | 限流驱动 auto 降级内存；ai/chat 桶为进程内 Map；多实例下阈值被分摊、重启清零 | ③架构运维层 | 中(1-3天) | 近期 | 第4章 |
| D-15 | IP 维度唯一信任 `X-Real-IP`，前提是上层 Nginx/CDN 覆写该头；CDN 回源透传情况待核实 | ③架构运维层 | 小(<1天) | 近期 | 第4章 |
| D-16 | 未见异常 UA、高频 401、单 IP 大流量下载的日志审计与告警配置 | ③架构运维层 | 中(1-3天) | 长期 | 第4章 |
| E-1 | `settings/backup/create` 七表无 select/无 take 全标量回包 | ①已具备但不完善·导出通道 | 中 | 立刻 | 第5章 |
| E-2 | 导出通道无专用限流、无按用户/按日配额 | ①已具备但不完善·限流 | 中 | 近期 | 第5章 |
| E-3 | 18/20 导出下载路由无独立审计条目 | ①已具备但不完善·审计 | 小 | 近期 | 第5章 |
| E-4 | paper-stats 教师未按本人课次裁剪；volunteer-stats 跨部不裁剪 | ①已具备但不完善·授权裁剪 | 小 | 近期 | 第5章 |
| E-5 | finance notes 自由文本随表导出；考勤/学员/薪资导出无 take 上限 | ①已具备但不完善·字段裁剪/分页 | 小 | 近期 | 第5章 |
| E-6 | OSS 私有 bucket 开关代码未接线，put 返回未签名公网 URL | ①已具备但不完善·对象存储 | 中 | 近期 | 第5章 |
| E-7 | 本地 legacyUrl `/uploads/<key>` 静态旁路，proxy matcher 排除 uploads/vo… | ①已具备但不完善·访问控制 | 中 | 近期 | 第5章 |
| E-8 | Sentry 无 beforeSend/无 PII 显式关闭、replay 无 masking | ①已具备但不完善·遥测泄露 | 小 | 近期 | 第5章 |
| E-9 | 文档类上传无 magic bytes；志愿文档通道无文件头校验 | ①已具备但不完善·上传校验 | 中 | 近期 | 第5章 |
| E-10 | 请求 body/cookie 未纳入脱敏；upload 错误消息内部外泄；识别上游细节回显 120 字符 | ①已具备但不完善·错误/日志 | 小 | 近期 | 第5章 |
| E-11 | 部分上传/下载响应缺 nosniff；CSP script-src unsafe-inline；无 COOP/COEP | ①已具备但不完善·响应头 | 小 | 长期 | 第5章 |
| E-12 | 志愿文档下载仅登录、无角色校验 | ②完全缺失·授权 | 小 | 立刻 | 第5章 |
| E-13 | `.gitignore` 未排除根 `*.sql/*.zip/_*`；54.7MB 生产 dump 跟踪状态未核 | ②完全缺失·仓库泄露 | 小 | 立刻 | 第5章 |
| E-14 | 反馈图片签名 secret 缺失时降级未签名裸链；7 天 TTL 偏长 | ②完全缺失·签名机制 | 小 | 近期 | 第5章 |
| E-15 | 无上传内容恶意扫描/病毒检测（magic bytes 之外） | ②完全缺失·上传校验 | 中 | 长期 | 第5章 |
| E-16 | Redis 内网无密码 | ②完全缺失·基础设施 | 小 | 近期 | 第5章 |
| E-17 | db/redis 未映射公网端口（正面），但 Redis 无密码 + 单实例内网假设 | ③架构运维·网络隔离 | — | 近期 | 第5章 |
| E-18 | 本地 scratch 体量巨大（release 1494MB / tmp 642MB / backups 55MB）；dat… | ③架构运维·构建上下文 | 中 | 长期 | 第5章 |
| E-19 | 生产备份以文档 cron 约定为准，仓库内无 cron 安装证据；应用 JSON 导出非 DB 备份 | ③架构运维·备份策略 | 中 | 近期 | 第5章 |
| E-20 | OSS ACL / CDN 回源缓存 / Nginx 是否直出 uploads 均为线上配置，仓库无证据 | ③架构运维·CDN/对象存储 | 中 | 近期 | 第5章 |
| E-21 | 多组第三方凭证已配置（DB/next-auth/WxPusher/企微/AI Key/OSS AK），仓库无轮换台账与 AK… | ③架构运维·密钥管理 | 中 | 近期 | 第5章 |
