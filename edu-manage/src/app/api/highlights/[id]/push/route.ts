import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const PATCH = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params

  await prisma.classHighlight.update({
    where: { id },
    data: { pushedToParent: true },
  })

  return NextResponse.json({ success: true })
})
