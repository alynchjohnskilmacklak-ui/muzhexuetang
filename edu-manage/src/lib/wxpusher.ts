import { captureException } from '@/lib/monitoring'

export interface PushResult {
  success: boolean
  error?: string
}

const WXPUSHER_API = 'https://wxpusher.zjiecode.com/api'

function getAppToken(): string {
  const token = process.env.WXPUSHER_APP_TOKEN
  if (!token) {
    console.error('[wxpusher] WXPUSHER_APP_TOKEN 未配置，请检查 .env 文件')
    throw new Error('WXPUSHER_APP_TOKEN 未配置')
  }
  return token
}

/**
 * Send WeChat message to a specific user.
 * contentType: 1=plain text, 2=HTML, 3=Markdown
 */
export async function sendWxMessage(
  uid: string,
  content: string,
  summary: string,
  contentType: 1 | 2 | 3 = 1
): Promise<PushResult> {
  try {
    const res = await fetch(`${WXPUSHER_API}/send/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken: getAppToken(),
        content,
        summary,
        contentType,
        uids: [uid],
      }),
    })
    const data = await res.json()
    if (data.code === 1000) {
      const item = data.data?.[0]
      if (item?.status === 'SENDING' || item?.status === 'SUCCESS') {
        return { success: true }
      }
      return { success: false, error: item?.status || '发送失败' }
    }
    return { success: false, error: data.msg || '发送失败' }
  } catch (e: unknown) {
    captureException(e, { uid, context: 'wxpusher/sendWxMessage' })
    return { success: false, error: (e as Error).message }
  }
}

/**
 * Classroom feedback notification content.
 */
export function buildFeedbackContent(studentName: string): string {
  return `【牧哲学堂】${studentName}同学的课堂反馈已上传至牧哲学堂客户端，请家长查收。如有疑问请联系老师。`
}

/**
 * Safe home notification content.
 */
export function buildSafeHomeContent(studentName: string): string {
  return `【牧哲学堂】${studentName}同学已经平安前往回家的路上，牧哲学堂站好最后一班岗。当您看到这条消息已经说明${studentName}同学已上车。如有问题请联系老师。`
}

/**
 * Create a QR code with extra parameter for parent WeChat binding.
 * extra = system user ID, passed back via WxPusher callback.
 */
export async function createBindQrcode(userId: string): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const res = await fetch(`${WXPUSHER_API}/fun/create/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appToken: getAppToken(),
        extra: userId,
        validTime: 1800,
      }),
    })
    const data = await res.json()
    if (data.code === 1000 && data.data?.url) {
      return { success: true, url: data.data.url }
    }
    return { success: false, error: data.msg || '二维码创建失败' }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}
