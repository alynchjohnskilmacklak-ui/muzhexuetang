import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, activeCourseWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const WEEK_DAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])

function normalizeRecurringDays(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((day): day is string => typeof day === 'string' && WEEK_DAYS.has(day))
}

function normalizeTeacherAssignments(body: Record<string, unknown>) {
  if (Array.isArray(body.teacherAssignments)) {
    const seen = new Set<string>()
    return body.teacherAssignments
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const entry = item as Record<string, unknown>
        const teacherId = typeof entry.teacherId === 'string' ? entry.teacherId : ''
        const subject = typeof entry.subject === 'string' ? entry.subject.trim() : ''
        if (!teacherId || seen.has(`${teacherId}:${subject}`)) return null
        seen.add(`${teacherId}:${subject}`)
        return { teacherId, subject: subject || null }
      })
      .filter((item): item is { teacherId: string; subject: string | null } => Boolean(item))
  }

  const teacherIds = Array.isArray(body.teacherIds)
    ? [...new Set(body.teacherIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
  const teacherId = typeof body.teacherId === 'string' && body.teacherId ? body.teacherId : teacherIds[0]
  return (teacherIds.length ? teacherIds : teacherId ? [teacherId] : []).map((id) => ({
    teacherId: id,
    subject: typeof body.subject === 'string' ? body.subject : null,
  }))
}

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade')
  const status = searchParams.get('status')
  const include = searchParams.get('include')

  const where: Record<string, unknown> = { course: activeCourseWhere }
  if (status) {
    where.status = status
  } else {
    Object.assign(where, visibleClassGroupWhere)
  }
  if (grade) {
    where.course = { ...activeCourseWhere, grade }
  }

  const includeAll = {
    course: { select: { id: true, name: true, subject: true, type: true, grade: true, color: true, lessonMinutes: true } },
    teacher: { select: { id: true, name: true, phone: true } },
    teacherAssignments: { include: { teacher: { select: { id: true, name: true, phone: true, subjects: true } } }, orderBy: { createdAt: 'asc' as const } },
    room: { select: { id: true, name: true } },
    enrollments: { where: activeEnrollmentWhere, include: { student: { select: { id: true, name: true } } } },
    classLessons: { orderBy: { lessonDate: 'asc' as const } },
    _count: { select: { enrollments: { where: activeEnrollmentWhere }, classLessons: true } },
  }
  const includeSimple = {
    course: { select: { id: true, name: true, subject: true, type: true, grade: true, color: true, lessonMinutes: true } },
    teacher: { select: { id: true, name: true } },
    teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } }, orderBy: { createdAt: 'asc' as const } },
    room: { select: { id: true, name: true } },
    _count: { select: { enrollments: { where: activeEnrollmentWhere }, classLessons: true } },
  }

  const groups = await prisma.classGroup.findMany({
    where,
    orderBy: { createdAt: 'desc' as const },
    include: include === 'all' ? includeAll : includeSimple,
  })

  return NextResponse.json(groups)
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { name, courseId, teacherId, teacherIds, roomId, startDate, maxStudents, recurringDays, lessonStartTime, lessonMinutes, totalLessons, note } = body
  const normalizedRecurringDays = normalizeRecurringDays(recurringDays)
  const normalizedAssignments = normalizeTeacherAssignments(body)
  const primaryTeacherId = typeof teacherId === 'string' && teacherId ? teacherId : normalizedAssignments[0]?.teacherId

  if (!name || !courseId || !primaryTeacherId || !startDate || !lessonStartTime) {
    return NextResponse.json({ error: '请填写必填字段：班级名称、课程、教师、开班日期、上课时间' }, { status: 400 })
  }

  if (!normalizedRecurringDays.length) {
    return NextResponse.json({ error: '璇烽€夋嫨鑷冲皯涓€涓笂璇炬棩' }, { status: 400 })
  }

  const group = await prisma.$transaction(async (tx) => {
    const g = await tx.classGroup.create({
      data: {
        name, courseId, teacherId: primaryTeacherId, roomId: roomId || null,
        maxStudents: maxStudents || 20,
        startDate: new Date(startDate),
        totalLessons: totalLessons || 1,
        recurringDays: normalizedRecurringDays,
        lessonStartTime,
        lessonMinutes: lessonMinutes || 90,
        note, status: 'WAITING',
      },
    })

    await tx.classGroupTeacher.createMany({
      data: normalizedAssignments.map((item, index) => ({
        groupId: g.id,
        teacherId: item.teacherId,
        subject: item.subject,
        role: index === 0 ? 'PRIMARY' : 'SUBJECT',
      })),
      skipDuplicates: true,
    })

    await tx.activityLog.create({
      data: { userId: user.id, action: '新建班级', detail: name },
    })

    return g
  })

  return NextResponse.json(group, { status: 201 })
})
