import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { attendanceEligibleLessonWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { recordCourseChangeEvent } from '@/lib/course-change-events'
import { dateRangeDays, getLocalDayRange, localDateColumnValue, localDateKey } from '@/lib/date/local-day'
import { findClassLessonCopyConflicts, type CopyScheduleConflict, type CopyScheduleSlot } from '@/lib/class-lesson-copy-conflicts'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

class ScheduleChangedError extends Error {}
class ScheduleConflictError extends Error {
  constructor(readonly conflicts: CopyScheduleConflict[]) {
    super('调整后的课程与现有安排冲突')
  }
}

const lessonScheduleInclude = {
  group: {
    include: {
      course: { select: { name: true, subject: true } },
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { name: true } } } },
      enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
    },
  },
  teacher: { select: { id: true, name: true } },
  lessonStudents: { select: { studentId: true } },
} satisfies Prisma.ClassLessonInclude

function lessonStudents(lesson: {
  lessonStudents: Array<{ studentId: string }>
  group: { enrollments: Array<{ studentId: string; subjects: string[] }>; course: { subject: string | null } | null }
  subject: string | null
  lessonDate: Date
}) {
  return resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((row) => row.studentId),
    lesson.group.enrollments,
    lesson.subject || lesson.group.course?.subject,
    lesson.lessonDate,
  )
}

function lessonSlot(lesson: {
  id: string
  groupId: string
  lessonDate: Date
  startTime: string
  endTime: string
  teacherId: string | null
  subject: string | null
  lessonStudents: Array<{ studentId: string }>
  teacher: { id: string; name: string } | null
  group: {
    name: string
    teacherId: string | null
    course: { subject: string | null } | null
    room: { id: string; name: string } | null
    teacher: { id: string; name: string } | null
    teacherAssignments: Array<{ teacherId: string; subject: string | null; teacher: { name: string } }>
    enrollments: Array<{ studentId: string; subjects: string[] }>
  }
}, dateKey: string): CopyScheduleSlot {
  const subject = lesson.subject || lesson.group.course?.subject
  const assignment = lesson.group.teacherAssignments.find((item) => item.subject === subject)
  return {
    id: lesson.id,
    groupId: lesson.groupId,
    dateKey,
    groupName: lesson.group.name,
    teacherId: lesson.teacherId || assignment?.teacherId || lesson.group.teacherId,
    teacherName: lesson.teacher?.name || assignment?.teacher.name || lesson.group.teacher?.name || '',
    roomId: lesson.group.room?.id || null,
    roomName: lesson.group.room?.name || null,
    studentIds: lessonStudents(lesson),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  }
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => ({}))
  const { lessonId, offsetDays } = body
  if (typeof lessonId !== 'string' || !lessonId || !await isClassLessonInActiveTerm(prisma, lessonId, user.division)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能后移课次' }, { status: 409 })
  }

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, division: user.division, ...attendanceEligibleLessonWhere },
    include: { group: true },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const days = offsetDays === undefined ? 7 : Number(offsetDays)
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: '后移天数须为 1 至 90 天' }, { status: 400 })
  }

  const lessons = await prisma.classLesson.findMany({
    where: {
      groupId: lesson.groupId,
      group: visibleClassGroupWhere,
      lessonDate: { gte: lesson.lessonDate },
      status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
      deletedAt: null,
      division: user.division,
    },
    include: lessonScheduleInclude,
  })

  if (lessons.length === 0) return NextResponse.json({ error: '没有可后移的课次' }, { status: 409 })

  let result: Awaited<ReturnType<typeof recordCourseChangeEvent>>
  try {
    result = await prisma.$transaction(async (tx) => {
      const movingIds = lessons.map((item) => item.id)
      const targetDateById = new Map(lessons.map((item) => {
        const targetKey = dateRangeDays(localDateKey(item.lessonDate), days + 1)[days]
        return [item.id, targetKey] as const
      }))
      const targetDateKeys = [...targetDateById.values()].sort()
      const earliest = targetDateKeys[0]
      const latest = targetDateKeys[targetDateKeys.length - 1]
      const collisionRows = await tx.classLesson.findMany({
        where: {
          id: { notIn: movingIds },
          division: user.division,
          lessonDate: {
            gte: getLocalDayRange(earliest).start,
            lt: getLocalDayRange(latest).end,
          },
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'POSTPONED', 'COMPLETED'] },
          group: visibleClassGroupWhere,
        },
        include: lessonScheduleInclude,
      })
      const targets = lessons.map((item) => lessonSlot(item, targetDateById.get(item.id)!))
      const existing: CopyScheduleSlot[] = collisionRows.map((item) => lessonSlot(item, localDateKey(item.lessonDate)))
      const conflicts = findClassLessonCopyConflicts(targets, existing)
      if (conflicts.length) throw new ScheduleConflictError(conflicts)

      for (const l of lessons) {
        const targetDateKey = targetDateById.get(l.id)!
        const moved = await tx.classLesson.updateMany({
          where: {
            id: l.id,
            lessonDate: l.lessonDate,
            status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
            deletedAt: null,
            division: user.division,
          },
          data: { lessonDate: localDateColumnValue(targetDateKey) },
        })
        if (moved.count !== 1) throw new ScheduleChangedError('课程安排已发生变化')
      }

    const studentIds = [...new Set(lessons.flatMap((item) => lessonStudents(item)))]
    const event = await recordCourseChangeEvent(tx, {
      eventType: 'LESSONS_POSTPONED',
      actorUserId: user.id,
      groupId: lesson.groupId,
      lessonIds: lessons.map((item) => item.id),
      studentIds,
      title: `${lesson.group.name}后续课程已顺延`,
      summary: `${lessons.length} 节后续课程统一后移 ${days} 天，请查看家长端最新课表。`,
      notifyParents: lesson.group.status === 'ACTIVE',
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '一键后移课次',
        detail: `${lesson.group.name} 后移${days}天`,
        entityType: 'CourseChangeEvent',
        entityId: event.event.id,
        metadata: { lessonCount: lessons.length, studentCount: studentIds.length, notifiedParents: event.recipientCount },
      },
    })
      return event
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json({ error: error.message, conflicts: error.conflicts }, { status: 409 })
    }
    if (error instanceof ScheduleChangedError) {
      return NextResponse.json({ error: '课程安排已发生变化，请刷新课表后重试' }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: '课表刚刚发生变化，请刷新后重试' }, { status: 409 })
    }
    throw error
  }

  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/dashboard')
  return NextResponse.json({ success: true, count: lessons.length, notifiedParents: result.recipientCount, changeEventId: result.event.id })
})
