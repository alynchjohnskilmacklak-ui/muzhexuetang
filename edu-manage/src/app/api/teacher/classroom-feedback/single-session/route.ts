import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { normalizeLoginPhone } from '@/lib/login-accounts'
import { parentIdsForPhone } from '@/lib/parent-binding'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { requireSingleSessionActor } from '@/lib/classroom-feedback/single-session-actor'
import { getTeacherFeedbackSubjects } from '@/lib/classroom-feedback/teacher-subjects'
import { visibleStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

const GRADE_OPTIONS = ['初一', '初二', '初三', '高一', '高二', '高三']

function studentSearchWhere(division: string, query: string) {
  return {
    ...visibleStudentWhere,
    division,
    OR: [{ parentId: { not: null } }, { parentUserId: { not: null } }],
    ...(query ? { name: { contains: query } } : {}),
  }
}

async function toStudentOptions(prisma: Awaited<ReturnType<typeof requireCurrentTeacher>>['prisma'], teacher: { division: string }, query: string) {
  const rows = query
    ? await prisma.student.findMany({
        where: studentSearchWhere(teacher.division, query),
        select: {
          id: true,
          name: true,
          grade: true,
          gender: true,
          parentName: true,
          parentPhone: true,
          parentId: true,
          parentUserId: true,
        },
        orderBy: [{ name: 'asc' }, { updatedAt: 'desc' }],
        take: 20,
      })
    : []

  const parentIds = [...new Set(rows.flatMap((row) => [row.parentId, row.parentUserId]).filter((id): id is string => Boolean(id)))]
  const parents = parentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: parentIds }, role: 'parent', status: { not: 'deleted' } },
        select: { id: true, name: true, phone: true, division: true },
      })
    : []
  const parentById = new Map(parents.map((parent) => [parent.id, parent]))
  const students = rows.flatMap((student) => {
    const parent = parentById.get(student.parentId || '') || parentById.get(student.parentUserId || '')
    if (!parent || parent.division !== teacher.division) return []
    const phone = parent.phone || student.parentPhone || ''
    return [{
      id: student.id,
      name: student.name,
      grade: student.grade,
      gender: student.gender,
      parentLabel: `${parent.name || student.parentName || '家长'}${phone ? ` · 尾号 ${phone.slice(-4)}` : ''}`,
    }]
  })

  return students
}

