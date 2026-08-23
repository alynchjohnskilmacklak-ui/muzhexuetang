import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能调整教师' }, { status: 409 })
  }
  const body = await req.json().catch(() => ({}))
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : ''

  if (!teacherId || !subject) {
    return NextResponse.json({ error: '请选择老师和科目' }, { status: 400 })
  }

  const group = await prisma.classGroup.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, status: 'ACTIVE' },
    select: { id: true, name: true },
  })
  if (!teacher) return NextResponse.json({ error: '老师不存在或未在职' }, { status: 400 })

  const existing = await prisma.classGroupTeacher.findFirst({
    where: { groupId: id, teacherId, subject },
  })
  if (existing) {
    return NextResponse.json({ error: '该老师在此班已担任此科目' }, { status: 409 })
  }

  await prisma.classGroupTeacher.create({
    data: {
      groupId: id,
      teacherId,
      subject,
      role: 'SUBJECT',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: '添加任课老师',
      detail: `${group.name}，${teacher.name} / ${subject}`,
    },
  })

  return NextResponse.json({ success: true, teacherId, subject })
})
