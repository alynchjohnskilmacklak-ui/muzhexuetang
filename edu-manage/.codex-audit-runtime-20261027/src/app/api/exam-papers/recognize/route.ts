import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { fetchWithTimeout } from '@/lib/ai/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_MASTERY = ['MASTERED', 'NEEDS_REVIEW', 'NEEDS_PRACTICE'] as const
const MAX_FILE_BYTES = 3 * 1024 * 1024       // 3 MB per image
const MAX_TOTAL_BYTES = 10 * 1024 * 1024     // 10 MB combined base64 payload
const MAX_IMAGES = 4
const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function safeRelativePath(raw: string) {
  const decoded = decodeURIComponent(raw || '').replace(/\\/g, '/')
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '')
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null
  return normalized
}

function uploadRoots() {
  const cwd = process.cwd()
  return [
    path.join(cwd, 'public', 'uploads'),
    path.join(cwd, '..', 'public', 'uploads'),
    path.join(cwd, '..', '..', 'public', 'uploads'),
  ]
}

async function findUploadedFile(relativePath: string) {
  for (const root of uploadRoots()) {
    const rootPath = path.resolve(root)
    const filePath = path.resolve(rootPath, relativePath)
    if (!filePath.startsWith(rootPath + path.sep) && filePath !== rootPath) continue
    try {
      const info = await stat(filePath)
      if (info.isFile()) return filePath
    } catch {
      // Try the next possible runtime root.
    }
  }
  return null
}

async function toVisionImageUrl(rawUrl: string, req: NextRequest) {
  const origin = req.headers.get('origin') || `https://${req.headers.get('host') || 'muzhexuetang.xyz'}`
  let url = rawUrl
  try {
    const parsed = new URL(rawUrl, origin)
    url = parsed.pathname
  } catch {
    // Keep raw relative URL.
  }

  if (url.startsWith('/api/uploads/') || url.startsWith('/uploads/')) {
    const relative = safeRelativePath(url.replace(/^\/api\/uploads\//, '').replace(/^\/uploads\//, ''))
    if (!relative) throw new Error('INVALID_FILE')
    const filePath = await findUploadedFile(relative)
    if (!filePath) throw new Error('FILE_NOT_FOUND')
    const info = await stat(filePath)
    if (info.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')
    const ext = relative.split('.').pop()?.toLowerCase() || 'jpg'
    const mime = CONTENT_TYPES[ext] || 'image/jpeg'
    const buffer = await readFile(filePath)
    return { url: `data:${mime};base64,${buffer.toString('base64')}`, size: buffer.length }
  }

  const resolvedUrl = rawUrl.startsWith('http') ? rawUrl : `${origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
  return { url: resolvedUrl, size: 0 }
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || !['admin', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const imageUrls: string[] = Array.isArray(body.imageUrls) ? body.imageUrls.filter((u: unknown) => typeof u === 'string') : []
  const subject = typeof body.subject === 'string' ? body.subject : ''
  if (imageUrls.length === 0) {
    return NextResponse.json({ error: '\u8bf7\u5148\u4e0a\u4f20\u8bd5\u5377\u56fe\u7247\u518d\u8bc6\u522b' }, { status: 400 })
  }

  const apiKey = process.env.KIMI_API_KEY || ''
  const visionModel = process.env.KIMI_VISION_MODEL || 'moonshot-v1-vision-preview'
  if (!apiKey) {
    return NextResponse.json({ error: 'AI \u8bc6\u522b\u672a\u914d\u7f6e\uff08\u7f3a\u5c11 KIMI_API_KEY\uff09' }, { status: 503 })
  }

  const prompt = `\u4f60\u662f\u4e00\u4f4d${subject || ''}\u9605\u5377\u8001\u5e08\u3002\u8bf7\u8bc6\u522b\u8bd5\u5377\u56fe\u7247\u4e2d\u7684\u6240\u6709\u9898\u76ee\uff0c\u9010\u9898\u8f93\u51fa\u3002
\u5bf9\u6bcf\u9053\u9898\u5224\u65ad\u5b66\u751f\u4f5c\u7b54\u60c5\u51b5\uff0c\u8f93\u51fa JSON \u6570\u7ec4\uff0c\u6bcf\u4e2a\u5143\u7d20\u683c\u5f0f\uff1a
{"order": \u9898\u53f7\u6570\u5b57, "topic": "\u77e5\u8bc6\u70b9\u6216\u7b80\u77ed\u63cf\u8ff0(20\u5b57\u5185)", "mastery": "MASTERED \u6216 NEEDS_REVIEW \u6216 NEEDS_PRACTICE", "teacherNote": "\u7b80\u77ed\u70b9\u8bc4(\u53ef\u7a7a)"}
\u5224\u65ad\u6807\u51c6\uff1a\u7b54\u5bf9\u4e14\u89c4\u8303=MASTERED\uff0c\u6709\u5c0f\u9519\u6216\u4e0d\u786e\u5b9a=NEEDS_REVIEW\uff0c\u660e\u663e\u9519\u8bef=NEEDS_PRACTICE\u3002
\u53ea\u8fd4\u56de JSON \u6570\u7ec4\u672c\u8eab\uff0c\u4e0d\u8981\u4efb\u4f55\u989d\u5916\u6587\u5b57\uff0c\u4e0d\u8981 markdown \u4ee3\u7801\u5757\u3002`

  try {
    const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }]
    let totalBytes = 0
    for (const url of imageUrls.slice(0, MAX_IMAGES)) {
      const { url: resolvedUrl, size } = await toVisionImageUrl(url, req)
      totalBytes += size
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: '试卷图片总大小超过 10MB 限制，请压缩后重试或减少图片数量' }, { status: 413 })
      }
      content.push({ type: 'image_url', image_url: { url: resolvedUrl } })
    }

    const res = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: visionModel, messages: [{ role: 'user', content }], temperature: 1 }),
    }, 55_000)

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json({ error: `AI \u8bc6\u522b\u5931\u8d25\uff1a${detail.slice(0, 120) || res.status}` }, { status: 502 })
    }

    const data = await res.json()
    let text: string = data?.choices?.[0]?.message?.content || ''
    text = text.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      parsed = match ? JSON.parse(match[0]) : []
    }
    if (!Array.isArray(parsed)) parsed = []

    const questions = (parsed as Array<Record<string, unknown>>).map((q, i) => ({
      order: typeof q.order === 'number' ? q.order : i + 1,
      topic: String(q.topic || '').slice(0, 60),
      mastery: VALID_MASTERY.includes(String(q.mastery) as typeof VALID_MASTERY[number]) ? String(q.mastery) : 'NEEDS_REVIEW',
      teacherNote: String(q.teacherNote || '').slice(0, 120),
    }))

    return NextResponse.json({ questions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'FILE_TOO_LARGE') {
      return NextResponse.json({ error: `\u5355\u5f20\u8bd5\u5377\u56fe\u7247\u8d85\u8fc7 ${MAX_FILE_BYTES / 1024 / 1024}MB \u9650\u5236\uff0c\u8bf7\u538b\u7f29\u540e\u91cd\u8bd5` }, { status: 413 })
    }
    if (msg === 'INVALID_FILE' || msg === 'FILE_NOT_FOUND') {
      return NextResponse.json({ error: '\u8bd5\u5377\u56fe\u7247\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u4e0a\u4f20' }, { status: 400 })
    }
    return NextResponse.json({ error: 'AI \u8bc6\u522b\u8d85\u65f6\u6216\u56fe\u7247\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u6216\u624b\u52a8\u6807\u6ce8' }, { status: 504 })
  }
})
