import { auth } from './auth'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null

  const u = session.user as Record<string, unknown>
  const division = (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  return {
    id: u.id as string,
    email: session.user.email,
    name: session.user.name,
    role: u.role as string,
    teacherId: (u.teacherId as string | null) ?? null,
    division,
    /** @deprecated kept for backward compatibility, equals division */
    selectedDivision: division,
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('\\u672a\\u767b\\u5f55')
  if (!allowedRoles.includes(user.role)) throw new Error('\\u65e0\\u6743\\u9650')
  return user
}