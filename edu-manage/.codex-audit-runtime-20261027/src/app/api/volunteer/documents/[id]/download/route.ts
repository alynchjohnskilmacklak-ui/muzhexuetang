import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const doc = await prisma.guideDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!doc.fileUrl.startsWith('/volunteer/docs/')) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

  const filePath = path.join(process.cwd(), 'public', doc.fileUrl)
  const buffer = await readFile(filePath)
  const encodedName = encodeURIComponent(doc.name)
  return new Response(buffer, {
    headers: {
      'Content-Type': doc.fileUrl.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}${doc.fileUrl.endsWith('.xlsx') ? '.xlsx' : '.txt'}`,
    },
  })
})
