import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { roundHours } from '@/lib/hours'
import { hoursPerLesson } from '@/lib/lesson-units'
import { syncStudentHourSnapshot } from '@/lib/student-hour-snapshot'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'
import { countRemainingEnrollmentLessons } from '@/lib/remaining-enrollment-hours'
import { normalizeEnrollmentSubjects } from '@/lib/enrollment-subjects'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id, user.division)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能校准课时' }, { status: 409 })
  }

  const group = await prisma.classGroup.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, lessonMinutes: true, course: { select: { subject: true } } },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const enrollments = await prisma.enrollment.findMany({
    where: {
      groupId: id,
      status: 'ACTIVE',
      enrolledAt: { gt: group.startDate },
    },
    select: {
      id: true,
      studentId: true,
      remainHours: true,
      totalHours: true,
      usedHours: true,
      enrolledAt: true,
      subjects: true,
    },
    orderBy: { enrolledAt: 'asc' },
  })

  if (!enrollments.length) {
    return NextResponse.json({ message: '没有开班后加入的插班生，无需校准', updated: 0 })
  }

  const skippedStudentIds: string[] = []
  const eligibleEnrollments = enrollments.flatMap((enrollment) => {
    const subjects = normalizeEnrollmentSubjects(enrollment.subjects)
    if (!subjects.length) {
      skippedStudentIds.push(enrollment.studentId)
      return []
    }
    return [{ ...enrollment, subjects }]
  })
  const skippedMessage = skippedStudentIds.length
    ? `另有 ${skippedStudentIds.length} 位学员未填写报名科目，余额未修改`
    : ''

  if (!eligibleEnrollments.length) {
    return NextResponse.json({
      message: `没有可校准的科目数据，${skippedMessage}`,
      updated: 0,
      skipped: skippedStudentIds.length,
      skippedStudentIds,
      students: [],
    })
  }

  const remainingLessons = await prisma.classLesson.findMany({
    where: {
      groupId: id,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      deletedAt: null,
      lessonDate: { gte: group.startDate },
    },
    select: { lessonDate: true, startTime: true, subject: true, status: true, deletedAt: true },
  })
  const targets = eligibleEnrollments.map((enrollment) => {
    const remainingLessonCount = countRemainingEnrollmentLessons(
      enrollment,
      remainingLessons,
      group.course.subject,
    )
    return {
      enrollment,
      remainingLessonCount,
      targetHours: roundHours(remainingLessonCount * hoursPerLesson(group.lessonMinutes)),
    }
  })
  const toUpdate = targets.filter(({ enrollment, targetHours }) =>
    Math.abs(Number(enrollment.remainHours || 0) - targetHours) >= 0.01,
  )

  if (!toUpdate.length) {
    return NextResponse.json({
      message: `插班生课时已经与剩余有效课次一致${skippedMessage ? `；${skippedMessage}` : ''}`,
      updated: 0,
      skipped: skippedStudentIds.length,
      skippedStudentIds,
      students: targets.map(({ enrollment, targetHours, remainingLessonCount }) => ({
        studentId: enrollment.studentId, targetHours, remainingLessonCount,
      })),
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const { enrollment, targetHours, remainingLessonCount } of toUpdate) {
      const beforeHours = Number(enrollment.remainHours || 0)
      const amount = roundHours(targetHours - beforeHours)
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          remainHours: targetHours,
          totalHours: roundHours(Number(enrollment.usedHours || 0) + targetHours),
        },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          amount,
          beforeHours,
          afterHours: targetHours,
          type: 'ADMIN_ADJUSTMENT',
          reason: `插班生按剩余${remainingLessonCount}节有效课次校准`,
          operatorId: user.id,
        },
      })
    }

    for (const studentId of [...new Set(toUpdate.map(({ enrollment }) => enrollment.studentId))]) {
      await syncStudentHourSnapshot(tx, studentId)
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '批量同步课时',
        detail: `${group.name}：按各学生报名科目和加入时间，校准${toUpdate.length}位插班生；逐人剩余课次为${toUpdate.map((item) => item.remainingLessonCount).join('、')}`,
      },
    })
  })

  return NextResponse.json({
    updated: toUpdate.length,
    students: toUpdate.map(({ enrollment, targetHours, remainingLessonCount }) => ({
      studentId: enrollment.studentId, targetHours, remainingLessonCount,
    })),
    message: `已按各学员报名科目和插班时间，校准 ${toUpdate.length} 位插班生课时${skippedMessage ? `；${skippedMessage}` : ''}`,
    skipped: skippedStudentIds.length,
    skippedStudentIds,
  })
})
