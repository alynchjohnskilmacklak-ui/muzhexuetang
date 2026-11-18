import { AuthError, requireAdminUser } from '@/lib/auth/guards'
import { isSuperAdminEmail } from '@/lib/super-admin'
import { resolveFeeDivisionScope, type FeeDivisionScope } from '@/lib/fee-division-scope'

export async function requireFeeAdminScope(requestedDivision?: string | null) {
  const user = await requireAdminUser()
  const canAccessAllDivisions = isSuperAdminEmail(user.email)
  let division: FeeDivisionScope
  try {
    division = resolveFeeDivisionScope(user.division, requestedDivision, canAccessAllDivisions)
  } catch (error) {
    throw new AuthError(error instanceof Error ? error.message : '无权访问其他学部的收费数据')
  }
  return { user, division, canAccessAllDivisions }
}
