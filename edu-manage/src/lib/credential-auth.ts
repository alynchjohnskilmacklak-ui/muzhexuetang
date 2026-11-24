import { resolveLoginIdentifier, validateLoginAccount, type LoginIdentifierType, type LoginRole } from '@/lib/login-accounts'
import {
  buildCredentialAccountKey,
  checkCredentialRateLimit,
  clearCredentialFailures,
  recordCredentialFailure,
} from '@/lib/login-rate-limit'
import { getPrismaForDivision } from '@/lib/prisma'
import { hasCurrentParentStudent, PARENT_TERM_EXPIRED_CODE } from '@/lib/parent-account-validity'
import { checkRateLimit } from '@/lib/rate-limit'

type CredentialMeta = {
  ip: string
  userAgent: string
  device: string
  os: string
  browser: string
}

export async function authenticateCredentialInput(input: {
  email: string
  password: string
  loginRole: LoginRole
  identifierType?: LoginIdentifierType
  division?: string
  meta: CredentialMeta
}) {
  const identifierType = input.identifierType || 'email'
  const sharedIpLimit = await checkRateLimit(input.meta.ip, '/api/auth/credentials')
  if (!sharedIpLimit.allowed) {
    return { ok: false as const, code: 'RATE_LIMITED' as const }
  }
  const resolvedIdentifier = await resolveLoginIdentifier(input.email, input.loginRole, input.division, identifierType)
  if (!resolvedIdentifier.ok) return resolvedIdentifier
  const email = resolvedIdentifier.email
  const accountKey = buildCredentialAccountKey(input.loginRole, input.division, email, input.meta.ip)
  const limit = checkCredentialRateLimit(input.meta.ip, accountKey)
  if (!limit.allowed) {
    return { ok: false as const, code: limit.code || 'RATE_LIMITED' }
  }

  const result = await validateLoginAccount(
    input.email,
    input.password,
    input.loginRole,
    { persistUser: true, recordAttempt: true, recordSuccess: true },
    input.meta,
    input.division,
    identifierType,
    resolvedIdentifier,
  )

  if (!result.ok) {
    if (input.meta.ip !== 'unknown') recordCredentialFailure(accountKey)
    return result
  }

  if (result.user.role === 'parent') {
    const division = result.user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
    const prisma = getPrismaForDivision(division)
    if (!await hasCurrentParentStudent(prisma, result.user.id, division)) {
      return { ok: false as const, code: PARENT_TERM_EXPIRED_CODE }
    }
  }

  clearCredentialFailures(accountKey)
  return result
}
