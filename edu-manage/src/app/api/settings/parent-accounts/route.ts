import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'admin' ? user : null
}

export const GET = apiHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })


  const prisma = await getRequestPrisma()
  if (req.nextUrl.searchParams.get('options') === '1') {
    const accounts = await prisma.user.findMany({
      where: { role: 'parent', status: { not: 'deleted' } },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    })
    const ids = accounts.map((account) => account.id)
    const students = ids.length ? await prisma.student.findMany({
      where: { deletedAt: null, OR: [{ parentId: { in: ids } }, { parentUserId: { in: ids } }] },
      select: {
        id: true,
        name: true,
        grade: true,
        birthYear: true,
        parentPhone: true,
        parentId: true,
        parentUserId: true,
        termMemberships: {
          orderBy: { joinedAt: 'desc' },
          take: 3,
          select: { status: true, term: { select: { name: true } } },
        },
      },
    }) : []
    const studentsByParent = new Map<string, typeof students>()
    for (const student of students) {
      const parentIds = new Set([student.parentId, student.parentUserId].filter((id): id is string => Boolean(id)))
      for (const parentId of parentIds) {
        const parentStudents = studentsByParent.get(parentId) || []
        parentStudents.push(student)
        studentsByParent.set(parentId, parentStudents)
      }
    }
    return NextResponse.json({ accounts: accounts.map((account) => ({
      ...account,
      students: (studentsByParent.get(account.id) || [])
        .map(({ id, name, grade, birthYear, parentPhone, termMemberships }) => ({ id, name, grade, birthYear, parentPhone, termMemberships })),
    })) })
  }
  const accounts = await prisma.user.findMany({
    where: { role: 'parent', status: { not: 'deleted' } },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      students: {
        where: { status: { not: 'INACTIVE' } },
        select: { id: true, name: true, grade: true, status: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ accounts })
})
