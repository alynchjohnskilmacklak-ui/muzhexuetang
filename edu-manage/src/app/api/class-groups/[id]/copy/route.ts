import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { isValidDateKey, localDateColumnValue, localDateKey } from '@/lib/date/local-day'
import { findClassLessonCopyConflicts, type CopyScheduleSlot } from '@/lib/class-lesson-copy-conflicts'

export const dynamic = 'force-dynamic'

class ClassCopyError extends Error {
  constructor(message: string, readonly status = 400, readonly conflicts?: unknown[]) { super(message) }
}

function dayOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays))
  return shifted.toISOString().slice(0, 10)
}

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, null)
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const requestedStartDate = body.newStartDate
  if (requestedStartDate !== undefined && !isValidDateKey(requestedStartDate)) {
    return NextResponse.json({ error: '新班级开始日期格式不正确' }, { status: 400 })
  }
  const requestedName = typeof body.name === 'string' ? body.name.trim() : ''
  if (requestedName.length > 80) return NextResponse.json({ error: '班级名称不能超过 80 个字符' }, { status: 400 })

  const activeTerm = await getActiveAcademicTerm(prisma, division)
  if (!activeTerm) return NextResponse.json({ error: '请先启用一个运营批次，再复制班级' }, { status: 409 })

  try {
    let copied: { id: string; name: string; lessonCount: number } | undefined
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        copied = await prisma.$transaction(async (tx) => {
          const term = await tx.academicTerm.findFirst({
            where: { id: activeTerm.id, division, status: 'ACTIVE' },
            select: { id: true, startDate: true, endDate: true },
          })
          if (!term) throw new ClassCopyError('运营批次已变化，请刷新后重试', 409)

          const termStart = localDateKey(term.startDate)
          const termEnd = localDateKey(term.endDate)
          const targetStartDate = typeof requestedStartDate === 'string'
            ? requestedStartDate
            : termStart
          if (targetStartDate < termStart || targetStartDate > termEnd) {
            throw new ClassCopyError('新班级开始日期须在当前运营批次内')
          }

          const source = await tx.classGroup.findFirst({
            where: { id, division, deletedAt: null },
            include: {
              course: { select: { id: true, name: true, subject: true, isActive: true, deletedAt: true, division: true } },
              teacher: { select: { id: true, name: true, status: true, division: true } },
              room: { select: { id: true, name: true } },
              classLessons: {
                where: { deletedAt: null, status: { notIn: ['CANCELLED', 'POSTPONED'] } },
                orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
                include: { teacher: { select: { id: true, name: true, status: true, division: true } } },
              },
              teacherAssignments: {
                include: { teacher: { select: { id: true, name: true, status: true, division: true } } },
              },
            },
          })
          if (!source) throw new ClassCopyError('原班级不存在或无权复制', 404)
          if (!source.course.isActive || source.course.deletedAt || source.course.division !== division) {
            throw new ClassCopyError('原班级课程已停用或不属于当前学部，不能复制', 409)
          }

          const offsetDays = dayOrdinal(targetStartDate) - dayOrdinal(localDateKey(source.startDate))
          const clock = chinaClock(new Date())
          const targetSlots: CopyScheduleSlot[] = source.classLessons.map((lesson) => {
            const dateKey = shiftDateKey(localDateKey(lesson.lessonDate), offsetDays)
            if (dateKey < termStart || dateKey > termEnd) {
              throw new ClassCopyError(`复制后的课次 ${dateKey} 超出当前运营批次，请调整开始日期或先整理原班课表`)
            }
            if (dateKey < clock.day || (dateKey === clock.day && lesson.startTime <= clock.time)) {
              throw new ClassCopyError(`复制后的课次 ${dateKey} ${lesson.startTime} 已过或即将开始，不能作为待上课课次创建`)
            }
            const assignment = source.teacherAssignments.find((item) => item.subject === lesson.subject)
            const teacher = lesson.teacher || assignment?.teacher || source.teacher
            return {
              id: `copy:${lesson.id}`,
              groupId: `copy:${id}`,
              dateKey,
              groupName: requestedName || `${source.name}（副本）`,
              teacherId: lesson.teacherId || assignment?.teacherId || source.teacherId,
              teacherName: teacher?.name || '',
              roomId: source.roomId,
              roomName: source.room?.name || null,
              studentIds: [],
              startTime: lesson.startTime,
              endTime: lesson.endTime,
            }
          })

          const teacherIds = [...new Set([
            source.teacherId,
            ...source.teacherAssignments.map((item) => item.teacherId),
            ...source.classLessons.map((lesson) => lesson.teacherId),
          ].filter((teacherId): teacherId is string => Boolean(teacherId)))]
          if (teacherIds.length) {
            const activeTeachers = await tx.teacher.findMany({
              where: { id: { in: teacherIds }, division, status: 'ACTIVE' },
              select: { id: true },
            })
            if (activeTeachers.length !== teacherIds.length) {
              throw new ClassCopyError('原班级包含非在职或不属于当前学部的教师，请先修正任课关系', 409)
            }
          }

          if (targetSlots.length) {
            const sortedDates = targetSlots.map((slot) => slot.dateKey!).sort()
            const existingLessons = await tx.classLesson.findMany({
              where: {
                division,
                lessonDate: {
                  gte: localDateColumnValue(sortedDates[0]),
                  lte: localDateColumnValue(sortedDates[sortedDates.length - 1]),
                },
                deletedAt: null,
                status: { notIn: ['CANCELLED', 'POSTPONED'] },
                group: { termId: term.id, deletedAt: null },
              },
              include: {
                teacher: { select: { id: true, name: true } },
                group: {
                  include: {
                    teacher: { select: { id: true, name: true } },
                    room: { select: { id: true, name: true } },
                    teacherAssignments: {
                      include: { teacher: { select: { id: true, name: true } } },
                    },
                  },
                },
              },
            })
            const existingSlots: CopyScheduleSlot[] = existingLessons.map((lesson) => {
              const assignment = lesson.group.teacherAssignments.find((item) => item.subject === lesson.subject)
              const teacher = lesson.teacher || assignment?.teacher || lesson.group.teacher
              return {
                id: lesson.id,
                groupId: lesson.groupId,
                dateKey: localDateKey(lesson.lessonDate),
                groupName: lesson.group.name,
                teacherId: lesson.teacherId || assignment?.teacherId || lesson.group.teacherId,
                teacherName: teacher?.name || '',
                roomId: lesson.group.roomId,
                roomName: lesson.group.room?.name || null,
                studentIds: [],
                startTime: lesson.startTime,
                endTime: lesson.endTime,
              }
            })
            const conflicts = findClassLessonCopyConflicts(targetSlots, existingSlots)
            if (conflicts.length) {
              const summary = conflicts.slice(0, 5).map((conflict) => conflict.message).join('；')
              throw new ClassCopyError(`复制后的课表存在冲突：${summary}`, 409, conflicts)
            }
          }

          const group = await tx.classGroup.create({
            data: {
              name: requestedName || `${source.name}（副本）`,
              courseId: source.courseId,
              teacherId: source.teacherId,
              roomId: source.roomId,
              maxStudents: source.maxStudents,
              startDate: localDateColumnValue(targetStartDate),
              totalLessons: targetSlots.length,
              recurringDays: source.recurringDays,
              lessonStartTime: source.lessonStartTime,
              lessonMinutes: source.lessonMinutes,
              note: source.note,
              status: 'WAITING',
              termId: term.id,
              division,
            },
            select: { id: true, name: true },
          })

          if (targetSlots.length) {
            await tx.classLesson.createMany({
              data: targetSlots.map((slot, index) => ({
                groupId: group.id,
                division,
                teacherId: slot.teacherId,
                subject: source.classLessons[index].subject,
                lessonDate: localDateColumnValue(slot.dateKey!),
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: 'SCHEDULED',
              })),
            })
          }

          const assignmentRows = source.teacherAssignments.length
            ? source.teacherAssignments
            : source.teacherId ? [{ teacherId: source.teacherId, subject: null, role: 'PRIMARY' }] : []
          if (assignmentRows.length) {
            await tx.classGroupTeacher.createMany({
              data: assignmentRows.map((item) => ({
                groupId: group.id,
                teacherId: item.teacherId,
                subject: item.subject,
                role: item.role,
              })),
              skipDuplicates: true,
            })
          }

          await tx.activityLog.create({
            data: { userId: user.id, action: '复制班次', detail: `${source.name} → ${group.name}` },
          })

          return { ...group, lessonCount: targetSlots.length }
        }, { isolationLevel: 'Serializable' })
        break
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    if (!copied) throw new ClassCopyError('排课正在变化，请刷新后重试', 409)

    revalidatePath('/schedule')
    revalidatePath('/teacher/schedule')
    return NextResponse.json(copied, { status: 201 })
  } catch (error) {
    if (error instanceof ClassCopyError) {
      return NextResponse.json({ error: error.message, ...(error.conflicts ? { conflicts: error.conflicts } : {}) }, { status: error.status })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: '排课正在变化，请刷新后重试' }, { status: 409 })
    }
    throw error
  }
})
