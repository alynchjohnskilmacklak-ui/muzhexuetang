import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisibleMaterialWhere, teacherVisibleMaterialWhere } from '@/lib/material-visibility'
import { resolveTeacherForUser } from '@/lib/performance'
import { apiHandler } from '@/lib/api-handler'
import { readStoredBuffer } from '@/lib/storage'
import { parentVisibleLessonWhere } from '@/lib/business-visibility'
import { teacherLessonWhere } from '@/lib/teacher-portal'
import { canRoleAccessMaterialAudience, materialContentType } from '@/lib/material-file'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

async function wordPreviewResponse(buffer: Buffer, title: string) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  const safeTitle = escapeHtml(title)
  const safeText = escapeHtml(result.value || '文档暂无可提取的文字内容')
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{margin:0;background:#faf8f5;color:#1a1201;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}.page{box-sizing:border-box;max-width:860px;min-height:100vh;margin:0 auto;padding:32px 28px;background:#fff}.title{margin:0 0 24px;font-size:22px}.content{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.85}@media(max-width:600px){.page{padding:22px 18px}.title{font-size:19px}.content{font-size:15px}}</style></head><body><main class="page"><h1 class="title">${safeTitle}</h1><div class="content">${safeText}</div></main></body></html>`
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}

/**
 * 从 fileUrl 解析存储 key：
 * - local driver：key 即相对路径（uploads/xxx）
 * - aliyun-oss：若 fileUrl 存了完整 URL，取 URL 路径部分作为对象 key
 */
function resolveStorageKey(fileUrl: string, storageDriver?: string): string {
  if (storageDriver === 'aliyun-oss' && /^https?:\/\//i.test(fileUrl)) {
    try {
      const pathname = new URL(fileUrl).pathname
      return decodeURIComponent(pathname.replace(/^\/+/, ''))
    } catch { /* 解析失败则回退原值 */ }
  }
  return fileUrl
}

/** 读取文件内容：优先按记录驱动读，失败后降级尝试另一驱动，最终返回 null */
async function tryReadStoredBuffer(fileUrl: string, storageDriver?: string): Promise<Buffer | null> {
  const primary = storageDriver || 'local'
  const attempts: Array<{ driver: string; key: string }> = []
  attempts.push({ driver: primary, key: resolveStorageKey(fileUrl, primary) })
  const fallbackDriver = primary === 'aliyun-oss' ? 'local' : 'aliyun-oss'
  attempts.push({ driver: fallbackDriver, key: resolveStorageKey(fileUrl, fallbackDriver) })
  for (const attempt of attempts) {
    try {
      return await readStoredBuffer(attempt.key, attempt.driver)
    } catch { /* 尝试下一个 */ }
  }
  return null
}

export const GET = apiHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string }
  const prisma = await getRequestPrisma()

  const { id } = await params
  const material = await prisma.studyMaterial.findUnique({ where: { id } })
  if (!material) return NextResponse.json({ error: '资料不存在' }, { status: 404 })
  if (material.status === 'DELETED' && user.role !== 'admin') {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 })
  }

  // audience 鉴权：角色不在可见范围内则 403
  if (!canRoleAccessMaterialAudience(user.role, material.audience)) {
    return NextResponse.json({ error: '无权限查看该资料' }, { status: 403 })
  }

  // 教师/家长需通过 visibilityWhere 进一步校验
  let allowed = user.role === 'admin'
  if (!allowed && user.role === 'teacher') {
    const teacher = await resolveTeacherForUser({
      id: user.id || '',
      email: user.email,
      name: user.name,
      role: user.role,
    }, prisma)
    if (teacher) {
      const matched = material.isLessonPreview && material.classLessonId
        ? await prisma.classLesson.findFirst({ where: { id: material.classLessonId, ...teacherLessonWhere(teacher.id) }, select: { id: true } })
        : await prisma.studyMaterial.findFirst({
            where: { id, ...teacherVisibleMaterialWhere(teacher.id, user.id) },
            select: { id: true },
          })
      allowed = !!matched
    }
  }
  if (!allowed && user.role === 'parent') {
    let matched: { id: string } | null = null
    if (material.isLessonPreview && material.classLessonId && material.status === 'PUBLISHED') {
      matched = await prisma.classLesson.findFirst({
        where: { id: material.classLessonId, ...parentVisibleLessonWhere(user.id || '') },
        select: { id: true },
      })
    } else {
      matched = await prisma.studyMaterial.findFirst({
        where: { id, ...parentVisibleMaterialWhere() },
        select: { id: true },
      })
    }
    allowed = !!matched
  }
  if (!allowed) return NextResponse.json({ error: '无权限查看该资料' }, { status: 403 })

  const download = new URL(req.url).searchParams.get('download') === '1'

  // 本地与 OSS 文件都由本站鉴权后代理返回，避免微信内置浏览器跳转到
  // 临时 OSS 域名时触发“无法确认是否安全”，也保证 PDF 可以同源预览。
  if (material.storageDriver === 'local' || material.storageDriver === 'aliyun-oss') {
    const buffer = await tryReadStoredBuffer(material.fileUrl, material.storageDriver)
    if (!buffer) {
      return NextResponse.json({ error: '资料文件不存在或已被清理，请联系管理员重新上传' }, { status: 404 })
    }
    await prisma.studyMaterial.update({ where: { id }, data: { downloads: { increment: 1 } } })
    const ext = path.extname(material.fileName).toLowerCase()
    if (!download && material.fileType === 'word' && ext === '.docx') return wordPreviewResponse(buffer, material.title)
    const inlinePreview = !download && ['pdf', 'image'].includes(material.fileType)
    const encodedName = encodeURIComponent(material.fileName)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': materialContentType(material.fileType, ext),
        'Content-Disposition': `${inlinePreview ? 'inline' : 'attachment'}; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  }

  // -- 以下为本地文件逻辑 --

  const relativePath = material.fileUrl.replace(/^\/+/, '')
  if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
  }
  const filePath = path.join(process.cwd(), 'public', relativePath)
  const publicRoot = path.resolve(process.cwd(), 'public')
  if (!path.resolve(filePath).startsWith(publicRoot + path.sep) && path.resolve(filePath) !== publicRoot) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: '资料文件不存在或已被清理，请联系管理员重新上传' }, { status: 404 })
  }

  await prisma.studyMaterial.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  })

  const ext = path.extname(material.fileName).toLowerCase()
  if (!download && material.fileType === 'word' && ext === '.docx') return wordPreviewResponse(buffer, material.title)
  const inlinePreview = !download && ['pdf', 'image'].includes(material.fileType)
  const encodedName = encodeURIComponent(material.fileName)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': materialContentType(material.fileType, ext),
      'Content-Disposition': `${inlinePreview ? 'inline' : 'attachment'}; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
})
