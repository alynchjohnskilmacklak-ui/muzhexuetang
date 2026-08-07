import { auth } from './auth'
import { getPrismaForDivision } from './prisma'
import { resolveTeacherForUser } from './teacher-account-binding'
import { isSuperAdminEmail } from './super-admin'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null

  const u = session.user as Record<string, unknown>
  const division = (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  let teacherId = (u.teacherId as string | null) ?? null
  if (String(u.role || '').toLowerCase() === 'teacher' && !teacherId && u.id) {
    try {
      const prisma = getPrismaForDivision(division)
      const account = await prisma.user.findUnique({
        where: { id: u.id as string },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teacherId: true,
        },
      })
      if (account) {
        teacherId = (await resolveTeacherForUser(prisma, account))?.id ?? null
      }
    } catch (error) {
      console.error('[current-user:teacher-binding]', {
        userId: u.id,
        division,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return {
    id: u.id as string,
    email: session.user.email,
    name: session.user.name,
    role: u.role as string,
    teacherId,
    division,
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
  if (!isSuperAdminEmail(user.email)) {
    throw new Error('无权限')
  }
  return user
}
