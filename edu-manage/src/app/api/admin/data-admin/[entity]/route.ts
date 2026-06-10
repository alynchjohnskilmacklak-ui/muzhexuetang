import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DATA_ADMIN_ENTITIES,
  filterEditableFields,
  sanitizeDataAdminRecord,
  createActivityLog,
  type EntityKey,
} from '@/lib/data-admin/entities'

const ALLOWED_ENTITIES = Object.keys(DATA_ADMIN_ENTITIES)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {

  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const url = req.nextUrl
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
  const includeDeleted = url.searchParams.get('includeDeleted') === 'true'

  const where: Record<string, unknown> = {}

  if (!includeDeleted) {
    const softDelete = { field: 'status', deletedValue: 'DELETED' }
    const scMap: Record<EntityKey, { field: string; deletedValue: string } | undefined> = {
      students: { field: 'status', deletedValue: 'INACTIVE' },
      teachers: { field: 'status', deletedValue: 'RESIGNED' },
      'class-groups': { field: 'status', deletedValue: 'ARCHIVED' },
      'class-lessons': { field: 'status', deletedValue: 'CANCELLED' },
      'exam-papers': { field: 'status', deletedValue: 'DELETED' },
      notifications: { field: 'status', deletedValue: 'DELETED' },
      materials: { field: 'status', deletedValue: 'DELETED' },
      'classroom-feedbacks': { field: 'status', deletedValue: 'DELETED' },
      enrollments: undefined,
      attendances: undefined,
      'performance-posts': undefined,
      meals: undefined,
    }
    const sc = scMap[entityKey]
    if (sc) {
      where[sc.field] = { not: sc.deletedValue }
    }
    if (entityKey === 'performance-posts') {
      where['deletedAt'] = null
    }
  }

  if (search && def.searchableFields.length > 0) {
    const or = def.searchableFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }))
    where['OR'] = or
  }

  if (status && def.filterableFields.includes('status')) {
    where['status'] = status
  }

  const prismaModel = (prisma as any)[def.model]
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const [total, records] = await Promise.all([
      prismaModel.count({ where }),
      prismaModel.findMany({
        where,
        orderBy: { [def.defaultSort.field]: def.defaultSort.order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: sanitizeDataAdminRecord(records),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('data-admin GET error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {

  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const body = await req.json()
  const data = filterEditableFields(entityKey, body)

  const prismaModel = (prisma as any)[def.model]
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const record = await prismaModel.create({ data })
    await createActivityLog(session.user.id, 'DATA_ADMIN_CREATE', def.model, record.id, { created: data })
    return NextResponse.json({ success: true, data: sanitizeDataAdminRecord(record) })
  } catch (error) {
    console.error('data-admin POST error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
