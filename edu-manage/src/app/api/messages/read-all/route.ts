import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  if (user.role === 'parent') {
    await prisma.parentMessageReply.updateMany({
      where: {
        isReadByParent: false,
        role: { not: 'parent' },
        message: { parentId: user.id },
      },
      data: { isReadByParent: true },
    })
  } else if (user.role === 'teacher' && user.teacherId) {
    await prisma.parentMessageReply.updateMany({
      where: {
        isReadByTeacher: false,
        role: 'parent',
        message: { teacherId: user.teacherId },
      },
      data: { isReadByTeacher: true },
    })
  }

  return NextResponse.json({ ok: true })
})
