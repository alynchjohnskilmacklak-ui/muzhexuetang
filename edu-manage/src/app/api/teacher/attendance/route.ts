import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS, teacherLessonWhere, todayRange } from '@/lib/teacher-portal'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { triggerLessonPay } from '@/lib/teacher-salary'

import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'])

export const GET = apiHandler(async (request: NextRequest) => {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const { start: today, end: todayEnd } = todayRange()
    const lessonId = request.nextUrl.searchParams.get('lessonId')
    const lessonWhere = teacherLessonWhere(teacher.id)

    if (lessonId) {
      const lesson = await prisma.classLesson.findFirst({
        where: { id: lessonId, ...lessonWhere },
        include: {
          group: {
            include: {
              course: true,
              room: true,
              teacher: { select: { id: true, name: true } },
              teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } } },
              enrollments: { where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } }, include: { student: true } },
            },
          },
          attendances: true,
        },
      })
      if (!lesson) return NextResponse.json({ error: '不可操作此课次' }, { status: 403 })
      return NextResponse.json({
        lesson: {
          id: lesson.id,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          courseName: lesson.group.course.name,
          groupName: lesson.group.name,
          subject: lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject || lesson.group.course.subject,
          room: lesson.group.room?.name,
          status: lesson.status,
          hoursDeducted: !!lesson.hoursDeductedAt,
          attendanceSubmitted: !!lesson.attendanceSubmittedAt,
        },
        students: lesson.group.enrollments.map((enrollment) => ({
          studentId: enrollment.student.id,
          enrollmentId: enrollment.id,
          name: enrollment.student.name,
          grade: enrollment.student.grade,
          remainHours: enrollment.remainHours,
          status: lesson.attendances.find((attendance) => attendance.studentId === enrollment.student.id)?.status || 'PRESENT',
        })),
      })
    }

    const lessons = await prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: today, lt: todayEnd } },
      include: {
        group: {
          include: {
            course: true,
            room: true,
            teacher: { select: { id: true, name: true } },
            teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } } },
            enrollments: { where: { status: 'ACTIVE' }, select: { id: true } },
          },
        },
        attendances: { select: { id: true, status: true, studentId: true } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    })
    return NextResponse.json(lessons.map((lesson) => ({
      id: lesson.id,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      time: `${lesson.startTime}-${lesson.endTime}`,
      courseName: lesson.group.course.name,
      groupName: lesson.group.name,
      subject: lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject || lesson.group.course.subject,
      room: lesson.group.room?.name || '-',
      status: lesson.status,
      studentCount: lesson.group.enrollments.length,
      attendanceCount: lesson.attendances.length,
      allPresent: lesson.attendances.length > 0 && lesson.attendances.every((attendance) => attendance.status === 'PRESENT'),
      hoursDeducted: !!lesson.hoursDeductedAt,
    })))
  } catch (err) {
    console.error('[teacher:attendance:GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
})

