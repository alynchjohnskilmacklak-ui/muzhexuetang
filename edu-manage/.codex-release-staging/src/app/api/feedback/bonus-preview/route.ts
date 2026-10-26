import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { getFeedbackBonusPreview } from '@/lib/teacher-salary'

export const dynamic = 'force-dynamic'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
}

export const POST = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json().catch(() => ({}))
  const preview = await getFeedbackBonusPreview({
    teacherId: teacher.id,
    studentIds: asStringArray(body.studentIds),
    lessonId: typeof body.lessonId === 'string' ? body.lessonId : null,
    groupId: typeof body.groupId === 'string' ? body.groupId : null,
    feedbackCourseType: typeof body.feedbackCourseType === 'string' ? body.feedbackCourseType : null,
    prismaClient: prisma,
  })

  return NextResponse.json(preview)
})
