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
 * Generate parent account credentials with bcrypt hashed password.
 */
export async function generateParentCredentialsHashed(name: string): Promise<{
  email: string
  password: string       // hashed, for database
  plainPassword: string  // plain, for display
}> {
  const py = chineseToPinyin(name)
  // 初始密码 = 学生姓名拼音（如 马紫晨 → mazichen），与账号邮箱前缀一致
  const plainPassword = py
  const hashed = await bcrypt.hash(plainPassword, 12)
  return { email: `${py}@st.com`, password: hashed, plainPassword }
}
