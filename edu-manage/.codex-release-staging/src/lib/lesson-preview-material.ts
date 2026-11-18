import 'server-only'

import path from 'path'
import { MaterialAudience, MaterialSource, type PrismaClient } from '@prisma/client'
import { uploadBuffer } from '@/lib/storage'
import { isLessonTaughtBy, isWeekendLesson } from '@/lib/lesson-preview'
import { hasValidMaterialFileSignature } from '@/lib/material-file'

const MAX_PREVIEW_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z',
])

export class LessonPreviewPublishError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'LessonPreviewPublishError'
  }
}

function fileTypeFromExtension(extension: string) {
  if (extension === '.pdf') return 'pdf'
  if (['.doc', '.docx'].includes(extension)) return 'word'
  if (['.xls', '.xlsx'].includes(extension)) return 'excel'
  if (['.ppt', '.pptx'].includes(extension)) return 'ppt'
  if (['.zip', '.rar', '.7z'].includes(extension)) return 'archive'
  return 'image'
}

export function validateLessonPreviewFile(file: File) {
  const extension = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new LessonPreviewPublishError('仅支持 PDF、Word、Excel、PPT、图片和压缩包格式')
  }
  if (file.size > MAX_PREVIEW_FILE_SIZE) {
    throw new LessonPreviewPublishError('单个文件大小不能超过 50MB')
  }
  return { extension, fileType: fileTypeFromExtension(extension) }
}

type PublishActor =
  | { role: 'TEACHER'; userId: string; teacherId: string; division: string }
  | { role: 'ADMIN'; userId: string; division: string }

type PublishLessonPreviewInput = {
  prisma: PrismaClient
  actor: PublishActor
  classLessonId: string
  file: File
  title?: string | null
  description?: string | null
  allowAdminReplace?: boolean
}

export async function prepareLessonPreviewMaterial(input: PublishLessonPreviewInput) {
  const { prisma, actor, file } = input
  const { extension, fileType } = validateLessonPreviewFile(file)
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasValidMaterialFileSignature(buffer, extension)) {
    throw new LessonPreviewPublishError('文件内容与扩展名不匹配，请检查文件后重试')
  }
  const lesson = await prisma.classLesson.findFirst({
    where: {
      id: input.classLessonId,
      division: actor.division,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      group: { deletedAt: null, status: { not: 'ARCHIVED' } },
    },
    select: {
      id: true,
      teacherId: true,
      subject: true,
      lessonDate: true,
      group: {
        select: {
          id: true,
          teacherId: true,
          teacherAssignments: { select: { teacherId: true, subject: true } },
          term: { select: { kind: true, status: true } },
          course: { select: { grade: true, subject: true } },
        },
      },
    },
  })
  if (!lesson) throw new LessonPreviewPublishError('课次不存在或已取消', 404)
  if (!isWeekendLesson(lesson.lessonDate, lesson.group.term?.kind)) {
    throw new LessonPreviewPublishError('该课次不是周末课，不能发布周末课讲义', 403)
  }
  if (actor.role === 'ADMIN' && lesson.group.term?.status !== 'ACTIVE') {
    throw new LessonPreviewPublishError('历史运营批次只允许查看，不能发布讲义', 409)
  }
  if (actor.role === 'TEACHER' && !isLessonTaughtBy(lesson, actor.teacherId)) {
    throw new LessonPreviewPublishError('该课次不属于你的周末课，无法上传讲义', 403)
  }

  const subject = lesson.subject || lesson.group.course.subject
  const subjectTeacher = lesson.group.teacherAssignments.find((assignment) => assignment.subject === subject)?.teacherId
  const teacherId = actor.role === 'TEACHER'
    ? actor.teacherId
    : lesson.teacherId || subjectTeacher || lesson.group.teacherId
  const grade = lesson.group.course.grade
  if (!teacherId || !grade || !subject) {
    throw new LessonPreviewPublishError('课次缺少教师、年级或学科信息，暂时无法发布')
  }

  const existing = await prisma.studyMaterial.findUnique({
    where: { classLessonId: lesson.id },
    select: { id: true, status: true },
  })
  if (actor.role === 'ADMIN' && existing && existing.status !== 'DELETED' && !input.allowAdminReplace) {
    throw new LessonPreviewPublishError('这个课次已经有讲义，请刷新清单后重新选择', 409)
  }

  const stored = await uploadBuffer(buffer, {
    originalName: file.name,
    mimeType: file.type,
    prefix: 'materials/lesson-previews',
    allowLocalFallback: true,
  })
  const title = input.title?.trim() || file.name.replace(/\.[^.]+$/, '')
  const data = {
    title,
    grade,
    subject,
    description: input.description?.trim() || null,
    fileUrl: stored.storageKey,
    fileName: file.name,
    fileSize: file.size,
    fileType,
    storageDriver: stored.storageDriver,
    uploadedBy: actor.userId,
    uploadedByRole: actor.role,
    uploadedByAdminId: actor.role === 'ADMIN' ? actor.userId : null,
    teacherId,
    source: actor.role === 'ADMIN' ? MaterialSource.ADMIN : MaterialSource.TEACHER,
    audience: MaterialAudience.STUDENT,
    status: 'PUBLISHED' as const,
    tags: [] as string[],
    classLessonId: lesson.id,
    isLessonPreview: true,
    deletedAt: null,
    deletedById: null,
    deletionBatchId: null,
  }

  return { existingId: existing?.id || null, data, groupId: lesson.group.id, lessonDate: lesson.lessonDate }
}

export async function persistPreparedLessonPreviewMaterial(
  prisma: Pick<PrismaClient, 'studyMaterial'>,
  prepared: Awaited<ReturnType<typeof prepareLessonPreviewMaterial>>,
) {
  return prepared.existingId
    ? prisma.studyMaterial.update({ where: { id: prepared.existingId }, data: prepared.data })
    : prisma.studyMaterial.create({ data: prepared.data })
}

export async function publishLessonPreviewMaterial(input: PublishLessonPreviewInput) {
  const prepared = await prepareLessonPreviewMaterial(input)
  const main = await input.prisma.$transaction((tx) => persistPreparedLessonPreviewMaterial(tx, prepared))

  // 连堂合并：同 group 当天其他节自动复用同一份讲义（不重复存文件）
  try {
    const siblingLessons = await input.prisma.classLesson.findMany({
      where: {
        lessonDate: prepared.lessonDate,
        groupId: prepared.groupId,
        id: { not: input.classLessonId },
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      },
      select: { id: true },
    })
    for (const sib of siblingLessons) {
      const existing = await input.prisma.studyMaterial.findUnique({ where: { classLessonId: sib.id }, select: { id: true } })
      if (existing) continue
      await input.prisma.studyMaterial.create({
        data: { ...prepared.data, classLessonId: sib.id } as never,
      })
    }
  } catch { /* 复制失败不阻断主流程 */ }

  return main
}
