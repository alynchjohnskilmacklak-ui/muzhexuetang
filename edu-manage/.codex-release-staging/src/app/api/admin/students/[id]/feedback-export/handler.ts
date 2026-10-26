import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import {
  FeedbackArchiveAccessError,
  getCompleteFeedbackArchive,
  type FeedbackArchiveActor,
  type FeedbackArchiveResult,
} from '@/lib/classroom-feedback/archive'
import {
  renderFeedbackMarkdown,
  type FeedbackMarkdownOptions,
} from '@/lib/classroom-feedback/markdown'
import { createFeedbackExportImageUrl } from '@/lib/classroom-feedback/export-image-url'

type AdminContext = FeedbackArchiveActor & { prisma: PrismaClient }
export type ExportDependencies = {
  requireAdmin: () => Promise<AdminContext>
  loadArchive: typeof getCompleteFeedbackArchive
  renderMarkdown: (archive: FeedbackArchiveResult, options?: FeedbackMarkdownOptions) => string
}

const defaultDependencies: ExportDependencies = {
  requireAdmin: requireAdminUser,
  loadArchive: getCompleteFeedbackArchive,
  renderMarkdown: renderFeedbackMarkdown,
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  if (Number.isNaN(date.getTime())) throw new FeedbackArchiveAccessError('日期格式无效', 400)
  return date
}

export async function handleFeedbackExport(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  dependencies: ExportDependencies = defaultDependencies,
) {
  try {
    const actor = await dependencies.requireAdmin()
    const { id: studentId } = await params
    const searchParams = request.nextUrl.searchParams
    const archive = await dependencies.loadArchive(actor.prisma, actor, {
      studentId,
      subject: searchParams.get('subject') || undefined,
      startDate: parseDate(searchParams.get('startDate')),
      endDate: parseDate(searchParams.get('endDate'), true),
    })
    const publicOrigin = process.env.NEXTAUTH_URL || process.env.AUTH_URL || request.nextUrl.origin
    const division = actor.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
    const markdown = dependencies.renderMarkdown(archive, {
      imageUrl: (assetId) => createFeedbackExportImageUrl(assetId, {
        baseUrl: publicOrigin,
        division,
      }),
    })
    const filename = `${archive.student.name}_课堂反馈档案.md`
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    if (error instanceof AuthError || error instanceof FeedbackArchiveAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
