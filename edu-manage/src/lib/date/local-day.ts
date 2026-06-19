/** 统一中国本地日期工具。所有排课/考勤/课表日期查询必须使用此模块。 */

export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

export interface DayRange {
  start: Date
  end: Date
}

/**
 * 返回 dateString 在中国本地时区下的 00:00:00 ~ 次日 00:00:00 区间。
 * dateString 格式: "YYYY-MM-DD"。
 */
export function getLocalDayRange(dateString: string, timezone = DEFAULT_TIMEZONE): DayRange {
  const d = new Date(`${dateString}T00:00:00+08:00`)
  if (isNaN(d.getTime())) throw new Error(`Invalid date string: ${dateString}`)
  const start = new Date(d)
  const end = new Date(d.getTime() + 86400000)
  return { start, end }
}

/** 将各种日期输入标准化为 "YYYY-MM-DD" */
export function normalizeDateOnly(input: string | Date | unknown): string {
  if (!input) throw new Error('Invalid date input')
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10)
  }
  if (typeof input === 'string') {
    // 已经是 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    // ISO 字符串
    const d = new Date(input)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  throw new Error('Invalid date format')
}

/** 标准化时间字符串为 "HH:mm" */
export function normalizeTimeHHmm(input: string | unknown): string {
  if (typeof input !== 'string') throw new Error('Invalid time input: expected string')
  const trimmed = input.trim()
  // 已经是 HH:mm
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  // H:mm 补零
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  throw new Error(`Invalid time format: "${input}". Expected HH:mm`)
}

/** 判断两个时间段是否重叠。所有参数应为 "HH:mm" 字符串。 */
export function isTimeRangeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aS = normalizeTimeHHmm(startA)
  const aE = normalizeTimeHHmm(endA)
  const bS = normalizeTimeHHmm(startB)
  const bE = normalizeTimeHHmm(endB)
  return aS < bE && aE > bS
}

/** 获取今天的本地日期字符串 YYYY-MM-DD */
export function todayLocal(timezone = DEFAULT_TIMEZONE): string {
  // 用 Intl 避免手动拼接，自动处理时区
  const now = new Date()
  // 简单方式：转为 ISO 并取日期部分（在 UTC+8 下 day 通常正确，用 formatter 更可靠）
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(now)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

/** 返回从 startDate 开始连续 n 天的日期字符串数组 */
export function dateRangeDays(startDate: string, count: number): string[] {
  const start = new Date(`${startDate}T00:00:00+08:00`)
  if (isNaN(start.getTime())) throw new Error(`Invalid startDate: ${startDate}`)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}
