export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_BYTES = 72

const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password123',
  'qwerty123',
  'admin123',
  'abc123456',
])

export type PasswordPolicyOptions = {
  identifiers?: Array<string | null | undefined>
}

export type PasswordPolicyResult = {
  valid: boolean
  errors: string[]
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length
}

export function validatePassword(
  password: string,
  options: PasswordPolicyOptions = {},
): PasswordPolicyResult {
  const errors: string[] = []
  const normalized = password.toLowerCase()

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`密码至少需要 ${PASSWORD_MIN_LENGTH} 位`)
  }
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) {
    errors.push(`密码不能超过 ${PASSWORD_MAX_BYTES} 个字节`)
  }
  if (!/[A-Za-z]/.test(password)) {
    errors.push('密码必须包含英文字母')
  }
  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字')
  }
  if (/\s/.test(password)) {
    errors.push('密码不能包含空格')
  }
  if (COMMON_PASSWORDS.has(normalized)) {
    errors.push('该密码过于常见，请更换更安全的密码')
  }

  const identifiers = options.identifiers
    ?.map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => value.length >= 4) || []
  if (identifiers.some((identifier) => normalized.includes(identifier))) {
    errors.push('密码不能包含账号、手机号或姓名等身份信息')
  }

  return { valid: errors.length === 0, errors }
}

export function getPasswordPolicyError(
  password: string,
  options: PasswordPolicyOptions = {},
) {
  return validatePassword(password, options).errors[0] || null
}

