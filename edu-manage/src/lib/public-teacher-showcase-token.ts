import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
type TeacherDivision = 'JUNIOR' | 'SENIOR'

function signingSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
}

function encryptionKey(secret: string) {
  return createHash('sha256').update(secret).digest()
}

export function createPublicTeacherPortraitToken(
  teacherId: string,
  division: TeacherDivision,
  now = Date.now(),
) {
  const secret = signingSecret()
  if (!secret) return null

  const payload = JSON.stringify({
    teacherId,
    division,
    expires: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  })
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url')
}

export function verifyPublicTeacherPortraitToken(
  token: string | null,
  now = Date.now(),
): { teacherId: string; division: TeacherDivision } | null {
  const secret = signingSecret()
  if (!secret || !token) return null

  try {
    const buffer = Buffer.from(token, 'base64url')
    if (buffer.length < 30) return null
    const iv = buffer.subarray(0, 12)
    const tag = buffer.subarray(12, 28)
    const ciphertext = buffer.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv)
    decipher.setAuthTag(tag)
    const payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as {
      teacherId?: unknown
      division?: unknown
      expires?: unknown
    }
    if (typeof payload.teacherId !== 'string' || !Number.isInteger(payload.expires)) return null
    if (payload.division !== 'JUNIOR' && payload.division !== 'SENIOR') return null
    if ((payload.expires as number) <= Math.floor(now / 1000)) return null
    return { teacherId: payload.teacherId, division: payload.division }
  } catch {
    return null
  }
}
