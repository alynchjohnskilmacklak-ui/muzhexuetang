import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'

/**
 * Get the teacherId for a logged-in user.
 * Primary: session.user.teacherId (strong binding).
 * Fallback: match by pinyin email for migration compatibility.
 */
export async function detectTeacherId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teacherId: true, email: true, name: true },
  })
  if (!user) return null
  if (user.teacherId) return user.teacherId

  // Fallback: match teacher by pinyin email pattern
  const teachers = await prisma.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true },
  })
  const match = teachers.find(t => `${chineseToPinyin(t.name)}@tea.com` === user.email)
  return match?.id ?? null
}
