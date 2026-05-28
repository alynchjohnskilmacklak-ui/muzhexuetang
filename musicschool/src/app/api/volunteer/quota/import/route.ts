import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreateVolunteerGuide } from '@/lib/volunteer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const guide = await getOrCreateVolunteerGuide()
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: '请选择 Excel 文件' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  if (!rows.length) return NextResponse.json({ error: 'Excel 内容为空' }, { status: 400 })

  const keys = Object.keys(rows[0])
  const hasStandardColumns = ['学校名称', '县（市、区）', '分配生计划', '统招计划', '合计'].every((column) => keys.includes(column))
  let data: Array<{ guideId: string; schoolName: string; district: string; allocQuota: number; normalQuota: number; totalQuota: number; note: string | null; year: number }>

  if (hasStandardColumns) {
    data = rows
      .map((row) => ({
        guideId: guide.id,
        schoolName: String(row['学校名称'] || '').trim(),
        district: String(row['县（市、区）'] || '').trim(),
        allocQuota: Number(row['分配生计划'] || 0),
        normalQuota: Number(row['统招计划'] || 0),
        totalQuota: Number(row['合计'] || 0),
        note: row['说明'] ? String(row['说明']) : null,
        year: guide.year,
      }))
      .filter((row) => row.schoolName && row.district)
  } else {
    const districtKey = keys[0]
    if (!districtKey || keys.length < 2) return NextResponse.json({ error: 'Excel格式无法识别：需要标准列，或“区县+生源学校”为首列、各高中为后续列的矩阵表' }, { status: 400 })
    data = rows.flatMap((row) => {
      const sourceSchool = String(row[districtKey] || '').trim()
      if (!sourceSchool) return []
      return Object.entries(row)
        .filter(([key]) => key !== districtKey)
        .map(([schoolName, value]) => {
          const quota = Number(value || 0)
          return {
            guideId: guide.id,
            schoolName: schoolName.replace(/\s+/g, ''),
            district: districtKey.replace(/\s+/g, ''),
            allocQuota: Number.isFinite(quota) ? quota : 0,
            normalQuota: 0,
            totalQuota: Number.isFinite(quota) ? quota : 0,
            note: sourceSchool,
            year: guide.year,
          }
        })
    })
  }

  await prisma.$transaction([
    prisma.quotaRecord.deleteMany({ where: { guideId: guide.id, year: guide.year } }),
    prisma.quotaRecord.createMany({ data }),
  ])
  revalidatePath('/volunteer/quota')
  revalidatePath('/parent/volunteer')
  return NextResponse.json({ imported: data.length })
}
