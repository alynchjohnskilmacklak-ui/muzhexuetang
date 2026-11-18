import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { getLocalDayRange, localDateColumnValue, localDateKey } from '@/lib/date/local-day'
import { hasTimeOverlap } from '@/lib/schedule-conflict'

export const dynamic = 'force-dynamic'

class LessonPlanError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { id } = await params
  const prisma = await getRequestPrisma()
  const body = await req.json().catch(() => ({}))
  const date = typeof body.date === 'string' ? body.date : ''
  const startTime = body.startTime
  const endTime = body.endTime
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  let dayRange: ReturnType<typeof getLocalDayRange> | null = null
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dayRange = getLocalDayRange(date)
  } catch {
    // Invalid calendar date is a user input error, not a server error.
  }
  if (!dayRange || localDateKey(dayRange.start) !== date) {
    return NextResponse.json({ error: '请选择有效的上课日期' }, { status: 400 })
  }
  if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
    return NextResponse.json({ error: '请填写正确的开始和结束时间' }, { status: 400 })
  }
  const plannedMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) - Number(startTime.slice(0, 2)) * 60 - Number(startTime.slice(3))
  if (plannedMinutes < 15 || plannedMinutes > 240) {
    return NextResponse.json({ error: '单节课时长须在 15 分钟至 4 小时之间' }, { status: 400 })
  }
  const clock = chinaClock(new Date())
  if (date < clock.day || (date === clock.day && startTime <= clock.time)) {
    return NextResponse.json({ error: '只能新增尚未开始的课次；历史课程请走补录流程' }, { status: 400 })
  }
  if (!subject || !teacherId) return NextResponse.json({ error: '请选择科目和任课教师' }, { status: 400 })
  if (note.length < 2 || note.length > 200) return NextResponse.json({ error: '请填写 2–200 字的临时加课原因' }, { status: 400 })

  const { start, end } = dayRange
  const create = () => prisma.$transaction(async (tx) => {
    const group = await tx.classGroup.findFirst({
      where: { id, division: user.division, deletedAt: null, status: { in: ['WAITING', 'ACTIVE'] }, term: { status: 'ACTIVE' }, course: { isActive: true } },
      include: {
        term: { select: { startDate: true, endDate: true } },
        course: { select: { subject: true, name: true } },
        teacherAssignments: { select: { teacherId: true, subject: true } },
        enrollments: {
          where: { status: 'ACTIVE', deletedAt: null, student: { deletedAt: null, status: { not: 'INACTIVE' } } },
          select: { studentId: true, subjects: true, student: { select: { parentId: true, parentUserId: true } } },
        },
      },
    })
    if (!group) throw new LessonPlanError('班级不在当前运营批次，或无权调整', 404)
    if (!group.term || date < localDateKey(group.term.startDate) || date > localDateKey(group.term.endDate)) {
      throw new LessonPlanError('上课日期须在当前运营批次内')
    }
    if (group.intensiveMode === 'INTENSIVE') throw new LessonPlanError('个性化课程请使用教师约课或个性化排课入口')
    const assigned = group.teacherAssignments.some((item) => item.teacherId === teacherId && item.subject === subject)
      || (group.teacherAssignments.length === 0 && group.teacherId === teacherId && group.course.subject === subject)
    if (!assigned) throw new LessonPlanError('该教师未被分配到本班的该学科')

    const studentIds = group.enrollments
      .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, subject))
      .map((enrollment) => enrollment.studentId)
    const studentIdSet = new Set(studentIds)
    const existing = await tx.classLesson.findMany({
      where: { lessonDate: { gte: start, lt: end }, deletedAt: null, status: { notIn: ['CANCELLED', 'POSTPONED'] }, group: { deletedAt: null, term: { status: 'ACTIVE' } } },
      select: {
        id: true, groupId: true, teacherId: true, subject: true, startTime: true, endTime: true,
        group: { select: {
          name: true, roomId: true, teacherId: true,
          enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
        } },
        lessonStudents: { select: { studentId: true } },
      },
    })
    for (const lesson of existing) {
      if (!hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) continue
      const teacherConflict = (lesson.teacherId || lesson.group.teacherId) === teacherId
      const roomConflict = Boolean(group.roomId && lesson.group.roomId === group.roomId)
      const existingStudents = lesson.lessonStudents.length
        ? lesson.lessonStudents.map((row) => row.studentId)
        : lesson.group.enrollments
          .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, lesson.subject))
          .map((enrollment) => enrollment.studentId)
      const studentConflict = existingStudents.some((studentId) => studentIdSet.has(studentId))
      if (lesson.groupId === id || teacherConflict || roomConflict || studentConflict) {
        const reasons = [lesson.groupId === id ? '同班级' : '', teacherConflict ? '教师' : '', roomConflict ? '教室' : '', studentConflict ? '学员' : ''].filter(Boolean).join('、')
        throw new LessonPlanError(`${reasons}时间冲突：${lesson.group.name} ${lesson.startTime}-${lesson.endTime}`, 409)
      }
    }

    const created = await tx.classLesson.create({
      data: {
        groupId: id, division: group.division, teacherId, subject,
        lessonDate: localDateColumnValue(date), startTime, endTime, status: 'SCHEDULED', isManual: true,
        note: note || null,
        plannedMinutes,
      },
    })
    if (studentIds.length) {
      await tx.classLessonStudent.createMany({ data: studentIds.map((studentId) => ({ lessonId: created.id, studentId })) })
    }
    const totalLessons = await tx.classLesson.count({ where: { groupId: id, status: { notIn: ['CANCELLED', 'POSTPONED'] }, deletedAt: null } })
    await tx.classGroup.update({ where: { id }, data: { totalLessons } })
    const parentIds = [...new Set(group.enrollments
      .filter((enrollment) => studentIdSet.has(enrollment.studentId))
      .map((enrollment) => enrollment.student.parentId || enrollment.student.parentUserId)
      .filter((parentId): parentId is string => Boolean(parentId)))]
    if (group.status === 'ACTIVE' && parentIds.length) {
      await tx.notification.createMany({ data: parentIds.map((parentId) => ({
        userId: parentId, type: 'SCHEDULE_CHANGE', title: `${group.name}新增上课`,
        content: `${date} ${startTime}-${endTime} ${subject}，请查看最新课表。`,
        href: '/parent/schedule', relatedType: 'ClassLesson', relatedId: created.id,
      })) })
    }
    await tx.activityLog.create({ data: {
      userId: user.id, action: '临时加课', entityType: 'ClassLesson', entityId: created.id,
      detail: `${group.name} ${date} ${startTime}-${endTime} ${subject}，${studentIds.length}名学员${note ? `；原因：${note}` : ''}`,
      metadata: { groupId: id, studentCount: studentIds.length, note },
    } })
    return { id: created.id, studentCount: studentIds.length, notifiedParents: parentIds.length }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await create()
        revalidatePath('/schedule')
        revalidatePath('/teacher/schedule')
        revalidatePath('/parent/schedule')
        return NextResponse.json(result, { status: 201 })
      }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    throw new LessonPlanError('排课繁忙，请重试', 409)
  } catch (error) {
    if (error instanceof LessonPlanError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: '排课正在变化，请重试' }, { status: 409 })
    }
    throw error
  }
})
