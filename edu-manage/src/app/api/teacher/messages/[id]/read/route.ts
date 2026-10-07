import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const { id } = await context.params
  const updated = await prisma.teacherMessage.updateMany({
    where: { id, teacherId: teacher.id, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ success: updated.count > 0 })
})