export const POST = apiHandler(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const lessonId = typeof body.lessonId === 'string' ? body.lessonId : ''
    const records = Array.isArray(body.records) ? body.records : []
    if (!lessonId || !records.length) return NextResponse.json({ error: '无效数据' }, { status: 400 })

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '无权限' }, { status: 401 })

    let user = { id: session.user.id }
    let teacher: { id: string; name?: string | null }
    let lessonWhere: Record<string, unknown>

    if (session.user.role === 'admin') {
      const prisma = await getRequestPrisma()
      const lessonForAdmin = await prisma.classLesson.findUnique({
        where: { id: lessonId },
        include: {
          teacher: { select: { id: true, name: true } },
          group: { include: { teacher: { select: { id: true, name: true } } } },
        },
      })
      if (!lessonForAdmin) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
      const lessonTeacher = lessonForAdmin.teacher || lessonForAdmin.group.teacher
      teacher = { id: lessonTeacher.id, name: lessonTeacher.name }
      lessonWhere = { id: lessonId }
    } else {
      const result = await requireCurrentTeacher()
      const prisma = result.prisma
      user = { id: result.user.id }
      teacher = { id: result.teacher.id, name: result.teacher.name }
      lessonWhere = { id: lessonId, ...teacherLessonWhere(teacher.id) }
    }

    const lesson = await prisma.classLesson.findFirst({
      where: lessonWhere,
      include: { group: { include: { course: true } } },
    })
    if (!lesson) return NextResponse.json({ error: '不可操作' }, { status: 403 })

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

    const group = lesson.group
    const counts = { PRESENT: 0, LEAVE: 0, ABSENT: 0, MAKEUP: 0 }
    const existingDeductedCount = await prisma.attendance.count({
      where: { lessonId, hoursDeducted: { gt: 0 } },
    })
    const alreadyDeducted = !!lesson.hoursDeductedAt || existingDeductedCount > 0
    let processedCount = 0
    let deductedCount = 0

    await prisma.$transaction(async (tx) => {
      // Use upsert instead of delete+create to avoid losing data
      for (const rec of records) {
        const studentId = typeof rec.studentId === 'string' ? rec.studentId : ''
        const status = VALID_STATUS.has(rec.status) ? rec.status as keyof typeof counts : 'PRESENT'
        const enrollment = await tx.enrollment.findFirst({
          where: {
            studentId,
            groupId: group.id,
            status: 'ACTIVE',
            student: { status: { not: 'INACTIVE' } },
            group: { course: { type: group.course.type } },
          },
        })
        if (!enrollment) continue
        counts[status] += 1
        processedCount += 1
        const actualMinutes = Number(rec.actualMinutes) || null

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

        // Only deduct hours first time
        if (!alreadyDeducted) {
          const hoursDeducted = calculateAttendanceDeductHours({
            status,
            courseType: group.course.type,
            lessonMinutes: group.lessonMinutes,
            actualMinutes,
          })
          if (hoursDeducted > 0) {
            if (!attendance.hoursDeducted || attendance.hoursDeducted <= 0) {
              const safeDeduct = Math.min(hoursDeducted, enrollment.remainHours)
              if (safeDeduct <= 0) continue
              deductedCount += 1
              await tx.attendance.update({
                where: { id: attendance.id },
                data: { hoursDeducted: safeDeduct },
              })
              await tx.enrollment.update({
                where: { id: enrollment.id },
                data: { usedHours: { increment: safeDeduct }, remainHours: { decrement: safeDeduct } },
              })
              await tx.hourTransaction.create({
                data: {
                  studentId,
                  enrollmentId: enrollment.id,
                  lessonId,
                  amount: -safeDeduct,
                  beforeHours: enrollment.remainHours,
                  afterHours: enrollment.remainHours - safeDeduct,
                  type: 'ATTENDANCE_DEDUCT',
                  reason: `${group.name} 考勤扣课时`,
                  operatorId: user.id,
                },
              })
            }
          }
          if (status === 'LEAVE' && group.course.type === 'ONE_ON_ONE') {
            const existingMakeup = await tx.makeupRequest.findFirst({
              where: { attendanceId: attendance.id },
            })
            if (!existingMakeup) {
              await tx.makeupRequest.create({
                data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
              })
            }
          }
        } else if (status === 'LEAVE' && group.course.type === 'ONE_ON_ONE') {
          const existingMakeup = await tx.makeupRequest.findFirst({
            where: { attendanceId: attendance.id },
          })
          if (!existingMakeup) {
            await tx.makeupRequest.create({
              data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
            })
          }
        }
      }

      if (processedCount === 0) {
        throw new Error('NO_VALID_ATTENDANCE_RECORDS')
      }

      const now = new Date()
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

      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: teacher.id,
          action: TEACHER_LOG_ACTIONS.ATTENDANCE_SUBMIT,
          detail: `${group.name} · ${counts.PRESENT}出勤/${counts.LEAVE}请假/${counts.ABSENT}旷课${alreadyDeducted ? ' (修改考勤，未重复扣课时)' : ''}`,
          entityType: 'ClassLesson',
          entityId: lessonId,
          metadata: { ...counts, alreadyDeducted },
        },
      })
    })

    // 在 transaction 提交成功后触发薪资发放，与考勤事务解耦（幂等，不会重复）
    if (!alreadyDeducted) {
      await triggerLessonPay(lessonId)
    }

    const msg = alreadyDeducted
      ? `考勤已更新（未重复扣课时）：出勤${counts.PRESENT}/请假${counts.LEAVE}/旷课${counts.ABSENT}`
      : `考勤已提交：出勤${counts.PRESENT}/请假${counts.LEAVE}/旷课${counts.ABSENT}`

    return NextResponse.json({ success: true, counts, alreadyDeducted, processedCount, message: msg })
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_VALID_ATTENDANCE_RECORDS') {
      return NextResponse.json({ error: '没有有效考勤记录，请检查学生是否仍在班级中' }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '提交失败' }, { status: 500 })
  }
})
