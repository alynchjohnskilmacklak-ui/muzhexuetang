import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const { assessmentId, records } = body as {
    assessmentId: string
    records: {
      studentId: string; score: number; comment?: string
      dimensions?: { dimension: string; score: number; maxScore?: number }[]
    }[]
  }

  if (!assessmentId || !records?.length) {
    return NextResponse.json({ error: '缺少测评ID或成绩数据' }, { status: 400 })
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      group: { division: user.division, term: { status: 'ACTIVE' } },
    },
    select: {
      group: {
        select: {
          termId: true,
          enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
        },
      },
    },
  })
  if (!assessment?.group.termId) {
    return NextResponse.json({ error: '测评不属于当前启用批次' }, { status: 409 })
  }
  const enrolledStudentIds = new Set(assessment.group.enrollments.map((item) => item.studentId))
  if (records.some((record) => !enrolledStudentIds.has(record.studentId))) {
    return NextResponse.json({ error: '成绩中包含不属于该班级当前批次的学员' }, { status: 409 })
  }

  const created = await prisma.$transaction(async (tx) => {
    const results = []
    for (const rec of records) {
      const grade = await tx.gradeRecord.create({
        data: {
          termId: assessment.group.termId,
          assessmentId,
          studentId: rec.studentId,
          score: rec.score,
          comment: rec.comment,
        },
      })

      if (rec.dimensions?.length) {
        await tx.dimensionScore.createMany({
          data: rec.dimensions.map((d) => ({
            gradeId: grade.id,
            dimension: d.dimension,
            score: d.score,
            maxScore: d.maxScore || 100,
          })),
        })
      }

      results.push(grade)
    }
    return results
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '录入成绩', detail: `共${records.length}人` },
  })

  return NextResponse.json(created, { status: 201 })
})
