import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'

export const dynamic = 'force-dynamic'

const MAX_DRAFT_BYTES = 96 * 1024
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, maxItems).map((item) => item.slice(0, maxLength))
    : []
}

function cleanStringMap(value: unknown, maxItems: number, maxLength: number) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .slice(0, maxItems)
    .map(([key, text]) => [key.slice(0, 160), text.slice(0, maxLength)]))
}

function sanitizeDraft(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const draft = value as Record<string, unknown>
  const rawPerf = draft.studentPerf && typeof draft.studentPerf === 'object' && !Array.isArray(draft.studentPerf)
    ? draft.studentPerf as Record<string, unknown>
    : {}
  const studentPerf = Object.fromEntries(Object.entries(rawPerf)
    .filter((entry): entry is [string, 'GREAT' | 'OKAY' | 'NEEDS_IMPROVEMENT'] =>
      entry[1] === 'GREAT' || entry[1] === 'OKAY' || entry[1] === 'NEEDS_IMPROVEMENT')
    .slice(0, 5)
    .map(([studentId, level]) => [studentId.slice(0, 160), level]))
  const rawPerfTags = draft.studentTags && typeof draft.studentTags === 'object' && !Array.isArray(draft.studentTags)
    ? draft.studentTags as Record<string, unknown>
    : {}
  const studentTags = Object.fromEntries(Object.entries(rawPerfTags)
    .filter((entry): entry is [string, unknown] => Array.isArray(entry[1]))
    .slice(0, 5)
    .map(([studentId, items]) => [studentId.slice(0, 160), cleanStringArray(items, 30, 60)]))

  return {
    version: 1,
    clientSavedAt: typeof draft.clientSavedAt === 'number' && Number.isFinite(draft.clientSavedAt)
      ? draft.clientSavedAt
      : Date.now(),
    groupId: cleanString(draft.groupId, 160),
    selectedStudentIds: cleanStringArray(draft.selectedStudentIds, 5, 160),
    lessonContent: cleanString(draft.lessonContent, 5000),
    summary: cleanString(draft.summary, 500),
    overallComment: cleanString(draft.overallComment, 1400),
    perStudentComments: cleanStringMap(draft.perStudentComments, 5, 1400),
    studentObservations: cleanStringMap(draft.studentObservations, 5, 350),
    studentPerf,
    studentTags,
    studentMastery: cleanStringMap(draft.studentMastery, 5, 80),
    mood: cleanString(draft.mood, 40),
    tags: cleanStringArray(draft.tags, 40, 80),
    kps: cleanStringArray(draft.kps, 20, 120),
    homework: cleanStringArray(draft.homework, 30, 500),
    hwInput: cleanString(draft.hwInput, 500),
    badge: cleanString(draft.badge, 100),
    textbookCatalogKey: cleanString(draft.textbookCatalogKey, 200),
    knowledgeCard: parseStoredKnowledgeCard(draft.knowledgeCard),
    imageUrls: cleanStringArray(draft.imageUrls, 9, 2048),
    stageSummaryText: cleanString(draft.stageSummaryText, 500),
    stageSuggestions: cleanString(draft.stageSuggestions, 200),
  }
}

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const saved = await prisma.teacherFeedbackDraft.findUnique({ where: { teacherId: teacher.id } })
  if (!saved) return NextResponse.json({ draft: null })

  if (Date.now() - saved.updatedAt.getTime() > DRAFT_MAX_AGE_MS) {
    await prisma.teacherFeedbackDraft.deleteMany({ where: { teacherId: teacher.id, updatedAt: saved.updatedAt } })
    return NextResponse.json({ draft: null })
  }

  return NextResponse.json({ draft: { payload: saved.payload, updatedAt: saved.updatedAt.toISOString() } })
})

export const PUT = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: '草稿内容过大，请移除部分课堂图片后重试' }, { status: 413 })
  }

  const body = await req.json().catch(() => null) as { payload?: unknown } | null
  const payload = sanitizeDraft(body?.payload)
  if (!payload) return NextResponse.json({ error: '草稿格式无效' }, { status: 400 })

  const serializedPayload = JSON.stringify(payload)
  if (new TextEncoder().encode(serializedPayload).byteLength > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: '草稿内容过大，请移除部分课堂图片后重试' }, { status: 413 })
  }

  const saved = await prisma.teacherFeedbackDraft.upsert({
    where: { teacherId: teacher.id },
    create: { teacherId: teacher.id, payload: payload as Prisma.InputJsonValue },
    update: { payload: payload as Prisma.InputJsonValue },
    select: { updatedAt: true },
  })
  return NextResponse.json({ savedAt: saved.updatedAt.toISOString() })
})

export const DELETE = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  await prisma.teacherFeedbackDraft.deleteMany({ where: { teacherId: teacher.id } })
  return NextResponse.json({ deleted: true })
})
