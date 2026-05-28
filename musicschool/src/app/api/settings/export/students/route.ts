import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const students = await prisma.student.findMany({
    include: { enrollments: { include: { group: { include: { course: true } } } }, fees: true },
    orderBy: { createdAt: 'desc' },
  })

  const rows = students.map((s) => {
    const courses = s.enrollments.map((e) => e.group.course.name).join('、')
    const totalFees = s.fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0)
    return [
      s.name, s.gender || '', s.grade || '', s.school || '',
      s.remainHours, s.totalHours, s.status,
      courses || '未报名', totalFees,
      s.createdAt.toLocaleDateString('zh-CN'),
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([
    ['姓名', '性别', '年级', '学校', '剩余课时', '总课时', '状态', '报名课程', '缴费总额', '注册日期'],
    ...rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="学员数据-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
