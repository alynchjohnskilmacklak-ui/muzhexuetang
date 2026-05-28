import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runDataHealthCheck } from '@/lib/data-admin/health'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  try {
    const issues = await runDataHealthCheck()
    return NextResponse.json({ success: true, data: issues })
  } catch (error) {
    console.error('data-health error:', error)
    return NextResponse.json({ error: '健康检查失败' }, { status: 500 })
  }
}
