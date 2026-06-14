import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import * as XLSX from 'xlsx'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const lessonId = searchParams.get('lessonId')
  const groupId = searchParams.get('groupId')
  const month = searchParams.get('month')

  const where: Record<string, unknown> = {}
  if (lessonId) {
    where.lessonId = lessonId
    where.lesson = { group: visibleClassGroupWhere }
  } else if (groupId) {
    where.lesson = { groupId, group: visibleClassGroupWhere }
  } else {
    where.lesson = { group: visibleClassGroupWhere }
  }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.lesson = { ...(where.lesson as object || {}), lessonDate: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } }
  }
  where.student = visibleStudentWhere

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: { select: { name: true } },
      lesson: { include: { group: { select: { name: true } } } },
    },
    orderBy: { lesson: { lessonDate: 'asc' } },
  })

  const statusMap: Record<string, string> = { PRESENT: '出勤', LEAVE: '请假', ABSENT: '旷课', MAKEUP: '补课' }
  const rows = records
    .filter((r) => r.lesson)
    .map((r) => ({
      '班级': r.lesson!.group.name,
      '日期': r.lesson!.lessonDate.toISOString().slice(0, 10),
      '学员': r.student.name,
      '状态': statusMap[r.status] || r.status,
      '扣课时': r.hoursDeducted,
    }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '考勤记录')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="考勤_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
})
