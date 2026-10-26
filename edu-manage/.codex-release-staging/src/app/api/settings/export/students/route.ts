import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { requireAdminUser } from '@/lib/auth/guards'
import { createActivityLog } from '@/lib/data-admin/entities-server'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireAdminUser()
  const prisma = await getRequestPrisma()

  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))

  const students = await prisma.student.findMany({
    where: { division },
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
  await createActivityLog(user.id, 'EXPORT_STUDENTS', 'StudentReport', division, {
    division,
    rowCount: rows.length,
  })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="学员数据-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
