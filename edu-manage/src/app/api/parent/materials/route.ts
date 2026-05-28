import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parentVisibleMaterialWhere } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade') || undefined
  const subject = searchParams.get('subject') || undefined
  const teacherId = searchParams.get('teacherId') || undefined

  const materials = await prisma.studyMaterial.findMany({
    where: {
      ...parentVisibleMaterialWhere(),
      ...(grade ? { grade } : {}),
      ...(subject ? { subject } : {}),
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      teacher: { select: { id: true, name: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ materials })
})
