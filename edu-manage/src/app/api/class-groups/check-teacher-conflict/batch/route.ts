import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { checkTeacherConflict } from '@/lib/teacher-conflict'
import { requireAdminUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

interface Item { key: string; teacherId: string; date: string; startTime: string; endTime: string }

export const POST = apiHandler(async (req: NextRequest) => {
  const { prisma } = await requireAdminUser()

  const body = await req.json()
  const items: Item[] = (Array.isArray(body.items) ? body.items : [])
    .filter((i: Item) => i?.teacherId && i?.date && i?.startTime && i?.endTime)
    .slice(0, 200)
  if (!items.length) return NextResponse.json({ results: [] })

  // ClassLesson is the single source of truth for teacher occupancy.
  const results = await Promise.all(items.map(async it => {
    const result = await checkTeacherConflict(prisma, it)
    return { key: it.key, ...result }
  }))
  return NextResponse.json({ results })
})
