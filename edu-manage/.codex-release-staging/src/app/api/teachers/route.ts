import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { generateTemporaryPassword } from '@/lib/temporary-password'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const subject = searchParams.get('subject')
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const selectedTerm = (session.user as { role?: string }).role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)

  const where: Record<string, unknown> = { division }
  if (type === 'FULL_TIME' || type === 'PART_TIME') where.employmentType = type
  if (type === 'RESIGNED' || status === 'RESIGNED') where.status = 'RESIGNED'
  else if (status === 'ACTIVE') where.status = 'ACTIVE'
  else where.status = { not: 'RESIGNED' }
  if (subject) where.subjects = { contains: subject }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { subjects: { contains: q } },
    ]
  }

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teacher.count({ where }),
  ])

  const teacherIds = teachers.map((teacher) => teacher.id)
  const [groupStudentRows, scopedLessonRows] = teacherIds.length
    ? await Promise.all([
      prisma.classGroup.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          division,
          termId: selectedTerm?.id || '__NO_SELECTED_TERM__',
          course: { isActive: true },
          OR: [
            { teacherId: { in: teacherIds } },
            { teacherAssignments: { some: { teacherId: { in: teacherIds } } } },
          ],
        },
        select: {
          teacherId: true,
          teacherAssignments: { where: { teacherId: { in: teacherIds } }, select: { teacherId: true } },
          enrollments: {
            where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
            select: { studentId: true },
          },
        },
      }),
      prisma.classLesson.findMany({
        where: {
          division,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          group: {
            termId: selectedTerm?.id || '__NO_SELECTED_TERM__',
            status: { not: 'ARCHIVED' },
            OR: [
              { teacherId: { in: teacherIds } },
              { teacherAssignments: { some: { teacherId: { in: teacherIds } } } },
            ],
          },
        },
        select: {
          id: true,
          teacherId: true,
          group: {
            select: {
              teacherId: true,
              teacherAssignments: { where: { teacherId: { in: teacherIds } }, select: { teacherId: true } },
            },
          },
        },
      }),
    ])
    : [[], []]

  const studentIdsByTeacher = new Map<string, Set<string>>()
  const lessonIdsByTeacher = new Map<string, Set<string>>()
  for (const teacherId of teacherIds) studentIdsByTeacher.set(teacherId, new Set())
  for (const teacherId of teacherIds) lessonIdsByTeacher.set(teacherId, new Set())
  for (const group of groupStudentRows) {
    const assignedTeacherIds = new Set([group.teacherId, ...group.teacherAssignments.map((item) => item.teacherId)])
    for (const teacherId of assignedTeacherIds) {
      const studentIds = studentIdsByTeacher.get(teacherId)
      if (!studentIds) continue
      for (const enrollment of group.enrollments) studentIds.add(enrollment.studentId)
    }
  }
  for (const lesson of scopedLessonRows) {
    const assignedTeacherIds = lesson.teacherId
      ? [lesson.teacherId]
      : [lesson.group.teacherId, ...lesson.group.teacherAssignments.map((item) => item.teacherId)]
    for (const teacherId of assignedTeacherIds) lessonIdsByTeacher.get(teacherId)?.add(lesson.id)
  }

  const teachersWithCounts = teachers.map((teacher) => ({
    ...teacher,
    _count: {
      students: studentIdsByTeacher.get(teacher.id)?.size ?? 0,
      schedules: lessonIdsByTeacher.get(teacher.id)?.size ?? 0,
    },
  }))

  return NextResponse.json({
    teachers: teachersWithCounts,
    total,
    page,
    limit,
    term: selectedTerm,
  })
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      console.error('[teachers:create] unauthorized request')
      return NextResponse.json({ error: '请重新登录后再添加教师' }, { status: 401 })
    }
    if ((session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    const prisma = await getRequestPrisma()

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const subjects = typeof body.subjects === 'string' ? body.subjects.trim() : ''

    if (!name) return NextResponse.json({ error: '姓名不能为空', field: 'name' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: '手机号不能为空', field: 'phone' }, { status: 400 })
    if (!subjects) return NextResponse.json({ error: '至少选择一个授课科目', field: 'subjects' }, { status: 400 })
    if (typeof body.bio === 'string' && body.bio.length > 500) {
      return NextResponse.json({ error: '个人介绍最多填写500字', field: 'bio' }, { status: 400 })
    }

    const teacherData: Prisma.TeacherCreateInput = {
      name,
      gender: body.gender || null,
      phone,
      email: body.email || null,
      employmentType: body.employmentType || 'FULL_TIME',
      tierLevel: body.tierLevel || 'NEW',
      joinedAt: body.joinedAt ? new Date(body.joinedAt) : new Date(),
      contractEnd: body.contractEnd ? new Date(body.contractEnd) : null,
      education: body.education || null,
      university: body.university || null,
      major: body.major || null,
      graduationYear: body.graduationYear ? parseInt(body.graduationYear) : null,
      currentUnit: body.currentUnit || null,
      avatar: body.avatar || null,
      subjects,
      bio: body.bio || null,
      monthlyHours: body.monthlyHours ? parseInt(body.monthlyHours) : 0,
      division: getRequestDivision(session.user as Record<string, unknown> | undefined, body.division),
    }

    const existingTeacher = await prisma.teacher.findUnique({ where: { phone } })
    if (existingTeacher && existingTeacher.status !== 'RESIGNED') {
      return NextResponse.json({
        error: `手机号 ${phone} 已绑定在职教师“${existingTeacher.name}”，请修改手机号或编辑已有教师档案`,
        field: 'phone',
        code: 'TEACHER_PHONE_EXISTS',
      }, { status: 409 })
    }

    const userId = (session.user as { id?: string }).id
    if (!userId) return NextResponse.json({ error: '登录状态无效，请重新登录' }, { status: 401 })

    const initialPassword = generateTemporaryPassword()
    const result = await prisma.$transaction(async (tx) => {
      const teacher = existingTeacher
        ? await tx.teacher.update({
            where: { id: existingTeacher.id },
            data: { ...teacherData, status: 'ACTIVE' },
          })
        : await tx.teacher.create({ data: teacherData })

      const teacherEmail = `${chineseToPinyin(teacher.name)}@tea.com`
      const existingAccount = await tx.user.findUnique({ where: { email: teacherEmail } })
      const account = existingAccount
        ? await tx.user.update({
            where: { id: existingAccount.id },
            data: {
              name: teacher.name,
              role: 'teacher',
              status: 'active',
              division: (teacherData.division as string) || 'JUNIOR',
              teacherId: teacher.id,
            },
          })
        : await tx.user.create({
            data: {
              email: teacherEmail,
              password: await bcrypt.hash(initialPassword, 12),
              name: teacher.name,
              role: 'teacher',
              status: 'active',
              division: (teacherData.division as string) || 'JUNIOR',
              teacherId: teacher.id,
            },
          })

      await tx.activityLog.create({
        data: {
          userId,
          teacherId: teacher.id,
          action: existingTeacher ? '恢复教师' : '添加教师',
          detail: teacher.name,
          entityType: 'Teacher',
          entityId: teacher.id,
        },
      })
      if (!existingAccount) {
        await tx.activityLog.create({
          data: {
            userId,
            teacherId: teacher.id,
            action: 'PASSWORD_INITIALIZED',
            detail: `创建教师登录账号：${teacher.name}（${teacherEmail}）`,
            entityType: 'User',
            entityId: account.id,
            metadata: { source: 'TEACHER_CREATE' },
          },
        })
      }
      return { teacher, teacherEmail, issuedPassword: existingAccount ? null : initialPassword }
    })

    revalidatePath('/dashboard')
    revalidatePath('/teachers')

    return NextResponse.json({
      ...result.teacher,
      loginEmail: result.teacherEmail,
      initialPassword: result.issuedPassword,
    }, { status: existingTeacher ? 200 : 201 })
  } catch (error: unknown) {
    console.error('[teachers:create] failed', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({
        error: '教师手机号或账号已经存在，请检查后重试',
        field: 'phone',
        code: 'TEACHER_UNIQUE_CONFLICT',
      }, { status: 409 })
    }
    return NextResponse.json({ error: '添加教师失败，请稍后重试' }, { status: 500 })
  }
}
