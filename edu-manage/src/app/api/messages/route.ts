import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentActiveStudentWhere } from '@/lib/business-visibility'
import { getRequestDivision } from '@/lib/division'
import { getAccessibleParentMessageWhere } from '@/lib/parent-message-access'
import { getParentMessageWorkflowState } from '@/lib/parent-message-workflow'
import { notifyTeacherAboutParentMessage } from '@/lib/parent-message-notifications'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined
  const division = getRequestDivision(user, searchParams.get('division'))

  let where = await getAccessibleParentMessageWhere(prisma, user, division)
  if (!where) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (status) {
    if (where.OR) {
      const { OR, ...baseWhere } = where
      where = { ...baseWhere, AND: [{ OR }, { status }] }
    } else {
      where.status = status
    }
  }

  const [messages, total] = await Promise.all([
    prisma.parentMessage.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        feedback: {
          select: {
            id: true,
            teacherId: true,
            studentIds: true,
            createdAt: true,
            summary: true,
            overallComment: true,
            classLesson: {
              select: {
                lessonDate: true,
                subject: true,
                group: { select: { course: { select: { name: true, subject: true } } } },
              },
            },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.parentMessage.count({ where }),
  ])
  const reminderRows = user.role === 'admin' && messages.length > 0
    ? await prisma.notification.findMany({
        where: {
          type: 'PARENT_MESSAGE_REMINDER',
          relatedType: 'PARENT_MESSAGE',
          relatedId: { in: messages.map((message) => message.id) },
        },
        select: { relatedId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
    : []
  const remindersByMessage = reminderRows.reduce<Record<string, { count: number; lastRemindedAt: string }>>(
    (result, reminder) => {
      if (!reminder.relatedId) return result
      const current = result[reminder.relatedId]
      result[reminder.relatedId] = {
        count: (current?.count || 0) + 1,
        lastRemindedAt: current?.lastRemindedAt || reminder.createdAt.toISOString(),
      }
      return result
    },
    {},
  )

  return NextResponse.json({
    total,
    messages: messages.map((message) => ({
      ...message,
      workflow: getParentMessageWorkflowState(message),
      reminder: remindersByMessage[message.id] || { count: 0, lastRemindedAt: null },
    })),
  })
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

  // 默认优先最近课次教师，其次当前班级教师；家长可在这些任课教师中手动调整。
  if (studentId) {
    const [recentLesson, enrollments] = await Promise.all([
      prisma.classLesson.findFirst({
        where: {
          status: { not: 'CANCELLED' },
          group: { enrollments: { some: { studentId, status: 'ACTIVE' } } },
        },
        orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
        select: {
          teacherId: true,
          subject: true,
          group: {
            select: {
              teacherId: true,
              course: { select: { subject: true } },
              teacherAssignments: { select: { teacherId: true, subject: true } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
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
      }),
    ])
    const normalizedSubject = subject?.toLowerCase() || ''
    const recentCandidates = recentLesson ? [
      { teacherId: recentLesson.teacherId || recentLesson.group.teacherId, subject: recentLesson.subject || recentLesson.group.course.subject, priority: 0 },
      ...recentLesson.group.teacherAssignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        subject: assignment.subject || recentLesson.group.course.subject,
        priority: 1,
      })),
    ] : []
    const groupCandidates = enrollments.flatMap(({ group }) => [
      ...group.teacherAssignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        subject: assignment.subject || group.course.subject,
        priority: assignment.subject && normalizedSubject && assignment.subject.toLowerCase().includes(normalizedSubject) ? 2 : 3,
      })),
      { teacherId: group.teacherId, subject: group.course.subject, priority: normalizedSubject && group.course.subject.toLowerCase().includes(normalizedSubject) ? 2 : 4 },
    ])
    const candidates = [...recentCandidates, ...groupCandidates]
      .filter((candidate): candidate is { teacherId: string; subject: string; priority: number } => Boolean(candidate.teacherId))
      .sort((a, b) => a.priority - b.priority)
    const requestedCandidate = requestedTeacherId ? candidates.find((candidate) => candidate.teacherId === requestedTeacherId) : null
    teacherId = requestedCandidate?.teacherId || candidates[0]?.teacherId || null
    if (!teacherId) return NextResponse.json({ error: '暂未找到该学员的任课教师，请联系管理员检查课程关系' }, { status: 400 })
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.parentMessage.create({
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
        feedback: { select: { id: true, createdAt: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (teacherId) {
      await notifyTeacherAboutParentMessage(tx, {
        teacherId,
        messageId: created.id,
        parentName: user.name || '家长',
        studentId,
        studentName: created.student?.name || null,
        senderId: user.id,
      })
    }

    return created
  })

  return NextResponse.json(message, { status: 201 })
})
