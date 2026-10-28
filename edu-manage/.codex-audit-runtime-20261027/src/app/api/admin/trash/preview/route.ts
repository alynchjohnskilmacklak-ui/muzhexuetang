import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { previewDeletion, type TrashEntityType } from '@/lib/data-correction/trash'

const TYPES = new Set<TrashEntityType>(['ClassGroup', 'Student', 'ClassLesson', 'ExamPaper', 'StudyMaterial', 'FileAsset'])

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('type') as TrashEntityType
  const entityId = searchParams.get('id') || ''
  if (!TYPES.has(entityType) || !entityId) return NextResponse.json({ error: '参数无效' }, { status: 400 })
  const prisma = await getRequestPrisma()
  const preview = await previewDeletion(prisma, entityType, entityId)
  if (!preview) return NextResponse.json({ error: '记录不存在或已删除' }, { status: 404 })
  return NextResponse.json({ success: true, data: preview })
})
