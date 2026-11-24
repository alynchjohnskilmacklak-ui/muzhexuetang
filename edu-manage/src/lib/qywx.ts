import * as Sentry from '@sentry/nextjs'
import { truncateUtf8Bytes } from '@/lib/utf8'

/**
 * 企业微信集成 SDK。
 *
 * 两条通道：
 * - 员工通道：企业自建应用消息（POST /cgi-bin/message/send，news 卡片可点链接）
 * - 家长通道：客户联系「创建群发任务」（POST /cgi-bin/externalcontact/add_msg_template）
 *   这只会创建待员工确认的群发任务，不会由服务端直接把消息送到家长微信。
 *
 * 配置（.env）：
 *   QYWX_ENABLED=true/false          总开关
 *   QYWX_CORP_ID=                    企业 ID（企业微信后台-我的企业）
 *   QYWX_AGENT_ID=                   自建应用 AgentId
 *   QYWX_AGENT_SECRET=               自建应用 Secret（员工通道）
 *   QYWX_CONTACT_SECRET=             可选：已获客户联系接口权限的应用 Secret
 *   QYWX_HOME_SCHOOL_SECRET=         可选：家校沟通 Secret（仅学校通知接口使用）
 */

const QYWX_API = 'https://qyapi.weixin.qq.com/cgi-bin'

export interface QywxPushResult {
  success: boolean
  channel: 'member' | 'parent'
  error?: string
  rawCode?: number
  rawMsg?: string
  failedExternalUserIds?: string[]
}

let tokenCache: { key: string; token: string; expiresAt: number } | null = null
const QYWX_REQUEST_TIMEOUT_MS = 8_000

type QywxApiResult = {
  ok: boolean
  errcode?: number
  errmsg?: string
  msgid?: string
  fail_list?: string[]
  send_list?: Array<{ external_userid?: string; userid?: string; status?: number; send_time?: number }>
  next_cursor?: string
  [key: string]: unknown
}

type QywxApiPayload = Omit<QywxApiResult, 'ok'>

export function qywxEnabled(): boolean {
  return process.env.QYWX_ENABLED === 'true'
}

function requireConfig() {
  const corpId = process.env.QYWX_CORP_ID
  const agentId = process.env.QYWX_AGENT_ID
  const secret = process.env.QYWX_AGENT_SECRET
  if (!corpId || !agentId || !secret) {
    throw new Error('QYWX_CORP_ID / QYWX_AGENT_ID / QYWX_AGENT_SECRET 未配置')
  }
  return { corpId, agentId, secret }
}

function requireAgentId() {
  const agentId = process.env.QYWX_AGENT_ID
  if (!agentId || !Number.isInteger(Number(agentId))) {
    throw new Error('QYWX_AGENT_ID 未配置或不是有效数字')
  }
  return Number(agentId)
}

/**
 * 获取 access_token（内存缓存，提前 30s 刷新）。不同通道必须显式选择自己的 secret，
 * 防止配置家校 secret 后误用于员工/客户联系接口。
 */
async function getToken(useSecret: string): Promise<string> {
  const corpId = process.env.QYWX_CORP_ID
  if (!corpId) throw new Error('QYWX_CORP_ID 未配置')
  if (!useSecret) throw new Error('企微 secret 未配置')
  const cacheKey = `${corpId}:${useSecret}`
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token
  }
  const url = `${QYWX_API}/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(useSecret)}`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(QYWX_REQUEST_TIMEOUT_MS) })
  let data: { errcode?: number; errmsg?: string; access_token?: string; expires_in?: number }
  try {
    data = await res.json()
  } catch {
    throw new Error(`企微获取 access_token 失败: HTTP ${res.status} 非 JSON 响应`)
  }
  if (!res.ok || data.errcode !== 0 || !data.access_token) {
    throw new Error(`企微获取 access_token 失败: ${data.errmsg || data.errcode || `HTTP ${res.status}`}`)
  }
  const expiresIn = Number(data.expires_in)
  tokenCache = { key: cacheKey, token: data.access_token, expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 7200) * 1000 }
  return data.access_token
}

async function parseApiResponse(res: Response): Promise<QywxApiResult> {
  let data: QywxApiPayload
  try {
    data = await res.json() as QywxApiPayload
  } catch {
    return { ok: false, errcode: -1, errmsg: `非 JSON 响应(${res.status})` }
  }
  if (!res.ok) {
    const message = typeof data.errmsg === 'string' && data.errmsg ? data.errmsg : `HTTP ${res.status}`
    return { ...data, ok: false, errcode: typeof data.errcode === 'number' ? data.errcode : -1, errmsg: message }
  }
  return { ...data, ok: data.errcode === 0 }
}

