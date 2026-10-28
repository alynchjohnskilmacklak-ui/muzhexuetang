import * as Sentry from '@sentry/nextjs'

/**
 * 企业微信集成 SDK。
 *
 * 两条通道：
 * - 员工通道：企业自建应用消息（POST /cgi-bin/message/send，news 卡片可点链接）
 * - 家长通道：家校互通「学校通知」（POST /cgi-bin/externalcontact/message/send）
 *   前提：应用需在企业微信后台「家校沟通 → 家长可使用的应用」中配置，且使用
 *   「家校沟通」secret（或已加入可调用应用列表的自建应用 secret）获取 token。
 *
 * 配置（.env）：
 *   QYWX_ENABLED=true/false          总开关
 *   QYWX_CORP_ID=                    企业 ID（企业微信后台-我的企业）
 *   QYWX_AGENT_ID=                   自建应用 AgentId
 *   QYWX_AGENT_SECRET=               自建应用 Secret（员工通道）
 *   QYWX_HOME_SCHOOL_SECRET=         可选：家校沟通 Secret（家长通道；缺省回退 AGENT_SECRET）
 */

const QYWX_API = 'https://qyapi.weixin.qq.com/cgi-bin'

export interface QywxPushResult {
  success: boolean
  channel: 'member' | 'parent'
  error?: string
  rawCode?: number
  rawMsg?: string
}

let tokenCache: { key: string; token: string; expiresAt: number } | null = null

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

/**
 * 获取 access_token（内存缓存，提前 30s 刷新）。
 * secret 优先用家校 secret（家长通道），缺省用自建应用 secret。
 */