export const GET = apiHandler(async (req: NextRequest) => {
  const actor = await requireSingleSessionActor()
  const divisionContext = { division: actor.division }
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 40)
  const [teacherRows, students] = await Promise.all([
    actor.prisma.teacher.findMany({
      where: { division: actor.division, status: { not: 'RESIGNED' } },
      select: { id: true, name: true, gender: true, avatar: true, tierLevel: true, division: true, subjects: true },
      orderBy: { name: 'asc' },
    }),
    toStudentOptions(actor.prisma, divisionContext, query),
  ])
  const teachers = await Promise.all(teacherRows.map(async (candidate) => ({
    ...candidate,
    subjects: await getTeacherFeedbackSubjects(actor.prisma, candidate),
  })))
  const currentTeacherId = actor.currentTeacherId || teachers[0]?.id || ''
  const currentTeacher = teachers.find((candidate) => candidate.id === currentTeacherId)
  return NextResponse.json({
    currentTeacherId,
    subjects: currentTeacher?.subjects || [],
    teachers,
    students,
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json() as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : ''
  const grade = typeof body.grade === 'string' ? body.grade.trim() : ''
  const rawPhone = typeof body.parentPhone === 'string' ? body.parentPhone.trim() : ''
  const parentPhone = normalizeLoginPhone(rawPhone)

  if (name.length < 2) return NextResponse.json({ error: '请填写至少 2 个字的学员姓名' }, { status: 400 })
  if (!GRADE_OPTIONS.includes(grade)) return NextResponse.json({ error: '请选择学员年级' }, { status: 400 })
  if (!parentPhone) return NextResponse.json({ error: '请输入家长端已登记的手机号' }, { status: 400 })

  const linkedRecords = await prisma.student.findMany({
    where: {
      division: teacher.division,
      parentPhone,
      deletedAt: null,
      OR: [{ parentId: { not: null } }, { parentUserId: { not: null } }],
    },
    select: { parentId: true, parentUserId: true },
  })
  const linkedParentIds = parentIdsForPhone(linkedRecords)
  const phoneCandidates = await prisma.user.findMany({
    where: {
      role: 'parent',
      division: teacher.division,
      status: { not: 'deleted' },
      OR: [
        { phone: { contains: parentPhone.slice(-8) } },
        ...(linkedParentIds.length ? [{ id: { in: linkedParentIds } }] : []),
      ],
    },
    select: { id: true, name: true, phone: true },
    take: 100,
  })
  const parentMatches = phoneCandidates.filter((parent) =>
    normalizeLoginPhone(parent.phone || '') === parentPhone || linkedParentIds.includes(parent.id),
  )
  if (parentMatches.length !== 1) {
    return NextResponse.json({
      error: parentMatches.length
        ? '该手机号关联了多个家长账号，请联系管理员确认归属后再建立档案'
        : '没有找到该手机号对应的家长端账号。请先为家长绑定账号，或从姓名匹配结果中选择已有学员。',
    }, { status: 409 })
  }

  const parent = parentMatches[0]
  const existing = await prisma.student.findMany({
    where: {
      division: teacher.division,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
      OR: [{ parentId: parent.id }, { parentUserId: parent.id }],
    },
    select: { id: true, name: true, grade: true, gender: true, parentId: true, parentUserId: true },
    orderBy: { updatedAt: 'desc' },
    take: 2,
  })
  if (existing.length) {
    const sameIdentity = existing.length === 1 || existing.every((item) => item.id === existing[0].id)
    if (!sameIdentity) {
      return NextResponse.json({ error: '该家长账号下已有同名学员档案，请从姓名匹配结果中选择正确档案' }, { status: 409 })
    }
    const matched = existing[0]
    if (matched.grade && matched.grade !== grade) {
      return NextResponse.json({ error: `已有档案年级为${matched.grade}，请核对后从姓名匹配结果中选择` }, { status: 409 })
    }
    const updated = matched.grade ? matched : await prisma.student.update({ where: { id: matched.id }, data: { grade } })
    return NextResponse.json({
      student: { id: updated.id, name: updated.name, grade: updated.grade, gender: updated.gender, parentLabel: `${parent.name} · 尾号 ${parentPhone.slice(-4)}` },
      reused: true,
    })
  }

  const student = await prisma.student.create({
    data: {
      name,
      grade,
      division: teacher.division,
      status: 'TRIAL',
      source: 'SINGLE_SESSION_FEEDBACK',
      parentName: parent.name,
      parentPhone,
      parentId: parent.id,
      parentUserId: parent.id,
      mainTeacherId: null,
      remainHours: 0,
      totalHours: 0,
      notes: '通过单次课程反馈建立；未加入班级，不产生考勤和课时扣减。',
    },
    select: { id: true, name: true, grade: true, gender: true },
  })
  return NextResponse.json({
    student: { ...student, parentLabel: `${parent.name} · 尾号 ${parentPhone.slice(-4)}` },
    reused: false,
  }, { status: 201 })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const actor = await requireSingleSessionActor()
  const prisma = actor.prisma
  const body = await req.json() as Record<string, unknown>
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  const grade = typeof body.grade === 'string' ? body.grade.trim() : ''
  if (!studentId) return NextResponse.json({ error: '请先选择学员档案' }, { status: 400 })
  if (!GRADE_OPTIONS.includes(grade)) return NextResponse.json({ error: '请选择学员年级' }, { status: 400 })

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      division: actor.division,
      ...visibleStudentWhere,
      OR: [{ parentId: { not: null } }, { parentUserId: { not: null } }],
    },
    select: { id: true, name: true, grade: true, gender: true, parentName: true, parentPhone: true, parentId: true, parentUserId: true },
  })
  if (!student) return NextResponse.json({ error: '学员档案不存在或家长尚未绑定账号' }, { status: 404 })
  const linkedParentIds = [...new Set([student.parentId, student.parentUserId].filter((id): id is string => Boolean(id)))]
  const parent = linkedParentIds.length ? await prisma.user.findFirst({
    where: { id: { in: linkedParentIds }, role: 'parent', status: { not: 'deleted' }, division: actor.division },
    select: { id: true, name: true, phone: true },
  }) : null
  if (!parent) return NextResponse.json({ error: '该学员尚未关联本学部的家长账号' }, { status: 404 })
  if (student.grade && student.grade !== grade) return NextResponse.json({ error: `档案已记录为${student.grade}，请联系管理员核对年级` }, { status: 409 })

  const updated = student.grade ? student : await prisma.student.update({ where: { id: student.id }, data: { grade } })
  return NextResponse.json({
    student: {
      id: updated.id,
      name: updated.name,
      grade: updated.grade,
      gender: updated.gender,
      parentLabel: `${parent.name || student.parentName || '家长'}${parent.phone ? ` · 尾号 ${parent.phone.slice(-4)}` : ''}`,
    },
  })
})
