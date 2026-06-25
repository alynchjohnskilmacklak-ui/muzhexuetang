import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/Layout/PageLayout'
import { auth } from '@/lib/auth'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { FeedItem } from '../_components/FeedItem'

export const dynamic = 'force-dynamic'

async function findPost(db: PrismaClient, id: string) {
  return db.performancePost.findFirst({
    where: { id, deletedAt: null },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      teacher: { select: { id: true, name: true, avatar: true } },
      comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      reactions: true,
      badges: true,
    },
  })
}

export default async function PerformanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  let post = null
  if (session?.user) {
    post = await findPost(await getRequestPrisma(), id)
  } else if (isDualDbEnabled()) {
    post = (await findPost(getPrismaForDivision('JUNIOR'), id))
        ?? (await findPost(getPrismaForDivision('SENIOR'), id))
  } else {
    post = await findPost(getPrismaForDivision('JUNIOR'), id)
  }

  if (!post) notFound()

  return (
    <PageLayout title="表现动态详情" subtitle={`${post.student.name} · ${post.teacher.name}`}>
      <FeedItem post={JSON.parse(JSON.stringify(post))} />
    </PageLayout>
  )
}
