import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { AuthError, requireParentUser } from '@/lib/auth/guards'
import { FeedbackArchiveAccessError } from '@/lib/classroom-feedback/archive'
import {
  getStudentGrowthArchive,
  StudentGrowthAccessError,
  type StudentGrowthArchive,
} from '@/lib/student-growth/archive'
import { renderStudentGrowthReport, type StudentGrowthReportDTO } from '@/lib/student-growth/report'

type ParentContext = {
  id: string
  role: string
  division: string
  prisma: PrismaClient
}

type Dependencies = {
  requireParent: () => Promise<ParentContext>
  loadArchive: (
    prisma: PrismaClient,
    actor: ParentContext,
    studentId: string,
  ) => Promise<StudentGrowthArchive>
  renderReport: (archive: StudentGrowthArchive) => StudentGrowthReportDTO
}

const defaultDependencies: Dependencies = {
  requireParent: requireParentUser,
  loadArchive: (prisma, actor, studentId) => getStudentGrowthArchive(prisma, actor, studentId),
  renderReport: renderStudentGrowthReport,
}

export async function handleParentGrowthReport(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  dependencies: Dependencies = defaultDependencies,
) {
  try {
    const actor = await dependencies.requireParent()
    const { id } = await params
    const archive = await dependencies.loadArchive(actor.prisma, actor, id)
    return NextResponse.json(dependencies.renderReport(archive))
  } catch (error) {
    if (
      error instanceof AuthError
      || error instanceof StudentGrowthAccessError
      || error instanceof FeedbackArchiveAccessError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}

