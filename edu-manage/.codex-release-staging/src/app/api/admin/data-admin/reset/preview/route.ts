import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireSuperAdmin } from '@/lib/get-user'
import { getPrismaForDivision, isDualDbEnabled } from '@/lib/prisma'
import { isCleanupCategory, previewCleanup } from '@/lib/data-correction/cleanup'

type Division = 'JUNIOR' | 'SENIOR'

export const POST = apiHandler(async (req: NextRequest) => {
  await requireSuperAdmin()
  if (!isDualDbEnabled()) return NextResponse.json({ error: '双库未启用，禁止清理数据' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const division = typeof body.division === 'string' ? body.division : 'JUNIOR'
  if (!['JUNIOR', 'SENIOR', 'BOTH'].includes(division)) return NextResponse.json({ error: '无效清理范围' }, { status: 400 })
  const categories = (Array.isArray(body.categories) ? body.categories : []).filter((value: unknown): value is string => typeof value === 'string' && isCleanupCategory(value))
  if (!categories.length) return NextResponse.json({ error: '请至少选择一个清理类别' }, { status: 400 })
  const divisions: Division[] = division === 'BOTH' ? ['JUNIOR', 'SENIOR'] : [division as Division]
  const results: Record<string, { counts: Record<string, number>; total: number }> = {}
  for (const div of divisions) {
    results[div] = await previewCleanup(getPrismaForDivision(div), categories, {
      division: div,
      termId: typeof body.termId === 'string' && body.termId ? body.termId : undefined,
      dateFrom: typeof body.dateFrom === 'string' && body.dateFrom ? body.dateFrom : undefined,
      dateTo: typeof body.dateTo === 'string' && body.dateTo ? body.dateTo : undefined,
      classId: typeof body.classId === 'string' && body.classId ? body.classId : undefined,
      studentId: typeof body.studentId === 'string' && body.studentId ? body.studentId : undefined,
    })
  }
  return NextResponse.json({ success: true, data: results, total: Object.values(results).reduce((sum, item) => sum + item.total, 0) })
})
