import type { Prisma } from '@prisma/client'
import { chineseToPinyin } from '@/lib/pinyin'
import { isUserActive } from '@/lib/user-status'

type BindingClient = Pick<Prisma.TransactionClient, 'teacher' | 'user'>

export type TeacherBindingUser = {
  id: string
  email: string
  name: string
  role: string
  status: string
  teacherId: string | null
}

export type TeacherBindingTeacher = {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  division: string
}

function normalized(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

export function expectedTeacherLoginEmails(teacher: Pick<TeacherBindingTeacher, 'name' | 'email'>) {
  return [...new Set([
    normalized(teacher.email),
    `${chineseToPinyin(teacher.name)}@tea.com`.toLowerCase(),
  ].filter(Boolean))]
}

export function isUnambiguousTeacherAccountMatch(
  user: Pick<TeacherBindingUser, 'email' | 'name'>,
  teacher: Pick<TeacherBindingTeacher, 'name' | 'email'>,
) {
  return teacherAccountMatchScore(user, teacher) > 0
}

export function teacherAccountMatchScore(
  user: Pick<TeacherBindingUser, 'email' | 'name'>,
  teacher: Pick<TeacherBindingTeacher, 'name' | 'email'>,
) {
  if (expectedTeacherLoginEmails(teacher).includes(normalized(user.email))) return 2
  if (normalized(user.name) === normalized(teacher.name)) return 1
  return 0
}

function bestUniqueMatch<T>(items: T[], score: (item: T) => number): T | null {
  const ranked = items
    .map(item => ({ item, score: score(item) }))
    .filter(item => item.score > 0)
  const bestScore = Math.max(0, ...ranked.map(item => item.score))
  const best = ranked.filter(item => item.score === bestScore)
  return best.length === 1 ? best[0].item : null
}

export async function resolveTeacherForUser(
  prisma: BindingClient,
  user: Pick<TeacherBindingUser, 'id' | 'email' | 'name' | 'role' | 'teacherId'>,
): Promise<TeacherBindingTeacher | null> {
  if (user.role !== 'teacher') return null

  if (user.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.teacherId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        division: true,
      },
    })
    return teacher?.status === 'RESIGNED' ? null : teacher
  }

  const directCandidates = await prisma.teacher.findMany({
    where: {
      status: { not: 'RESIGNED' },
      OR: [
        { name: user.name },
        { email: user.email },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      division: true,
    },
    take: 3,
  })
  const directMatch = bestUniqueMatch(directCandidates, teacher => teacherAccountMatchScore(user, teacher))
  if (directMatch) return directMatch

  // Historical accounts may only use a generated pinyin email. Preserve that
  // compatibility as an explicit final fallback instead of the common path.
  const teachers = await prisma.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      division: true,
    },
  })
  return bestUniqueMatch(teachers, teacher => teacherAccountMatchScore(user, teacher))
}

export async function resolveUserForTeacher(
  prisma: BindingClient,
  teacherId: string,
): Promise<TeacherBindingUser | null> {
  const directlyBound = await prisma.user.findFirst({
    where: { teacherId, role: 'teacher' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      teacherId: true,
    },
  })
  if (directlyBound) return isUserActive(directlyBound.status) ? directlyBound : null

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  })
  if (!teacher || teacher.status === 'RESIGNED') return null

  const expectedEmails = expectedTeacherLoginEmails(teacher)
  const candidates = await prisma.user.findMany({
    where: {
      role: 'teacher',
      teacherId: null,
      OR: [
        { name: teacher.name },
        ...(expectedEmails.length ? [{ email: { in: expectedEmails } }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      teacherId: true,
    },
    take: 3,
  })
  const activeCandidates = candidates.filter(candidate => isUserActive(candidate.status))
  return bestUniqueMatch(activeCandidates, candidate => teacherAccountMatchScore(candidate, teacher))
}
