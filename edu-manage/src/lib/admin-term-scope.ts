import type { AcademicTermStatus, PrismaClient } from '@prisma/client'
import type { NextRequest, NextResponse } from 'next/server'

export const ADMIN_TERM_SCOPE_COOKIE = 'muzhe_admin_term_scope'

type TermScope = {
  id: string
  name: string
  code: string
  status: AcademicTermStatus
  startDate: Date
  endDate: Date
}

export function requestedAdminTermId(request: NextRequest) {
  return request.nextUrl.searchParams.get('termId')?.trim()
    || request.cookies.get(ADMIN_TERM_SCOPE_COOKIE)?.value?.trim()
    || null
}

export async function resolveAdminTermScope(
  db: PrismaClient,
  division: string,
  request: NextRequest,
): Promise<TermScope | null> {
  const queryTermId = request.nextUrl.searchParams.get('termId')?.trim() || null
  if (queryTermId) {
    const selected = await db.academicTerm.findFirst({
      where: { id: queryTermId, division },
      select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
    })
    return selected
  }
  const cookieTermId = request.cookies.get(ADMIN_TERM_SCOPE_COOKIE)?.value?.trim() || null
  if (cookieTermId) {
    const selected = await db.academicTerm.findFirst({
      where: { id: cookieTermId, division },
      select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
    })
    if (selected) return selected
  }
  return db.academicTerm.findFirst({
    where: { division, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
  })
}

export function setAdminTermScopeCookie(response: NextResponse, termId: string) {
  response.cookies.set(ADMIN_TERM_SCOPE_COOKIE, termId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    priority: 'high',
  })
  return response
}

export async function isClassGroupInActiveTerm(db: PrismaClient, groupId: string) {
  const group = await db.classGroup.findUnique({
    where: { id: groupId },
    select: { term: { select: { status: true } } },
  })
  return group?.term?.status === 'ACTIVE'
}

export async function isClassLessonInActiveTerm(db: PrismaClient, lessonId: string) {
  const lesson = await db.classLesson.findUnique({
    where: { id: lessonId },
    select: { group: { select: { term: { select: { status: true } } } } },
  })
  return lesson?.group.term?.status === 'ACTIVE'
}
