import { auth } from './auth'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null

  return {
    id: (session.user as { id: string }).id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as { role: string }).role,
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('未登录')
  if (!allowedRoles.includes(user.role)) throw new Error('无权限')
  return user
}
