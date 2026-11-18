import { NextResponse } from 'next/server'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { POST as canonicalPerformancePost } from '@/app/api/performance/route'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
    const posts = await prisma.performancePost.findMany({
      where: { teacherId: teacher.id, termId: activeTerm?.id || '__NO_ACTIVE_TERM__', deletedAt: null },
      include: {
        student: { select: { id: true, name: true, grade: true } },
        comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    })
    return NextResponse.json(posts)
})

// Compatibility endpoint: keep the historical URL, but use the authoritative
// performance writer so validation, term scoping, notifications and logs do
// not drift into a second implementation.
export const POST = canonicalPerformancePost
