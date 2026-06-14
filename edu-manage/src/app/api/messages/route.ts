import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentActiveStudentWhere } from '@/lib/business-visibility'
import { divisionWhere } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const division = getRequestDivision(user, searchParams.get('division'))

  let where: Record<string, unknown> = {}
  if (user.role === 'parent') {
    where = { parentId: user.id }
  } else if (user.role === 'teacher') {
    if (!user.teacherId) {
      return NextResponse.json({ messages: [] })
    }
    const taughtGroups = await prisma.classGroupTeacher.findMany({
      where: { teacherId: user.teacherId },
      select: { groupId: true },
    })
    const groupIds = taughtGroups.map((g) => g.groupId)
    const enrollments = await prisma.enrollment.findMany({
      where: { groupId: { in: groupIds }, status: 'ACTIVE' },
      select: { studentId: true },
    })
    const taughtStudentIds = Array.from(new Set(enrollments.map((e) => e.studentId)))

    where = {
      OR: [
        { teacherId: user.teacherId },
        {
          teacherId: null,
          studentId: { in: taughtStudentIds.length > 0 ? taughtStudentIds : ['__none__'] },
        },
      ],
    }
  }
  if (user.role === 'admin') {
    where.student = { division }
  }
  if (status) {
    if (where.OR) {
      where = { AND: [{ OR: where.OR }, { status }] }
    } else {
      where.status = status
    }
  }

  const messages = await prisma.parentMessage.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ messages })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : null
  const studentId = typeof body.studentId === 'string' ? body.studentId : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null

  if (!title) return NextResponse.json({ error: '请填写标题' }, { status: 400 })
  if (title.length > 100) return NextResponse.json({ error: '标题不能超过100字' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '请填写问题内容' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: '内容不能超过2000字' }, { status: 400 })

  // 验证 studentId 属于当前家长
  if (studentId) {
    const owned = await prisma.student.count({
      where: { id: studentId, ...parentActiveStudentWhere(user.id) },
    })
    if (owned === 0) return NextResponse.json({ error: '无权为该学员创建留言' }, { status: 403 })
  }

  // 验证 teacherId 是该学员的任课教师
  if (studentId && teacherId) {
    const assigned = await prisma.enrollment.count({
      where: {
        studentId,
        status: 'ACTIVE',
        group: { teacherAssignments: { some: { teacherId } } },
      },
    })
    if (assigned === 0) return NextResponse.json({ error: '该老师不是此学员的任课教师' }, { status: 400 })
  }

  const message = await prisma.parentMessage.create({
    data: {
      parentId: user.id,
      studentId,
      teacherId,
      subject,
      title,
      replies: {
        create: {
          authorId: user.id,
          authorName: user.name || '家长',
          role: 'parent',
          content,
          isReadByTeacher: false,
          isReadByParent: true,
        },
      },
    },
    include: {
      parent: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  })

  return NextResponse.json(message, { status: 201 })
})
