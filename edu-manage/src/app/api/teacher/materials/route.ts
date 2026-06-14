import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import {
  normalizeMaterialAudience,
  normalizeMaterialStatus,
  teacherOwnMaterialWhere,
  teacherVisibleMaterialWhere,
} from '@/lib/material-visibility'
import { MaterialAudience, MaterialSource } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const { searchParams } = new URL(req.url)
    const tab = searchParams.get('tab') || 'all'
    const grade = searchParams.get('grade') || undefined
    const subject = searchParams.get('subject') || undefined

    const tabWhere =
      tab === 'student'
        ? { status: 'PUBLISHED' as const, audience: { in: [MaterialAudience.STUDENT, MaterialAudience.BOTH] } }
        : tab === 'teacher'
        ? { status: 'PUBLISHED' as const, audience: { in: [MaterialAudience.TEACHER, MaterialAudience.BOTH] } }
        : tab === 'mine'
        ? teacherOwnMaterialWhere(teacher.id, user.id)
        : teacherVisibleMaterialWhere(teacher.id, user.id)

    const materials = await prisma.studyMaterial.findMany({
      where: {
        ...tabWhere,
        ...(grade ? { grade } : {}),
        ...(subject ? { subject } : {}),
      },
      include: {
        uploader: { select: { name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ materials })
  } catch (err) {
    console.error('[teacher:materials]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const grade = formData.get('grade') as string | null
    const subject = formData.get('subject') as string | null
    const description = formData.get('description') as string | null
    const audience = normalizeMaterialAudience(formData.get('audience'))
    const status = normalizeMaterialStatus(formData.get('status'))
    const tags = String(formData.get('tags') || '')
      .split(/[,，\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (!file || !title || !grade || !subject) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z']
    const ext = path.extname(file.name).toLowerCase()
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
    }

    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, storedName), Buffer.from(await file.arrayBuffer()))

    const fileType = ext === '.pdf'
      ? 'pdf'
      : ['.doc', '.docx'].includes(ext)
      ? 'word'
      : ['.xls', '.xlsx'].includes(ext)
      ? 'excel'
      : ['.ppt', '.pptx'].includes(ext)
      ? 'ppt'
      : ['.zip', '.rar', '.7z'].includes(ext)
      ? 'archive'
      : 'image'

    const material = await prisma.studyMaterial.create({
      data: {
        title,
        grade,
        subject,
        description: description || null,
        fileUrl: `/uploads/materials/${storedName}`,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        uploadedBy: user.id,
        teacherId: teacher.id,
        source: MaterialSource.TEACHER,
        audience,
        status,
        tags,
      },
    })

    return NextResponse.json(material, { status: 201 })
  } catch (err) {
    console.error('[teacher:materials]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}
