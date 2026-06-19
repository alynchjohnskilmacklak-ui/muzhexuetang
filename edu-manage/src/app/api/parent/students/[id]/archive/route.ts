import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { getStudentArchive, ArchiveAccessError } from '@/lib/student-archive'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: studentId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const prisma = await getRequestPrisma()

  // Get parent's linked children
  const parentStudents = user.role === 'parent'
    ? (await prisma.student.findMany({
        where: { parentUserId: user.id, status: { not: 'INACTIVE' } },
        select: { id: true },
      })).map(s => s.id)
    : []

  try {
    const archive = await getStudentArchive(prisma, studentId, {
      role: user.role as 'admin' | 'teacher' | 'parent',
      userId: user.id,
      teacherId: user.teacherId,
      division: user.division,
      parentStudentIds: parentStudents,
    })

    if (!archive) return NextResponse.json({ error: '学生不存在' }, { status: 404 })
    return NextResponse.json(archive)
  } catch (err) {
    if (err instanceof ArchiveAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
})
