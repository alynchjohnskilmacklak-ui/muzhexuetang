import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import {
  normalizeMaterialAudience,
  normalizeMaterialStatus,
  teacherOwnMaterialWhere,
  teacherVisibleMaterialWhere,
} from '@/lib/material-visibility'
import { MaterialAudience, MaterialSource } from '@prisma/client'
import { LessonPreviewPublishError, publishLessonPreviewMaterial } from '@/lib/lesson-preview-material'
import { detectMaterialFileType, hasValidMaterialFileSignature, isAllowedMaterialExtension } from '@/lib/material-file'
import { StorageConfigurationError, uploadBuffer } from '@/lib/storage'
import { listStudyMaterials } from '@/lib/material-list'
import { compressPdfIfNeeded } from '@/lib/compress-pdf'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
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

    const { materials } = await listStudyMaterials(prisma, {
        ...tabWhere,
        isLessonPreview: false,
        ...(grade ? { grade } : {}),
        ...(subject ? { subject } : {}),
    })

    return NextResponse.json({ materials })
})

export const POST = apiHandler(async (req: NextRequest) => {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const grade = formData.get('grade') as string | null
    const subject = formData.get('subject') as string | null
    const description = formData.get('description') as string | null
    const audience = normalizeMaterialAudience(formData.get('audience'))
    const status = normalizeMaterialStatus(formData.get('status'))
    const rawType = String(formData.get('materialType') || '').trim().toUpperCase()
    const validTypes = ['TEXTBOOK','HANDOUT','EXERCISE','EXAM','ANSWER','REFERENCE']
    const materialType = validTypes.includes(rawType) ? rawType : 'HANDOUT'
    const tags = String(formData.get('tags') || '')
      .split(/[,，\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
    const classLessonId = String(formData.get('classLessonId') || '').trim() || null

    if (classLessonId) {
      if (!file || !title) return NextResponse.json({ error: '请选择文件并填写讲义标题' }, { status: 400 })
      try {
        const material = await publishLessonPreviewMaterial({
          prisma,
          actor: { role: 'TEACHER', userId: user.id, teacherId: teacher.id, division: user.division },
          classLessonId,
          file,
          title,
          description,
        })
        return NextResponse.json(material, { status: 201 })
      } catch (error) {
        if (error instanceof LessonPreviewPublishError) {
          return NextResponse.json({ error: error.message }, { status: error.status })
        }
        throw error
      }
    }

    const resolvedGrade = grade
    const resolvedSubject = subject
    if (!file || !title || !resolvedGrade || !resolvedSubject) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!isAllowedMaterialExtension(ext)) {
      return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasValidMaterialFileSignature(buffer, ext)) {
      return NextResponse.json({ error: '文件内容与扩展名不匹配，请检查文件后重试' }, { status: 400 })
    }

    // PDF > 3MB 自动压缩（手机端加载优化），失败则降级用原文件
    let finalBuffer: Buffer = buffer
    if (ext === '.pdf') {
      finalBuffer = await compressPdfIfNeeded(buffer)
    }

    let stored
    try {
      stored = await uploadBuffer(finalBuffer, {
        originalName: file.name,
        mimeType: file.type,
        prefix: 'materials',
      })
    } catch (error) {
      if (error instanceof StorageConfigurationError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      throw error
    }

    const fileType = detectMaterialFileType(ext)

    const data = {
        title,
        grade: resolvedGrade,
        subject: resolvedSubject,
        description: description || null,
        fileUrl: stored.storageKey,
        fileName: file.name,
        fileSize: finalBuffer.length,
        fileType,
        materialType: materialType as never,
        storageDriver: stored.storageDriver,
        uploadedBy: user.id,
        uploadedByRole: 'TEACHER',
        uploadedByAdminId: null,
        teacherId: teacher.id,
        source: MaterialSource.TEACHER,
        audience,
        status,
        tags,
        classLessonId: null,
        isLessonPreview: false,
      }
    const material = await prisma.studyMaterial.create({ data })

    return NextResponse.json(material, { status: 201 })
})
