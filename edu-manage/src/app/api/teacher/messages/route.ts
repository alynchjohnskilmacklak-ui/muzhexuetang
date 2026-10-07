import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const messages = await prisma.teacherMessage.findMany({
    where: { teacherId: teacher.id, readAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ messages })
})
