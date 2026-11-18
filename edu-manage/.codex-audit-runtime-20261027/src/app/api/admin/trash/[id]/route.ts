import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { purgeTrashRecord, restoreTrashRecord } from '@/lib/data-correction/trash'

export const PATCH = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { id } = await params
  const record = await restoreTrashRecord(prisma, id, user.id)
  return NextResponse.json({ success: true, data: record })
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { id } = await params
  const record = await purgeTrashRecord(prisma, id, user.id)
  return NextResponse.json({ success: true, data: record })
})
