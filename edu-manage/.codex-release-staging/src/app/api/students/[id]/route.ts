import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/get-user'
import { resolveTeacherForUser } from '@/lib/performance'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from '@/lib/student-taught-hours'
import type { Prisma } from '@prisma/client'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { parseDateKey } from '@/lib/study-hall/domain'
import { todayLocal } from '@/lib/date/local-day'
import { softDeleteEntity } from '@/lib/data-correction/trash'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      mainTeacher: true,
      parent: { select: { id: true, name: true, email: true, role: true, status: true, wxpusherUid: true } },
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
        },
        include: {
          group: {
            include: {
              course: true,
              // 班级学科集合（该班所有课次的学科去重），供前端按学科勾选/修改
              classLessons: { where: { status: { not: 'CANCELLED' as const } }, select: { subject: true } },
              teacherAssignments: { include: { teacher: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      },
      attendances: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          lesson: {
            include: {
              group: { include: { course: true } },
            },
          },
          enrollment: {
            include: {
              group: { include: { course: true } },
            },
          },
        },
      },
      fees: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ownership check: parents can only see their own children, teachers only their assigned students
  if (!['admin', 'SUPER_ADMIN', 'teacher', 'parent'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.role === 'parent' && student.parentUserId !== user.id && student.parentId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (user.role === 'teacher') {
    const teacher = await resolveTeacherForUser(user, prisma)
    if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isAssigned = student.enrollments.some(
      e => e.group?.teacherId === teacher.id
        || e.group?.teacherAssignments?.some(ta => ta.teacherId === teacher.id)
    )
    if (!isAssigned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const activeEnrollments = student.enrollments.filter((enrollment) => (
    enrollment.status === 'ACTIVE'
    && enrollment.group?.status !== 'ARCHIVED'
    && enrollment.group?.course?.isActive !== false
  ))

  // 报名记录是唯一学科事实来源；未来课次尚未排出时也应显示已报学科。
  // 旧记录的空数组代表全学科，按班级学科集合展示。
  const enrollmentsWithSubjects = activeEnrollments.map((enrollment) => {
    const groupSubjects = [...new Set([
      enrollment.group?.course?.subject,
      ...(enrollment.group?.teacherAssignments || []).map((assignment) => assignment.subject),
      ...(enrollment.group?.classLessons || []).map((lesson) => lesson.subject),
    ].filter((subject): subject is string => Boolean(subject)))]
    return {
      ...enrollment,
      subjects: enrollment.subjects.length ? enrollment.subjects : groupSubjects,
      group: {
        ...enrollment.group,
        subjects: groupSubjects,
      },
    }
  })
  const approvedIntensiveAttendances = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      lesson: {
        intensiveReviewStatus: 'APPROVED',
        group: { intensiveMode: 'INTENSIVE' },
      },
    },
    select: {
      status: true,
      actualMinutes: true,
      lesson: { select: { actualMinutes: true } },
    },
  })
  const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
  const taughtHours = calculateTaughtHours(
    activeEnrollments,
    calculateApprovedIntensiveHours(approvedIntensiveAttendances),
  )
  // 同父母孩子：admin 视角返回该家长账号下所有学员（供「同父母孩子」关联模块使用）
  let family: Array<{
    id: string
    name: string
    grade: string | null
    status: string
    totalHours: number
    remainHours: number
    isCurrent: boolean
    enrollments: Array<{ id: string; group: { name: string | null } | null }>
  }> = []
  if (user.role === 'admin' || user.role === 'SUPER_ADMIN') {
    const parentUserId = student.parentUserId || student.parentId || null
    if (parentUserId) {
      const familyRows = await prisma.student.findMany({
        where: { parentUserId, deletedAt: null },
        select: {
          id: true, name: true, grade: true, status: true, totalHours: true, remainHours: true,
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null },
            select: { id: true, group: { select: { name: true } } },
            take: 3,
          },
        },
        orderBy: [{ createdAt: 'asc' }],
      })
      family = familyRows.map((row) => ({
        ...row,
        totalHours: Number(row.totalHours || 0),
        remainHours: Number(row.remainHours || 0),
        isCurrent: row.id === student.id,
        enrollments: row.enrollments.map((enrollment) => ({
          id: enrollment.id,
          group: enrollment.group ? { name: enrollment.group.name } : null,
        })),
      }))
    }
  }

  const visibleStudent = user.role === 'teacher'
    ? {
        ...student,
        parent: undefined,
        fees: undefined,
        parentName: undefined,
        parentPhone: undefined,
        parentId: undefined,
        parentUserId: undefined,
        phone: undefined,
        email: undefined,
      }
    : student

  return NextResponse.json({
    ...visibleStudent,
    enrollments: enrollmentsWithSubjects,
    remainHours,
    totalHours,
    taughtHours,
    family: user.role === 'admin' || user.role === 'SUPER_ADMIN' ? family : undefined,
  })
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const existingStudent = await prisma.student.findUnique({ where: { id }, select: { id: true, division: true, grade: true } })
  if (!existingStudent) return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  const selectedTerm = await resolveAdminTermScope(prisma, existingStudent.division, req)
  if (!selectedTerm || selectedTerm.status !== 'ACTIVE') return NextResponse.json({ error: '请切换到当前有效运营期后再编辑学员' }, { status: 409 })
  const requestedStudyHallMemberships = (Array.isArray(body.studyHallMemberships) ? body.studyHallMemberships : []).map((raw: unknown) => {
    const item = raw as { classId?: unknown; purchasedDays?: unknown }
    return { classId: typeof item.classId === 'string' ? item.classId : '', purchasedDays: Number(item.purchasedDays) }
  })
  if (requestedStudyHallMemberships.some((item: { classId: string; purchasedDays: number }) => !item.classId || !Number.isInteger(item.purchasedDays) || item.purchasedDays <= 0 || item.purchasedDays > 366)) return NextResponse.json({ error: '作业班或购买天数填写不正确' }, { status: 400 })
  if (new Set(requestedStudyHallMemberships.map((item: { classId: string }) => item.classId)).size !== requestedStudyHallMemberships.length) return NextResponse.json({ error: '不能重复选择同一个作业班' }, { status: 400 })
  const requestedClasses = requestedStudyHallMemberships.length ? await prisma.studyHallClass.findMany({
    where: { id: { in: requestedStudyHallMemberships.map((item: { classId: string }) => item.classId) }, termId: selectedTerm.id, division: existingStudent.division, status: 'ACTIVE' },
    select: { id: true, scheduleType: true, gradeScope: true },
  }) : []
  if (requestedClasses.length !== requestedStudyHallMemberships.length) return NextResponse.json({ error: '所选作业班无效或不属于当前运营期' }, { status: 409 })
  if (new Set(requestedClasses.map((item) => item.scheduleType)).size !== requestedClasses.length) return NextResponse.json({ error: '同一学员在一个运营期最多参加一个晚托班和一个周末班' }, { status: 409 })
  const effectiveGrade = typeof body.grade === 'string' ? body.grade.trim() : existingStudent.grade || ''
  if (effectiveGrade && requestedClasses.some((item) => item.gradeScope.length && !item.gradeScope.includes(effectiveGrade))) return NextResponse.json({ error: '学员年级与所选作业班的适用年级不一致' }, { status: 409 })

  // 字段白名单 + 基础校验，防止 mass-assignment 写入任意字段。
  const data: Prisma.StudentUncheckedUpdateInput = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.gender === 'string') data.gender = body.gender
  if (body.birthYear !== undefined && body.birthYear !== null && body.birthYear !== '') {
    const birthYear = Number(body.birthYear)
    if (!Number.isFinite(birthYear)) return NextResponse.json({ error: '出生年份必须为数字' }, { status: 400 })
    data.birthYear = birthYear
  }
  if (typeof body.grade === 'string') data.grade = body.grade
  if (typeof body.school === 'string') data.school = body.school
  if (typeof body.phone === 'string') data.phone = body.phone
  if (typeof body.email === 'string') data.email = body.email
  if (typeof body.parentName === 'string') data.parentName = body.parentName
  if (typeof body.parentPhone === 'string') data.parentPhone = body.parentPhone
  if (typeof body.source === 'string') data.source = body.source
  if (typeof body.notes === 'string') data.notes = body.notes
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags)
  if (body.mainTeacherId === null || typeof body.mainTeacherId === 'string') data.mainTeacherId = body.mainTeacherId
  if (body.remainHours !== undefined && body.remainHours !== '') {
    const remainHours = Number(body.remainHours)
    if (!Number.isFinite(remainHours)) return NextResponse.json({ error: '剩余课时必须为数字' }, { status: 400 })
    data.remainHours = remainHours
  }
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.membershipLevel === 'string') data.membershipLevel = body.membershipLevel

  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({ where: { id }, data })
    const currentMemberships = await tx.studyHallClassStudent.findMany({ where: { studentId: id, studyClass: { termId: selectedTerm.id } } })
    const requestedIds = requestedStudyHallMemberships.map((item: { classId: string }) => item.classId)
    await tx.studyHallClassStudent.updateMany({ where: { studentId: id, status: 'ACTIVE', studyClass: { termId: selectedTerm.id }, classId: { notIn: requestedIds } }, data: { status: 'LEFT', leftAt: parseDateKey(todayLocal()) } })
    for (const request of requestedStudyHallMemberships as Array<{ classId: string; purchasedDays: number }>) {
      const membership = currentMemberships.find((item) => item.classId === request.classId)
      if (!membership) await tx.studyHallClassStudent.create({ data: { classId: request.classId, studentId: id, purchasedDays: request.purchasedDays, joinedAt: parseDateKey(todayLocal()) } })
      else await tx.studyHallClassStudent.update({ where: { id: membership.id }, data: { status: 'ACTIVE', leftAt: null, purchasedDays: request.purchasedDays } })
    }
    return updated
  })

  revalidatePath('/dashboard')
  revalidatePath('/students')

  return NextResponse.json(student)
})

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '请重新登录后再办理离校' }, { status: 401 })
    const role = (session.user as { role?: string }).role
    if (role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
    const prisma = await getRequestPrisma()

    const { id } = await params

    // Find student with parent link
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, email: true, role: true, status: true } },
      },
    })
    if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

    const userId = (session.user as { id?: string }).id
    if (!userId) return NextResponse.json({ error: '登录信息不完整' }, { status: 401 })
    const deleted = await softDeleteEntity(prisma, 'Student', id, { id: userId, name: session.user.name || undefined }, 'delete_from_student_management')
    revalidatePath('/dashboard')
    revalidatePath('/students')
    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error('[students:delete] failed', error)
    return NextResponse.json({ error: '离校处理失败，请查看服务器日志' }, { status: 500 })
  }
}
