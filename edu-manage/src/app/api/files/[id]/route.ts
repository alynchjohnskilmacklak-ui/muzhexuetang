import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const prisma = await getRequestPrisma()

  try {
    const file = await (prisma as unknown as { fileAsset: { findUnique: Function } }).fileAsset.findUnique({
      where: { id },
      select: {
        id: true, filename: true, originalName: true, mimeType: true, size: true,
        storageDriver: true, storageKey: true, url: true,
        ownerType: true, studentId: true, feedbackId: true, postId: true,
        visibility: true, uploadedById: true, createdAt: true,
      },
    })

    if (!file) return NextResponse.json({ error: '文件不存在' }, { status: 404 })

    const f = file as Record<string, unknown>

    // Permission check
    if (user.role === 'admin') {
      // Admin: allowed
    } else if (user.role === 'teacher') {
      if (f.visibility === 'ADMIN_ONLY') return NextResponse.json({ error: '无权访问该文件' }, { status: 403 })
      // Teacher can access their own uploads + teacher-visible files
      if (f.visibility === 'PRIVATE' && f.uploadedById !== user.id) {
        return NextResponse.json({ error: '无权访问该文件' }, { status: 403 })
      }
    } else if (user.role === 'parent') {
      if (f.visibility !== 'PARENT_VISIBLE' && f.visibility !== 'PUBLIC') {
        return NextResponse.json({ error: '无权访问该文件' }, { status: 403 })
      }
      // Verify parent is linked to the student
      if (f.studentId) {
        const linked = await prisma.student.findFirst({
          where: { id: f.studentId as string, parentUserId: user.id },
          select: { id: true },
        })
        if (!linked) return NextResponse.json({ error: '无权访问该文件' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    return NextResponse.json({
      id: f.id,
      filename: f.filename,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      url: f.url,
      storageDriver: f.storageDriver,
      ownerType: f.ownerType,
      createdAt: f.createdAt,
    })
  } catch {
    return NextResponse.json({ error: '文件不存在或FileAsset表未就绪' }, { status: 404 })
  }
})
