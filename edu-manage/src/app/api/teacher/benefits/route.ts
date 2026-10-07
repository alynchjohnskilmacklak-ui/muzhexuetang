import { NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { DEFAULT_TEACHER_BENEFITS } from '@/data/teacher-benefits-default'

export const dynamic = 'force-dynamic'

// 我的福利数据（供薪酬福利合并页 Tab 使用）
export const GET = apiHandler(async () => {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
      select: { teacherBenefits: true },
    })

    return NextResponse.json({
      content: config?.teacherBenefits?.trim() || DEFAULT_TEACHER_BENEFITS,
      teacherName: teacher.name,
      tierLevel: teacher.tierLevel,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
})
