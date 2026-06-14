import { NextResponse } from 'next/server'
import { checkTeacherAlerts } from '@/lib/teacher-alert-cron'
import { requireAdminUser } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { prisma } = await requireAdminUser()
    const result = await checkTeacherAlerts()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
