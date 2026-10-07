import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser()
    const division = getRequestDivision(admin, req.nextUrl.searchParams.get('division'))
    const teachers = await admin.prisma.teacher.findMany({
      where: { division, status: 'ACTIVE' },
      select: { id: true, name: true, subjects: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ teachers })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
