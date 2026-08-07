import { createHmac, timingSafeEqual } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60
export type FeedbackExportDivision = 'JUNIOR' | 'SENIOR'

function getSigningSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
}

function signature(
  assetId: string,
  division: FeedbackExportDivision,
  expires: number,
  secret: string,
) {
  return createHmac('sha256', secret)
    .update(`${assetId}:${division}:${expires}`)
    .digest('hex')
}

export function createFeedbackExportImageUrl(
  assetId: string,
  options: {
    baseUrl: string
    division: FeedbackExportDivision
    now?: number
    ttlSeconds?: number
  },
) {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const secret = getSigningSecret()
  if (!secret) {
    return `${baseUrl}/api/files/view?id=${encodeURIComponent(assetId)}`
  }

  const expires = Math.floor((options.now ?? Date.now()) / 1000)
    + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS)
  const token = signature(assetId, options.division, expires, secret)
  const params = new URLSearchParams({
    id: assetId,
    division: options.division,
    expires: String(expires),
    token,
  })
  return `${baseUrl}/api/files/view?${params.toString()}`
}

export function verifyFeedbackExportImageToken(
  assetId: string,
  divisionValue: string | null,
  expiresValue: string | null,
  token: string | null,
  now = Date.now(),
) {
  const secret = getSigningSecret()
  if (divisionValue !== 'JUNIOR' && divisionValue !== 'SENIOR') return false
  const expires = Number(expiresValue)
  if (!secret || !token || !Number.isInteger(expires)) return false
  if (expires <= Math.floor(now / 1000)) return false

  const expected = signature(assetId, divisionValue, expires, secret)
  const actualBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
}
