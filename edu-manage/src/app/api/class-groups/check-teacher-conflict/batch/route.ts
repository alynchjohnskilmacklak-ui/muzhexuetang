import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { hasTimeOverlap } from '@/lib/schedule-conflict'

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

  const teacherIds = [...new Set(items.map(i => i.teacherId))]
  const dates = items.map(i => i.date).sort()
  const minDate = new Date(`${dates[0]}T00:00:00`)
  const maxDate = new Date(`${dates[dates.length - 1]}T23:59:59`)

  const lessons = await prisma.classLesson.findMany({
    where: { teacherId: { in: teacherIds }, lessonDate: { gte: minDate, lte: maxDate }, status: { not: 'CANCELLED' } },
    select: { teacherId: true, lessonDate: true, startTime: true, endTime: true, group: { select: { course: { select: { name: true } } } } },
  })

  const fmt = (d: Date) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }
  const byKey = new Map<string, typeof lessons>()
  for (const l of lessons) {
    const k = `${l.teacherId}|${fmt(l.lessonDate)}`
    ;(byKey.get(k) ?? byKey.set(k, []).get(k)!).push(l)
  }

  const results = items.map(it => {
    const cands = byKey.get(`${it.teacherId}|${it.date}`) || []
    for (const l of cands) {
      if (hasTimeOverlap(it.startTime, it.endTime, l.startTime, l.endTime)) {
        return { key: it.key, conflict: true, conflictDetail: `${l.group?.course?.name || '某班'} ${l.startTime}-${l.endTime}` }
      }
    }
    return { key: it.key, conflict: false }
  })
  return NextResponse.json({ results })
})
