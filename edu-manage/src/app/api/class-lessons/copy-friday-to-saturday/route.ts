import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { hasTimeOverlap } from '@/lib/schedule-conflict'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getRequestDivision } from '@/lib/division'

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

interface ConflictInfo {
  type: 'teacher' | 'room' | 'student'
  teacherName?: string
  groupName?: string
  timeRange: string
  message: string
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
  const targetDivision = typeof body.division === 'string' && body.division ? body.division : undefined
  const groupIds: string[] = Array.isArray(body.groupIds)
    ? body.groupIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []
  const teacherIds: string[] = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []
  const dryRun = body.dryRun === true
  const overwrite = body.overwrite === true

  if (!fridayDate || !/^\d{4}-\d{2}-\d{2}$/.test(fridayDate)) {
    return NextResponse.json({ error: '请提供有效日期 (yyyy-MM-dd)' }, { status: 400 })
  }

  // Validate it's Friday
  const fridayDateObj = new Date(`${fridayDate}T00:00:00`)
  if (Number.isNaN(fridayDateObj.getTime())) {
    return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
  }
  if (fridayDateObj.getDay() !== 5) {
    return NextResponse.json({ error: '请选择周五日期，系统会复制该日课程到周六' }, { status: 400 })
  }

  // Saturday = Friday + 1
  const saturdayDateObj = new Date(fridayDateObj)
  saturdayDateObj.setDate(saturdayDateObj.getDate() + 1)
  const saturdayDate = saturdayDateObj.toISOString().slice(0, 10)

  const fridayDayStart = new Date(`${fridayDate}T00:00:00`)
  const fridayDayEnd = new Date(`${fridayDate}T23:59:59.999`)

