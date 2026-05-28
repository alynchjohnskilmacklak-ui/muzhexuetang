import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS, teacherLessonWhere, todayRange } from '@/lib/teacher-portal'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'])

export async function GET(request: NextRequest) {
  try {
    const { teacher } = await requireCurrentTeacher()
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
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teacher } = await requireCurrentTeacher()
    const body = await request.json()
    const lessonId = typeof body.lessonId === 'string' ? body.lessonId : ''
    const records = Array.isArray(body.records) ? body.records : []
    if (!lessonId || !records.length) return NextResponse.json({ error: '无效数据' }, { status: 400 })

    const lesson = await prisma.classLesson.findFirst({
      where: { id: lessonId, ...teacherLessonWhere(teacher.id) },
      include: { group: { include: { course: true } } },
    })
    if (!lesson) return NextResponse.json({ error: '不可操作' }, { status: 403 })

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
          where: { studentId, groupId: group.id, status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
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
}
