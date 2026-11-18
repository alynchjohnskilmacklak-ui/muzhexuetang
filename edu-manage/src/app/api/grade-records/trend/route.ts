import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { assertCanAccessStudent } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const groupId = searchParams.get('groupId')

  if (!studentId || !groupId) {
    return NextResponse.json({ error: '请指定学员和班级' }, { status: 400 })
  }
  if (user.role === 'teacher' && !user.teacherId) {
    return NextResponse.json({ error: '教师账号未绑定教师档案' }, { status: 403 })
  }

  // 归属校验：家长只能看自己孩子，教师只能看自己学生，管理员不受限。
  await assertCanAccessStudent({ ...user, prisma }, studentId)

  // The student check above does not authorize an arbitrary groupId. Require
  // this student to have a persisted enrollment in the requested group, and
  // require teachers to teach that same group before exposing its averages.
  const teacherScope = user.role === 'teacher'
    ? {
        OR: [
          { teacherId: user.teacherId! },
          { teacherAssignments: { some: { teacherId: user.teacherId! } } },
        ],
      }
    : {}
  const group = await prisma.classGroup.findFirst({
    where: {
      id: groupId,
      division: getRequestDivision(user),
      enrollments: { some: { studentId, deletedAt: null } },
      ...teacherScope,
    },
    select: { id: true },
  })
  if (!group) return NextResponse.json({ error: '无权访问该班级成绩' }, { status: 404 })

  // Get all assessments for this group
  const assessments = await prisma.assessment.findMany({
    where: { groupId },
    include: {
      gradeRecords: {
        include: { dimensions: true },
      },
    },
    orderBy: { assessDate: 'asc' },
  })

  // Get student's scores
  const studentScores = assessments.map((a) => {
    const record = a.gradeRecords.find((r) => r.studentId === studentId)
    return record ? { assessmentName: a.name, date: a.assessDate, type: a.type, score: record.score } : null
  }).filter(Boolean)

  // Compute class averages
  const classAverages = assessments.map((a) => {
    const scores = a.gradeRecords.map((r) => r.score)
    const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null
    return { assessmentName: a.name, average: avg }
  })

  // Get all dimension scores for radar
  const latestAssessment = assessments[assessments.length - 1]
  const dimensions = latestAssessment?.gradeRecords.find((r) => r.studentId === studentId)?.dimensions || []

  return NextResponse.json({
    studentScores,
    classAverages,
    dimensions,
    assessments: assessments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      date: a.assessDate,
      fullScore: a.fullScore,
      studentRecord: a.gradeRecords.find((r) => r.studentId === studentId) || null,
      totalRecords: a.gradeRecords.length,
    })),
  })
})
