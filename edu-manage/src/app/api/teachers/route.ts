import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

function teacherInitialPassword(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-6)
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type')
  const subject = searchParams.get('subject')
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')

  const where: Record<string, unknown> = { division }
  if (type === 'FULL_TIME' || type === 'PART_TIME') where.employmentType = type
  if (type === 'RESIGNED') where.status = 'RESIGNED'
  if (!type || type === 'FULL_TIME' || type === 'PART_TIME') where.status = { not: 'RESIGNED' }
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
      include: { _count: { select: { schedules: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teacher.count({ where }),
  ])

  const teacherIds = teachers.map((teacher) => teacher.id)
  const groupStudentRows = teacherIds.length
    ? await prisma.classGroup.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          division,
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
      })
    : []

  const studentIdsByTeacher = new Map<string, Set<string>>()
  for (const teacherId of teacherIds) studentIdsByTeacher.set(teacherId, new Set())
  for (const group of groupStudentRows) {
    const assignedTeacherIds = new Set([group.teacherId, ...group.teacherAssignments.map((item) => item.teacherId)])
    for (const teacherId of assignedTeacherIds) {
      const studentIds = studentIdsByTeacher.get(teacherId)
      if (!studentIds) continue
      for (const enrollment of group.enrollments) studentIds.add(enrollment.studentId)
    }
  }

  const teachersWithCounts = teachers.map((teacher) => ({
    ...teacher,
    _count: {
      ...teacher._count,
      students: studentIdsByTeacher.get(teacher.id)?.size ?? 0,
    },
  }))

  return NextResponse.json({ teachers: teachersWithCounts, total, page, limit })
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

    if (!name) return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 })
    if (!subjects) return NextResponse.json({ error: '至少选择一个授课科目' }, { status: 400 })

    const teacherData: Prisma.TeacherCreateInput = {
      name,
      gender: body.gender || null,
      phone,
      email: body.email || null,
      employmentType: body.employmentType || 'FULL_TIME',
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
      return NextResponse.json({ error: '该手机号已有在职教师，请更换手机号或编辑原教师' }, { status: 409 })
    }

    const teacher = existingTeacher
      ? await prisma.teacher.update({
          where: { id: existingTeacher.id },
          data: { ...teacherData, status: 'ACTIVE' },
        })
      : await prisma.teacher.create({ data: teacherData })

    const teacherEmail = `${chineseToPinyin(teacher.name)}@tea.com`
    const initialPwd = teacherInitialPassword(teacher.phone)
    const pwdHash = await bcrypt.hash(initialPwd, 10)

    await prisma.user.upsert({
      where: { email: teacherEmail },
      update: { name: teacher.name },
      create: {
        email: teacherEmail,
        password: pwdHash,
        name: teacher.name,
        role: 'teacher',
        status: 'active',
        division: (teacherData.division as string) || 'JUNIOR',
      },
    })

    const userId = (session.user as { id?: string }).id
    if (userId) {
      try {
        await prisma.activityLog.create({
          data: { userId, action: existingTeacher ? '恢复教师' : '添加教师', detail: teacher.name },
        })
      } catch (logError) {
        console.error('[teachers:create] activity log skipped', logError)
      }
    } else {
      console.error('[teachers:create] session user id missing; skipped activity log')
    }

    revalidatePath('/dashboard')
    revalidatePath('/teachers')

    return NextResponse.json(teacher, { status: existingTeacher ? 200 : 201 })
  } catch (error: unknown) {
    console.error('[teachers:create] failed', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: '手机号已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: '添加教师失败，请查看服务器日志' }, { status: 500 })
  }
}
