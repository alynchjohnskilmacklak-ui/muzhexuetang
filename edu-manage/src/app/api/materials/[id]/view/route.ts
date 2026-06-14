import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisibleMaterialWhere, teacherVisibleMaterialWhere } from '@/lib/material-visibility'
import { resolveTeacherForUser } from '@/lib/performance'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function contentTypeFor(fileType: string, fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (fileType === 'pdf') return 'application/pdf'
  if (fileType === 'word') return ext === '.doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (fileType === 'excel') return ext === '.xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (fileType === 'ppt') return ext === '.ppt' ? 'application/vnd.ms-powerpoint' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (fileType === 'archive') return 'application/octet-stream'
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export const GET = apiHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string }
  const prisma = await getRequestPrisma()

  const { id } = await params
  const material = await prisma.studyMaterial.findUnique({ where: { id } })
  if (!material) return NextResponse.json({ error: '资料不存在' }, { status: 404 })

  let allowed = user.role === 'admin' && material.status !== 'DELETED'
  if (!allowed && user.role === 'teacher') {
    const teacher = await resolveTeacherForUser({
      id: user.id || '',
      email: user.email,
      name: user.name,
      role: user.role,
    })
    if (teacher) {
      const matched = await prisma.studyMaterial.findFirst({
        where: { id, ...teacherVisibleMaterialWhere(teacher.id, user.id) },
        select: { id: true },
      })
      allowed = !!matched
    }
  }
  if (!allowed && user.role === 'parent') {
    const matched = await prisma.studyMaterial.findFirst({
      where: { id, ...parentVisibleMaterialWhere() },
      select: { id: true },
    })
    allowed = !!matched
  }
  if (!allowed) return NextResponse.json({ error: '无权限查看该资料' }, { status: 403 })

  const download = new URL(req.url).searchParams.get('download') === '1'
  const relativePath = material.fileUrl.replace(/^\/+/, '')
  if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
  }
  const filePath = path.join(process.cwd(), 'public', relativePath)
  const publicRoot = path.resolve(process.cwd(), 'public')
  if (!path.resolve(filePath).startsWith(publicRoot + path.sep) && path.resolve(filePath) !== publicRoot) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
  }

  if (material.fileType === 'word' && !download) {
    await prisma.studyMaterial.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    })

    const baseUrl = process.env.NEXTAUTH_URL || ''
    const publicFileUrl = `${baseUrl.replace(/\/$/, '')}${material.fileUrl}`
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicFileUrl)}&embedded=true`
    return NextResponse.json({ type: 'word', viewerUrl })
  }

  await prisma.studyMaterial.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  })

  const buffer = await readFile(filePath)
  const inlinePreview = !download && ['pdf', 'image'].includes(material.fileType)
  const encodedName = encodeURIComponent(material.fileName)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentTypeFor(material.fileType, material.fileName),
      'Content-Disposition': `${inlinePreview ? 'inline' : 'attachment'}; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
})
