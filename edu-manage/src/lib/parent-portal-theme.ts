import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE, selectParentMembership } from '@/constants/membership'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { selectLatestParentStudents } from '@/lib/parent-student-selection'
import { getRequestPrisma } from '@/lib/prisma'

/** Resolve the same active child and tier before the first HTML paint. Never trust a cookie as authorization. */
export const getParentPortalTheme = cache(async (parentId: string) => {
  const prisma = await getRequestPrisma()
  const students = selectLatestParentStudents(await prisma.student.findMany({
    where: parentLinkedStudentWhere(parentId),
    select: {
      id: true,
      name: true,
      gender: true,
      birthYear: true,
      grade: true,
      membershipLevel: true,
      updatedAt: true,
      termMemberships: {
        select: {
          grade: true,
          status: true,
          joinedAt: true,
          term: { select: { status: true, startDate: true, name: true } },
        },
      },
    },
  }))
  const requestedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  return selectParentMembership(students, requestedChildId)
})
