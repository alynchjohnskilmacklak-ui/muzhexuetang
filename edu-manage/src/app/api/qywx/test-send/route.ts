import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { getConfiguredPublicOrigin } from '@/lib/public-origin'
import {
  getQywxExternalDetail,
  listQywxExternalIdsByMember,
  qywxEnabled,
  sendQywxMemberMessage,
  sendQywxParentMass,
  sendQywxParentNotice,
} from '@/lib/qywx'

export const dynamic = 'force-dynamic'

/**
 * 企微通道测试（员工消息、学校通知或专用家长群发测试任务）。
 * body: { channel?: 'member' | 'parent' | 'parent-mass', title?, desc?, url? }
 * 默认向调用者自己发送员工通道消息，验证 token + 发送全链路。
 * parent-mass 仅管理员可用，只创建专用测试联系人的待确认任务，不会自动发送。
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Unauthorized', 401)

  const body = (await req.json().catch(() => ({}))) as {
    channel?: 'member' | 'parent' | 'parent-mass'
    title?: string
    desc?: string
    url?: string
  }
  const channel = body.channel ?? 'member'
  if (!['member', 'parent', 'parent-mass'].includes(channel)) {
    return NextResponse.json({ error: '不支持的企微测试通道' }, { status: 400 })
  }
  if (!['admin', 'teacher'].includes(user.role)) throw new AuthError('Forbidden', 403)
  if (channel === 'parent-mass' && user.role !== 'admin') throw new AuthError('Forbidden', 403)

  if (!qywxEnabled()) {
    return NextResponse.json({ error: '企业微信通道未开启（QYWX_ENABLED 未配置为 true）' }, { status: 400 })
  }

  const title = (body.title || '【牧哲学堂】企微通道测试').trim().slice(0, 64)
  const desc = (body.desc || '这是一条测试消息，说明企业微信推送通道已连通。').trim().slice(0, 500)
  const baseOrigin = getConfiguredPublicOrigin()
  let targetUrl: URL
  try {
    targetUrl = new URL(body.url || '/parent/dashboard', baseOrigin)
  } catch {
    return NextResponse.json({ error: '消息链接格式无效' }, { status: 400 })
  }
  if (targetUrl.origin !== baseOrigin || !['https:', 'http:'].includes(targetUrl.protocol)) {
    return NextResponse.json({ error: '测试消息链接只能指向本系统网站' }, { status: 400 })
  }
  const url = targetUrl.toString()

  if (channel === 'parent-mass') {
    const testExternalUserId = process.env.QYWX_TEST_MASS_EXTERNAL_USER_ID?.trim()
    const testSenderUserId = process.env.QYWX_TEST_MASS_SENDER_USER_ID?.trim()
    if (!testExternalUserId || !testSenderUserId) {
      return NextResponse.json({
        error: '请配置专用测试联系人 QYWX_TEST_MASS_EXTERNAL_USER_ID 和发送成员 QYWX_TEST_MASS_SENDER_USER_ID；不能使用普通家长联系人测试',
      }, { status: 400 })
    }

    try {
      const externalIds = await listQywxExternalIdsByMember(testSenderUserId)
      if (!externalIds.includes(testExternalUserId)) {
        return NextResponse.json({ error: '配置的测试联系人不属于指定的企微测试发送成员' }, { status: 400 })
      }
      const contact = await getQywxExternalDetail(testExternalUserId)
      if (contact?.type !== 1) {
        return NextResponse.json({ error: '配置的测试联系人不是有效的微信外部联系人' }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? `企微测试联系人校验失败：${error.message}` : '企微测试联系人校验失败',
      }, { status: 502 })
    }

    try {
      const databases = isDualDbEnabled()
        ? [getPrismaForDivision('JUNIOR'), getPrismaForDivision('SENIOR')]
        : [await getRequestPrisma()]
      const parentBindings = await Promise.all(databases.map((db) => db.user.findFirst({
        where: { role: 'parent', qywxExternalUserId: testExternalUserId },
        select: { id: true },
      })))
      if (parentBindings.some(Boolean)) {
        return NextResponse.json({ error: '此联系人已绑定系统家长账号，不能作为专用测试联系人' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: '无法核验测试联系人是否已绑定家长账号，已拒绝创建测试任务' }, { status: 500 })
    }

    const result = await sendQywxParentMass(testSenderUserId, [testExternalUserId], {
      title: '【测试】牧哲学堂家长群发连通性检查',
      desc: '专用测试任务：网站仅创建待确认群发任务，不会自动发送。若在企业微信「群发助手」手动确认，测试联系人将收到此测试卡片。',
      url: new URL('/parent/dashboard', baseOrigin).toString(),
    })
    const taskCreated = result.success && Boolean(result.msgid)
    return NextResponse.json({
      ok: taskCreated,
      taskCreated,
      manualConfirmationRequired: taskCreated,
      ...(result.msgid ? { msgid: result.msgid } : {}),
      ...(!taskCreated ? {
        error: result.error || '企微未返回可追踪的群发任务编号，无法确认任务创建结果',
        rawCode: result.rawCode,
      } : {}),
    }, { status: taskCreated ? 200 : 502 })
  }

  const prisma = await getRequestPrisma()
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { qywxUserId: true },
  })

  if (channel === 'parent') {
    const testRecipient = process.env.QYWX_TEST_SCHOOL_PARENT_ID
    if (!testRecipient) return NextResponse.json({ error: '请先配置专用学校通知测试对象 QYWX_TEST_SCHOOL_PARENT_ID；此接口不会向普通家长联系人发送测试消息' }, { status: 400 })
    const result = await sendQywxParentNotice(testRecipient, { title, desc, url })
    return NextResponse.json({ ok: result.success, result })
  }

  if (!row?.qywxUserId) {
    return NextResponse.json({ error: '当前账号未绑定企微成员身份（qywxUserId），请先调用 /api/qywx/bind 绑定' }, { status: 400 })
  }
  const result = await sendQywxMemberMessage(row.qywxUserId, { title, desc, url })
  return NextResponse.json({ ok: result.success, result })
})
