import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const [
    guideViews,
    docDownloads,
    consultations,
    quotaQueries,
  ] = await Promise.all([
    prisma.guideViewLog.count({ where: { action: 'VIEW_GUIDE' } }),
    prisma.guideViewLog.count({ where: { action: 'DOWNLOAD_DOC' } }),
    prisma.volunteerConsultation.count(),
    prisma.guideViewLog.count({ where: { action: 'QUERY_QUOTA' } }),
  ])

  return NextResponse.json({
    guideViews,
    docDownloads,
    consultations,
    quotaQueries,
  })
}
