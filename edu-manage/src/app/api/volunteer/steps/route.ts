import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { getOrCreateVolunteerGuide } from '@/lib/volunteer'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function isEditor(role?: string) {
  return role === 'admin' || role === 'teacher'
}

export const GET = apiHandler(async () => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const guide = await getOrCreateVolunteerGuide()
  const steps = await prisma.guideStep.findMany({
    where: { guideId: guide.id, ...(isEditor(role) ? {} : { isPublished: true }) },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json({ steps })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isEditor(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const guide = await getOrCreateVolunteerGuide()
  const body = await req.json()
  const count = await prisma.guideStep.count({ where: { guideId: guide.id } })
  const step = await prisma.guideStep.create({
    data: {
      guideId: guide.id,
      order: count + 1,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : `新步骤 ${count + 1}`,
      content: typeof body.content === 'string' ? body.content : '',
      tipContent: typeof body.tipContent === 'string' ? body.tipContent : null,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
      batchTags: Array.isArray(body.batchTags) ? body.batchTags.filter((item: unknown): item is string => typeof item === 'string') : [],
      isPublished: false,
    },
  })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json(step, { status: 201 })
})
