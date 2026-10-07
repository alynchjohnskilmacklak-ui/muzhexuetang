import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisibleMaterialWhere } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'
import { listStudyMaterials } from '@/lib/material-list'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade') || undefined
  const subject = searchParams.get('subject') || undefined
  const teacherId = searchParams.get('teacherId') || undefined
  const materialType = searchParams.get('materialType') || undefined

  const { materials } = await listStudyMaterials(prisma, {
      ...parentVisibleMaterialWhere(),
      isLessonPreview: false,
      ...(grade ? { grade } : {}),
      ...(subject ? { subject } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(materialType ? { materialType: materialType as never } : {}),
  })

  return NextResponse.json({ materials })
})
