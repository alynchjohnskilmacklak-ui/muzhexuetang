type HeaderReader = Pick<Headers, 'get'>

function normalizeIp(value: string | null): string | null {
  const candidate = value?.trim()
  if (!candidate || candidate.length > 64 || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null
  return candidate
}

/**
 * Read the client address written by the trusted reverse proxy.
 * The app is bound to localhost in production, and Nginx overwrites
 * X-Real-IP with its peer address. Do not prefer the client-controlled first
 * entry of X-Forwarded-For for rate limits or audit records.
 */
export function getTrustedClientIp(headers: HeaderReader): string {
  return normalizeIp(headers.get('x-real-ip')) || 'unknown'
}