async function qywxFetch(path: string, body: unknown, secret: string): Promise<QywxApiResult> {
  try {
    const request = async (token: string) => fetch(
      `${QYWX_API}${path}?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(QYWX_REQUEST_TIMEOUT_MS),
      },
    )
    let result = await parseApiResponse(await request(await getToken(secret)))
    // Token expired/invalid (40014/42001): clear cache and retry once with a fresh token.
    if (result.errcode === 40014 || result.errcode === 42001) {
      tokenCache = null
      result = await parseApiResponse(await request(await getToken(secret)))
    }
    return result
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx' } })
    return { ok: false, errcode: -2, errmsg: e instanceof Error ? e.message : '企微请求失败' }
  }
}

async function qywxGet(path: string, params: Record<string, string>, secret: string): Promise<QywxApiResult> {
  try {
    const request = async (token: string) => {
      const url = new URL(`${QYWX_API}${path}`)
      url.searchParams.set('access_token', token)
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
      return fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(QYWX_REQUEST_TIMEOUT_MS) })
    }
    let result = await parseApiResponse(await request(await getToken(secret)))
    if (result.errcode === 40014 || result.errcode === 42001) {
      tokenCache = null
      result = await parseApiResponse(await request(await getToken(secret)))
    }
    return result
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-get' } })
    return { ok: false, errcode: -2, errmsg: e instanceof Error ? e.message : '企微请求失败' }
  }
}

/** Execute a POST using a token derived from the explicitly selected channel secret. */
async function postWithToken(path: string, body: unknown, secret: string) {
  return qywxFetch(path, body, secret)
}

function requireMemberConfig() {
  const { agentId, secret } = requireConfig()
  return { agentId, secret }
}

function getCustomerContactSecret() {
  return process.env.QYWX_CONTACT_SECRET || process.env.QYWX_AGENT_SECRET || ''
}

function getSchoolNoticeSecret() {
  return process.env.QYWX_HOME_SCHOOL_SECRET || process.env.QYWX_AGENT_SECRET || ''
}

/** 员工通道：发应用消息（news 卡片，可点链接）。toUser 为企业成员 userid（多个用 | 分隔，@all 全公司） */
export async function sendQywxMemberMessage(
  toUser: string,
  opts: { title: string; desc?: string; url: string; picUrl?: string },
): Promise<QywxPushResult> {
  if (!qywxEnabled()) return { success: false, channel: 'member', error: '企微通道未开启' }
  try {
    const { agentId, secret } = requireMemberConfig()
    const article: Record<string, string> = { title: opts.title, url: opts.url }
    if (opts.desc) article.desc = opts.desc
    if (opts.picUrl) article.picurl = opts.picUrl
    const result = await postWithToken('/message/send', {
      touser: toUser,
      msgtype: 'news',
      agentid: Number(agentId),
      news: { articles: [article] },
      enable_id_trans: 1,
    }, secret)
    if (result.ok) return { success: true, channel: 'member' }
    return { success: false, channel: 'member', error: result.errmsg || '发送失败', rawCode: result.errcode, rawMsg: result.errmsg }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-member' } })
    return { success: false, channel: 'member', error: (e as Error).message }
  }
}

/** 家长通道：家校互通「学校通知」（external_userid 家长）。toExternalIds 多个用 | 分隔 */
export async function sendQywxParentNotice(
  toExternalIds: string,
  opts: { title: string; desc?: string; url: string; picUrl?: string },
): Promise<QywxPushResult> {
  if (!qywxEnabled()) return { success: false, channel: 'parent', error: '企微通道未开启' }
  try {
    const agentId = requireAgentId()
    const schoolSecret = getSchoolNoticeSecret()
    const externalUserIds = toExternalIds.split('|').map((value) => value.trim()).filter(Boolean)
    if (externalUserIds.length === 0) return { success: false, channel: 'parent', error: '缺少家长企微身份' }
    const article: Record<string, string> = { title: opts.title, url: opts.url }
    if (opts.desc) article.desc = opts.desc
    if (opts.picUrl) article.picurl = opts.picUrl
    const result = await postWithToken('/externalcontact/message/send', {
      to_external_user: externalUserIds,
      agentid: agentId,
      msgtype: 'news',
      news: { articles: [article] },
      enable_id_trans: 0,
    }, schoolSecret)
    if (result.ok) return { success: true, channel: 'parent' }
    return { success: false, channel: 'parent', error: result.errmsg || '发送失败', rawCode: result.errcode, rawMsg: result.errmsg }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-parent' } })
    return { success: false, channel: 'parent', error: (e as Error).message }
  }
}

/** 按手机号查企业成员 userid（员工通道绑定用；需应用有通讯录读取权限） */
export async function getQywxUserIdByMobile(mobile: string): Promise<string | null> {
  if (!qywxEnabled()) return null
  try {
    const { secret } = requireMemberConfig()
    const result = await postWithToken('/user/getuserid', { mobile }, secret)
    if (result.ok) return (result as { userid?: string }).userid || null
    return null
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-getuserid' } })
    return null
  }
}

/* ===================== 家长通道：学员联系（客户联系）群发 =====================
 * 通道说明：家长微信被企业成员添加为「学员」（外部联系人）后，系统调用
 * externalcontact/add_msg_template 创建企业群发，由该成员在企业微信
 * 「群发助手」中确认发送，家长在微信内接收（每日每家长上限 1 条，防骚扰硬限制）。
 * token 使用自建应用 secret（应用需在「学员联系-可调用接口的应用」列表中）。
 */

/** 拉取某企业成员名下的学员（外部联系人）列表 */
export async function listQywxExternalIdsByMember(userid: string): Promise<string[]> {
  if (!qywxEnabled()) return []
  const result = await qywxGet('/externalcontact/list', { userid }, getCustomerContactSecret())
  if (!result.ok) {
    throw new Error(`读取企微员工名下的学员失败${result.errcode !== undefined ? `（错误码 ${result.errcode}）` : ''}${result.errmsg ? `：${result.errmsg}` : ''}`)
  }
  return Array.isArray(result.external_userid) ? result.external_userid.filter((id): id is string => typeof id === 'string') : []
}

/** 获取外部联系人（学员）详情：名称、头像、type=1 微信用户、unionid 等 */
export async function getQywxExternalDetail(externalUserId: string): Promise<{ name?: string; type?: number; unionid?: string } | null> {
  if (!qywxEnabled()) return null
  try {
    const result = await qywxGet('/externalcontact/get', { external_userid: externalUserId }, getCustomerContactSecret())
    if (!result.ok) {
      throw new Error(`读取企微联系人详情失败${result.errcode !== undefined ? `（错误码 ${result.errcode}）` : ''}${result.errmsg ? `：${result.errmsg}` : ''}`)
    }
    // The WeCom API nests customer fields under external_contact. Keep a
    // top-level fallback for compatible gateways and older mocked responses.
    const externalContact = result.external_contact && typeof result.external_contact === 'object' && !Array.isArray(result.external_contact)
      ? result.external_contact as Record<string, unknown>
      : result
    return {
      name: typeof externalContact.name === 'string' ? externalContact.name : undefined,
      type: typeof externalContact.type === 'number' ? externalContact.type : undefined,
      unionid: typeof externalContact.unionid === 'string' ? externalContact.unionid : undefined,
    }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-external-detail' } })
    throw e
  }
}

/** 获取客户联系使用范围内的企业成员 userid 列表 */
export async function listQywxFollowUsers(): Promise<string[]> {
  if (!qywxEnabled()) return []
  const result = await qywxGet('/externalcontact/get_follow_user_list', {}, getCustomerContactSecret())
  if (!result.ok) {
    throw new Error(`读取企微客户联系成员失败${result.errcode !== undefined ? `（错误码 ${result.errcode}）` : ''}${result.errmsg ? `：${result.errmsg}` : ''}`)
  }
  return Array.isArray(result.follow_user) ? result.follow_user.filter((id): id is string => typeof id === 'string') : []
}

/** 按企业成员手机号反查企微成员 userid（用于确定群发 sender） */
export async function getQywxMemberUserIdByMobile(mobile: string): Promise<string | null> {
  return getQywxUserIdByMobile(mobile)
}

/**
 * 家长通道群发：externalcontact/add_msg_template（link 卡片）
 * 创建后需 sender 成员在企业微信「群发助手」确认发送，家长微信才可收到。
 * @returns 成功时返回 { msgid }；失败返回 { error, rawCode, rawMsg }
 */
export async function sendQywxParentMass(
  senderUserid: string,
  externalUserIds: string[],
  opts: { title: string; desc?: string; url: string; picUrl?: string },
): Promise<QywxPushResult & { msgid?: string }> {
  if (!qywxEnabled()) return { success: false, channel: 'parent', error: '企微通道未开启' }
  if (!senderUserid || !externalUserIds.length) return { success: false, channel: 'parent', error: '缺少发送成员或学员列表' }
  try {
    const link: Record<string, string> = { title: opts.title, url: opts.url }
    if (opts.desc) link.desc = truncateUtf8Bytes(opts.desc, 500)
    if (opts.picUrl) link.picurl = opts.picUrl
    const result = await postWithToken('/externalcontact/add_msg_template', {
      chat_type: 'single',
      external_userid: externalUserIds,
      sender: senderUserid,
      attachments: [{ msgtype: 'link', link }],
    }, getCustomerContactSecret())
    if (result.ok) {
      const failedExternalUserIds = result.fail_list || []
      if (failedExternalUserIds.length > 0) {
        return {
          success: false,
          channel: 'parent',
          error: '企微拒绝了部分目标家长，未创建完整发送任务',
          failedExternalUserIds,
        }
      }
      const msgid = result.msgid
      return { success: true, channel: 'parent', msgid }
    }
    return { success: false, channel: 'parent', error: result.errmsg || '创建群发失败', rawCode: result.errcode, rawMsg: result.errmsg }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-parent-mass' } })
    return { success: false, channel: 'parent', error: (e as Error).message }
  }
}

/* ===================== 家长绑定：客户联系「联系我」二维码 =====================
 * 管理端为家长生成专属二维码，家长微信扫码即成为 sender 成员的「客户」（外部联系人），
 * 企微回调 change_external_contact 事件带回 state 与 external_userid，
 * 本系统据 state 把 external_userid 写回家长账号，完成绑定。
 * 依赖：QYWX_CONTACT_SECRET（企业微信-客户联系-外部联系人 Secret），未配置时明确报错。
 */

/** state 上限 30 字符（企微限制），家长账号的 cuid 正好在范围内 */
export const QYWX_BIND_STATE_MAX = 30

export async function createQywxContactWay(params: {
  userid: string
  state: string
  remark?: string
}): Promise<
  | { ok: true; configId: string; qrCode: string }
  | { ok: false; error: string; rawCode?: number }
> {
  if (!qywxEnabled()) return { ok: false, error: '企微通道未开启（QYWX_ENABLED 未配置为 true）' }
  if (!params.userid) return { ok: false, error: '缺少企业成员 userid（请先为生成二维码的成员绑定企微身份）' }
  if (!params.state) return { ok: false, error: '缺少 state' }
  if (params.state.length > QYWX_BIND_STATE_MAX) {
    return { ok: false, error: `state 超过企微上限 ${QYWX_BIND_STATE_MAX} 字符` }
  }
  try {
    const result = await postWithToken(
      '/externalcontact/add_contact_way',
      {
        type: 1,
        scene: 2,
        skip_verify: true,
        state: params.state,
        remark: (params.remark || '牧哲学堂家长绑定').slice(0, 30),
        user: [params.userid],
        is_temp: false,
      },
      getCustomerContactSecret(),
    )
    const configId = typeof result.config_id === 'string' ? result.config_id : ''
    const qrCode = typeof result.qr_code === 'string' ? result.qr_code : ''
    if (!result.ok || !configId || !qrCode) {
      return {
        ok: false,
        error: result.errmsg || '生成「联系我」二维码失败',
        rawCode: typeof result.errcode === 'number' ? result.errcode : undefined,
      }
    }
    return { ok: true, configId, qrCode }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-contact-way' } })
    return { ok: false, error: e instanceof Error ? e.message : '生成「联系我」二维码失败' }
  }
}

/** 删除「联系我」配置；家长解绑或重新生成二维码时调用，失败不阻断主流程 */
export async function deleteQywxContactWay(configId: string): Promise<boolean> {
  if (!qywxEnabled() || !configId) return false
  try {
    const result = await postWithToken('/externalcontact/del_contact_way', { config_id: configId }, getCustomerContactSecret())
    return Boolean(result.ok)
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-contact-way-del' } })
    return false
  }
}

/** 查询某个发送成员的群发执行结果；status 0/1/2/3 分别表示未发送/已发送/非好友/被其他群发占用。 */
export async function getQywxGroupSendResult(
  msgid: string,
  userid: string,
): Promise<{ sendList: Array<{ external_userid?: string; userid?: string; status?: number; send_time?: number }>; complete: boolean } | null> {
  if (!qywxEnabled()) return null
  if (!msgid || !userid) return null
  try {
    let cursor = ''
    const sendList: Array<{ external_userid?: string; userid?: string; status?: number; send_time?: number }> = []
    for (let page = 0; page < 10; page += 1) {
      const result = await postWithToken('/externalcontact/get_groupmsg_send_result', {
        msgid,
        userid,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      }, getCustomerContactSecret())
      if (!result.ok) return null
      if (Array.isArray(result.send_list)) sendList.push(...result.send_list)
      const nextCursor = result.next_cursor || ''
      if (!nextCursor) return { sendList, complete: true }
      if (nextCursor === cursor) return null
      cursor = nextCursor
    }
    return { sendList, complete: false }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-group-result' } })
    return null
  }
}
