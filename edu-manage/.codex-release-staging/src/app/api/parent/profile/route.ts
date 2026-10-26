import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getStudentProfile } from '@/lib/student-profile'
import { findParentChild, getParentChildren } from '@/lib/parent-children'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const children = await getParentChildren(prisma, user.id)
  if (children.length === 0) return NextResponse.json({ children: [], profile: null })

  const requested = req.nextUrl.searchParams.get('studentId')
  const target = findParentChild(children, requested)
  if (!target) return NextResponse.json({ error: '未找到该孩子的档案，请刷新后重试' }, { status: 404 })

  const monthsParam = Number(req.nextUrl.searchParams.get('months'))
  const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(1, Math.round(monthsParam))) : 6
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - months)

  const profile = await getStudentProfile(prisma, target.id, { from, to }, target.recordIds)
  return NextResponse.json({ children, activeStudentId: target.id, profile })
})
