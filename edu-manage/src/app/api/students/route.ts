import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { generateParentCredentials, generateParentCredentialsHashed } from '@/lib/pinyin'
import { apiHandler } from '@/lib/api-handler'
import { divisionWhere, getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

const normalizeCourseTypeFilter = (courseType: string) => {
  if (courseType === 'ONE_ON_TWO' || courseType === 'ONE_ON_THREE') return 'SMALL_GROUP'
  if (courseType === 'GROUP' || courseType === 'ONE_ON_ONE' || courseType === 'SMALL_GROUP') return courseType
  return null
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
        group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
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
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({ where }),
  ])

  const normalized = students.map((student) => {
    const activeEnrollments = student.enrollments.filter((enrollment) => (
      enrollment.status === 'ACTIVE'
      && enrollment.group?.status !== 'ARCHIVED'
      && enrollment.group?.course?.isActive !== false
    ))
    const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
    const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
    return {
      ...student,
      enrollments: activeEnrollments,
      remainHours,
      totalHours,
      courseType: activeEnrollments[0]?.group.course.type || null,
    }
  })

  if (groupByGrade) {
    const grouped: Record<string, typeof normalized> = {}
    const gradeOrder = ['高三', '高二', '高一', '初三', '初二', '初一']
    for (const g of gradeOrder) {
      const gStudents = normalized.filter((student) => student.grade === g)
      if (gStudents.length) grouped[g] = gStudents
    }
    const otherStudents = normalized.filter((student) => !student.grade || !gradeOrder.includes(student.grade))
    if (otherStudents.length) grouped['未设年级'] = otherStudents
    return NextResponse.json(grouped)
  }

  return NextResponse.json({ students: normalized, total, page, limit })
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

    // Auto-create parent account from student name (hashed password)
    let parentUserId: string | null = null
    let parentPlainPassword: string | null = null
    try {
      const creds = await generateParentCredentialsHashed(name)
      parentPlainPassword = creds.plainPassword
      const parentUser = await prisma.user.upsert({
        where: { email: creds.email },
        update: { status: 'active', division },
        create: {
          email: creds.email,
          password: creds.password,
          name: body.parentName || `${name}家长`,
          role: 'parent',
          status: 'active',
          division,
        },
      })
      parentUserId = parentUser.id
    } catch (error) {
      console.error('[students:create] parent account creation failed', error)
    }

    const student = await prisma.student.create({
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
        parentUserId: parentUserId,
        parentId: parentUserId,
        source: body.source || null,
        notes: body.notes || null,
        mainTeacherId: body.mainTeacherId || null,
        division,
        remainHours: body.remainHours ? parseFloat(body.remainHours) : 0,
        tags: JSON.stringify(body.tags || []),
        status: 'TRIAL',
      },
    })

    const userId = (session.user as { id?: string }).id
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: '添加学员',
          detail: `${student.name}${parentUserId ? `，家长账号：${generateParentCredentials(name).email}` : ''}`,
        },
      })
    } else {
      console.error('[students:create] session user id missing; skipped activity log')
    }

    revalidatePath('/dashboard')
    revalidatePath('/students')

    return NextResponse.json({
      ...student,
      parentEmail: parentUserId ? generateParentCredentials(name).email : null,
      parentPlainPassword: parentPlainPassword || null,
    }, { status: 201 })
  } catch (error) {
    console.error('[students:create] failed', error)
    return NextResponse.json({ error: '添加学员失败，请查看服务器日志' }, { status: 500 })
  }
})
