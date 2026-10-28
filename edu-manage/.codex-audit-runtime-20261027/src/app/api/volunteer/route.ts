import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { getVolunteerGuideForAdmin, getVolunteerGuideForParent, getOrCreateVolunteerGuide } from '@/lib/volunteer'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const guide = role === 'admin' || role === 'teacher'
    ? await getVolunteerGuideForAdmin()
    : await getVolunteerGuideForParent()
  return NextResponse.json(guide)
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const guide = await getOrCreateVolunteerGuide()
  const body = await req.json()
  const updated = await prisma.volunteerGuide.update({
    where: { id: guide.id },
    data: {
      ...(typeof body.title === 'string' ? { title: body.title.trim() || guide.title } : {}),
      ...(typeof body.subtitle === 'string' ? { subtitle: body.subtitle.trim() || null } : {}),
      ...(Number.isFinite(Number(body.year)) ? { year: Number(body.year) } : {}),
      ...(typeof body.isPublished === 'boolean' ? { isPublished: body.isPublished } : {}),
    },
    include: { steps: { orderBy: { order: 'asc' } }, documents: { orderBy: { sortOrder: 'asc' } } },
  })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json(updated)
})
