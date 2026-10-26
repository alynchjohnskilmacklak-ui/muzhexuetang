import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { checkScheduleConflict, type ConflictInfo } from '@/lib/schedule-conflict'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import {
  calculatePlannedMinutes,
  canTeacherEditIntensiveLesson,
  parseTeacherIntensiveTeachingType,
  validateTeacherIntensiveSchedule,
} from '@/lib/teacher-intensive-scheduling'

export const dynamic = 'force-dynamic'

async function getOwnedLesson(id: string) {
  const context = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(context.prisma, context.teacher.division)
  const lesson = await context.prisma.classLesson.findFirst({
    where: {
      id,
      ...teacherLessonWhere(context.teacher.id),
      group: {
        intensiveMode: 'INTENSIVE',
        status: { not: 'ARCHIVED' },
        termId: activeTerm?.id || '__NO_ACTIVE_TERM__',
      },
    },
    include: {
      group: {
        include: {
          room: { select: { id: true, name: true } },
          enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
        },
      },
      lessonStudents: { select: { studentId: true } },
    },
  })
  return { ...context, lesson }
}

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const { user, teacher, prisma, lesson } = await getOwnedLesson(id)
  if (!lesson) return NextResponse.json({ error: '无权调整该课次' }, { status: 403 })
  if (!canTeacherEditIntensiveLesson(lesson)) {
    return NextResponse.json({ error: '课程开始前30分钟内或结算后不能调整，请联系管理员' }, { status: 409 })
  }

  const body = await request.json()
  const lessonDate = typeof body.lessonDate === 'string' ? body.lessonDate : localDateKey(lesson.lessonDate)
  const startTime = typeof body.startTime === 'string' ? body.startTime : lesson.startTime
  const endTime = typeof body.endTime === 'string' ? body.endTime : lesson.endTime
  const teachingType = parseTeacherIntensiveTeachingType(lesson.group.teachingType)
  if (!teachingType) return NextResponse.json({ error: '该课程班型配置异常' }, { status: 409 })

  const studentIds = lesson.lessonStudents.map((item) => item.studentId)
  const validationError = validateTeacherIntensiveSchedule({
    lessonDate,
    startTime,
    endTime,
    teachingType,
    studentIds,
  })
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const conflicts: ConflictInfo[] = []
  for (const studentId of studentIds) {
    const current = await checkScheduleConflict({
      teacherId: teacher.id,
      studentId,
      date: lessonDate,
      startTime,
      endTime,
      excludeLessonId: lesson.id,
      termId: lesson.group.termId || undefined,
    }, prisma)
    for (const conflict of current) {
      if (!conflicts.some((item) => item.type === conflict.type && item.lessonId === conflict.lessonId)) {
        conflicts.push(conflict)
      }
    }
  }
  if (conflicts.length) {
    return NextResponse.json({ error: '该时间与已有课程冲突', conflicts }, { status: 409 })
  }

  const plannedMinutes = calculatePlannedMinutes(startTime, endTime)
  if (!plannedMinutes) return NextResponse.json({ error: '课程时间不正确' }, { status: 400 })
  const oldSchedule = {
    lessonDate: localDateKey(lesson.lessonDate),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  }

  const changed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.classLesson.updateMany({
      where: {
        id: lesson.id,
        status: 'SCHEDULED',
        settlementStatus: 'UNSETTLED',
        attendanceSubmittedAt: null,
      },
      data: {
        lessonDate: getLocalDayRange(lessonDate).start,
        startTime,
        endTime,
        plannedMinutes,
        note: typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : undefined,
      },
    })
    if (claimed.count !== 1) return false

    await tx.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: 'INTENSIVE_LESSON_RESCHEDULE',
        detail: `${oldSchedule.lessonDate} ${oldSchedule.startTime}-${oldSchedule.endTime} 调整为 ${lessonDate} ${startTime}-${endTime}`,
        entityType: 'ClassLesson',
        entityId: lesson.id,
        metadata: { oldSchedule, newSchedule: { lessonDate, startTime, endTime }, source: 'TEACHER' },
      },
    })
    return true
  })
  if (!changed) return NextResponse.json({ error: '课次状态已变化，请刷新后重试' }, { status: 409 })

  revalidatePath('/teacher/intensive')
  revalidatePath('/teacher/schedule')
  return NextResponse.json({ success: true })
})

export const DELETE = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const { user, teacher, prisma, lesson } = await getOwnedLesson(id)
  if (!lesson) return NextResponse.json({ error: '无权取消该课次' }, { status: 403 })
  if (!canTeacherEditIntensiveLesson(lesson)) {
    return NextResponse.json({ error: '课程开始前30分钟内或结算后不能取消，请联系管理员' }, { status: 409 })
  }

  const changed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.classLesson.updateMany({
      where: {
        id: lesson.id,
        status: 'SCHEDULED',
        settlementStatus: 'UNSETTLED',
        attendanceSubmittedAt: null,
      },
      data: { status: 'CANCELLED', cancelReason: '教师取消个性化课程安排' },
    })
    if (claimed.count !== 1) return false

    await tx.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: 'INTENSIVE_LESSON_CANCEL',
        detail: `${localDateKey(lesson.lessonDate)} ${lesson.startTime}-${lesson.endTime}`,
        entityType: 'ClassLesson',
        entityId: lesson.id,
        metadata: { groupId: lesson.groupId, source: 'TEACHER' },
      },
    })
    return true
  })
  if (!changed) return NextResponse.json({ error: '课次状态已变化，请刷新后重试' }, { status: 409 })

  revalidatePath('/teacher/intensive')
  revalidatePath('/teacher/schedule')
  return NextResponse.json({ success: true })
})
