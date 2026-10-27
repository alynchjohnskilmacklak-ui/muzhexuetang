import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * 企业微信「接收消息服务器URL」回调端点。
 * 配置路径：企微后台 → 应用管理 → 自建应用 → 接收消息 → 设置接收消息服务器URL
 *    URL: https://muzhexuetang.xyz/api/qywx/event
 *    Token / EncodingAESKey：取 .env 中的 QYWX_CALLBACK_TOKEN / QYWX_CALLBACK_AES_KEY
 * 保存时企微会 GET 验证（echostr 解密回显），通过即配置成功；
 * 之后家长关注/成员事件等会 POST 到这里（本端点为后续自动绑定等能力预留）。
 */

const TOKEN = process.env.QYWX_CALLBACK_TOKEN || ''
const AES_KEY = process.env.QYWX_CALLBACK_AES_KEY || ''

function b64decode(s: string): Buffer {
  return Buffer.from(s, 'base64')
}

function decryptAes(encrypted: string, aesKey: string): string {
  const key = b64decode(aesKey + '=')
  const iv = key.subarray(0, 16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  decipher.setAutoPadding(false)
  let decrypted = Buffer.concat([decipher.update(b64decode(encrypted)), decipher.final()])
  // 去除 PKCS#7 padding
  const pad = decrypted[decrypted.length - 1]
  decrypted = decrypted.subarray(0, decrypted.length - pad)
  // 去掉前 16 字节随机串，取 4 字节消息长度（大端）
  const msgLen = decrypted.readUInt32BE(16)
  return decrypted.subarray(20, 20 + msgLen).toString('utf8')
}

function verifySignature(signature: string, timestamp: string, nonce: string, encrypt: string): boolean {
  const str = [TOKEN, timestamp, nonce, encrypt].sort().join('')
  const sha = crypto.createHash('sha1').update(str).digest('hex')
  return sha === signature
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

// POST 预留：后续可接收企微事件（家长关注、成员变更等），此处仅记录状态
export async function POST(req: NextRequest) {
  void req
  return NextResponse.json({ ok: true, note: 'event endpoint ready' })
}
