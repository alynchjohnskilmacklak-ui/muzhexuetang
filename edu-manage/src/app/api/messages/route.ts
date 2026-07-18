import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentActiveStudentWhere } from '@/lib/business-visibility'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
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
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'ACTIVE',
        group: {
          OR: [
            { teacherId: user.teacherId },
            { teacherAssignments: { some: { teacherId: user.teacherId } } },
          ],
        },
      },
      select: { studentId: true },
    })
    const taughtStudentIds = Array.from(new Set(enrollments.map((e) => e.studentId)))

    where = {
      studentId: { in: taughtStudentIds.length > 0 ? taughtStudentIds : ['__none__'] },
      OR: [{ teacherId: user.teacherId }, { teacherId: null }],
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
        take: 50,
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
 
  const prisma = await getRequestPrisma()
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const requestedTeacherId = typeof body.teacherId === 'string' ? body.teacherId : null
  let teacherId: string | null = null
  const studentId = typeof body.studentId === 'string' ? body.studentId : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null

  if (!title) return NextResponse.json({ error: '请填写标题' }, { status: 400 })
  if (title.length > 100) return NextResponse.json({ error: '标题不能超过100字' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '请填写问题内容' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: '内容不能超过2000字' }, { status: 400 })
  if (!studentId) return NextResponse.json({ error: '请选择关联学员，系统将自动匹配任课教师' }, { status: 400 })

  // 验证 studentId 属于当前家长
  if (studentId) {
    const owned = await prisma.student.count({
      where: { id: studentId, ...parentActiveStudentWhere(user.id) },
    })
    if (owned === 0) return NextResponse.json({ error: '无权为该学员创建留言' }, { status: 403 })
  }

  // 根据当前课程关系自动匹配教师；前端传入的教师仅在无法匹配课程时作为兼容提示。
  if (studentId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'ACTIVE',
        group: { status: { not: 'ARCHIVED' } },
      },
      select: {
        group: {
          select: {
            teacherId: true,
            course: { select: { subject: true } },
            teacherAssignments: { select: { teacherId: true, subject: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })
    const normalizedSubject = subject?.toLowerCase() || ''
    const candidates = enrollments.flatMap(({ group }) => [
      ...group.teacherAssignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        subject: assignment.subject || group.course.subject,
        priority: assignment.subject && normalizedSubject && assignment.subject.toLowerCase().includes(normalizedSubject) ? 0 : 1,
      })),
      { teacherId: group.teacherId, subject: group.course.subject, priority: normalizedSubject && group.course.subject.toLowerCase().includes(normalizedSubject) ? 0 : 2 },
    ]).sort((a, b) => a.priority - b.priority)
    teacherId = candidates[0]?.teacherId || null

    if (!teacherId && requestedTeacherId) {
      const assigned = await prisma.enrollment.count({
        where: { studentId, status: 'ACTIVE', group: { OR: [{ teacherId: requestedTeacherId }, { teacherAssignments: { some: { teacherId: requestedTeacherId } } }] } },
      })
      if (assigned > 0) teacherId = requestedTeacherId
    }
    if (!teacherId) return NextResponse.json({ error: '暂未找到该学员的任课教师，请联系管理员检查课程关系' }, { status: 400 })
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
