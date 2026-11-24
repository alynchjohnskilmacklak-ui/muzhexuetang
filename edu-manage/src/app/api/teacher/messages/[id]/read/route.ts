import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const { id } = await context.params
  const body = await req.json().catch(() => ({})) as { kind?: unknown }

  if (body.kind === 'notification') {
    const updated = await prisma.notification.updateMany({
      where: { id, userId: user.id, status: 'ACTIVE', deletedAt: null, read: false },
      data: { read: true, readAt: new Date() },
    })
    return NextResponse.json({ success: updated.count > 0 })
  }

  const updated = await prisma.teacherMessage.updateMany({
    where: { id, teacherId: teacher.id, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ success: updated.count > 0 })
})
