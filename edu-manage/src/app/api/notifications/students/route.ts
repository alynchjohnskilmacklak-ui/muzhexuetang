import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))

  const students = await prisma.student.findMany({
    where: { status: { not: 'INACTIVE' }, division },
    include: {
      parent: { select: { wxpusherUid: true } },
      schedules: {
        include: {
          schedule: {
            include: { room: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = students.map(s => {
    const roomEntry = s.schedules.find(ss => ss.schedule?.room?.name)
    return {
      id: s.id,
      name: s.name,
      grade: s.grade || '未设置年级',
      parentName: s.parentName,
      wxBound: !!s.parent?.wxpusherUid,
      roomId: roomEntry?.schedule?.room?.id || null,
      roomName: roomEntry?.schedule?.room?.name || '未分配班级',
    }
  })

  const grouped: Record<string, typeof result> = {}
  for (const student of result) {
    const key = student.roomName
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(student)
  }

  const grades = [...new Set(result.map((student) => student.grade))].sort()

  return NextResponse.json({ students: result, grouped, grades })
})
