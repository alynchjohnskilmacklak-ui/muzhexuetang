import type { NextRequest } from 'next/server'

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i

function normalizeConfiguredOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (process.env.NODE_ENV === 'production' && LOCAL_HOST_PATTERN.test(url.host)) return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * Resolve the externally reachable application origin.
 *
 * Reverse proxies commonly make request.nextUrl.origin look like localhost.
 * Configuration wins; forwarded headers are accepted only when they describe
 * a non-local host. Development keeps the request origin as a final fallback.
 */
export function resolvePublicOrigin(request: NextRequest): string {
  const configured = normalizeConfiguredOrigin(process.env.PUBLIC_APP_URL)
    || normalizeConfiguredOrigin(process.env.NEXTAUTH_URL)
    || normalizeConfiguredOrigin(process.env.AUTH_URL)
  if (configured) return configured

  // Host and X-Forwarded-Host are request-controlled unless the proxy has a
  // strict allow-list. Production activation links must therefore use the
  // canonical domain rather than reflecting either header.
  if (process.env.NODE_ENV === 'production') {
    return 'https://muzhexuetang.xyz'
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedHost && !LOCAL_HOST_PATTERN.test(forwardedHost)) {
    const protocol = forwardedProto === 'http' ? 'http' : 'https'
    const forwarded = normalizeConfiguredOrigin(`${protocol}://${forwardedHost}`)
    if (forwarded) return forwarded
  }

  const host = request.headers.get('host')?.trim()
  if (host && !LOCAL_HOST_PATTERN.test(host)) {
    const protocol = request.nextUrl.protocol === 'http:' ? 'http' : 'https'
    const fromHost = normalizeConfiguredOrigin(`${protocol}://${host}`)
    if (fromHost) return fromHost
  }

  return request.nextUrl.origin
}
