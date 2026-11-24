import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const [messages, notifications] = await Promise.all([
    prisma.teacherMessage.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, type: true, title: true, content: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { userId: user.id, status: 'ACTIVE', deletedAt: null },
      select: { id: true, title: true, content: true, type: true, href: true, link: true, read: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])
  return NextResponse.json({ messages, notifications }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
})
