import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

async function requireAdmin() {
  const session = await auth()
  return session?.user && (session.user as { role?: string }).role === 'admin' ? session : null
}

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const prisma = await getRequestPrisma()
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await req.json() as Record<string, unknown>
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : ''
  const type = body.type === 'praise' ? 'praise' : 'remind'
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 40) : ''
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 500) : ''
  if (!teacherId) return NextResponse.json({ error: '请选择教师' }, { status: 400 })
  if (!title) return NextResponse.json({ error: '请填写标题' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '请填写内容' }, { status: 400 })
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

  const message = await prisma.teacherMessage.create({
    data: {
      teacherId,
      type,
      title,
      content,
      createdById: (session.user as { id?: string }).id || 'admin',
    },
  })
  return NextResponse.json({ success: true, message })
})

export const GET = apiHandler(async (req: NextRequest) => {
  const prisma = await getRequestPrisma()
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const teacherId = req.nextUrl.searchParams.get('teacherId')
  const messages = await prisma.teacherMessage.findMany({
    where: teacherId ? { teacherId } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ messages })
})
