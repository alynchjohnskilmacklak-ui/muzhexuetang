import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { roundHours } from '@/lib/hours'
import { hoursPerLesson } from '@/lib/lesson-units'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'
import { normalizeEnrollmentSubjects, validateEnrollmentSubjects } from '@/lib/enrollment-subjects'
import { chinaClock, isEditableSubjectRosterLesson } from '@/lib/enrollment-subject-change'

export const dynamic = 'force-dynamic'

async function syncStudentHours(tx: Prisma.TransactionClient, studentId: string) {
  const activeEnrollments = await tx.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
    },
    select: { remainHours: true, totalHours: true },
  })
  const totalRemain = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalAll = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)

  await tx.student.update({
    where: { id: studentId },
    data: { remainHours: totalRemain, totalHours: totalAll },
  })
}

function trimmedMeanHours(hours: number[]) {
  const sorted = [...hours].sort((a, b) => a - b)
  const trimCount = Math.max(0, Math.floor(sorted.length * 0.2))
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  if (!trimmed.length) return 0
  return roundHours(trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length)
}

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const enrollments = await prisma.enrollment.findMany({
    where: { groupId: id, ...activeEnrollmentWhere },
    include: {
      student: {
        select: { id: true, name: true, phone: true, grade: true, school: true, parentName: true, parentPhone: true },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  })
  return NextResponse.json(enrollments)
})

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能调整学员名单' }, { status: 409 })
  }
  const body = await req.json()
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const totalHours = Number(body.totalHours || 0)
  // 累计制报名：课时从 0 起步，考勤按实际时长累加，不预购课时包
  const accrualMode = body.mode === 'ACCRUAL'
  // 按学科报名：subjects 为该生在此班级实际报名的学科；
  // 快照只写给这些学科的未来课次，不传则默认为班级全部课次。
  const hasExplicitSubjects = Array.isArray(body.subjects)
  let requestedSubjects = normalizeEnrollmentSubjects(body.subjects)
  if (!studentId) return NextResponse.json({ error: '请选择学员' }, { status: 400 })

  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: {
      course: true,
      teacherAssignments: { select: { subject: true } },
      teacher: { select: { name: true } },
      room: { select: { name: true } },
      classLessons: { orderBy: { lessonDate: 'asc' }, select: { id: true, lessonDate: true, startTime: true }, take: 1 },
      _count: { select: { classLessons: true } },
    },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const lessonSubjects = await prisma.classLesson.findMany({
    where: { groupId: id, deletedAt: null },
    select: { subject: true },
    distinct: ['subject'],
  })
  const availableSubjects = [...new Set([
    group.course.subject,
    ...group.teacherAssignments.map((assignment) => assignment.subject),
    ...lessonSubjects.map((lesson) => lesson.subject),
  ].filter((subject): subject is string => Boolean(subject)))]
  if (!hasExplicitSubjects) requestedSubjects = availableSubjects
  if (!validateEnrollmentSubjects(requestedSubjects, availableSubjects)) {
    return NextResponse.json({ error: '请至少选择一个该班级开设的学科' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...visibleStudentWhere },
  })
  if (!student) return NextResponse.json({ error: 'STUDENT_NOT_AVAILABLE' }, { status: 404 })

  // Enforce maxStudents
  if (group.maxStudents > 0) {
    const activeCount = await prisma.enrollment.count({
      where: { groupId: id, status: 'ACTIVE', studentId: { not: studentId } },
    })
    if (activeCount >= group.maxStudents) {
      return NextResponse.json({ error: `班级人数已满（上限 ${group.maxStudents} 人）` }, { status: 409 })
    }
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_groupId: { studentId, groupId: id } },
  })
  if (existing?.status === 'ACTIVE') return NextResponse.json({ error: '该学员已在此班级中' }, { status: 409 })

  let hours: number
  if (accrualMode) {
    hours = 0
  } else if (totalHours > 0) {
    hours = roundHours(totalHours)
  } else {
    const now = new Date()
    const { day } = chinaClock(now)
    const remainingLessons = await prisma.classLesson.findMany({
      where: {
        groupId: id,
        status: 'SCHEDULED',
        subject: { in: requestedSubjects },
        deletedAt: null,
        attendanceSubmittedAt: null,
        hoursDeductedAt: null,
        lessonDate: { gte: new Date(`${day}T00:00:00.000Z`) },
      },
      select: { lessonDate: true, startTime: true },
    })
    const remainingLessonCount = remainingLessons.filter((lesson) => isEditableSubjectRosterLesson({
      ...lesson, hasAttendance: false, hasFeedback: false,
    }, now)).length
    if (remainingLessonCount > 0) {
      hours = roundHours(remainingLessonCount * hoursPerLesson(group.lessonMinutes))
    } else {
      const peerEnrollments = await prisma.enrollment.findMany({
        where: { groupId: id, status: 'ACTIVE', studentId: { not: studentId } },
        select: { remainHours: true },
        orderBy: { enrolledAt: 'asc' },
      })
      hours = peerEnrollments.length
        ? trimmedMeanHours(peerEnrollments.map((enrollment) => Number(enrollment.remainHours || 0)))
        : 0
    }
  }
  const createEnrollment = () => prisma.$transaction(async (tx) => {
    // Repeat capacity and membership checks inside a serializable transaction.
    // The earlier checks only provide a fast response; they cannot prevent two
    // concurrent requests from consuming the final seat.
    if (group.maxStudents > 0) {
      const activeCount = await tx.enrollment.count({
        where: { groupId: id, status: 'ACTIVE', studentId: { not: studentId } },
      })
      if (activeCount >= group.maxStudents) throw new Error('GROUP_FULL')
    }
    const currentEnrollment = await tx.enrollment.findUnique({
      where: { studentId_groupId: { studentId, groupId: id } },
    })
    if (currentEnrollment?.status === 'ACTIVE') throw new Error('ALREADY_ENROLLED')

    const created = currentEnrollment
      ? await tx.enrollment.update({
          where: { id: currentEnrollment.id },
          data: { status: 'ACTIVE', totalHours: hours, remainHours: hours, usedHours: 0, subjects: requestedSubjects },
          include: { student: true },
        })
      : await tx.enrollment.create({
          data: { studentId, groupId: id, totalHours: hours, remainHours: hours, usedHours: 0, subjects: requestedSubjects },
          include: { student: true },
        })

    await tx.student.update({
      where: { id: studentId },
      data: { status: 'ACTIVE', mainTeacherId: group.teacherId },
    })
    await syncStudentHours(tx, studentId)

    // 插班只进入尚未开始且未考勤/结算的报读学科课次；历史名单不追补。
    const now = new Date()
    const { day } = chinaClock(now)
    const futureLessons = await tx.classLesson.findMany({
      where: {
        groupId: id,
        lessonDate: { gte: new Date(`${day}T00:00:00.000Z`) },
        status: 'SCHEDULED',
        deletedAt: null,
        subject: { in: requestedSubjects },
        attendanceSubmittedAt: null,
        hoursDeductedAt: null,
      },
      select: { id: true, lessonDate: true, startTime: true },
    })
    const eligibleLessons = futureLessons.filter((lesson) => isEditableSubjectRosterLesson({
      ...lesson, hasAttendance: false, hasFeedback: false,
    }, now))
    if (eligibleLessons.length) {
      await tx.classLessonStudent.createMany({
        data: eligibleLessons.map((lesson) => ({ lessonId: lesson.id, studentId })),
        skipDuplicates: true,
      })
    }

    const parentId = created.student.parentId || created.student.parentUserId
    const firstLesson = group.classLessons[0]
    if (group.status === 'ACTIVE' && parentId) {
      await tx.notification.create({
        data: {
          userId: parentId,
          type: 'CLASS_ENROLLMENT',
          href: '/parent/schedule',
          title: `${created.student.name} 已加入 ${group.name}`,
          content: `课程：${group.course.name}；教师：${group.teacher.name}；首次课：${firstLesson ? `${firstLesson.lessonDate.toISOString().slice(0, 10)} ${firstLesson.startTime}` : '待通知'}；教室：${group.room?.name || '待分配'}。`,
        },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '学员报班', detail: `${created.student.name} -> ${group.name}` },
    })

    return created
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  let enrollment: Awaited<ReturnType<typeof createEnrollment>>
  for (let attempt = 0; ; attempt++) {
    try {
      enrollment = await createEnrollment()
      break
    } catch (error) {
      if (error instanceof Error && error.message === 'GROUP_FULL') {
        return NextResponse.json({ error: `班级人数已满（上限 ${group.maxStudents} 人）` }, { status: 409 })
      }
      if (error instanceof Error && error.message === 'ALREADY_ENROLLED') {
        return NextResponse.json({ error: '该学员已在此班级中' }, { status: 409 })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) {
        continue
      }
      throw error
    }
  }

  return NextResponse.json(enrollment, { status: 201 })
})

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能调整学员名单' }, { status: 409 })
  }
  const { searchParams } = new URL(req.url)
  const enrollmentId = searchParams.get('enrollmentId')
  if (!enrollmentId) return NextResponse.json({ error: '缺少报名记录' }, { status: 400 })

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, groupId: id },
    include: { student: true, group: true },
  })
  if (!enrollment) return NextResponse.json({ error: '报名记录不存在' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'WITHDRAWN', remainHours: 0 },
    })

    // 退班快照：仅移除当天及以后未考勤课次的学员名单；历史课次保留（属于教学档案）
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    await tx.classLessonStudent.deleteMany({
      where: {
        studentId: enrollment.studentId,
        lesson: { groupId: id, lessonDate: { gte: todayStart } },
      },
    })

    const activeClassCount = await tx.enrollment.count({
      where: {
        studentId: enrollment.studentId,
        status: 'ACTIVE',
        group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
      },
    })
    await syncStudentHours(tx, enrollment.studentId)
    if (activeClassCount === 0) {
      await tx.student.update({
        where: { id: enrollment.studentId },
        data: { status: 'TRIAL', remainHours: 0, totalHours: 0, mainTeacherId: null },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '移出班级', detail: `${enrollment.student.name} -> ${enrollment.group.name}` },
    })

    return result
  })

  return NextResponse.json(updated)
})
