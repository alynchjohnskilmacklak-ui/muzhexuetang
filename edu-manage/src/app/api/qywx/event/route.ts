import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 企业微信「接收消息服务器URL」回调端点。
 * 配置路径：企微后台 → 应用管理 → 自建应用 → 接收消息 → 设置接收消息服务器URL
 *    URL: https://muzhexuetang.xyz/api/qywx/event
 *    Token / EncodingAESKey：取 .env 中的 QYWX_CALLBACK_TOKEN / QYWX_CALLBACK_AES_KEY
 * 保存时企微会 GET 验证（echostr 解密回显），通过即配置成功；
 * 之后事件会 POST 到这里。本端点只验证并确认企微回调；家长身份仍由校区工作人员人工核验关联。
 */

const TOKEN = process.env.QYWX_CALLBACK_TOKEN || ''
const AES_KEY = process.env.QYWX_CALLBACK_AES_KEY || ''

function b64decode(s: string): Buffer {
  return Buffer.from(s, 'base64')
}

function decryptAes(encrypted: string, aesKey: string): string {
  const key = b64decode(aesKey + '=')
  if (key.length !== 32) throw new Error('EncodingAESKey 长度无效')
  const iv = key.subarray(0, 16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  decipher.setAutoPadding(false)
  let decrypted = Buffer.concat([decipher.update(b64decode(encrypted)), decipher.final()])
  // 去除 PKCS#7 padding
  const pad = decrypted[decrypted.length - 1]
  if (pad < 1 || pad > 32 || pad > decrypted.length) throw new Error('回调消息 padding 无效')
  decrypted = decrypted.subarray(0, decrypted.length - pad)
  // 去掉前 16 字节随机串，取 4 字节消息长度（大端）
  if (decrypted.length < 20) throw new Error('回调消息长度无效')
  const msgLen = decrypted.readUInt32BE(16)
  if (msgLen > decrypted.length - 20) throw new Error('回调消息长度超出数据范围')
  const message = decrypted.subarray(20, 20 + msgLen).toString('utf8')
  const corpId = decrypted.subarray(20 + msgLen).toString('utf8')
  const configuredCorpId = process.env.QYWX_CORP_ID
  if (configuredCorpId && corpId !== configuredCorpId) throw new Error('回调企业 ID 不匹配')
  return message
}

function verifySignature(signature: string, timestamp: string, nonce: string, encrypt: string): boolean {
  const str = [TOKEN, timestamp, nonce, encrypt].sort().join('')
  const sha = crypto.createHash('sha1').update(str).digest('hex')
  const expected = Buffer.from(sha, 'hex')
  const actual = Buffer.from(signature, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function readEncryptedField(xml: string): string | null {
  const cdata = xml.match(/<Encrypt>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/Encrypt>/i)
  if (cdata?.[1]) return cdata[1]
  const plain = xml.match(/<Encrypt>\s*([^<]+)\s*<\/Encrypt>/i)
  return plain?.[1] || null
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const msgSignature = params.get('msg_signature') || ''
  const timestamp = params.get('timestamp') || ''
  const nonce = params.get('nonce') || ''
  const echostr = params.get('echostr') || ''

  if (!TOKEN || !AES_KEY) {
    return NextResponse.json({ error: 'QYWX_CALLBACK_TOKEN / QYWX_CALLBACK_AES_KEY 未配置' }, { status: 500 })
  }
  if (!verifySignature(msgSignature, timestamp, nonce, echostr)) {
    return NextResponse.json({ error: '签名校验失败' }, { status: 403 })
  }
  try {
    const reply = decryptAes(echostr, AES_KEY)
    return new NextResponse(reply, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e: unknown) {
    return NextResponse.json({ error: `解密失败: ${(e as Error).message}` }, { status: 500 })
  }
}

/** 读取回调 XML 里的标签值（CDATA 或明文两种写法都兼容） */
function readTag(xml: string, tag: string): string | null {
  const cdata = xml.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'))
  if (cdata?.[1]) return cdata[1]
  const plain = xml.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`, 'i'))
  return plain?.[1] ?? null
}

/** 双库模式下家长可能落在 JUNIOR / SENIOR 任一库，逐个查 */
function candidateClients() {
  return isDualDbEnabled()
    ? [getPrismaForDivision('JUNIOR'), getPrismaForDivision('SENIOR')]
    : [prisma]
}

/**
 * 家长扫码添加成功：state 就是家长账号 id，把 external_userid 写回该账号。
 * 已绑定到别的外部联系人时不覆盖，避免把两个家庭串在一起。
 */
async function bindParentByState(state: string, externalUserId: string, senderUserId: string | null) {
  for (const client of candidateClients()) {
    const parent = await client.user.findFirst({
      where: { id: state, role: 'parent' },
      select: { id: true, qywxExternalUserId: true },
    })
    if (!parent) continue
    if (parent.qywxExternalUserId && parent.qywxExternalUserId !== externalUserId) {
      console.warn('[qywx] 家长已绑定其它外部联系人，忽略本次回调', { parentId: parent.id })
      return
    }
    await client.user.update({
      where: { id: parent.id },
      data: {
        qywxExternalUserId: externalUserId,
        qywxSenderUserId: senderUserId ?? undefined,
      },
    })
    return
  }
  console.warn('[qywx] 回调 state 未匹配到家长账号', { state })
}

/** 家长删除企业微信联系人：清掉绑定，避免继续往失效身份推送 */
async function unbindParentByExternalId(externalUserId: string) {
  for (const client of candidateClients()) {
    const parent = await client.user.findFirst({
      where: { role: 'parent', qywxExternalUserId: externalUserId },
      select: { id: true },
    })
    if (!parent) continue
    await client.user.update({
      where: { id: parent.id },
      data: { qywxExternalUserId: null, qywxSenderUserId: null },
    })
    return
  }
}

// Valid events are acknowledged to prevent retries. Identity changes still require admin review.
export async function POST(req: NextRequest) {
  if (!TOKEN || !AES_KEY) return NextResponse.json({ error: '企微回调验签未配置' }, { status: 500 })
  const params = req.nextUrl.searchParams
  const msgSignature = params.get('msg_signature') || ''
  const timestamp = params.get('timestamp') || ''
  const nonce = params.get('nonce') || ''
  const encrypted = readEncryptedField(await req.text())
  if (!encrypted) return NextResponse.json({ error: '缺少加密回调内容' }, { status: 400 })
  if (!verifySignature(msgSignature, timestamp, nonce, encrypted)) {
    return NextResponse.json({ error: '签名校验失败' }, { status: 403 })
  }
  let message: string
  try {
    message = decryptAes(encrypted, AES_KEY)
  } catch (e: unknown) {
    return NextResponse.json({ error: `回调解密失败: ${(e as Error).message}` }, { status: 400 })
  }

  const event = readTag(message, 'Event')
  const changeType = readTag(message, 'ChangeType')
  const externalUserId = readTag(message, 'ExternalUserID')
  const state = readTag(message, 'State')
  const userId = readTag(message, 'UserID')

  if (event === 'change_external_contact' && externalUserId) {
    try {
      if (changeType === 'add_external_contact' && state) {
        await bindParentByState(state, externalUserId, userId)
      } else if (changeType === 'del_external_contact') {
        await unbindParentByExternalId(externalUserId)
      }
    } catch (e: unknown) {
      console.error('[qywx] 处理外部联系人回调失败', e)
      // 返回 5xx 让企微重试，避免绑定丢失
      return NextResponse.json({ error: '处理回调失败' }, { status: 500 })
    }
  }

  return new NextResponse('success', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
