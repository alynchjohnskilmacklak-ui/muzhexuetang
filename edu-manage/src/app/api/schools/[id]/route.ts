import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const PUT = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const role = (session?.user as Record<string, unknown> | undefined)?.role
  if (!session?.user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const data = await req.json()
  const userId = (session.user as Record<string, string>).id

  delete data.id
  delete data.schoolId

  const school = await prisma.highSchoolInfo.update({
    where: { id },
    data: { ...data, updatedBy: userId },
  })

  return NextResponse.json(school)
})
