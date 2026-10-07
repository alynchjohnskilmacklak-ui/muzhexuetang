import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 管理端「同父母孩子」关联模块
 * POST：把选中的学员关联到当前学员绑定的家长账号下（parentId / parentUserId 统一）
 * DELETE：解除某个学员与当前家长账号的关联（parentId / parentUserId 置空，不删数据）
 */
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin' && role !== 'SUPER_ADMIN') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const actorId = (session.user as { id?: string }).id
  if (!actorId) return NextResponse.json({ error: '登录状态无效' }, { status: 401 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const studentIds = Array.isArray(body.studentIds) ? body.studentIds.filter((value: unknown): value is string => typeof value === 'string') : []
  if (!studentIds.length) return NextResponse.json({ error: '请选择要关联的学员' }, { status: 400 })

  const current = await prisma.student.findUnique({
    where: { id },
    select: { id: true, name: true, parentId: true, parentUserId: true },
  })
  if (!current) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  const parentUserId = current.parentUserId || current.parentId || null
  if (!parentUserId) {
    return NextResponse.json({ error: '当前学员尚未绑定家长账号，请先绑定家长账号再关联其他孩子' }, { status: 400 })
  }
  if (studentIds.includes(current.id)) {
    return NextResponse.json({ error: '无需关联当前学员本身' }, { status: 400 })
  }

  const targets = await prisma.student.findMany({
    where: { id: { in: studentIds }, deletedAt: null },
    select: { id: true, name: true, status: true },
  })
  if (targets.length !== studentIds.length) return NextResponse.json({ error: '部分学员不存在或已离校' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.student.updateMany({
      where: { id: { in: studentIds } },
      data: { parentId: current.parentId || parentUserId, parentUserId },
    })
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: 'FAMILY_CHILDREN_LINKED',
        detail: `将 ${targets.map((item) => item.name).join('、')} 关联到家长账号 ${parentUserId}（由学员 ${current.name} 发起）`,
        entityType: 'Student',
        entityId: current.id,
      },
    })
  })

  return NextResponse.json({
    success: true,
    message: `已将 ${targets.map((item) => item.name).join('、')} 关联到当前家长账号，家长登录后可查看这些孩子`,
  })
})

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin' && role !== 'SUPER_ADMIN') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const actorId = (session.user as { id?: string }).id
  if (!actorId) return NextResponse.json({ error: '登录状态无效' }, { status: 401 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  const url = new URL(req.url)
  const targetId = url.searchParams.get('studentId')
  if (!targetId) return NextResponse.json({ error: '缺少要解除关联的学员' }, { status: 400 })

  const current = await prisma.student.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!current) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  if (targetId === current.id) return NextResponse.json({ error: '不能解除当前学员自身的关联' }, { status: 400 })

  const target = await prisma.student.findUnique({ where: { id: targetId }, select: { id: true, name: true } })
  if (!target) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: targetId },
      data: { parentId: null, parentUserId: null },
    })
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: 'FAMILY_CHILDREN_UNLINKED',
        detail: `解除 ${target.name} 与家长账号的关联（由学员 ${current.name} 页面操作）`,
        entityType: 'Student',
        entityId: current.id,
      },
    })
  })

  return NextResponse.json({ success: true, message: `已解除 ${target.name} 与当前家长账号的关联` })
})
