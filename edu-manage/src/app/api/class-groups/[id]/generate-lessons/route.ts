import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere } from '@/lib/business-visibility'
import { addDays } from 'date-fns'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { recordCourseChangeEvent } from '@/lib/course-change-events'
import { isValidDateKey, localDateKey } from '@/lib/date/local-day'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { findClassLessonCopyConflicts, type CopyScheduleSlot } from '@/lib/class-lesson-copy-conflicts'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { isSerializationConflict, runSerializableWithRetry } from '@/lib/serializable-retry'

const WEEK_DAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])

class ScheduleGenerationError extends Error {
  constructor(message: string, readonly status = 409, readonly conflicts?: unknown) {
    super(message)
  }
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeRecurringDays(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((day): day is string => typeof day === 'string' && WEEK_DAYS.has(day))
}

function normalizeTemplate(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Record<string, unknown>
      const teacherId = typeof entry.teacherId === 'string' ? entry.teacherId.trim() : ''
      const subject = typeof entry.subject === 'string' ? entry.subject.trim() : ''
      const startTime = typeof entry.startTime === 'string' ? entry.startTime.trim() : ''
      const endTime = typeof entry.endTime === 'string' ? entry.endTime.trim() : ''
      if (!teacherId || !subject || !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) return null
      return { teacherId, subject, startTime, endTime, order: Number(entry.order || index + 1) }
    })
    .filter((item): item is { teacherId: string; subject: string; startTime: string; endTime: string; order: number } => Boolean(item))
    .sort((a, b) => a.order - b.order)
}

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id, user.division)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能重新生成课表' }, { status: 409 })
  }
  const body = await req.json()
  const { startDate, recurringDays, totalLessons, lessonStartTime, lessonMinutes, totalDays } = body
  const scheduleTemplate = normalizeTemplate(body.scheduleTemplate)
  if (Array.isArray(body.scheduleTemplate) && body.scheduleTemplate.length > 0 && scheduleTemplate.length !== body.scheduleTemplate.length) {
    return NextResponse.json({ error: '课次模板包含无效教师、科目或时间，请核对后重试' }, { status: 400 })
  }

  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: {
      course: true,
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      term: { select: { id: true, status: true, startDate: true, endDate: true } },
      teacherAssignments: { orderBy: { createdAt: 'asc' } },
      classLessons: {
        where: { status: { notIn: ['CANCELLED', 'POSTPONED'] }, deletedAt: null },
        select: {
          lessonDate: true,
          teacherId: true,
          subject: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })
  if (group.intensiveMode === 'INTENSIVE') {
    return NextResponse.json({
      error: '个性化课程不生成固定课表，请由教师逐次约课，或由管理员进行历史补录。',
    }, { status: 409 })
  }
  if (group.status !== 'WAITING') {
    return NextResponse.json({
      error: '进行中班级不能重新生成整张课表，请使用“调整上课日”修改未来安排，避免覆盖历史课次。',
    }, { status: 409 })
  }

  // DATE columns use UTC midnight. Weekday calculation must stay in UTC so
  // deployments in different server timezones generate the same weekdays.
  const startDateKey = startDate === undefined || startDate === null || startDate === ''
    ? localDateKey(group.startDate)
    : typeof startDate === 'string' ? startDate.trim() : ''
  if (!isValidDateKey(startDateKey)) {
    return NextResponse.json({ error: '请选择有效的开始日期' }, { status: 400 })
  }
  const start = new Date(`${startDateKey}T00:00:00.000Z`)
  const termStartDateKey = group.term ? localDateKey(group.term.startDate) : ''
  const termEndDateKey = group.term ? localDateKey(group.term.endDate) : ''
  const groupEndDateKey = group.endDate ? localDateKey(group.endDate) : termEndDateKey
  const scheduleEndDateKey = groupEndDateKey && termEndDateKey
    ? (groupEndDateKey < termEndDateKey ? groupEndDateKey : termEndDateKey)
    : groupEndDateKey || termEndDateKey
  if (!group.term || group.term.status !== 'ACTIVE' || startDateKey < termStartDateKey || startDateKey > scheduleEndDateKey) {
    return NextResponse.json({ error: '开始日期须在当前运营批次和班级有效日期范围内' }, { status: 400 })
  }

  const requestDays = normalizeRecurringDays(recurringDays)
  if (Array.isArray(recurringDays) && recurringDays.length > 0 && requestDays.length !== recurringDays.length) {
    return NextResponse.json({ error: '上课星期包含无效选项，请重新选择' }, { status: 400 })
  }
  const days = requestDays.length ? requestDays : group.recurringDays
  const mins = Number(lessonMinutes ?? group.lessonMinutes ?? 45)
  const total = Number(totalDays ?? totalLessons ?? group.course.totalLessons ?? group.totalLessons)
  const startTime = typeof lessonStartTime === 'string' && lessonStartTime.trim()
    ? lessonStartTime.trim()
    : group.lessonStartTime

  if (!days.length) return NextResponse.json({ error: '请选择上课日期' }, { status: 400 })
  if (!Number.isInteger(total) || total <= 0) return NextResponse.json({ error: '总课次数必须为正整数' }, { status: 400 })
  if (total > 365) return NextResponse.json({ error: '单次最多安排 365 天课次' }, { status: 400 })
  if (!Number.isInteger(mins) || mins < 15 || mins > 240) {
    return NextResponse.json({ error: '单节课时长须在 15 分钟至 4 小时之间' }, { status: 400 })
  }
  if (!isValidTime(startTime)) return NextResponse.json({ error: '请填写有效的上课开始时间' }, { status: 400 })

  const dates: Date[] = []
  let cursor = new Date(start)
  const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
  const targetDays = days.map((d: string) => dayMap[d] ?? -1).filter((d: number) => d >= 0)
  if (!targetDays.length) return NextResponse.json({ error: '请选择有效的上课日期' }, { status: 400 })

  while (dates.length < total && cursor.toISOString().slice(0, 10) <= scheduleEndDateKey) {
    if (targetDays.includes(cursor.getUTCDay())) {
      dates.push(new Date(cursor))
    }
    cursor = addDays(cursor, 1)
  }
  if (dates.length < total) {
    return NextResponse.json({ error: `班级有效日期范围内只能安排 ${dates.length} 个上课日，无法满足 ${total} 次课` }, { status: 400 })
  }

  const endTime = (t: string, m: number) => {
    const [h, min] = t.split(':').map(Number)
    const totalMin = h * 60 + min + m
    return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
  }

  const assignments = group.teacherAssignments.length
    ? group.teacherAssignments
    : [{ teacherId: group.teacherId, subject: group.course.subject }]
  const lessonsByDay = new Map<number, typeof group.classLessons>()
  for (const lesson of group.classLessons) {
    const key = new Date(lesson.lessonDate).setHours(0, 0, 0, 0)
    const current = lessonsByDay.get(key) || []
    current.push(lesson)
    lessonsByDay.set(key, current)
  }
  const inferredTemplate = [...lessonsByDay.values()]
    .sort((left, right) => right.length - left.length)[0]
    ?.map((lesson, index) => ({
      teacherId: lesson.teacherId || group.teacherId,
      subject: lesson.subject || group.course.subject,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      order: index + 1,
    })) || []
  const dailyTemplate = scheduleTemplate.length
    ? scheduleTemplate
    : inferredTemplate.length
      ? inferredTemplate
    : assignments.slice(0, 1).map((assignment) => ({
        teacherId: assignment.teacherId,
        subject: assignment.subject || group.course.subject,
        startTime,
        endTime: endTime(startTime, mins),
        order: 1,
      }))

  if (!dailyTemplate.length || dailyTemplate.some((slot) => {
    if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime) || slot.startTime >= slot.endTime) return true
    const duration = Number(slot.endTime.slice(0, 2)) * 60 + Number(slot.endTime.slice(3))
      - Number(slot.startTime.slice(0, 2)) * 60 - Number(slot.startTime.slice(3))
    return duration < 15 || duration > 240
  })) {
    return NextResponse.json({ error: '课次模板时间无效，单节时长须为 15 分钟至 4 小时' }, { status: 400 })
  }
  const clock = chinaClock(new Date())
  const includesPastSlot = dates.some((date) => {
    const dateKey = date.toISOString().slice(0, 10)
    return dateKey < clock.day || (dateKey === clock.day && dailyTemplate.some((slot) => slot.startTime <= clock.time))
  })
  if (includesPastSlot) {
    return NextResponse.json({ error: '生成的课次不能早于当前时间，历史课程请使用补录流程' }, { status: 400 })
  }
  const templateAssignments = group.teacherAssignments.length
    ? group.teacherAssignments
    : [{ teacherId: group.teacherId, subject: group.course.subject }]
  if (dailyTemplate.some((slot) => !templateAssignments.some((assignment) =>
    assignment.teacherId === slot.teacherId && (assignment.subject || group.course.subject) === slot.subject,
  ))) {
    return NextResponse.json({ error: '课次模板中的教师或科目未分配到该班级' }, { status: 400 })
  }

  // 分批创建，每批最多50条，防止数据库超时
  const allData = dates.flatMap((d) => dailyTemplate.map((slot) => ({
    groupId: id,
    teacherId: slot.teacherId,
    subject: slot.subject,
    lessonDate: d,
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'SCHEDULED' as const,
    division: group.division,
  })))

  if (allData.length > 250) {
    return NextResponse.json({ error: `课次总数 ${allData.length} 节超过单次上限 250 节，请减少上课日/天数/每天节次` }, { status: 400 })
  }

  const BATCH_SIZE = 50
  let created: { count: number; changeEventId: string; notifiedParents: number; replacedCount: number }
  try {
    created = await runSerializableWithRetry(() => prisma.$transaction(async (tx) => {
      const currentGroup = await tx.classGroup.findFirst({
        where: {
          id,
          division: user.division,
          deletedAt: null,
          status: 'WAITING',
          course: { isActive: true },
          term: { status: 'ACTIVE', division: user.division },
        },
        include: {
          course: { select: { subject: true } },
          room: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          term: { select: { startDate: true, endDate: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
        },
      })
      if (!currentGroup || !currentGroup.term || currentGroup.updatedAt.getTime() !== group.updatedAt.getTime()) {
        throw new ScheduleGenerationError('班级或课程批次已变化，请刷新页面后重新生成课表')
      }
      const currentTermStart = localDateKey(currentGroup.term.startDate)
      const currentTermEnd = localDateKey(currentGroup.term.endDate)
      const currentGroupEnd = currentGroup.endDate ? localDateKey(currentGroup.endDate) : currentTermEnd
      const currentScheduleEnd = currentGroupEnd < currentTermEnd ? currentGroupEnd : currentTermEnd
      if (startDateKey < currentTermStart || dates.at(-1)!.toISOString().slice(0, 10) > currentScheduleEnd) {
        throw new ScheduleGenerationError('班级或批次日期范围已变化，请刷新后重新生成课表')
      }

      const currentAssignments = currentGroup.teacherAssignments.length
        ? currentGroup.teacherAssignments
        : [{ teacherId: currentGroup.teacherId, subject: currentGroup.course.subject }]
      if (dailyTemplate.some((slot) => !currentAssignments.some((assignment) =>
        assignment.teacherId === slot.teacherId && (assignment.subject || currentGroup.course.subject) === slot.subject,
      ))) {
        throw new ScheduleGenerationError('课次模板中的教师或科目已不属于该班，请刷新后重新生成课表', 409)
      }
      const templateTeacherIds = [...new Set(dailyTemplate.map((slot) => slot.teacherId))]
      const activeTeachers = await tx.teacher.findMany({
        where: { id: { in: templateTeacherIds }, division: currentGroup.division, status: 'ACTIVE' },
        select: { id: true, name: true },
      })
      const activeTeacherIds = new Set(activeTeachers.map((teacher) => teacher.id))
      if (templateTeacherIds.some((teacherId) => !activeTeacherIds.has(teacherId))) {
        throw new ScheduleGenerationError('课次模板包含未启用或不属于当前学部的教师', 400)
      }
      const teacherNameById = new Map(activeTeachers.map((teacher) => [teacher.id, teacher.name]))

      // Only untouched future plans may be replaced. Keep canceled, attended,
      // settled, and manual lessons so their records remain auditable.
      const oldLessons = await tx.classLesson.findMany({
        where: {
          groupId: id,
          status: 'SCHEDULED',
          isManual: false,
          deletedAt: null,
          attendanceSubmittedAt: null,
          hoursDeductedAt: null,
          attendances: { none: { deletedAt: null } },
          classroomFeedbacks: { none: { deletedAt: null } },
        },
        select: { id: true },
      })
      const oldIds = oldLessons.map((lesson) => lesson.id)
      const activeEnrollments = await tx.enrollment.findMany({
        where: {
          groupId: id,
          status: 'ACTIVE',
          deletedAt: null,
          student: { deletedAt: null, status: { not: 'INACTIVE' } },
        },
        select: { studentId: true, subjects: true },
      })
      const targetSlots: CopyScheduleSlot[] = allData.map((slot, index) => ({
        id: `generated:${index}`,
        groupId: id,
        dateKey: slot.lessonDate.toISOString().slice(0, 10),
        groupName: currentGroup.name,
        teacherId: slot.teacherId,
        teacherName: teacherNameById.get(slot.teacherId) || '',
        roomId: currentGroup.roomId,
        roomName: currentGroup.room?.name || null,
        studentIds: activeEnrollments
          .filter((student) => enrollmentIncludesSubject(student.subjects, slot.subject))
          .map((student) => student.studentId),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      const existingLessons = await tx.classLesson.findMany({
        where: {
          lessonDate: { gte: dates[0], lt: addDays(dates[dates.length - 1], 1) },
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          deletedAt: null,
          division: currentGroup.division,
          ...(oldIds.length ? { id: { notIn: oldIds } } : {}),
          group: { deletedAt: null, status: { not: 'ARCHIVED' } },
        },
        include: {
          teacher: { select: { id: true, name: true } },
          lessonStudents: { select: { studentId: true } },
          group: {
            include: {
              course: { select: { subject: true } },
              room: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } },
              teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } } },
              enrollments: {
                where: { status: 'ACTIVE', deletedAt: null, student: { deletedAt: null, status: { not: 'INACTIVE' } } },
                select: { studentId: true, subjects: true },
              },
            },
          },
        },
      })
      const existingSlots: CopyScheduleSlot[] = existingLessons.map((lesson) => {
        const subject = lesson.subject || lesson.group.course.subject
        const assignment = lesson.group.teacherAssignments.find((item) => item.subject === subject)
        return {
          id: lesson.id,
          groupId: lesson.groupId,
          dateKey: localDateKey(lesson.lessonDate),
          groupName: lesson.group.name,
          teacherId: lesson.teacherId || assignment?.teacherId || lesson.group.teacherId,
          teacherName: lesson.teacher?.name || assignment?.teacher.name || lesson.group.teacher?.name || '',
          roomId: lesson.group.room?.id || null,
          roomName: lesson.group.room?.name || null,
          studentIds: resolveSubjectLessonStudentIds(
            lesson.lessonStudents.map((row) => row.studentId),
            lesson.group.enrollments,
            subject,
            lesson.lessonDate,
          ),
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        }
      })
      const conflicts = findClassLessonCopyConflicts(targetSlots, existingSlots)
      if (conflicts.length) {
        throw new ScheduleGenerationError('生成课表存在教师、教室或学员时间冲突，请调整后重试', 409, conflicts)
      }

      if (oldIds.length) {
        const replaced = await tx.classLesson.updateMany({
          where: {
            id: { in: oldIds },
            status: 'SCHEDULED',
            deletedAt: null,
            attendanceSubmittedAt: null,
            hoursDeductedAt: null,
            attendances: { none: { deletedAt: null } },
            classroomFeedbacks: { none: { deletedAt: null } },
          },
          data: { status: 'CANCELLED', cancelReason: '重新生成课表，原安排已保留供查询' },
        })
        if (replaced.count !== oldIds.length) {
          throw new ScheduleGenerationError('原课表状态已变化，请刷新后重试')
        }
      }

      let createdCount = 0
      for (let i = 0; i < allData.length; i += BATCH_SIZE) {
        const batch = allData.slice(i, i + BATCH_SIZE)
        const result = await tx.classLesson.createMany({ data: batch, skipDuplicates: true })
        createdCount += result.count
      }

      // Snapshot the eligible active roster in the same transaction as lesson creation.
      const affectedStudentIds = new Set<string>()
      const snapshotLessons = await tx.classLesson.findMany({
        where: { groupId: id, status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, isManual: false, deletedAt: null },
        select: { id: true, subject: true },
      })
      const snapshotRows = snapshotLessons.flatMap((lesson) =>
        activeEnrollments
          .filter((student) => enrollmentIncludesSubject(student.subjects, lesson.subject))
          .map((student) => ({ lessonId: lesson.id, studentId: student.studentId })),
      )
      snapshotRows.forEach((row) => affectedStudentIds.add(row.studentId))
      if (snapshotRows.length) {
        await tx.classLessonStudent.createMany({ data: snapshotRows, skipDuplicates: true })
      }

      const activeLessonCount = await tx.classLesson.count({
        where: { groupId: id, status: { notIn: ['CANCELLED', 'POSTPONED'] }, deletedAt: null },
      })
      await tx.classGroup.update({
        where: { id },
        data: {
          totalLessons: activeLessonCount,
          lessonStartTime: startTime,
          lessonMinutes: mins,
          recurringDays: days,
          startDate: start,
        },
      })
      await tx.activityLog.create({
        data: { userId: user.id, action: '生成课次', detail: `${currentGroup.name} 共${dates.length}节` },
      })
      const createdLessons = await tx.classLesson.findMany({
        where: {
          groupId: id,
          lessonDate: { in: dates },
          status: 'SCHEDULED',
          isManual: false,
          deletedAt: null,
        },
        select: { id: true },
      })
      const change = await recordCourseChangeEvent(tx, {
        eventType: 'LESSON_SERIES_REGENERATED',
        actorUserId: user.id,
        groupId: id,
        lessonIds: [...oldIds, ...createdLessons.map((lesson) => lesson.id)],
        studentIds: [...affectedStudentIds],
        title: '班级课表已更新',
        summary: `${currentGroup.name}已重新生成未来课表：新增/保留 ${createdCount} 节，替换原有 ${oldIds.length} 节安排，请查看最新课表。`,
        notifyParents: currentGroup.status === 'ACTIVE',
      })
      return { count: createdCount, changeEventId: change.event.id, notifiedParents: change.recipientCount, replacedCount: oldIds.length }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 }))
  } catch (error) {
    if (error instanceof ScheduleGenerationError) {
      return NextResponse.json({ error: error.message, ...(error.conflicts ? { conflicts: error.conflicts } : {}) }, { status: error.status })
    }
    if (isSerializationConflict(error)) {
      return NextResponse.json({ error: '课表正在被其他操作更新，请刷新页面后重试' }, { status: 409 })
    }
    throw error
  }

  return NextResponse.json({ ...created, dates: dates.map((date) => date.toISOString().slice(0, 10)) })
})
