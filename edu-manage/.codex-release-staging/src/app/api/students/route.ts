import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { chineseToPinyin, generateParentCredentialsHashed } from '@/lib/pinyin'
import { canReuseStudentRecord, parentIdsForPhone } from '@/lib/parent-binding'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from '@/lib/student-taught-hours'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { calculatePurchasedDayBalance, dateKey } from '@/lib/study-hall/domain'

export const dynamic = 'force-dynamic'

const normalizeCourseTypeFilter = (courseType: string) => {
  if (courseType === 'STUDY_HALL') return 'STUDY_HALL'
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
  const requestedTermId = searchParams.get('termId')?.trim() || null
  const requestedSort = searchParams.get('sortBy')
  const sortBy: StudentSortBy = STUDENT_SORTS.includes(requestedSort as StudentSortBy) ? requestedSort as StudentSortBy : 'createdAt'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { division, deletedAt: null }
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  if (requestedTermId && !selectedTerm) {
    return NextResponse.json({ error: '运营批次不存在或不属于当前学部' }, { status: 404 })
  }
  if (!selectedTerm) {
    return NextResponse.json(groupByGrade ? {} : { students: [], total: 0, page, limit, contextState: 'NO_SELECTED_TERM' })
  }
  where.termMemberships = { some: { termId: selectedTerm.id } }
  if (status) {
    where.status = status.toUpperCase()
  } else if (selectedTerm.status !== 'ARCHIVED') {
    where.status = { not: 'INACTIVE' }
  }
  if (grade && grade !== 'all') where.grade = grade
  if (lowHours) where.status = 'ACTIVE'
  if (courseType && courseType !== 'all') {
    const normalizedCourseType = normalizeCourseTypeFilter(courseType)
    if (!normalizedCourseType) {
      return NextResponse.json({ error: '无效课程类型' }, { status: 400 })
    }
    if (normalizedCourseType === 'STUDY_HALL') where.studyHallClasses = {
      some: { status: 'ACTIVE', studyClass: { termId: selectedTerm.id, status: 'ACTIVE' } },
    }
    else where.enrollments = {
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
        enrollments: {
          where: {
            status: 'ACTIVE',
            group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
          },
          include: { group: { include: { course: { select: { id: true, name: true, type: true, isActive: true } } } } },
          orderBy: { enrolledAt: 'desc' },
        },
        fees: {
          where: { status: 'pending', deletedAt: null },
          select: { id: true, status: true, dueDate: true, amount: true },
          orderBy: { dueDate: 'asc' },
        },
        studyHallClasses: {
          where: { status: 'ACTIVE', studyClass: { termId: selectedTerm.id, status: 'ACTIVE' } },
          include: { studyClass: { select: { id: true, name: true, scheduleType: true, gradeScope: true } } },
          orderBy: { joinedAt: 'desc' },
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
  const studyHallAttendanceRows = students.length
    ? await prisma.studyHallHomeworkEntry.findMany({
        where: {
          studentId: { in: students.map((student) => student.id) },
          OR: [{ checkedIn: true }, { attendanceStatus: { in: ['PERSONAL_LEAVE', 'ABSENT'] } }],
          classRecord: { studyClass: { termId: selectedTerm.id } },
        },
        select: { studentId: true, classRecord: { select: { classId: true, studyDate: true } } },
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
    const studyHallMemberships = student.studyHallClasses.map((membership) => {
      const dates = studyHallAttendanceRows
        .filter((row) => row.studentId === student.id && row.classRecord.classId === membership.classId)
        .map((row) => dateKey(row.classRecord.studyDate))
      return { ...membership, ...calculatePurchasedDayBalance(membership.purchasedDays, membership.adjustedDays, dates) }
    })
    return {
      ...student,
      enrollments: activeEnrollments,
      remainHours,
      totalHours,
      taughtHours,
      studyHallMemberships,
      courseType: activeEnrollments[0]?.group.course.type || (studyHallMemberships.length ? 'STUDY_HALL' : null),
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

    const selectedTerm = await resolveAdminTermScope(prisma, division, req)
    if (!selectedTerm) {
      return NextResponse.json({ error: '请先在“运营批次”中创建并进入一个批次，再添加学员' }, { status: 400 })
    }
    if (selectedTerm.status !== 'ACTIVE') {
      return NextResponse.json({ error: '历史归档批次仅供查看，请先切换到当前运营批次' }, { status: 409 })
    }

    const requestedStudyHallMemberships = (Array.isArray(body.studyHallMemberships) ? body.studyHallMemberships : []).map((raw: unknown) => {
      const item = raw as { classId?: unknown; purchasedDays?: unknown }
      return { classId: typeof item.classId === 'string' ? item.classId : '', purchasedDays: Number(item.purchasedDays) }
    })
    if (requestedStudyHallMemberships.some((item: { classId: string; purchasedDays: number }) => !item.classId || !Number.isInteger(item.purchasedDays) || item.purchasedDays <= 0 || item.purchasedDays > 366)) {
      return NextResponse.json({ error: '作业班或购买天数填写不正确' }, { status: 400 })
    }
    if (new Set(requestedStudyHallMemberships.map((item: { classId: string }) => item.classId)).size !== requestedStudyHallMemberships.length) {
      return NextResponse.json({ error: '不能重复选择同一个作业班' }, { status: 400 })
    }
    const requestedClasses = requestedStudyHallMemberships.length ? await prisma.studyHallClass.findMany({
      where: { id: { in: requestedStudyHallMemberships.map((item: { classId: string }) => item.classId) }, termId: selectedTerm.id, division, status: 'ACTIVE' },
      select: { id: true, scheduleType: true, gradeScope: true },
    }) : []
    if (requestedClasses.length !== requestedStudyHallMemberships.length) return NextResponse.json({ error: '所选作业班无效或不属于当前运营期' }, { status: 409 })
    if (new Set(requestedClasses.map((item) => item.scheduleType)).size !== requestedClasses.length) return NextResponse.json({ error: '同一学员在一个运营期最多参加一个晚托班和一个周末班' }, { status: 409 })
    const studentGrade = typeof body.grade === 'string' ? body.grade.trim() : ''
    if (studentGrade && requestedClasses.some((item) => item.gradeScope.length && !item.gradeScope.includes(studentGrade))) return NextResponse.json({ error: '学员年级与所选作业班的适用年级不一致' }, { status: 409 })

    const requestedParentId = typeof body.existingParentUserId === 'string' ? body.existingParentUserId.trim() : ''
    const parentPhone = typeof body.parentPhone === 'string' ? body.parentPhone.trim() : ''
    let parentUserId = requestedParentId
    if (!parentUserId && parentPhone) {
      const samePhoneStudents = await prisma.student.findMany({
        where: { parentPhone, deletedAt: null, OR: [{ parentUserId: { not: null } }, { parentId: { not: null } }] },
        select: { parentUserId: true, parentId: true },
      })
      const matchingIds = parentIdsForPhone(samePhoneStudents)
      if (matchingIds.length > 1) return NextResponse.json({ error: '该家长手机号关联多个账号，请在“绑定已有家长账号”中选择正确账号' }, { status: 409 })
      parentUserId = matchingIds[0] || ''
    }
    const selectedParent = parentUserId ? await prisma.user.findFirst({
      where: { id: parentUserId, role: 'parent', status: { not: 'deleted' } },
      select: { id: true, email: true },
    }) : null
    if (parentUserId && !selectedParent) return NextResponse.json({ error: '家长账号不存在或不可用，请重新选择' }, { status: 409 })

    const reuseExistingStudentId = typeof body.reuseExistingStudentId === 'string' ? body.reuseExistingStudentId.trim() : ''
    const previousStudent = reuseExistingStudentId ? await prisma.student.findFirst({
      where: {
        id: reuseExistingStudentId,
        division,
        deletedAt: null,
        OR: [{ parentId: parentUserId }, { parentUserId }],
      },
      select: { id: true, name: true, birthYear: true, termMemberships: { where: { termId: selectedTerm.id }, select: { id: true } } },
    }) : null
    if (reuseExistingStudentId && (!parentUserId || !previousStudent)) return NextResponse.json({ error: '原学员档案不属于选定的家长账号' }, { status: 409 })
    if (previousStudent && !canReuseStudentRecord(previousStudent, { name, birthYear: body.birthYear ? Number(body.birthYear) : null })) {
      return NextResponse.json({ error: '原档案姓名或出生年份与当前填写内容不一致，请核对后再复用' }, { status: 409 })
    }
    if (previousStudent?.termMemberships.length) return NextResponse.json({ error: '该学员已在当前运营批次中，无需再次建档' }, { status: 409 })

    const creds = selectedParent ? null : await generateParentCredentialsHashed(name)
    if (creds && await prisma.user.findUnique({ where: { email: creds.email }, select: { id: true } })) {
      return NextResponse.json({ error: '系统发现同名学员关联的家长账号，请先在“绑定已有家长账号”中确认归属，避免把不同家庭误绑到一起' }, { status: 409 })
    }
    const creation = await prisma.$transaction(async (tx) => {
      const parentUser = selectedParent
        ? await tx.user.update({ where: { id: selectedParent.id }, data: { status: 'active' } })
        : await tx.user.create({
            data: {
              email: creds!.email,
              password: creds!.password,
              name: body.parentName || `${name}家长`,
              role: 'parent',
              status: 'active',
              division,
            },
          })

      const studentData = {
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
          status: requestedStudyHallMemberships.length ? 'ACTIVE' : 'TRIAL',
          membershipLevel: body.membershipLevel || 'NORMAL',
      }
      const student = previousStudent
        ? await tx.student.update({
            where: { id: previousStudent.id },
            data: {
              parentId: parentUser.id,
              parentUserId: parentUser.id,
              grade: body.grade || undefined,
              school: body.school || undefined,
              parentName: body.parentName || undefined,
              parentPhone: parentPhone || undefined,
              status: requestedStudyHallMemberships.length ? 'ACTIVE' : undefined,
            },
          })
        : await tx.student.create({ data: studentData })

      await tx.studentTermMembership.create({
        data: {
          termId: selectedTerm.id,
          studentId: student.id,
          grade: student.grade,
        },
      })

      if (requestedStudyHallMemberships.length) await tx.studyHallClassStudent.createMany({
        data: requestedStudyHallMemberships.map((item: { classId: string; purchasedDays: number }) => ({ classId: item.classId, studentId: student.id, purchasedDays: item.purchasedDays })),
      })

      await tx.activityLog.create({
        data: {
          userId,
          action: previousStudent ? '沿用学员档案加入运营批次' : '添加学员',
          detail: `${student.name}，家长账号：${parentUser.email}`,
          entityType: 'Student',
          entityId: student.id,
        },
      })
      if (!selectedParent) {
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
      return { student, parentUser, parentCreated: !selectedParent }
    })

    revalidatePath('/dashboard')
    revalidatePath('/students')

    return NextResponse.json({
      ...creation.student,
      parentEmail: creation.parentUser.email,
      parentPlainPassword: creation.parentCreated ? creds?.plainPassword : null,
    }, { status: 201 })
  } catch (error) {
    console.error('[students:create] failed', error)
    return NextResponse.json({ error: '添加学员失败，请查看服务器日志' }, { status: 500 })
  }
})
