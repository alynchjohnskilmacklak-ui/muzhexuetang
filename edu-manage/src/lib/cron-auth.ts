import { timingSafeEqual } from 'node:crypto'

/** Accept only a non-empty CRON_SECRET supplied as an Authorization Bearer token. */
export function isAuthorizedCronRequest(authorization: string | null, configuredSecret: string | undefined) {
  if (!configuredSecret) return false

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization?.trim() || '')
  if (!match) return false

  const provided = Buffer.from(match[1], 'utf8')
  const expected = Buffer.from(configuredSecret, 'utf8')
  if (provided.length !== expected.length) return false
  return timingSafeEqual(provided, expected)
}
