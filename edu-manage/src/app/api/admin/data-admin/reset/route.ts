import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { assertDangerAuth } from '@/lib/danger-guard'
import { getPrismaForDivision, isDualDbEnabled, getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { requireRole } from '@/lib/get-user'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { deleteFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

type Division = 'JUNIOR' | 'SENIOR'

interface CleanupCategory {
  label: string
  preset: boolean
  /** Execute deletion for one division. Returns count of deleted records + optional file keys to delete from disk. */
  run: (prisma: PrismaClient, division: Division) => Promise<{ count: number; fileKeys?: string[] }>
}

const CLEANUP_CATEGORIES: Record<string, CleanupCategory> = {
  teacherSalaryTransaction: {
    label: '教师薪资流水',
    preset: true,
    run: async (p, division) => {
      const r = await p.teacherSalaryTransaction.deleteMany({
        where: { teacher: { division } },
      })
      return { count: r.count }
    },
  },
  attendance: {
    label: '考勤记录',
    preset: true,
    run: async (p, division) => {
      await p.makeupRequest.deleteMany({
        where: { attendance: { student: { division } } },
      })
      const r = await p.attendance.deleteMany({
        where: { student: { division } },
      })
      return { count: r.count }
    },
  },
  classroomFeedback: {
    label: '课堂反馈',
    preset: true,
    run: async (p, division) => {
      const feedbacks = await p.classroomFeedback.findMany({
        where: { teacher: { division } },
        select: { id: true, imageUrls: true },
      })
      const fileKeys = feedbacks.flatMap((f) => (f.imageUrls ?? []) as string[])
      const r = await p.classroomFeedback.deleteMany({
        where: { teacher: { division } },
      })
      return { count: r.count, fileKeys }
    },
  },
  performancePost: {
    label: '表现动态',
    preset: true,
    run: async (p, division) => {
      await p.postReaction.deleteMany({ where: { post: { teacher: { division } } } })
      await p.postComment.deleteMany({ where: { post: { teacher: { division } } } })
      await p.postBadge.deleteMany({ where: { post: { teacher: { division } } } })
      const r = await p.performancePost.deleteMany({
        where: { teacher: { division } },
      })
      return { count: r.count }
    },
  },
  stageSummary: {
    label: '阶段总结',
    preset: true,
    run: async (p, division) => {
      const r = await p.stageSummary.deleteMany({
        where: { teacher: { division } },
      })
      return { count: r.count }
    },
  },
  notification: {
    label: '通知消息',
    preset: true,
    run: async (p, division) => {
      const r = await p.notification.deleteMany({
        where: { user: { division } },
      })
      return { count: r.count }
    },
  },
  fileAsset: {
    label: '文件资源',
    preset: true,
    run: async (p, division) => {
      const assets = await p.fileAsset.findMany({
        where: { tenant: division.toLowerCase() },
        select: { id: true, storageKey: true },
      })
      const r = await p.fileAsset.deleteMany({
        where: { tenant: division.toLowerCase() },
      })
      return { count: r.count, fileKeys: assets.map((a) => a.storageKey) }
    },
  },
  gradeRecord: {
    label: '成绩记录',
    preset: true,
    run: async (p, division) => {
      await p.dimensionScore.deleteMany({
        where: { grade: { student: { division } } },
      })
      await p.classHighlight.deleteMany({
        where: { grade: { student: { division } } },
      })
      const r = await p.gradeRecord.deleteMany({
        where: { student: { division } },
      })
      return { count: r.count }
    },
  },
  examPaper: {
    label: '试卷',
    preset: true,
    run: async (p, division) => {
      const papers = await p.examPaper.findMany({
        where: { teacher: { division } },
        select: { id: true, imageUrls: true },
      })
      const paperIds = papers.map((p) => p.id)
      const fileKeys = papers.flatMap((p) => (p.imageUrls ?? []) as string[])
      if (paperIds.length > 0) {
        await p.weaknessRecord.deleteMany({ where: { paperId: { in: paperIds } } })
        await p.paperReaction.deleteMany({ where: { paperId: { in: paperIds } } })
        await p.paperComment.deleteMany({ where: { paperId: { in: paperIds } } })
        await p.paperQuestion.deleteMany({ where: { paperId: { in: paperIds } } })
      }
      const r = await p.examPaper.deleteMany({
        where: { teacher: { division } },
      })
      return { count: r.count, fileKeys }
    },
  },
}

export const GET = apiHandler(async () => {
  await requireRole(['SUPER_ADMIN'])
  const categories = Object.entries(CLEANUP_CATEGORIES).map(([key, val]) => ({
    key,
    label: val.label,
    preset: val.preset,
  }))
  return NextResponse.json({ success: true, data: categories })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const prisma = await getRequestPrisma()
  const body = await req.json()

  const auth = await assertDangerAuth(body)

  const division: string = body.division || 'JUNIOR'
  const selectedCats: string[] = body.categories || []

  if (selectedCats.length === 0) {
    return NextResponse.json({ error: '请至少选择一个清理类别' }, { status: 400 })
  }

  const divisions: Division[] =
    division === 'BOTH' ? ['JUNIOR', 'SENIOR'] : [division as Division]

  const results: Record<string, Record<string, number>> = {}
  let totalFilesDeleted = 0

  for (const div of divisions) {
    const divPrisma = isDualDbEnabled() ? getPrismaForDivision(div) : prisma
    results[div] = {}

    for (const catKey of selectedCats) {
      const handler = CLEANUP_CATEGORIES[catKey]
      if (!handler) continue

      const { count, fileKeys } = await handler.run(divPrisma, div)
      results[div][catKey] = count

      if (fileKeys && fileKeys.length > 0) {
        for (const key of fileKeys) {
          try {
            await deleteFile(key)
            totalFilesDeleted++
          } catch {
            // File may already be gone — safe to ignore
          }
        }
      }
    }
  }

  await createActivityLog(auth.userId, 'DATA_RESET', 'System', 'reset', {
    divisions,
    categories: selectedCats,
    results,
    filesDeleted: totalFilesDeleted,
  })

  return NextResponse.json({ success: true, results, filesDeleted: totalFilesDeleted })
})
