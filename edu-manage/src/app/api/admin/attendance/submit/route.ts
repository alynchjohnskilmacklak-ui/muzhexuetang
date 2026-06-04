import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { triggerLessonPay } from '@/lib/teacher-salary'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'])

function normalizeStatus(status: unknown) {
  const value = String(status || '').toUpperCase()
  if (value === 'LATE') return 'PRESENT'
  return VALID_STATUS.has(value) ? value : 'PRESENT'
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { lessonId, records } = await req.json() as {
    lessonId?: string
    records?: { studentId?: string; status?: string; actualMinutes?: number }[]
  }

  if (!lessonId || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: '缺少 lessonId 或考勤记录' }, { status: 400 })
  }

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, status: { not: 'CANCELLED' } },
    include: {
      group: {
        include: {
          course: true,
          enrollments: {
            where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
          },
        },
      },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: '课次不存在或已取消' }, { status: 404 })
  }

  const [lessonHour, lessonMinute = 0] = (lesson.startTime || '00:00').split(':').map(Number)
  const lessonStart = new Date(lesson.lessonDate)
  lessonStart.setHours(lessonHour, lessonMinute, 0, 0)
  const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
  if (new Date() < earliestAllowed) {
    return NextResponse.json(
      { error: `未到考勤时间，课程 ${lesson.startTime} 开始，最早 30 分钟前可提交` },
      { status: 400 }
    )
  }

  const enrollmentByStudentId = new Map(lesson.group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]))
  const validRecords = records.filter((record) => typeof record.studentId === 'string' && enrollmentByStudentId.has(record.studentId))
  if (validRecords.length === 0) {
    return NextResponse.json({ error: '没有有效考勤记录，请检查学生是否仍在班级中' }, { status: 400 })
  }

  const alreadyDeducted = !!lesson.hoursDeductedAt || await prisma.attendance.count({
    where: { lessonId, hoursDeducted: { gt: 0 } },
  }) > 0
  let processedCount = 0
  let deductedCount = 0
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    for (const record of validRecords) {
      const studentId = typeof record.studentId === 'string' ? record.studentId : ''
      const enrollment = enrollmentByStudentId.get(studentId)
      if (!enrollment) continue

      const status = normalizeStatus(record.status) as 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'
      const actualMinutes = Number(record.actualMinutes) || null
      processedCount += 1

      const attendance = await tx.attendance.upsert({
        where: {
          attendance_lesson_student_unique: {
            lessonId,
            studentId,
          },
        },
        update: { status, enrollmentId: enrollment.id, actualMinutes },
        create: { lessonId, studentId, enrollmentId: enrollment.id, status, actualMinutes },
      })

      if (!alreadyDeducted) {
        const hoursDeducted = calculateAttendanceDeductHours({
          status,
          courseType: lesson.group.course.type,
          lessonMinutes: lesson.group.lessonMinutes,
          actualMinutes,
        })
        if (hoursDeducted > 0 && (!attendance.hoursDeducted || attendance.hoursDeducted <= 0)) {
          deductedCount += 1
          await tx.attendance.update({
            where: { id: attendance.id },
            data: { hoursDeducted },
          })
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { usedHours: { increment: hoursDeducted }, remainHours: { decrement: hoursDeducted } },
          })
        }
      }
    }
    await tx.classLesson.update({
      where: { id: lessonId },
      data: {
        status: 'COMPLETED',
        attendanceSubmittedAt: now,
        hoursDeductedAt: alreadyDeducted
          ? lesson.hoursDeductedAt || now
          : deductedCount > 0
            ? now
            : null,
      },
    })
  })

  if (!alreadyDeducted) {
    await triggerLessonPay(lessonId)
  }

  return NextResponse.json({ success: true, count: processedCount })
})
