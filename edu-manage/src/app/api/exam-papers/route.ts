import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { resolveTeacherForUser } from '@/lib/performance'
import { parentStudentHistoryWhere, parentVisibleExamPaperWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { resolveLearningRecordTermId } from '@/lib/learning-record-term'
import { assertCanAccessClassLesson, assertCanAccessStudent } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const teacherId = searchParams.get('teacherId')
  const subject = searchParams.get('subject')
  const status = searchParams.get('status')
  const division = getRequestDivision(user, searchParams.get('division'))

  const where: Record<string, unknown> = { deletedAt: null }
  if (user.role === 'parent') {
    // Parent visibility is an authorization boundary, not an optional list mode.
    // Client-supplied status/student filters may only narrow this scope.
    Object.assign(where, parentVisibleExamPaperWhere(user.id))
    if (studentId) {
      const children = await getParentChildren(prisma, user.id)
      const selectedChild = findParentChild(children, studentId)
      const linkedIds = selectedChild?.recordIds || []
      where.studentId = { in: linkedIds }
      // Historical term records can have no active enrollment. Keep the same
      // parent ownership boundary while allowing the archive to read those rows.
      where.student = { id: { in: linkedIds }, ...parentStudentHistoryWhere(user.id) }
    }
  } else if (user.role === 'admin') {
    if (studentId) where.studentId = studentId
    if (teacherId) where.teacherId = teacherId
    if (subject) where.subject = subject
    if (status) where.status = status
    else where.status = { not: 'DELETED' }
    const term = await resolveAdminTermScope(prisma, division, req)
    where.student = { division }
    if (term) where.termId = term.id
  } else if (user.role === 'teacher') {
    const teacher = await resolveTeacherForUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, prisma)
    if (!teacher) return NextResponse.json({ error: '教师账号未绑定教师档案' }, { status: 403 })
    if (teacherId && teacherId !== teacher.id) {
      return NextResponse.json({ error: '无权访问其他教师的试卷' }, { status: 403 })
    }

    // The authenticated teacher profile is the fixed authorization scope.
    // Other query parameters can only narrow this set.
    where.teacherId = teacher.id
    if (studentId) where.studentId = studentId
    if (subject) where.subject = subject
    where.status = status || { not: 'DELETED' }

    const term = await getActiveAcademicTerm(prisma, division)
    if (term) where.termId = term.id
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  if (Object.keys(where).length === 1) {
    where.status = { not: 'DELETED' }
  }

  const papers = await prisma.examPaper.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, grade: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
      reactions: { select: { id: true, type: true, userId: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      _count: { select: { questions: true, reactions: true, comments: true } },
    },
    orderBy: { paperDate: 'desc' },
  })

  return NextResponse.json({ papers }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const { studentId, classLessonId, title, subject, paperDate, tags } = body

  if (!studentId || !title || !subject) {
    return NextResponse.json({ error: '请填写学员、标题和科目' }, { status: 400 })
  }

  const teacher = await resolveTeacherForUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }, prisma)
  if (!teacher) {
    return NextResponse.json({ error: '没有匹配到教师档案，请先在教师管理中创建至少一位在职教师' }, { status: 400 })
  }

  if (user.role === 'teacher') {
    const teacherContext = { ...user, teacherId: teacher.id, division: getRequestDivision(user), prisma }
    if (classLessonId) {
      await assertCanAccessClassLesson(teacherContext, classLessonId)
    } else {
      await assertCanAccessStudent(teacherContext, studentId)
    }
  }

  const termId = await resolveLearningRecordTermId(prisma, {
    division: getRequestDivision(user),
    studentId,
    classLessonId: classLessonId || null,
  })
  if (!termId) {
    return NextResponse.json({ error: '该学员不在当前启用批次，或所选课次与学员不匹配' }, { status: 409 })
  }

  const paper = await prisma.examPaper.create({
    data: {
      termId,
      studentId,
      teacherId: teacher.id,
      classLessonId: classLessonId || null,
      title,
      subject,
      paperDate: paperDate ? new Date(paperDate) : new Date(),
      tags: Array.isArray(tags) ? tags : [],
      imageUrls: [],
      status: 'DRAFT',
    },
    include: { student: { select: { id: true, name: true } }, teacher: { select: { id: true, name: true } } },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '创建试卷', detail: `${title} - ${subject}` },
  })

  return NextResponse.json(paper, { status: 201 })
})
