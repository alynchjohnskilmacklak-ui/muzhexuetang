import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MaterialAudience, MaterialSource } from '@prisma/client'
import {
  adminVisibleMaterialWhere,
  parentVisibleMaterialWhere,
  teacherVisibleMaterialWhere,
} from '@/lib/material-visibility'
import { resolveTeacherForUser } from '@/lib/performance'
import { apiHandler } from '@/lib/api-handler'
import { divisionWhere } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string }
  const role = user.role

  const { searchParams } = new URL(req.url)
  const grade = searchParams.get('grade') || undefined
  const subject = searchParams.get('subject') || undefined
  const audience = searchParams.get('audience') || undefined
  const source = searchParams.get('source') || undefined
  const teacherId = searchParams.get('teacherId') || undefined
  const includeDeleted = searchParams.get('includeDeleted') === 'true'

  let visibilityWhere = parentVisibleMaterialWhere()
  if (role === 'admin') {
    visibilityWhere = adminVisibleMaterialWhere(includeDeleted)
  } else if (role === 'teacher') {
    const teacher = await resolveTeacherForUser({
      id: user.id || '',
      email: user.email,
      name: user.name,
      role,
    })
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    visibilityWhere = teacherVisibleMaterialWhere(teacher.id, user.id)
  }

  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 20)))
  const division = searchParams.get('division')
  const where = {
    ...visibilityWhere,
    ...(grade ? { grade } : {}),
    ...(subject ? { subject } : {}),
    ...(audience && role === 'admin' ? { audience: audience as MaterialAudience } : {}),
    ...(source && role === 'admin' ? { source: source as MaterialSource } : {}),
    ...(teacherId && role === 'admin' ? { teacherId } : {}),
    ...(role === 'admin' ? { teacher: divisionWhere(division) } : {}),
  }

  const [materials, total] = await Promise.all([
    prisma.studyMaterial.findMany({
      where,
      include: {
        uploader: { select: { name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.studyMaterial.count({ where }),
  ])

  return NextResponse.json({ materials, total, page, limit })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

  await prisma.studyMaterial.update({ where: { id }, data: { status: 'DELETED' } })
  return NextResponse.json({ ok: true })
})
