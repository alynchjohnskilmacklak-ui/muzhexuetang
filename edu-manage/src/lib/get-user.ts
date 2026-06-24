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
    division: (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('未登录')
  if (!allowedRoles.includes(user.role)) throw new Error('无权限')
  return user
}

/** SUPER_ADMIN 不走 role 字段，而是通过 env 邮箱白名单校验。
 *  登录层只认小写 admin/teacher/parent，role 必须保持 admin。 */
export async function requireSuperAdmin() {
  const user = await requireRole(['admin'])
  const supers = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!user.email || !supers.includes(user.email.toLowerCase())) {
    throw new Error('无权限')
  }
  return user
}
