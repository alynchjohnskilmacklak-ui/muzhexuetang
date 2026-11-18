import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE, selectParentMembership } from '@/constants/membership'
import { getParentChildren } from '@/lib/parent-children'
import { getRequestPrisma } from '@/lib/prisma'

/** Resolve the same active child and tier before the first HTML paint. Never trust a cookie as authorization. */
export const getParentPortalTheme = cache(async (parentId: string) => {
  const prisma = await getRequestPrisma()
  const students = await getParentChildren(prisma, parentId)
  const requestedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  return selectParentMembership(students, requestedChildId)
})
