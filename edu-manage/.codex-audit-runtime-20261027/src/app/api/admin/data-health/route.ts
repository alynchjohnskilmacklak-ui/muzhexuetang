import { apiHandler } from '@/lib/api-handler'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runDataHealthCheck } from '@/lib/data-admin/health'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  try {
    const issues = await runDataHealthCheck(undefined, getRequestDivision(session.user))
    return NextResponse.json({ success: true, data: issues })
  } catch (error) {
    console.error('data-health error:', error)
    return NextResponse.json({ error: '健康检查失败' }, { status: 500 })
  }
})
