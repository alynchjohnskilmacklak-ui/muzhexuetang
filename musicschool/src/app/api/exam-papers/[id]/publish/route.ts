import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const paper = await prisma.examPaper.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, parentId: true } }, teacher: { select: { name: true } } },
  })
  if (!paper) return NextResponse.json({ error: '试卷不存在' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.examPaper.update({
      where: { id },
      data: { status: 'PUBLISHED', notifySent: true, updatedAt: new Date() },
    })

    if (paper.student.parentId) {
      await tx.notification.create({
        data: {
          userId: paper.student.parentId,
          type: 'EXAM_PAPER',
          title: `${paper.teacher.name}老师上传了新试卷`,
          content: `${paper.subject} · ${paper.title}`,
          link: '/parent/grades',
        },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '推送试卷', detail: `${paper.student.name} - ${paper.title}` },
    })
  })

  revalidatePath('/grades')
  revalidatePath('/parent/grades')
  revalidatePath('/dashboard')

  return NextResponse.json({ success: true })
}
