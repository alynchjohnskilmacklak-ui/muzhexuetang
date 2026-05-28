import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const groupId = searchParams.get('groupId')

  if (!studentId || !groupId) {
    return NextResponse.json({ error: '请指定学员和班级' }, { status: 400 })
  }

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
}
