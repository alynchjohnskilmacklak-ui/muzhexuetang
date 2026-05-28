import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function requireSession() {
  const session = await auth()
  if (!session?.user) return null
  return session
}

async function getEffectiveTeacherStudents(teacherId: string) {
  const groups = await prisma.classGroup.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      course: { isActive: true },
      OR: [
        { teacherId },
        { teacherAssignments: { some: { teacherId } } },
      ],
    },
    include: {
      course: true,
      enrollments: {
        where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
        include: { student: true },
        orderBy: { enrolledAt: 'desc' },
      },
      teacherAssignments: {
        include: { teacher: { select: { id: true, name: true, subjects: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const studentMap = new Map<string, unknown>()
  for (const group of groups) {
    for (const enrollment of group.enrollments) {
      studentMap.set(enrollment.studentId, enrollment.student)
    }
  }

  return { groups, students: [...studentMap.values()] }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      schedules: {
        where: { status: { not: 'cancelled' }, course: { isActive: true } },
        include: { course: { select: { id: true, name: true } } },
      },
      studyMaterials: {
        where: { status: { not: 'DELETED' } },
        select: {
          id: true,
          title: true,
          grade: true,
          subject: true,
          audience: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      _count: { select: { schedules: true, courses: true } },
    },
  })

  if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const effective = await getEffectiveTeacherStudents(id)
  return NextResponse.json({
    ...teacher,
    students: effective.students,
    classGroups: effective.groups,
    _count: {
      ...teacher._count,
      students: effective.students.length,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  try {
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        employmentType: body.employmentType,
        status: body.status,
        joinedAt: body.joinedAt ? new Date(body.joinedAt) : undefined,
        contractEnd: body.contractEnd ? new Date(body.contractEnd) : undefined,
        education: body.education,
        university: body.university,
        major: body.major,
        graduationYear: body.graduationYear ? parseInt(body.graduationYear) : undefined,
        currentUnit: body.currentUnit,
        avatar: body.avatar,
        subjects: body.subjects,
        bio: body.bio,
        monthlyHours: body.monthlyHours ? parseInt(body.monthlyHours) : undefined,
      },
    })

    revalidatePath('/teachers')
    return NextResponse.json(teacher)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: '手机号已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const url = new URL(req.url)
  const transferTo = url.searchParams.get('transferTo') || ''

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { _count: { select: { courses: true, schedules: true } } },
  })
  if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const effective = await getEffectiveTeacherStudents(id)
  const userId = (session.user as { id?: string }).id
  const affectedParents = await prisma.student.findMany({
    where: {
      status: { not: 'INACTIVE' },
      OR: [
        { mainTeacherId: id },
        { enrollments: { some: { status: 'ACTIVE', group: { OR: [{ teacherId: id }, { teacherAssignments: { some: { teacherId: id } } }] } } } },
      ],
    },
    select: { parentId: true, parentUserId: true },
  })
  const affectedParentIds = [...new Set(affectedParents
    .flatMap((student) => [student.parentId, student.parentUserId])
    .filter((parentId): parentId is string => Boolean(parentId)))]

  if (transferTo && transferTo !== id) {
    const replacement = await prisma.teacher.findUnique({ where: { id: transferTo } })
    if (!replacement || replacement.status === 'RESIGNED') {
      return NextResponse.json({ error: '接替教师不存在或已离职' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({ where: { id }, data: { status: 'RESIGNED' } })
      await tx.student.updateMany({ where: { mainTeacherId: id }, data: { mainTeacherId: transferTo } })
      await tx.course.updateMany({ where: { teacherId: id }, data: { teacherId: transferTo } })
      await tx.schedule.updateMany({ where: { teacherId: id, status: { not: 'cancelled' } }, data: { teacherId: transferTo } })
      await tx.classGroupTeacher.updateMany({ where: { teacherId: id }, data: { teacherId: transferTo } })
      await tx.classGroup.updateMany({ where: { teacherId: id, status: { not: 'ARCHIVED' } }, data: { teacherId: transferTo } })
      await tx.classLesson.updateMany({ where: { teacherId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, data: { teacherId: transferTo } })
    })

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: '教师离职',
          detail: `${teacher.name} 离职，业务已转交给 ${replacement.name}`,
        },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/teachers')
    revalidatePath('/students')
    revalidatePath('/parent/dashboard')
    revalidatePath('/parent/schedule')
    revalidatePath('/parent/grades')
    revalidatePath('/parent/performance')
    revalidatePath('/parent/teachers')
    return NextResponse.json({
      success: true,
      transferTo: replacement.name,
      impact: { courses: teacher._count.courses, students: effective.students.length, schedules: teacher._count.schedules },
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacher.update({ where: { id }, data: { status: 'RESIGNED' } })
    await tx.student.updateMany({ where: { mainTeacherId: id }, data: { mainTeacherId: null } })
    await tx.course.updateMany({ where: { teacherId: id }, data: { isActive: false } })
    await tx.schedule.updateMany({ where: { teacherId: id, status: { not: 'cancelled' } }, data: { status: 'cancelled' } })
    await tx.classGroupTeacher.deleteMany({ where: { teacherId: id } })
    await tx.classGroup.updateMany({ where: { teacherId: id, status: { not: 'ARCHIVED' } }, data: { status: 'ARCHIVED' } })
    await tx.classLesson.updateMany({ where: { teacherId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, data: { teacherId: null } })
    await tx.performancePost.updateMany({ where: { teacherId: id, deletedAt: null }, data: { deletedAt: new Date(), isReadByParent: true } })
    await tx.examPaper.updateMany({ where: { teacherId: id, status: { not: 'DELETED' } }, data: { status: 'DELETED', isReadByParent: true } })
    await tx.classroomFeedback.updateMany({ where: { teacherId: id, status: { not: 'ARCHIVED' } }, data: { status: 'ARCHIVED', notifySent: true } })
    if (affectedParentIds.length) {
      await tx.notification.deleteMany({
        where: { userId: { in: affectedParentIds }, link: { in: ['/parent/performance', '/parent/grades', '/parent/schedule'] } },
      })
    }
  })

  if (userId) {
    await prisma.activityLog.create({
      data: {
        userId,
        action: '教师离职',
        detail: `${teacher.name}，已释放 ${effective.students.length} 名有效学员、停用 ${teacher._count.courses} 门课程、取消 ${teacher._count.schedules} 条排课`,
      },
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/teachers')
  revalidatePath('/students')
  revalidatePath('/parent/dashboard')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/grades')
  revalidatePath('/parent/performance')
  revalidatePath('/parent/teachers')

  return NextResponse.json({
    success: true,
    impact: { courses: teacher._count.courses, students: effective.students.length, schedules: teacher._count.schedules },
  })
}
