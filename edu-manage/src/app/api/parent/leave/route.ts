import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { isParentStudentInLesson } from '@/lib/parent-lesson-visibility'
import { visibleClassLessonWhere } from '@/lib/business-visibility'
import { createManyNotifications } from '@/lib/notifications'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id

  const { studentId: requestedStudentId, lessonId, reason: rawReason, leaveDate } = await req.json() as {
    studentId: string
    lessonId?: string
    reason: string
    leaveDate: string
  }
  const reason = typeof rawReason === 'string' ? rawReason.trim() : ''

  if (typeof requestedStudentId !== 'string' || !reason || reason.length > 1000 || !leaveDate || Number.isNaN(new Date(leaveDate).getTime())) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const child = findParentChild(await getParentChildren(prisma, userId), requestedStudentId)
  if (!child) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = lessonId
    ? await prisma.classLesson.findFirst({
        where: {
          id: lessonId,
          ...visibleClassLessonWhere,
          group: { ...visibleClassLessonWhere.group, enrollments: { some: { studentId: { in: child.recordIds }, status: 'ACTIVE', deletedAt: null } } },
        },
        include: {
          lessonStudents: { select: { studentId: true } },
          group: { include: { course: { select: { subject: true } }, enrollments: { where: { studentId: { in: child.recordIds }, status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } } } },
        },
      })
    : null
  const lessonStudentId = lesson ? child.recordIds.find((id) => isParentStudentInLesson(lesson, id)) : undefined
  if (lessonId && (!lesson || !lessonStudentId)) {
    return NextResponse.json({ error: '所选课次不存在或不属于该学员' }, { status: 400 })
  }

  const studentId = lessonStudentId || child.id
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { mainTeacher: { select: { id: true, name: true } } },
  })
  if (!student) return NextResponse.json({ error: '未找到关联学员' }, { status: 404 })

  const teacherIds = [...new Set([lesson?.teacherId, lesson?.group.teacherId, student.mainTeacher?.id]
    .filter((id): id is string => Boolean(id)))]
  const result = await prisma.$transaction(async (tx) => {
    // The semantic request key survives reloads and retries. Serialize matching
    // requests across all server processes without adding a production column.
    const key = JSON.stringify(['parent-leave', userId, studentId, lesson?.id || null, new Date(leaveDate).toISOString(), reason])
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`
    const existing = await tx.leaveRequest.findFirst({
      where: { studentId, lessonId: lesson?.id || null, leaveDate: new Date(leaveDate), reason, status: { in: ['pending', 'approved'] }, deletedAt: null },
      include: { student: { select: { name: true } }, lesson: { include: { group: { include: { course: { select: { name: true } } } } } } },
    })
    if (existing) return { leaveRequest: existing, reused: true, teacherNotified: false }
    const leaveRequest = await tx.leaveRequest.create({
    data: {
      studentId,
      lessonId: lesson?.id || null,
      reason,
      leaveDate: new Date(leaveDate),
      status: 'pending',
      replyNote: '已提交，等待老师审批',
    },
    include: {
      student: { select: { name: true } },
      lesson: { include: { group: { include: { course: { select: { name: true } } } } } },
    },
  })

  const admins = await tx.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { id: true },
  })
  const notificationTitle = `请假通知：${student.name}`
  const notificationContent = `${student.name} 于 ${new Date(leaveDate).toLocaleDateString('zh-CN')} 请假，原因：${reason}`

  if (admins.length > 0) {
    await createManyNotifications(tx, admins.map((admin) => ({
      userId: admin.id,
      title: notificationTitle,
      content: notificationContent,
      type: 'leave',
      href: '/leave-requests',
      studentId,
      senderId: userId,
      pushStatus: 'none',
    })))
  }

  const teacherUsers = teacherIds.length ? await tx.user.findMany({
    where: { teacherId: { in: teacherIds }, role: 'teacher', status: 'active' }, select: { id: true },
  }) : []
  if (teacherUsers.length) {
    await createManyNotifications(tx, teacherUsers.map((teacherUser) => ({
      userId: teacherUser.id,
      title: notificationTitle,
      content: notificationContent,
      type: 'leave',
      href: '/teacher/leave',
      studentId,
      senderId: userId,
      pushStatus: 'none',
    })))
  }

  await tx.activityLog.create({
    data: {
      userId,
      action: '请假通知',
      detail: `${student.name} - ${reason}`,
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
    },
  })
    return { leaveRequest, reused: false, teacherNotified: teacherUsers.length > 0 }
  })
  const { leaveRequest } = result

  return NextResponse.json({
    id: leaveRequest.id,
    studentName: leaveRequest.student.name,
    courseName: leaveRequest.lesson?.group.course.name || '未指定课程',
    leaveDate: leaveRequest.leaveDate.toISOString(),
    reason: leaveRequest.reason,
    status: leaveRequest.status,
    replyNote: leaveRequest.replyNote,
    createdAt: leaveRequest.createdAt.toISOString(),
    reused: result.reused,
    teacherNotified: result.teacherNotified,
  }, { status: result.reused ? 200 : 201 })
})
