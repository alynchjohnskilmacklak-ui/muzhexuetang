const TEXT_FIELDS = new Set(['orgName', 'orgNameEn', 'phone', 'address', 'website', 'logoUrl', 'membershipBenefits', 'teacherBenefits'])
export function parseSettingsUpdate(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('设置内容必须为对象')
  const result: Record<string, string | number | null> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === 'founded') {
      if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 1900 || value > new Date().getFullYear())) throw new Error('创办年份须为1900年至当前年份之间的整数')
      result[key] = value
    } else {
      if (!TEXT_FIELDS.has(key)) throw new Error(`不允许修改设置字段：${key}`)
      if (value !== null && typeof value !== 'string') throw new Error(`字段 ${key} 必须为文本`)
      if (typeof value === 'string' && value.length > (key.endsWith('Benefits') ? 50000 : 1000)) throw new Error(`字段 ${key} 内容过长`)
      if (key === 'orgName' && (!value || !value.trim())) throw new Error('机构名称不能为空')
      const text = key === 'logoUrl' && typeof value === 'string' && value.startsWith('/uploads/') ? `/api${value}` : value
      if (key === 'logoUrl' && text && !text.startsWith('/api/uploads/') && !/^https?:\/\//.test(text)) throw new Error('Logo须为有效图片地址')
      result[key] = text
    }
  }
  if (!Object.keys(result).length) throw new Error('没有需要保存的设置')
  return result
}
