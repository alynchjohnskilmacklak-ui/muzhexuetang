export function getSuperAdminEmails(raw = process.env.SUPER_ADMIN_EMAILS): string[] {
  return [...new Set((raw || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean))]
}

export function isSuperAdminEmail(email: string | null | undefined, raw = process.env.SUPER_ADMIN_EMAILS): boolean {
  if (!email) return false
  return getSuperAdminEmails(raw).includes(email.trim().toLowerCase())
}
