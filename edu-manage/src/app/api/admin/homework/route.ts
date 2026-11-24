import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision, divisionWhere } from '@/lib/division'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const admin = await requireAdminUser()
  const { prisma } = admin
  const sp = req.nextUrl.searchParams

  const division = getRequestDivision(admin.user, sp.get('division'))
  const termId = sp.get('termId')?.trim() || undefined
  const groupId = sp.get('groupId')?.trim() || undefined
  const teacherId = sp.get('teacherId')?.trim() || undefined
  const statusFilter = sp.get('status')?.trim() || 'ALL' // ALL | PENDING_REVIEW | REVIEWED | OVERDUE
  const searchKeyword = sp.get('search')?.trim().toLowerCase() || ''

  const groupWhere = {
    ...divisionWhere(division),
    deletedAt: null,
    ...(groupId ? { id: groupId } : {}),
  }

  // 1. 获取筛选字典：运营批次、班级、授课教师
  const [academicTerms, classGroups, teachers] = await Promise.all([
    prisma.academicTerm.findMany({
      where: { ...divisionWhere(division) },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      select: { id: true, name: true, status: true },
    }),
    prisma.classGroup.findMany({
      where: groupWhere,
      select: { id: true, name: true, course: { select: { name: true, subject: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.teacher.findMany({
      where: { ...divisionWhere(division), status: { not: 'RESIGNED' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // 2. 查询作业主体及关联班级、教师、批阅名册
  const assignmentWhere: Prisma.HomeworkAssignmentWhereInput = {
    group: groupWhere,
    ...(termId ? { termId } : {}),
    ...(teacherId ? { teacherId } : {}),
  }

  const rawAssignments = await prisma.homeworkAssignment.findMany({
    where: assignmentWhere,
    include: {
      group: {
        select: {
          id: true,
          name: true,
          division: true,
          course: { select: { name: true, subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null } },
            select: { student: { select: { id: true, name: true, grade: true } } },
          },
        },
      },
      teacher: {
        select: {
          id: true,
          name: true,
          user: { select: { id: true, avatar: true } },
        },
      },
      term: { select: { id: true, name: true, status: true } },
      submissions: {
        include: {
          student: { select: { id: true, name: true, grade: true } },
          parent: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 3. 汇总数据与质检分析指标
  const now = new Date()
  let totalAssignedStudents = 0
  let totalSubmissionsCount = 0
  let pendingReviewsCount = 0
  let reviewedSubmissionsCount = 0
  let totalScoresSum = 0
  let scoredSubmissionsCount = 0

  const assignments = rawAssignments.map((a) => {
    const totalStudents = a.studentIds?.length || a.group.enrollments?.length || 0
    const submissions = a.submissions || []
    const submittedCount = submissions.length
    const reviewedCount = submissions.filter((s) => s.status === 'REVIEWED').length
    const pendingReviewCount = submissions.filter((s) => s.status === 'SUBMITTED').length
    const isOverdue = Boolean(a.dueAt && new Date(a.dueAt) < now)

    const scores = submissions
      .map((s) => s.score)
      .filter((sc): sc is number => typeof sc === 'number' && Number.isFinite(sc))
    const avgScore = scores.length ? Number((scores.reduce((acc, v) => acc + v, 0) / scores.length).toFixed(1)) : null

    totalAssignedStudents += totalStudents
    totalSubmissionsCount += submittedCount
    pendingReviewsCount += pendingReviewCount
    reviewedSubmissionsCount += reviewedCount
    scores.forEach((sc) => {
      totalScoresSum += sc
      scoredSubmissionsCount++
    })

    const submittedStudentIds = new Set(submissions.map((s) => s.studentId))
    const missingStudents = (a.group.enrollments || [])
      .map((e) => e.student)
      .filter((st) => a.studentIds?.includes(st.id) && !submittedStudentIds.has(st.id))

    return {
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      teacherAttachmentUrls: a.teacherAttachmentUrls || [],
      dueAt: a.dueAt,
      status: a.status,
      createdAt: a.createdAt,
      group: {
        id: a.group.id,
        name: a.group.name,
        subject: a.group.course?.subject || '综合',
        courseName: a.group.course?.name || '',
      },
      teacher: {
        id: a.teacher.id,
        name: a.teacher.name,
        avatarUrl: a.teacher.user?.avatar || null,
      },
      term: a.term ? { id: a.term.id, name: a.term.name } : null,
      stats: {
        totalStudents,
        submittedCount,
        submissionRate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
        reviewedCount,
        reviewRate: submittedCount > 0 ? Math.round((reviewedCount / submittedCount) * 100) : 0,
        pendingReviewCount,
        avgScore,
        isOverdue,
      },
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.name,
        grade: s.student.grade,
        parentName: s.parent.name || '家长',
        parentPhone: s.parent.phone || '',
        content: s.content,
        attachmentUrls: s.attachmentUrls || [],
        status: s.status,
        score: s.score,
        teacherComment: s.teacherComment,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
      })),
      missingStudents: missingStudents.map((st) => ({
        id: st.id,
        name: st.name,
        grade: st.grade,
      })),
    }
  })

  // 4. 过滤结果
  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'PENDING_REVIEW' && a.stats.pendingReviewCount === 0) return false
    if (statusFilter === 'REVIEWED' && (a.stats.pendingReviewCount > 0 || a.stats.submittedCount === 0)) return false
    if (statusFilter === 'OVERDUE' && !a.stats.isOverdue) return false
    if (searchKeyword) {
      const matchTitle = a.title.toLowerCase().includes(searchKeyword)
      const matchGroup = a.group.name.toLowerCase().includes(searchKeyword)
      const matchTeacher = a.teacher.name.toLowerCase().includes(searchKeyword)
      const matchSubject = a.group.subject.toLowerCase().includes(searchKeyword)
      if (!matchTitle && !matchGroup && !matchTeacher && !matchSubject) return false
    }
    return true
  })

  return NextResponse.json({
    kpi: {
      totalAssignments: assignments.length,
      totalSubmissionsCount,
      totalAssignedStudents,
      overallSubmissionRate: totalAssignedStudents > 0 ? Math.round((totalSubmissionsCount / totalAssignedStudents) * 100) : 0,
      pendingReviewsCount,
      reviewedSubmissionsCount,
      overallReviewRate: totalSubmissionsCount > 0 ? Math.round((reviewedSubmissionsCount / totalSubmissionsCount) * 100) : 0,
      averageScore: scoredSubmissionsCount > 0 ? Number((totalScoresSum / scoredSubmissionsCount).toFixed(1)) : null,
    },
    filterOptions: {
      academicTerms,
      classGroups,
      teachers,
    },
    assignments: filteredAssignments,
  })
})
