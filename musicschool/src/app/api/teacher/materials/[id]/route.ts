import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { normalizeMaterialAudience, normalizeMaterialStatus } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function assertOwnMaterial(id: string) {
  const { user, teacher } = await requireCurrentTeacher()
  const material = await prisma.studyMaterial.findFirst({
    where: {
      id,
      status: { not: 'DELETED' },
      OR: [{ teacherId: teacher.id }, { uploadedBy: user.id }],
    },
  })
  return { user, teacher, material }
}

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const { material } = await assertOwnMaterial(id)
    if (!material) return NextResponse.json({ error: '无权编辑该资料' }, { status: 403 })
    const body = await req.json()

    const updated = await prisma.studyMaterial.update({
      where: { id },
      data: {
        title: body.title,
        grade: body.grade,
        subject: body.subject,
        description: body.description ?? null,
        audience: body.audience ? normalizeMaterialAudience(body.audience) : undefined,
        status: body.status ? normalizeMaterialStatus(body.status) : undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const { material } = await assertOwnMaterial(id)
    if (!material) return NextResponse.json({ error: '无权删除该资料' }, { status: 403 })

    await prisma.studyMaterial.update({
      where: { id },
      data: { status: 'DELETED' },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
})
