import { validateLoginAccount, type LoginRole } from '@/lib/login-accounts'
import {
  buildCredentialAccountKey,
  checkCredentialRateLimit,
  clearCredentialFailures,
  recordCredentialFailure,
} from '@/lib/login-rate-limit'

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
  division?: string
  meta: CredentialMeta
}) {
  const email = input.email.trim().toLowerCase()
  const accountKey = buildCredentialAccountKey(input.loginRole, input.division, email)
  const limit = checkCredentialRateLimit(input.meta.ip, accountKey)
  if (!limit.allowed) {
    return { ok: false as const, code: limit.code || 'RATE_LIMITED' }
  }

  const result = await validateLoginAccount(
    email,
    input.password,
    input.loginRole,
    { persistUser: true, recordAttempt: true, recordSuccess: true },
    input.meta,
    input.division,
  )

  if (!result.ok) {
    recordCredentialFailure(accountKey)
    return result
  }

  clearCredentialFailures(accountKey)
  return result
}
