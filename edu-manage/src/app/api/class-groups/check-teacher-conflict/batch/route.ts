import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getTeacherBusy } from '@/lib/teacher-busy'

export const dynamic = 'force-dynamic'

interface Item { key: string; teacherId: string; date: string; startTime: string; endTime: string }

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const items: Item[] = (Array.isArray(body.items) ? body.items : [])
    .filter((i: Item) => i?.teacherId && i?.date && i?.startTime && i?.endTime)
    .slice(0, 200)
  if (!items.length) return NextResponse.json({ results: [] })

  // Use unified busy check (ClassLesson + Schedule)
  const results = await Promise.all(items.map(async it => {
    const busy = await getTeacherBusy(prisma, it.teacherId, it.date, it.startTime, it.endTime)
    if (busy) return { key: it.key, conflict: true, conflictDetail: `${busy.label} ${busy.start}-${busy.end}` }
    return { key: it.key, conflict: false }
  }))
  return NextResponse.json({ results })
})
