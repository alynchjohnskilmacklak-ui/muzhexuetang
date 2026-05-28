import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PaperDetailClient } from './client'
import { parentVisibleExamPaperWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const paper = await prisma.examPaper.findFirst({
    where: {
      id,
      ...parentVisibleExamPaperWhere(userId),
    },
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  })

  if (!paper) notFound()

  return <PaperDetailClient paper={JSON.parse(JSON.stringify(paper))} />
}
