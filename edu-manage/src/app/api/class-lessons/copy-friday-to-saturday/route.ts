import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { recordCourseChangeEvent } from '@/lib/course-change-events'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getRequestDivision } from '@/lib/division'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { dateRangeDays, getLocalDayRange, isValidDateKey, localDateColumnValue } from '@/lib/date/local-day'
import { findClassLessonCopyConflicts, type CopyScheduleSlot } from '@/lib/class-lesson-copy-conflicts'
import { isSerializationConflict, runSerializableWithRetry } from '@/lib/serializable-retry'

export const dynamic = 'force-dynamic'

interface PreviewItem {
  sourceLessonId: string
  groupId: string
  groupName: string
  courseName: string
  teacherId: string
  teacherName: string
  roomId: string | null
  roomName: string | null
  studentCount: number
  oldDate: string
  newDate: string
  startTime: string
  endTime: string
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  if (!selectedTerm || selectedTerm.status !== 'ACTIVE') {
    return NextResponse.json({ error: '历史批次只允许查看，请切换到当前运营批次后再复制课程' }, { status: 409 })
  }
  const body = await req.json().catch(() => ({}))
  const fridayDate = typeof body.fridayDate === 'string' && body.fridayDate.trim() ? body.fridayDate.trim() : ''
  const groupIds: string[] = Array.isArray(body.groupIds)
    ? body.groupIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []
  const teacherIds: string[] = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []
  const dryRun = body.dryRun === true

  if (!isValidDateKey(fridayDate)) {
    return NextResponse.json({ error: '请提供有效日期 (yyyy-MM-dd)' }, { status: 400 })
  }

  // Validate it's Friday
  const fridayDateObj = new Date(`${fridayDate}T00:00:00Z`)
  if (fridayDateObj.getUTCDay() !== 5) {
    return NextResponse.json({ error: '请选择周五日期，系统会复制该日课程到周六' }, { status: 400 })
  }

  // Saturday = Friday + 1
  const saturdayDate = dateRangeDays(fridayDate, 2)[1]
  const { start: fridayDayStart, end: fridayDayEnd } = getLocalDayRange(fridayDate)
  const { start: saturdayDayStart } = getLocalDayRange(saturdayDate)

  // Build where clause for Friday lessons
  const where: Prisma.ClassLessonWhereInput = {
    lessonDate: { gte: fridayDayStart, lt: fridayDayEnd },
    deletedAt: null,
    status: { notIn: ['CANCELLED', 'POSTPONED'] },
    division,
    group: {
      termId: selectedTerm.id,
      status: { not: 'ARCHIVED' },
      course: { isActive: true },
    },
  }
  if (groupIds.length) {
    where.groupId = { in: groupIds }
  }
  if (teacherIds.length) {
    where.OR = [
      { teacherId: { in: teacherIds } },
      { group: { teacherId: { in: teacherIds } } },
      { group: { teacherAssignments: { some: { teacherId: { in: teacherIds } } } } },
    ]
  }

