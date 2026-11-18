import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { findScheduleMoveConflicts } from '@/lib/schedule-conflicts'
import { findStudentLessonConflicts } from '@/lib/schedule-conflict'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { cancelScheduledLesson, CancelLessonError } from '@/lib/cancel-class-lesson'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { getLocalDayRange, localDateColumnValue, localDateKey } from '@/lib/date/local-day'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassLessonInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能调整课次' }, { status: 409 })
  }
  const body = await req.json()
  const { lessonDate, startTime, endTime, status, cancelReason, note, teacherId, subject } = body

  const lesson = await prisma.classLesson.findUnique({
    where: { id },
    include: { group: { include: { course: { select: { subject: true } } } } },
  })
  if (!lesson || lesson.division !== user.division) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const mins = lesson.group.lessonMinutes || 45
  const calcEnd = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return t
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  if (status === 'CANCELLED') {
    try {
      const cancelled = await cancelScheduledLesson(prisma, {
        lessonId: id, division: user.division, operatorId: user.id,
        reason: typeof cancelReason === 'string' ? cancelReason : '',
      })
      revalidatePath('/schedule')
      revalidatePath('/teacher/schedule')
      revalidatePath('/parent/schedule')
      return NextResponse.json(cancelled)
    } catch (error) {
      if (error instanceof CancelLessonError) return NextResponse.json({ error: error.message }, { status: error.status })
      throw error
    }
  }

  if (status !== undefined && status !== lesson.status) {
    return NextResponse.json({ error: '课次状态须通过考勤或专门的停课流程调整' }, { status: 400 })
  }
  if (lesson.status !== 'SCHEDULED' || lesson.attendanceSubmittedAt || lesson.hoursDeductedAt) {
    return NextResponse.json({ error: '只能调整尚未开始、未考勤和未结算的课次' }, { status: 409 })
  }
  const clock = chinaClock(new Date())
  const originalDay = localDateKey(lesson.lessonDate)
  if (originalDay < clock.day || (originalDay === clock.day && lesson.startTime <= clock.time)) {
    return NextResponse.json({ error: '已开始或已过去的课次不能直接调课' }, { status: 409 })
  }

  if (lessonDate !== undefined && (typeof lessonDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate))) {
    return NextResponse.json({ error: '调课日期不正确' }, { status: 400 })
  }
  let targetDate: Date
  try {
    if (lessonDate && localDateKey(getLocalDayRange(lessonDate).start) !== lessonDate) throw new Error('invalid date')
    targetDate = lessonDate ? localDateColumnValue(lessonDate) : lesson.lessonDate
  } catch {
    return NextResponse.json({ error: '调课日期不正确' }, { status: 400 })
  }

  const targetStart = startTime || lesson.startTime
  const targetEnd = endTime || (startTime ? calcEnd(startTime) : lesson.endTime)
  if (!/^\d{2}:\d{2}$/.test(targetStart) || !/^\d{2}:\d{2}$/.test(targetEnd) || targetStart >= targetEnd || Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: '调课日期或时间不正确' }, { status: 400 })
  }
  const targetDay = localDateKey(targetDate)
  if (targetDay < clock.day || (targetDay === clock.day && targetStart <= clock.time)) {
    return NextResponse.json({ error: '只能将课次调整到尚未开始的时段' }, { status: 400 })
  }
  const targetTeacherId = teacherId !== undefined ? teacherId || null : lesson.teacherId || lesson.group.teacherId
  const targetSubject = subject !== undefined ? subject : lesson.subject
  if (teacherId !== undefined || subject !== undefined) {
    const assignments = await prisma.classGroupTeacher.findMany({
      where: { groupId: lesson.groupId },
      select: { teacherId: true, subject: true },
    })
    const assigned = assignments.some((item) => item.teacherId === targetTeacherId && item.subject === targetSubject)
      || (assignments.length === 0 && lesson.group.teacherId === targetTeacherId && targetSubject === lesson.group.course.subject)
    if (!assigned) return NextResponse.json({ error: '本次课的教师和学科须属于该班已分配的任课关系' }, { status: 400 })
  }
  const sameDayLessons = await prisma.classLesson.findMany({
    where: {
      id: { not: id },
      lessonDate: targetDate,
      status: { not: 'CANCELLED' },
      deletedAt: null,
      group: { deletedAt: null },
      division: lesson.division,
      OR: [
        ...(targetTeacherId ? [
          { teacherId: targetTeacherId },
          { teacherId: null, group: { teacherId: targetTeacherId } },
          { teacherId: null, group: { teacherAssignments: { some: { teacherId: targetTeacherId } } } },
        ] : []),
        ...(lesson.group.roomId ? [{ group: { roomId: lesson.group.roomId } }] : []),
      ],
    },
    include: { group: { select: { name: true, roomId: true, teacherId: true, teacherAssignments: { select: { teacherId: true } } } } },
  })
  const conflicts = findScheduleMoveConflicts(targetStart, targetEnd, sameDayLessons.map((candidate) => ({
    id: candidate.id,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    label: candidate.group.name,
    teacherConflict: Boolean(targetTeacherId) && (
      candidate.teacherId === targetTeacherId
      || (!candidate.teacherId && candidate.group.teacherId === targetTeacherId)
      || (!candidate.teacherId && candidate.group.teacherAssignments.some((item) => item.teacherId === targetTeacherId))
    ),
    roomConflict: Boolean(lesson.group.roomId) && candidate.group.roomId === lesson.group.roomId,
  })))
  if (conflicts.length) {
    const conflict = conflicts[0]
    const reasons = [conflict.teacherConflict ? '教师' : '', conflict.roomConflict ? '教室' : ''].filter(Boolean).join('和')
    return NextResponse.json({ error: `${reasons}时间冲突：${conflict.label || '已有课程'} ${conflict.startTime}-${conflict.endTime}` }, { status: 409 })
  }

  // 学生维度冲突：本节课在册学生（快照优先，存量课次退回 ACTIVE 报名名单）
  let lessonStudentIds = subject !== undefined && subject !== lesson.subject
    ? []
    : (await prisma.classLessonStudent.findMany({
      where: { lessonId: id },
      select: { studentId: true },
    })).map((record) => record.studentId)
  if (!lessonStudentIds.length) {
    lessonStudentIds = (await prisma.enrollment.findMany({
      where: { groupId: lesson.groupId, status: 'ACTIVE', deletedAt: null },
      select: { studentId: true, subjects: true },
    })).filter((record) => enrollmentIncludesSubject(record.subjects, targetSubject)).map((record) => record.studentId)
  }
  if (lessonStudentIds.length) {
    const studentConflicts = await findStudentLessonConflicts(prisma, {
      studentIds: lessonStudentIds,
      date: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      excludeLessonId: id,
      termId: lesson.group.termId || undefined,
    })
    if (studentConflicts.length) {
      const conflict = studentConflicts[0]
      return NextResponse.json({
        error: `学生冲突：${conflict.studentName} 在 ${conflict.timeRange} 已有【${conflict.courseName}】课程`,
      }, { status: 409 })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.classLesson.update({
      where: { id },
      data: {
        ...(lessonDate && { lessonDate: targetDate }),
        ...(startTime && { startTime: targetStart, endTime: targetEnd }),
        ...(endTime && { endTime }),
        ...(teacherId !== undefined && { teacherId: teacherId || null }),
        ...(subject !== undefined && { subject: subject || null }),
        ...(status && { status }),
        ...(note !== undefined && { note }),
        ...(status === 'POSTPONED' ? { postponeFrom: lesson.lessonDate } : {}),
      },
    })

    if (subject !== undefined && record.subject !== lesson.subject) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      if (record.lessonDate >= todayStart) {
        const enrollments = await tx.enrollment.findMany({
          where: { groupId: lesson.groupId, status: 'ACTIVE', deletedAt: null },
          select: { studentId: true, subjects: true },
        })
        await tx.classLessonStudent.deleteMany({ where: { lessonId: id } })
        const snapshotRows = enrollments
          .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, record.subject))
          .map((enrollment) => ({ lessonId: id, studentId: enrollment.studentId }))
        if (snapshotRows.length) {
          await tx.classLessonStudent.createMany({ data: snapshotRows, skipDuplicates: true })
        }
      }
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '调课', detail: lesson.group.name, entityType: 'ClassLesson', entityId: id },
    })
    return record
  })

  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/parent/schedule')

  return NextResponse.json(updated)
})
