import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { apiHandler } from '@/lib/api-handler'
import { findDashboardLessonDetail, dashboardClassDetail } from '@/lib/dashboard-lesson-detail'

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const division = getRequestDivision(admin)
  const term = await resolveAdminTermScope(admin.prisma, division, request)
  const id = request.nextUrl.searchParams.get('classId') || ''
  if (!id) return NextResponse.json({ error: '缺少课次信息' }, { status: 400 })
  const lesson = await findDashboardLessonDetail(admin.prisma, id, division, term?.id || '__NO_SELECTED_TERM__')
  if (!lesson) return NextResponse.json({ error: '课次不存在或不在当前学部与批次中' }, { status: 404 })
  const detail = dashboardClassDetail(lesson)
  return NextResponse.json(detail)
})