  const fridayLessons = await prisma.classLesson.findMany({
    where,
    include: {
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          room: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } } },
          enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
        },
      },
      teacher: { select: { id: true, name: true } },
      lessonStudents: { select: { studentId: true } },
    },
    orderBy: [{ groupId: 'asc' }, { startTime: 'asc' }],
  })

  if (!fridayLessons.length) {
    return NextResponse.json({
      ok: true,
      fridayDate,
      saturdayDate,
      matchedCount: 0,
      willCreateCount: 0,
      skippedCount: 0,
      conflictCount: 0,
      preview: [],
      skipped: [],
      conflicts: [],
    })
  }

  // Resolve each lesson against its saved subject roster. A current/future
  // lesson without a roster snapshot is not safe to copy from group enrollment.
  const rosterBySourceId = new Map<string, string[]>()
  const skipped: { sourceLessonId: string; reason: string }[] = []
  const preview: PreviewItem[] = fridayLessons.map((lesson) => {
    const subject = lesson.subject || lesson.group.course.subject
    const studentIds = resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((student) => student.studentId),
      lesson.group.enrollments,
      subject,
      lesson.lessonDate,
    )
    rosterBySourceId.set(lesson.id, studentIds)
    if (studentIds.length === 0) {
      skipped.push({ sourceLessonId: lesson.id, reason: '该课次没有有效的本学科报名名单快照，请先核对课次名单' })
    }
    return {
      sourceLessonId: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      courseName: lesson.group.course.name,
      teacherId: lesson.teacherId || lesson.group.teacherAssignments.find((assignment) => assignment.subject === subject)?.teacherId || lesson.group.teacherId || '',
      teacherName: lesson.teacher?.name || lesson.group.teacherAssignments.find((assignment) => assignment.subject === subject)?.teacher.name || lesson.group.teacher?.name || '',
      roomId: lesson.group.room?.id || null,
      roomName: lesson.group.room?.name || null,
      studentCount: studentIds.length,
      oldDate: fridayDate,
      newDate: saturdayDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    }
  })

  // Check existing Saturday lessons for duplicate detection
  const saturdayExisting = await prisma.classLesson.findMany({
    where: {
      lessonDate: { gte: saturdayDayStart, lt: getLocalDayRange(saturdayDate).end },
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      division,
      group: { termId: selectedTerm.id, deletedAt: null, status: { not: 'ARCHIVED' } },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      lessonStudents: { select: { studentId: true } },
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          room: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } } },
          enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
        },
      },
    },
  })

  // Build a set of existing Saturday slots: `${groupId}::${startTime}::${endTime}`
  const saturdaySlots = new Set(
    saturdayExisting.map((l) => `${l.groupId}::${l.startTime}::${l.endTime}`)
  )

  // Separate: toCreate vs skipped (duplicate)
  const toCreate: typeof preview = []
  for (const item of preview) {
    if ((rosterBySourceId.get(item.sourceLessonId)?.length || 0) === 0) continue
    if (!item.teacherId) {
      skipped.push({ sourceLessonId: item.sourceLessonId, reason: '该课次未配置授课教师，请先完善排课信息' })
      continue
    }
    const key = `${item.groupId}::${item.startTime}::${item.endTime}`
    if (saturdaySlots.has(key)) {
      skipped.push({ sourceLessonId: item.sourceLessonId, reason: '周六已存在相同班级同时间课程' })
    } else {
      toCreate.push(item)
    }
  }

  // Conflict checking
  const sourceById = new Map(fridayLessons.map((lesson) => [lesson.id, lesson]))
  const makeTargetSlot = (item: PreviewItem): CopyScheduleSlot => {
    const studentIds = rosterBySourceId.get(item.sourceLessonId) || []
    return { ...item, id: `copy:${item.sourceLessonId}`, studentIds }
  }
  const targetSlots = toCreate.map(makeTargetSlot)
  const existingSlots: CopyScheduleSlot[] = saturdayExisting.map((lesson) => {
    const subject = lesson.subject || lesson.group.course.subject
    const assignment = lesson.group.teacherAssignments.find((item) => item.subject === subject)
    const studentIds = resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((student) => student.studentId),
      lesson.group.enrollments,
      subject,
      lesson.lessonDate,
    )
    return {
      id: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      teacherId: lesson.teacherId || assignment?.teacherId || lesson.group.teacherId,
      teacherName: lesson.teacher?.name || assignment?.teacher.name || lesson.group.teacher?.name || '',
      roomId: lesson.group.room?.id || null,
      roomName: lesson.group.room?.name || null,
      studentIds,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    }
  })
  const conflicts = findClassLessonCopyConflicts(targetSlots, existingSlots)

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      fridayDate,
      saturdayDate,
      matchedCount: fridayLessons.length,
      willCreateCount: toCreate.length,
      skippedCount: skipped.length,
      conflictCount: conflicts.length,
      preview: toCreate,
      skipped,
      conflicts,
    })
  }

  // Real execution (dryRun = false)
  if (conflicts.length) {
    return NextResponse.json({ ok: false, error: '周六复制后存在冲突', conflicts }, { status: 409 })
  }

  const saturdayDayStartForCreate = localDateColumnValue(saturdayDate)
  let changeEvents: {
    ids: string[]
    events: Awaited<ReturnType<typeof recordCourseChangeEvent>>[]
    skippedCount: number
  }
  try {
    changeEvents = await runSerializableWithRetry(() => prisma.$transaction(async (tx) => {
      // The preview check above is intentionally repeated inside the write
      // transaction. Two admins can submit the same dry-run result at once.
      const transactionSources = await tx.classLesson.findMany({
        where: {
          id: { in: toCreate.map((item) => item.sourceLessonId) },
          lessonDate: { gte: fridayDayStart, lt: fridayDayEnd },
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          division,
          group: {
            termId: selectedTerm.id,
            deletedAt: null,
            status: { not: 'ARCHIVED' },
            course: { isActive: true },
          },
        },
        include: {
          lessonStudents: { select: { studentId: true } },
          group: {
            include: {
              course: { select: { subject: true } },
              room: { select: { id: true } },
              teacherAssignments: { select: { teacherId: true, subject: true } },
              enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
            },
          },
        },
      })
      const transactionSourcesById = new Map(transactionSources.map((lesson) => [lesson.id, lesson]))
      const sourceChangedAfterPreview = toCreate.some((item) => {
        const original = sourceById.get(item.sourceLessonId)
        const current = transactionSourcesById.get(item.sourceLessonId)
        if (!original || !current) return true

        const currentSubject = current.subject || current.group.course.subject
        const currentTeacherId = current.teacherId
          || current.group.teacherAssignments.find((assignment) => assignment.subject === currentSubject)?.teacherId
          || current.group.teacherId
          || ''
        const currentRoster = resolveSubjectLessonStudentIds(
          current.lessonStudents.map((student) => student.studentId),
          current.group.enrollments,
          currentSubject,
          current.lessonDate,
        ).sort()
        const plannedRoster = [...(rosterBySourceId.get(item.sourceLessonId) || [])].sort()
        const originalSubject = original.subject || original.group.course.subject

        return currentSubject !== originalSubject
          || currentTeacherId !== item.teacherId
          || (current.group.room?.id || null) !== item.roomId
          || current.startTime !== item.startTime
          || current.endTime !== item.endTime
          || currentRoster.length !== plannedRoster.length
          || currentRoster.some((studentId, index) => studentId !== plannedRoster[index])
      })
      if (sourceChangedAfterPreview) {
        throw Object.assign(new Error('周五课程名单或安排已变化，请重新预览后重试'), { status: 409 })
      }

      const transactionExisting = await tx.classLesson.findMany({
        where: {
          lessonDate: { gte: saturdayDayStart, lt: getLocalDayRange(saturdayDate).end },
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          division,
          group: { termId: selectedTerm.id, deletedAt: null, status: { not: 'ARCHIVED' } },
        },
        include: {
          teacher: { select: { id: true, name: true } },
          lessonStudents: { select: { studentId: true } },
          group: {
            include: {
              course: { select: { name: true, subject: true } },
              room: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } },
              teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } } },
              enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
            },
          },
        },
      })

      const existingKeys = new Set(transactionExisting.map((lesson) =>
        `${lesson.groupId}::${lesson.startTime}::${lesson.endTime}`,
      ))
      const transactionItems = toCreate.filter((item) =>
        !existingKeys.has(`${item.groupId}::${item.startTime}::${item.endTime}`),
      )
      const transactionSkippedCount = toCreate.length - transactionItems.length
      const transactionExistingSlots: CopyScheduleSlot[] = transactionExisting.map((lesson) => {
        const subject = lesson.subject || lesson.group.course.subject
        const assignment = lesson.group.teacherAssignments.find((item) => item.subject === subject)
        const studentIds = resolveSubjectLessonStudentIds(
          lesson.lessonStudents.map((student) => student.studentId),
          lesson.group.enrollments,
          subject,
          lesson.lessonDate,
        )
        return {
          id: lesson.id,
          groupId: lesson.groupId,
          groupName: lesson.group.name,
          teacherId: lesson.teacherId || assignment?.teacherId || lesson.group.teacherId,
          teacherName: lesson.teacher?.name || assignment?.teacher.name || lesson.group.teacher?.name || '',
          roomId: lesson.group.room?.id || null,
          roomName: lesson.group.room?.name || null,
          studentIds,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        }
      })
      const transactionConflicts = findClassLessonCopyConflicts(
        transactionItems.map(makeTargetSlot),
        transactionExistingSlots,
      )
      if (transactionConflicts.length) {
        throw Object.assign(new Error('周六复制后存在冲突'), {
          status: 409,
          conflicts: transactionConflicts,
        })
      }

      const ids: string[] = []
      const affectedByGroup = new Map<string, { lessonIds: string[]; studentIds: Set<string> }>()

      for (const item of transactionItems) {
        const newLesson = await tx.classLesson.create({
          data: {
            groupId: item.groupId,
            teacherId: item.teacherId,
            subject: (() => {
              const source = sourceById.get(item.sourceLessonId)
              return source?.subject || source?.group.course.subject || null
            })(),
            lessonDate: saturdayDayStartForCreate,
            startTime: item.startTime,
            endTime: item.endTime,
            status: 'SCHEDULED',
            note: `周六补开：复制自 ${fridayDate}`,
            isManual: true,
            division,
          },
        })
        ids.push(newLesson.id)

        const rosterStudentIds = rosterBySourceId.get(item.sourceLessonId) || []
        if (rosterStudentIds.length) {
          await tx.classLessonStudent.createMany({
            data: rosterStudentIds.map((studentId) => ({ lessonId: newLesson.id, studentId })),
            skipDuplicates: true,
          })
        }
        const affected = affectedByGroup.get(item.groupId) || { lessonIds: [], studentIds: new Set<string>() }
        affected.lessonIds.push(newLesson.id)
        rosterStudentIds.forEach((studentId) => affected.studentIds.add(studentId))
        affectedByGroup.set(item.groupId, affected)

        await tx.classGroup.update({
          where: { id: item.groupId },
          data: { totalLessons: { increment: 1 } },
        })
      }

      const events: Awaited<ReturnType<typeof recordCourseChangeEvent>>[] = []
      for (const [groupId, affected] of affectedByGroup) {
        const groupName = fridayLessons.find((source) => source.groupId === groupId)?.group.name || '班级'
        events.push(await recordCourseChangeEvent(tx, {
          eventType: 'MAKEUP_ADDED',
          actorUserId: user.id,
          groupId,
          lessonIds: affected.lessonIds,
          studentIds: [...affected.studentIds],
          title: `${groupName}周六补课已安排`,
          summary: `${saturdayDate}补开课程，课次已按周五安排复制，请查看家长端最新课表。`,
        }))
      }

    if (ids.length > 0) {
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: '周六补开',
          detail: `复制 ${fridayDate} 课程到 ${saturdayDate}，创建 ${ids.length} 节，跳过 ${skipped.length + transactionSkippedCount} 节`,
        },
      })
    }

      return { ids, events, skippedCount: skipped.length + transactionSkippedCount }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
  } catch (error) {
    const routeError = error as { status?: number; message?: string; conflicts?: unknown }
    if (routeError.status === 409) {
      return NextResponse.json({ ok: false, error: routeError.message || '周六复制后存在冲突', conflicts: routeError.conflicts }, { status: 409 })
    }
    if (isSerializationConflict(error)) {
      return NextResponse.json({ ok: false, error: '课程安排正在被其他操作更新，请刷新后重试' }, { status: 409 })
    }
    throw error
  }
  const createdCount = changeEvents.ids.length
  const notifiedParents = changeEvents.events.reduce((total, item) => total + item.recipientCount, 0)

  // Revalidate
  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/dashboard')

  return NextResponse.json({
    ok: true,
    createdCount,
    notifiedParents,
    changeEventIds: changeEvents.events.map((item) => item.event.id),
    skippedCount: changeEvents.skippedCount,
    createdLessonIds: changeEvents.ids,
  })
})
