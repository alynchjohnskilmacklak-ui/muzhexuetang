export class ValidationError extends Error {
  status = 400
  constructor(msg: string) { super(msg); this.name = 'ValidationError' }
}

export function requireString(val: unknown, field: string, maxLen = 500): string {
  if (typeof val !== 'string' || val.trim() === '') {
    throw new ValidationError(`${field} 不能为空`)
  }
  if (val.length > maxLen) {
    throw new ValidationError(`${field} 过长（最大${maxLen}字符）`)
  }
  return val.trim()
}

export function requireNumber(val: unknown, field: string, min?: number, max?: number): number {
  const n = Number(val)
  if (isNaN(n)) throw new ValidationError(`${field} 必须为数字`)
  if (min !== undefined && n < min) throw new ValidationError(`${field} 不能小于 ${min}`)
  if (max !== undefined && n > max) throw new ValidationError(`${field} 不能大于 ${max}`)
  return n
}

export function requireArray<T = unknown>(val: unknown, field: string, maxLen = 200): T[] {
  if (!Array.isArray(val)) throw new ValidationError(`${field} 必须为数组`)
  if (val.length > maxLen) throw new ValidationError(`${field} 超过最大数量限制（${maxLen}）`)
  return val as T[]
}
