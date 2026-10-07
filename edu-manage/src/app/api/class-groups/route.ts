import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, activeCourseWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

const WEEK_DAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
const INTENSIVE_STUDENT_LIMIT = {
  ONE_ON_ONE: 1,
  ONE_ON_TWO: 2,
  ONE_ON_THREE: 3,
} as const

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

  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade')
  const status = searchParams.get('status')
  const include = searchParams.get('include')
  const division = getRequestDivision(user, searchParams.get('division'))

  const where: Record<string, unknown> = { course: activeCourseWhere, division, deletedAt: null }
  const selectedTerm = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  where.termId = selectedTerm?.id || '__NO_SELECTED_TERM__'
  if (status) {
    where.status = status
  } else {
    Object.assign(where, visibleClassGroupWhere)
  }
  if (grade) {
    where.course = { ...activeCourseWhere, grade }
  }

  // Role-based filtering: teacher sees own groups, parent sees children's
  if (user.role === 'teacher') {
    if (!user.teacherId) return NextResponse.json({ error: '未绑定教师档案' }, { status: 403 })
    where.OR = [
      { teacherId: user.teacherId },
      { teacherAssignments: { some: { teacherId: user.teacherId } } },
    ]
  } else if (user.role === 'parent') {
    where.enrollments = {
      some: {
        student: {
          OR: [
            { parentUserId: user.id },
            { parentId: user.id },
          ],
          status: { not: 'ARCHIVED' },
        },
        status: 'ACTIVE',
      },
    }
  }
  // admin: no extra restriction (can see all in own division)

  const includeAll = {
    term: { select: { id: true, name: true, kind: true, status: true } },
    course: { select: { id: true, name: true, subject: true, type: true, grade: true, color: true, lessonMinutes: true } },
    teacher: { select: { id: true, name: true, phone: true } },
    teacherAssignments: { include: { teacher: { select: { id: true, name: true, phone: true, subjects: true } } }, orderBy: { createdAt: 'asc' as const } },
    room: { select: { id: true, name: true } },
    enrollments: { where: activeEnrollmentWhere, include: { student: { select: { id: true, name: true } } } },
    classLessons: { orderBy: { lessonDate: 'asc' as const } },
    _count: {
      select: {
        enrollments: { where: activeEnrollmentWhere },
        classLessons: { where: { status: { not: 'CANCELLED' as const }, deletedAt: null } },
      },
    },
  }
  const includeSimple = {
    term: { select: { id: true, name: true, kind: true, status: true } },
    course: { select: { id: true, name: true, subject: true, type: true, grade: true, color: true, lessonMinutes: true } },
    teacher: { select: { id: true, name: true } },
    teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } }, orderBy: { createdAt: 'asc' as const } },
    room: { select: { id: true, name: true } },
    _count: {
      select: {
        enrollments: { where: activeEnrollmentWhere },
        classLessons: { where: { status: { not: 'CANCELLED' as const } } },
      },
    },
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


  const prisma = await getRequestPrisma()
  const body = await req.json()
  const division = getRequestDivision(user, body.division)
  const { name, courseId, teacherId, roomId, startDate, maxStudents, recurringDays, lessonStartTime, lessonMinutes, totalLessons, note } = body
  const requestedTermId = typeof body.termId === 'string' && body.termId ? body.termId : null
  const normalizedRecurringDays = normalizeRecurringDays(recurringDays)
  const normalizedAssignments = normalizeTeacherAssignments(body)
  const primaryTeacherId = typeof teacherId === 'string' && teacherId ? teacherId : normalizedAssignments[0]?.teacherId
  const intensiveMode = body.intensiveMode === 'INTENSIVE'
  const teachingType = typeof body.teachingType === 'string'
    && body.teachingType in INTENSIVE_STUDENT_LIMIT
    ? body.teachingType as keyof typeof INTENSIVE_STUDENT_LIMIT
    : null

  if (!name || !courseId || !primaryTeacherId || !startDate) {
    return NextResponse.json({ error: '请填写必填字段：班级名称、课程、教师和开班日期' }, { status: 400 })
  }

  if (intensiveMode && !teachingType) {
    return NextResponse.json({ error: '请选择一对一、一对二或一对三班型' }, { status: 400 })
  }
  if (!intensiveMode && (!lessonStartTime || !normalizedRecurringDays.length)) {
    return NextResponse.json({ error: '普通班课必须设置上课时间和至少一个上课日' }, { status: 400 })
  }

  const term = await prisma.academicTerm.findFirst({
    where: requestedTermId
      ? { id: requestedTermId, division, status: 'ACTIVE' }
      : { division, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: { id: true, status: true },
  })
  if (!term) {
    return NextResponse.json({
      error: requestedTermId
        ? '所属运营期不存在、已归档或不属于当前学部'
        : '请先在“运营批次”进入一个当前工作区，再创建班级',
    }, { status: 400 })
  }
  const termId = term.id

  const group = await prisma.$transaction(async (tx) => {
    const g = await tx.classGroup.create({
      data: {
        name, courseId, teacherId: primaryTeacherId, roomId: roomId || null, termId,
        maxStudents: intensiveMode && teachingType
          ? INTENSIVE_STUDENT_LIMIT[teachingType]
          : maxStudents || 20,
        startDate: new Date(startDate),
        // 个性化课程按实际约课、考勤和审核累计，不使用普通班的固定计划课次。
        totalLessons: intensiveMode ? 0 : totalLessons || 1,
        recurringDays: intensiveMode ? [] : normalizedRecurringDays,
        lessonStartTime: intensiveMode ? (lessonStartTime || '18:00') : lessonStartTime,
        lessonMinutes: lessonMinutes || (intensiveMode ? 60 : 90),
        division,
        note,
        status: intensiveMode ? 'ACTIVE' : 'WAITING',
        intensiveMode: intensiveMode ? 'INTENSIVE' : 'NORMAL',
        teachingType: intensiveMode ? teachingType : null,
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
      data: {
        userId: user.id,
        action: intensiveMode ? '新建突击全能班' : '新建班级',
        detail: intensiveMode && teachingType ? `${name} · ${teachingType}` : name,
      },
    })

    return g
  })

  return NextResponse.json(group, { status: 201 })
})
