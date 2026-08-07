import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { chineseToPinyin, generateParentCredentialsHashed } from '@/lib/pinyin'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from '@/lib/student-taught-hours'

export const dynamic = 'force-dynamic'

const normalizeCourseTypeFilter = (courseType: string) => {
  if (courseType === 'ONE_ON_TWO' || courseType === 'ONE_ON_THREE') return 'SMALL_GROUP'
  if (courseType === 'GROUP' || courseType === 'ONE_ON_ONE' || courseType === 'SMALL_GROUP') return courseType
  return null
}

const STUDENT_SORTS = ['createdAt', 'nameAsc', 'nameDesc', 'remainHoursAsc', 'remainHoursDesc'] as const
type StudentSortBy = (typeof STUDENT_SORTS)[number]

function compareStudents(a: { id: string; name: string; createdAt: Date; remainHours: number }, b: { id: string; name: string; createdAt: Date; remainHours: number }, sortBy: StudentSortBy) {
  if (sortBy === 'nameAsc' || sortBy === 'nameDesc') {
    const direction = sortBy === 'nameAsc' ? 1 : -1
    const byPinyin = chineseToPinyin(a.name).localeCompare(chineseToPinyin(b.name), 'en')
    if (byPinyin) return byPinyin * direction
    const byName = a.name.localeCompare(b.name, 'zh-CN')
    if (byName) return byName * direction
  }
  if (sortBy === 'remainHoursAsc' || sortBy === 'remainHoursDesc') {
    const direction = sortBy === 'remainHoursAsc' ? 1 : -1
    const byHours = (a.remainHours - b.remainHours) * direction
    if (byHours) return byHours
  }
  const byCreatedAt = b.createdAt.getTime() - a.createdAt.getTime()
  return byCreatedAt || a.id.localeCompare(b.id)
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const role = (session.user as { role?: string }).role
  if (role === 'teacher') return NextResponse.json({ error: '请使用教师端查看学员' }, { status: 403 })
  if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const grade = searchParams.get('grade')
  const courseType = searchParams.get('courseType')
  const groupByGrade = searchParams.get('groupByGrade') === 'true'
  const lowHours = searchParams.get('lowHours') === '1'
  const q = searchParams.get('q') || ''
  const requestedSort = searchParams.get('sortBy')
  const sortBy: StudentSortBy = STUDENT_SORTS.includes(requestedSort as StudentSortBy) ? requestedSort as StudentSortBy : 'createdAt'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { division }
  if (status) {
    where.status = status.toUpperCase()
  } else {
    where.status = { not: 'INACTIVE' }
  }
  if (grade && grade !== 'all') where.grade = grade
  if (lowHours) where.status = 'ACTIVE'
  if (courseType && courseType !== 'all') {
    const normalizedCourseType = normalizeCourseTypeFilter(courseType)
    if (!normalizedCourseType) {
      return NextResponse.json({ error: '无效课程类型' }, { status: 400 })
    }
    where.enrollments = {
      some: {
        status: 'ACTIVE',
        group: {
          status: { not: 'ARCHIVED' },
          course: {
            isActive: true,
            type: normalizedCourseType,
          },
        },
      },
    }
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { parentName: { contains: q } },
      { parentPhone: { contains: q } },
    ]
  }

  if (lowHours) {
    const lowHourRows = await prisma.enrollment.groupBy({
      by: ['studentId'],
      where: {
        status: 'ACTIVE',
        student: { status: 'ACTIVE', division },
        group: {
          intensiveMode: { not: 'INTENSIVE' },
          status: { not: 'ARCHIVED' },
          course: { isActive: true },
        },
      },
      _sum: { remainHours: true },
      having: { remainHours: { _sum: { lte: 3 } } },
    })
    const lowHourStudentIds = lowHourRows.map((row) => row.studentId)
    if (!lowHourStudentIds.length) {
      return NextResponse.json({ students: [], total: 0, page, limit })
    }
    where.id = { in: lowHourStudentIds }
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        mainTeacher: { select: { id: true, name: true } },
        schedules: { include: { schedule: { include: { course: { select: { id: true, name: true } } } } } },
        enrollments: {
          where: {
            status: 'ACTIVE',
            group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
          },
          include: { group: { include: { course: { select: { id: true, name: true, type: true, isActive: true } } } } },
          orderBy: { enrolledAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({ where }),
  ])
  const approvedIntensiveAttendances = students.length
    ? await prisma.attendance.findMany({
        where: {
          studentId: { in: students.map((student) => student.id) },
          lesson: {
            intensiveReviewStatus: 'APPROVED',
            group: {
              intensiveMode: 'INTENSIVE',
              status: { not: 'ARCHIVED' },
              course: { isActive: true },
            },
          },
        },
        select: {
          studentId: true,
          status: true,
          actualMinutes: true,
          lesson: { select: { actualMinutes: true } },
        },
      })
    : []
  const approvedIntensiveByStudent = new Map<string, typeof approvedIntensiveAttendances>()
  for (const attendance of approvedIntensiveAttendances) {
    const current = approvedIntensiveByStudent.get(attendance.studentId) || []
    current.push(attendance)
    approvedIntensiveByStudent.set(attendance.studentId, current)
  }

  const normalized = students.map((student) => {
    const activeEnrollments = student.enrollments.filter((enrollment) => (
      enrollment.status === 'ACTIVE'
      && enrollment.group?.status !== 'ARCHIVED'
      && enrollment.group?.course?.isActive !== false
    ))
    const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
    const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
    const taughtHours = calculateTaughtHours(
      activeEnrollments,
      calculateApprovedIntensiveHours(approvedIntensiveByStudent.get(student.id) || []),
    )
    return {
      ...student,
      enrollments: activeEnrollments,
      remainHours,
      totalHours,
      taughtHours,
      courseType: activeEnrollments[0]?.group.course.type || null,
    }
  })
  const sorted = [...normalized].sort((a, b) => compareStudents(a, b, sortBy))

  if (groupByGrade) {
    const grouped: Record<string, typeof sorted> = {}
    const gradeOrder = ['高三', '高二', '高一', '初三', '初二', '初一']
    for (const g of gradeOrder) {
      const gStudents = sorted.filter((student) => student.grade === g)
      if (gStudents.length) grouped[g] = gStudents
    }
    const otherStudents = sorted.filter((student) => !student.grade || !gradeOrder.includes(student.grade))
    if (otherStudents.length) grouped['未设年级'] = otherStudents
    return NextResponse.json(grouped)
  }

  return NextResponse.json({ students: sorted.slice(skip, skip + limit), total, page, limit })
})

