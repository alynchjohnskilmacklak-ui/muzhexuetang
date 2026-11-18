export function parseSubjectSettings(input: unknown, requireName = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('学科内容格式无效')
  const output: { name?: string; color?: string; textColor?: string } = {}
  for (const [key, value] of Object.entries(input)) {
    if (!['name', 'color', 'textColor'].includes(key)) throw new Error(`不允许修改学科字段：${key}`)
    if (typeof value !== 'string') throw new Error('学科名称和颜色必须为文本')
    if (key === 'name') {
      const name = value.trim()
      if (!name || name.length > 30) throw new Error('学科名称须为1–30个字')
      output.name = name
    } else {
      if (!/^#[\da-f]{6}$/i.test(value)) throw new Error('标签颜色须为六位十六进制颜色')
      output[key as 'color' | 'textColor'] = value
    }
  }
  if (!Object.keys(output).length || (requireName && !output.name)) throw new Error('学科名称不能为空')
  return output
}
