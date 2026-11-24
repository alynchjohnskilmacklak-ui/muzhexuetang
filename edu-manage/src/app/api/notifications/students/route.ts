import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))
  const requestedTermId = req.nextUrl.searchParams.get('termId')?.trim() || null
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  if (requestedTermId && !selectedTerm) {
    return NextResponse.json({ error: '所选运营批次不存在或不属于当前学部' }, { status: 404 })
  }
  if (!selectedTerm) {
    return NextResponse.json({ students: [], grouped: {}, grades: [], term: null, contextState: 'NO_SELECTED_TERM' })
  }

  const students = await prisma.student.findMany({
    where: {
      division,
      deletedAt: null,
      status: { notIn: ['INACTIVE', 'ARCHIVED'] },
      termMemberships: {
        some: { termId: selectedTerm.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      },
    },
    include: {
      parent: { select: { wxpusherUid: true, qywxExternalUserId: true } },
      termMemberships: {
        where: { termId: selectedTerm.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { grade: true },
        take: 1,
      },
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: { termId: selectedTerm.id, status: { not: 'ARCHIVED' }, course: { isActive: true } },
        },
        include: { group: { include: { room: { select: { id: true, name: true } } } } },
      },
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
  })

  // Keep separately linked parent households distinct, while collapsing records
  // that an administrator has already confirmed belong to the same student identity.
  const uniqueStudents = new Map<string, typeof students[number]>()
  for (const student of students) {
    const ownerId = student.parentId || student.parentUserId || student.id
    const key = `${ownerId}:${student.identityId || student.id}`
    if (!uniqueStudents.has(key)) uniqueStudents.set(key, student)
  }

  const result = [...uniqueStudents.values()].map(s => {
    const roomEntry = s.enrollments.find((enrollment) => enrollment.group.room?.name)
    return {
      id: s.id,
      name: s.name,
      grade: s.termMemberships[0]?.grade || s.grade || '未设置年级',
      parentName: s.parentName,
      wxBound: !!s.parent?.qywxExternalUserId,
      roomId: roomEntry?.group.room?.id || null,
      roomName: roomEntry?.group.room?.name || '未分配班级',
    }
  })

  const grouped: Record<string, typeof result> = {}
  for (const student of result) {
    const key = student.roomName
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(student)
  }

  const grades = [...new Set(result.map((student) => student.grade))].sort()

  return NextResponse.json({
    students: result,
    grouped,
    grades,
    term: { id: selectedTerm.id, name: selectedTerm.name },
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } })
})
