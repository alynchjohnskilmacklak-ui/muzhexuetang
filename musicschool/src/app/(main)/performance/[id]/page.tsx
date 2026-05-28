import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/Layout/PageLayout'
import { prisma } from '@/lib/prisma'
import { FeedItem } from '../_components/FeedItem'

export const dynamic = 'force-dynamic'

export default async function PerformanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.performancePost.findFirst({
    where: { id, deletedAt: null },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      teacher: { select: { id: true, name: true, avatar: true } },
      comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      reactions: true,
      badges: true,
    },
  })
  if (!post) notFound()

  return (
    <PageLayout title="表现动态详情" subtitle={`${post.student.name} · ${post.teacher.name}`}>
      <FeedItem post={JSON.parse(JSON.stringify(post))} />
    </PageLayout>
  )
}
