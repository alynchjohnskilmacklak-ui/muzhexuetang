import { auth } from './auth'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null

  const u = session.user as Record<string, unknown>
  return {
    id: u.id as string,
    email: session.user.email,
    name: session.user.name,
    role: u.role as string,
    teacherId: (u.teacherId as string | null) ?? null,
    division: (u.division as string) || 'JUNIOR',
    selectedDivision: (u.selectedDivision as string) || 'JUNIOR',
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('未登录')
  if (!allowedRoles.includes(user.role)) throw new Error('无权限')
  return user
}