async function getToken(secret?: string): Promise<string> {
  const { corpId } = requireConfig()
  const useSecret = secret || process.env.QYWX_HOME_SCHOOL_SECRET || process.env.QYWX_AGENT_SECRET
  if (!useSecret) throw new Error('企微 secret 未配置（QYWX_AGENT_SECRET / QYWX_HOME_SCHOOL_SECRET）')
  const cacheKey = `${corpId}:${useSecret}`
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token
  }
  const url = `${QYWX_API}/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(useSecret)}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (data.errcode !== 0 || !data.access_token) {
    throw new Error(`企微获取 access_token 失败: ${data.errmsg || data.errcode}`)
  }
  tokenCache = { key: cacheKey, token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

function qywxFetch(path: string, body: unknown, secret?: string): Promise<{ ok: boolean; errcode?: number; errmsg?: string }> {
  return fetch(`${QYWX_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      try {
        const data = await res.json()
        return data as { ok?: boolean; errcode?: number; errmsg?: string }
      } catch {
        return { ok: false, errcode: -1, errmsg: `非 JSON 响应(${res.status})` }
      }
    })
    .then(async (data) => {
      if (data.errcode === 0) return { ok: true, ...data }
      // token 过期/无效（40014/42001）时重试一次
      if (data.errcode === 40014 || data.errcode === 42001) {
        tokenCache = null
        const token = await getToken(secret)
        const retry = await fetch(`${QYWX_API}${path}?access_token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then((r) => r.json())
        return retry.errcode === 0 ? { ok: true, ...retry } : { ok: false, ...retry }
      }
      return { ok: false, ...data }
    })
    .catch((e: unknown) => {
      Sentry.captureException(e, { extra: { location: 'qywx' } })
      return { ok: false, errcode: -2, errmsg: (e as Error).message }
    })
}

/** 执行带 token 的 POST：token 过期自动重试一次 */
async function postWithToken(path: string, body: unknown, secret?: string) {
  const token = await getToken(secret)
  return qywxFetch(`${path}?access_token=${encodeURIComponent(token)}`, body, secret)
}

/** 员工通道：发应用消息（news 卡片，可点链接）。toUser 为企业成员 userid（多个用 | 分隔，@all 全公司） */
export async function sendQywxMemberMessage(
  toUser: string,
  opts: { title: string; desc?: string; url: string; picUrl?: string },
): Promise<QywxPushResult> {
  if (!qywxEnabled()) return { success: false, channel: 'member', error: '企微通道未开启' }
  try {
    const { agentId } = requireConfig()
    const article: Record<string, string> = { title: opts.title, url: opts.url }
    if (opts.desc) article.desc = opts.desc
    if (opts.picUrl) article.picurl = opts.picUrl
    const result = await postWithToken('/message/send', {
      touser: toUser,
      msgtype: 'news',
      agentid: Number(agentId),
      news: { articles: [article] },
      enable_id_trans: 1,
    })
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
    const schoolSecret = process.env.QYWX_HOME_SCHOOL_SECRET || process.env.QYWX_AGENT_SECRET
    const article: Record<string, string> = { title: opts.title, url: opts.url }
    if (opts.desc) article.desc = opts.desc
    if (opts.picUrl) article.picurl = opts.picUrl
    const result = await postWithToken('/externalcontact/message/send', {
      to_external_userid: toExternalIds,
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
    const result = await postWithToken('/user/getuserid', { mobile })
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
  try {
    const token = await getToken()
    const res = await fetch(`${QYWX_API}/externalcontact/list?access_token=${encodeURIComponent(token)}&userid=${encodeURIComponent(userid)}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.errcode !== 0) return []
    return (data.external_userid as string[]) || []
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-list-external' } })
    return []
  }
}

/** 获取外部联系人（学员）详情：名称、头像、type=1 微信用户、unionid 等 */
export async function getQywxExternalDetail(externalUserId: string): Promise<{ name?: string; type?: number; unionid?: string } | null> {
  if (!qywxEnabled()) return null
  try {
    const token = await getToken()
    const res = await fetch(`${QYWX_API}/externalcontact/get?access_token=${encodeURIComponent(token)}&external_userid=${encodeURIComponent(externalUserId)}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.errcode !== 0) return null
    return { name: data.name, type: data.type, unionid: data.unionid }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-external-detail' } })
    return null
  }
}

/** 获取客户联系使用范围内的企业成员 userid 列表 */
export async function listQywxFollowUsers(): Promise<string[]> {
  if (!qywxEnabled()) return []
  try {
    const token = await getToken()
    const res = await fetch(`${QYWX_API}/externalcontact/get_follow_user_list?access_token=${encodeURIComponent(token)}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.errcode !== 0) return []
    return (data.follow_user as string[]) || []
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-follow-users' } })
    return []
  }
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
    if (opts.desc) link.desc = opts.desc
    if (opts.picUrl) link.picurl = opts.picUrl
    const result = await postWithToken('/externalcontact/add_msg_template', {
      chat_type: 'single',
      external_userid: externalUserIds,
      sender: senderUserid,
      msgtype: 'link',
      link,
    })
    if (result.ok) {
      const msgid = (result as { msgid?: string }).msgid
      return { success: true, channel: 'parent', msgid }
    }
    return { success: false, channel: 'parent', error: result.errmsg || '创建群发失败', rawCode: result.errcode, rawMsg: result.errmsg }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-parent-mass' } })
    return { success: false, channel: 'parent', error: (e as Error).message }
  }
}

/** 查询群发任务发送结果（externalcontact/get_group_send_result） */
export async function getQywxGroupSendResult(msgid: string): Promise<{ status?: string; failList?: Array<{ external_userid: string; userid: string }> } | null> {
  if (!qywxEnabled()) return null
  try {
    const token = await getToken()
    const res = await fetch(`${QYWX_API}/externalcontact/get_group_send_result?access_token=${encodeURIComponent(token)}&msgid=${encodeURIComponent(msgid)}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.errcode !== 0) return null
    return {
      status: (data.status as string) || undefined,
      failList: data.fail_list as Array<{ external_userid: string; userid: string }> | undefined,
    }
  } catch (e: unknown) {
    Sentry.captureException(e, { extra: { location: 'qywx-group-result' } })
    return null
  }
}
