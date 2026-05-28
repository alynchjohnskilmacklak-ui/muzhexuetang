import pinyin from 'pinyin'
import bcrypt from 'bcryptjs'

/**
 * Convert Chinese name to pinyin (lowercase, no spaces, no tones).
 * Example: 孙飞 → "sunfei"
 */
export function chineseToPinyin(name: string): string {
  const result = pinyin(name, { style: pinyin.STYLE_NORMAL })
  return result.flat().join('').toLowerCase()
}

/**
 * Generate parent account credentials from student name.
 * Email format: pinyin@st.com
 * Password: pinyin
 */
export function generateParentCredentials(name: string): { email: string; password: string } {
  const py = chineseToPinyin(name)
  return { email: `${py}@st.com`, password: py }
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
  const hashed = await bcrypt.hash(py, 10)
  return { email: `${py}@st.com`, password: hashed, plainPassword: py }
}
