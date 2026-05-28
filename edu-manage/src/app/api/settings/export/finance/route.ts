import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()))

  const fees = await prisma.fee.findMany({
    where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const rows = fees.map((f) => [
    f.student.name, f.type, f.amount,
    f.status === 'paid' ? '已付' : '待付',
    f.paidAt ? f.paidAt.toLocaleDateString('zh-CN') : '-',
    f.createdAt.toLocaleDateString('zh-CN'),
    f.notes || '',
  ])

  const ws = XLSX.utils.aoa_to_sheet([
    ['学员', '费用类型', '金额', '状态', '支付日期', '创建日期', '备注'],
    ...rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '财务报表')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="财务报表-${year}.xlsx"`,
    },
  })
})
