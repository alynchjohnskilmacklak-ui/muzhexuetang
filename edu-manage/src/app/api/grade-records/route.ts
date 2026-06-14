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

  const created = await prisma.$transaction(async (tx) => {
    const results = []
    for (const rec of records) {
      const grade = await tx.gradeRecord.create({
        data: {
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
