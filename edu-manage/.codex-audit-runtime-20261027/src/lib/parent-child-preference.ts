import { PARENT_ACTIVE_CHILD_COOKIE, resolveMembership } from '@/constants/membership'

/** This cookie is a display preference only. Every server read must validate ownership. */
export function rememberParentChild(studentId: string, membershipLevel?: string | null) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // The API routes live under /api/parent, so a /parent-scoped cookie would not
  // reach them. Remove the legacy scoped value before writing one site-wide preference.
  document.cookie = `${PARENT_ACTIVE_CHILD_COOKIE}=; Path=/parent; Max-Age=0; SameSite=Lax${secure}`
  document.cookie = `${PARENT_ACTIVE_CHILD_COOKIE}=${encodeURIComponent(studentId)}; Path=/; Max-Age=7776000; SameSite=Lax${secure}`
  if (membershipLevel != null) {
    window.dispatchEvent(new CustomEvent('parent-theme-change', { detail: resolveMembership(membershipLevel) }))
  }
}

export function readParentChildPreference(): string {
  const prefix = `${PARENT_ACTIVE_CHILD_COOKIE}=`
  const entry = document.cookie.split('; ').find(part => part.startsWith(prefix))
  if (!entry) return ''
  try {
    return decodeURIComponent(entry.slice(prefix.length))
  } catch {
    return ''
  }
}

export function rememberParentChildGender(gender: string | null | undefined) {
  document.cookie = `current-student-gender=${encodeURIComponent(gender || '')}; Path=/parent; Max-Age=7776000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}