  // Build where clause for Friday lessons
  const where: Prisma.ClassLessonWhereInput = {
    lessonDate: { gte: fridayDayStart, lte: fridayDayEnd },
    status: { not: 'CANCELLED' },
    group: {
      termId: selectedTerm.id,
      status: { not: 'ARCHIVED' },
      course: { isActive: true },
    },
  }
  if (targetDivision) {
    where.division = targetDivision as 'JUNIOR' | 'SENIOR'
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
          course: { select: { name: true } },
          room: { select: { id: true, name: true } },
          enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
        },
      },
      teacher: { select: { id: true, name: true } },
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

  // Build preview
  const preview: PreviewItem[] = fridayLessons.map((lesson) => ({
    sourceLessonId: lesson.id,
    groupId: lesson.groupId,
    groupName: lesson.group.name,
    courseName: lesson.group.course.name,
    teacherId: lesson.teacherId || lesson.group.teacherId || '',
    teacherName: lesson.teacher?.name || '',
    roomId: lesson.group.room?.id || null,
    roomName: lesson.group.room?.name || null,
    studentCount: lesson.group.enrollments.length,
    oldDate: fridayDate,
    newDate: saturdayDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  }))

  // Check existing Saturday lessons for duplicate detection
  const saturdayDayStart = new Date(`${saturdayDate}T00:00:00`)
  const saturdayDayEnd = new Date(`${saturdayDate}T23:59:59.999`)

  const saturdayExisting = await prisma.classLesson.findMany({
    where: {
      lessonDate: { gte: saturdayDayStart, lte: saturdayDayEnd },
      status: { not: 'CANCELLED' },
      group: { termId: selectedTerm.id },
    },
    select: { groupId: true, startTime: true, endTime: true, id: true },
  })

  // Build a set of existing Saturday slots: `${groupId}::${startTime}::${endTime}`
  const saturdaySlots = new Set(
    saturdayExisting.map((l) => `${l.groupId}::${l.startTime}::${l.endTime}`)
  )

  // Separate: toCreate vs skipped (duplicate)
  const toCreate: typeof preview = []
  const skipped: { sourceLessonId: string; reason: string }[] = []

  for (const item of preview) {
    const key = `${item.groupId}::${item.startTime}::${item.endTime}`
    if (saturdaySlots.has(key)) {
      skipped.push({ sourceLessonId: item.sourceLessonId, reason: '周六已存在相同班级同时间课程' })
    } else {
      toCreate.push(item)
    }
  }

  // Conflict checking
  const conflicts: ConflictInfo[] = []
  for (const item of toCreate) {
    // Teacher conflict — check against existing Saturday lessons AND other to-be-created lessons
    const allSaturdayLessons = [
      ...saturdayExisting,
      ...toCreate
        .filter((c) => c !== item)
        .map((c) => ({
          id: 'new',
          groupId: c.groupId,
          teacherId: c.teacherId,
          startTime: c.startTime,
          endTime: c.endTime,
          group: { course: { name: c.courseName }, room: { name: c.roomName } },
          teacher: { name: c.teacherName },
        })),
    ]

    for (const existing of allSaturdayLessons) {
      const existingTId = 'teacherId' in existing && existing.teacherId
      const existingStart = existing.startTime
      const existingEnd = existing.endTime
      if (existingTId === item.teacherId && hasTimeOverlap(item.startTime, item.endTime, existingStart, existingEnd)) {
        const dup = conflicts.some(
          (c) => c.type === 'teacher' && c.teacherName === item.teacherName && c.timeRange === `${existingStart}-${existingEnd}`
        )
        if (!dup) {
          conflicts.push({
            type: 'teacher',
            teacherName: item.teacherName,
            groupName: item.groupName,
            timeRange: `${existingStart}-${existingEnd}`,
            message: `教师 ${item.teacherName} 周六 ${existingStart}-${existingEnd} 已有课程`,
          })
        }
      }
    }

    // Room conflict
    if (item.roomId) {
      const roomConflicts = await prisma.classLesson.findMany({
        where: {
          lessonDate: { gte: saturdayDayStart, lte: saturdayDayEnd },
          status: { not: 'CANCELLED' },
          group: { roomId: item.roomId, termId: selectedTerm.id },
        },
        include: { group: { include: { room: { select: { name: true } } } }, teacher: { select: { name: true } } },
      })

      for (const existing of roomConflicts) {
        if (existing.startTime === item.startTime && existing.endTime === item.endTime) continue // Same slot pattern, different group
        if (hasTimeOverlap(item.startTime, item.endTime, existing.startTime, existing.endTime)) {
          const dup = conflicts.some(
            (c) => c.type === 'room' && c.groupName === (existing.group?.room?.name || '') && c.timeRange === `${existing.startTime}-${existing.endTime}`
          )
          if (!dup) {
            conflicts.push({
              type: 'room',
              groupName: item.groupName,
              timeRange: `${existing.startTime}-${existing.endTime}`,
              message: `教室 ${item.roomName} 周六 ${existing.startTime}-${existing.endTime} 已被占用`,
            })
          }
        }
      }
    }
  }

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
  if (conflicts.length && !overwrite) {
    return NextResponse.json({ ok: false, error: '周六复制后存在冲突', conflicts }, { status: 409 })
  }

  const saturdayDayStartForCreate = new Date(`${saturdayDate}T00:00:00`)
  let createdCount = 0
  const createdLessonIds: string[] = []

  for (const item of toCreate) {
    const newLesson = await prisma.classLesson.create({
      data: {
        groupId: item.groupId,
        teacherId: item.teacherId,
        subject: fridayLessons.find((l) => l.id === item.sourceLessonId)?.subject || null,
        lessonDate: saturdayDayStartForCreate,
        startTime: item.startTime,
        endTime: item.endTime,
        status: 'SCHEDULED',
        note: `周六补开：复制自 ${fridayDate}`,
        isManual: true,
        division: targetDivision as 'JUNIOR' | 'SENIOR',
      },
    })
    createdLessonIds.push(newLesson.id)
    createdCount++

    // Update group totalLessons
    await prisma.classGroup.update({
      where: { id: item.groupId },
      data: { totalLessons: { increment: 1 } },
    })
  }

  // activityLog
  if (createdCount > 0) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: '周六补开',
        detail: `复制 ${fridayDate} 课程到 ${saturdayDate}，创建 ${createdCount} 节，跳过 ${skipped.length} 节`,
      },
    })
  }

  // Revalidate
  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/dashboard')

  return NextResponse.json({
    ok: true,
    createdCount,
    skippedCount: skipped.length,
    createdLessonIds,
  })
})