export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const session = await auth()
    if (!session?.user) {
      console.error('[students:create] unauthorized request')
      return NextResponse.json({ error: '请重新登录后再添加学员' }, { status: 401 })
    }
    const role = (session.user as { role?: string }).role
    if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
    const prisma = await getRequestPrisma()
    const body = await req.json()
    const division = getRequestDivision(session.user as Record<string, unknown> | undefined, body.division)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })

    const userId = (session.user as { id?: string }).id
    if (!userId) return NextResponse.json({ error: '登录状态异常，请重新登录' }, { status: 401 })

    const creds = await generateParentCredentialsHashed(name)
    const creation = await prisma.$transaction(async (tx) => {
      const existingParent = await tx.user.findUnique({ where: { email: creds.email } })
      const parentUser = existingParent
        ? await tx.user.update({
            where: { id: existingParent.id },
            data: { status: 'active', division },
          })
        : await tx.user.create({
            data: {
              email: creds.email,
              password: creds.password,
              name: body.parentName || `${name}家长`,
              role: 'parent',
              status: 'active',
              division,
            },
          })

      const student = await tx.student.create({
        data: {
          name,
          gender: body.gender || null,
          birthYear: body.birthYear ? parseInt(body.birthYear) : null,
          grade: body.grade || null,
          school: body.school || null,
          phone: body.phone || null,
          email: body.email || null,
          parentName: body.parentName || null,
          parentPhone: body.parentPhone || null,
          parentUserId: parentUser.id,
          parentId: parentUser.id,
          source: body.source || null,
          notes: body.notes || null,
          mainTeacherId: body.mainTeacherId || null,
          division,
          remainHours: body.remainHours ? parseFloat(body.remainHours) : 0,
          tags: JSON.stringify(body.tags || []),
          status: 'TRIAL',
          membershipLevel: body.membershipLevel || 'NORMAL',
        },
      })

      await tx.activityLog.create({
        data: {
          userId,
          action: '添加学员',
          detail: `${student.name}，家长账号：${creds.email}`,
          entityType: 'Student',
          entityId: student.id,
        },
      })
      if (!existingParent) {
        await tx.activityLog.create({
          data: {
            userId,
            action: 'PASSWORD_INITIALIZED',
            detail: `添加学员时创建家长账号：${parentUser.name}（${parentUser.email}）`,
            entityType: 'User',
            entityId: parentUser.id,
            metadata: { source: body.source === '批量导入' ? 'BULK_IMPORT' : 'STUDENT_CREATION' },
          },
        })
      }
      return { student, parentUser, parentCreated: !existingParent }
    })

    revalidatePath('/dashboard')
    revalidatePath('/students')

    return NextResponse.json({
      ...creation.student,
      parentEmail: creation.parentUser.email,
      parentPlainPassword: creation.parentCreated ? creds.plainPassword : null,
    }, { status: 201 })
  } catch (error) {
    console.error('[students:create] failed', error)
    return NextResponse.json({ error: '添加学员失败，请查看服务器日志' }, { status: 500 })
  }
})
