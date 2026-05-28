import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function requireEditor() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!['admin', 'teacher'].includes(role || '')) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return {}
}

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireEditor()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await req.json()
  const content = typeof body.content === 'string' ? body.content.trim() : undefined
  const isPublished = typeof body.isPublished === 'boolean' ? body.isPublished : undefined
  if (isPublished && !content) return NextResponse.json({ error: '步骤内容为空，不能发布' }, { status: 400 })

  const step = await prisma.guideStep.update({
    where: { id },
    data: {
      ...(typeof body.title === 'string' ? { title: body.title.trim() || '未命名步骤' } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(typeof body.tipContent === 'string' ? { tipContent: body.tipContent.trim() || null } : {}),
      ...(typeof body.imageUrl === 'string' ? { imageUrl: body.imageUrl || null } : {}),
      ...(Array.isArray(body.batchTags) ? { batchTags: body.batchTags.filter((item: unknown): item is string => typeof item === 'string') } : {}),
      ...(isPublished !== undefined ? { isPublished } : {}),
    },
  })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json(step)
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireEditor()
  if (guard.error) return guard.error

  const { id } = await params
  await prisma.guideStep.delete({ where: { id } })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json({ success: true })
})
