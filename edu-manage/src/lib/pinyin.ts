import pinyin from 'pinyin'
import bcrypt from 'bcryptjs'
import { generateTemporaryPassword } from '@/lib/temporary-password'

/**
 * Convert Chinese name to pinyin (lowercase, no spaces, no tones).
 * Example: 孙飞 → "sunfei"
 */
export function chineseToPinyin(name: string): string {
  const result = pinyin(name, { style: pinyin.STYLE_NORMAL })
  return result.flat().join('').toLowerCase()
}

/**
 * Generate parent account credentials with bcrypt hashed password.
 */
export async function generateParentCredentialsHashed(name: string): Promise<{
  email: string
  password: string       // hashed, for database
  plainPassword: string  // plain, for display
}> {
  const py = chineseToPinyin(name)
  const plainPassword = generateTemporaryPassword()
  const hashed = await bcrypt.hash(plainPassword, 12)
  return { email: `${py}@st.com`, password: hashed, plainPassword }
}
