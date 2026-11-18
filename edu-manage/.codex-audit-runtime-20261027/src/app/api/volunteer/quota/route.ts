import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { getOrCreateVolunteerGuide } from '@/lib/volunteer'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const guide = await getOrCreateVolunteerGuide()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const district = searchParams.get('district') || ''

  const where = {
    guideId: guide.id,
    ...(district ? { district } : {}),
    ...(q ? { OR: [{ schoolName: { contains: q } }, { district: { contains: q } }, { note: { contains: q } }] } : {}),
  }
  const records = await prisma.quotaRecord.findMany({
    where,
    orderBy: [{ district: 'asc' }, { schoolName: 'asc' }],
    take: 2000,
  })
  const districts = await prisma.quotaRecord.findMany({
    where: { guideId: guide.id },
    select: { district: true },
    distinct: ['district'],
    orderBy: { district: 'asc' },
  })
  return NextResponse.json({ records, districts: districts.map((item) => item.district) })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const guide = await getOrCreateVolunteerGuide()
  const body = await req.json()
  const record = await prisma.quotaRecord.create({
    data: {
      guideId: guide.id,
      schoolName: String(body.schoolName || '').trim(),
      district: String(body.district || '').trim(),
      allocQuota: Number(body.allocQuota || 0),
      normalQuota: Number(body.normalQuota || 0),
      totalQuota: Number(body.totalQuota || 0),
      note: body.note ? String(body.note) : null,
      year: Number(body.year || guide.year),
    },
  })
  return NextResponse.json(record, { status: 201 })
})
