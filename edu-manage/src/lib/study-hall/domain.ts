const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseDateKey(value: string) {
  if (!DATE_PATTERN.test(value)) throw new Error('日期格式不正确')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('日期格式不正确')
  }
  return date
}

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function monthKeyForDate(value: string) {
  parseDateKey(value)
  return value.slice(0, 7)
}

export function monthRange(monthKey: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error('月份格式不正确')
  const start = new Date(`${monthKey}-01T00:00:00.000Z`)
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
  return { start, end }
}

export function isoWeekday(value: Date | string) {
  const day = (typeof value === 'string' ? parseDateKey(value) : value).getUTCDay()
  return day === 0 ? 7 : day
}

export function isScheduledDate(studyDate: string, weekdays: number[]) {
  return weekdays.includes(isoWeekday(studyDate))
}

export function countScheduledDays(start: Date, end: Date, weekdays: number[]) {
  if (end < start) return 0
  const allowed = new Set(weekdays)
  let count = 0
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (allowed.has(isoWeekday(cursor))) count += 1
  }
  return count
}

export function calculateMonthlyEntitlement(input: {
  monthKey: string
  joinedAt: Date
  leftAt?: Date | null
  termStart: Date
  termEnd: Date
  weekdays: number[]
}) {
  const month = monthRange(input.monthKey)
  const start = new Date(Math.max(month.start.getTime(), input.joinedAt.getTime(), input.termStart.getTime()))
  const end = new Date(Math.min(month.end.getTime(), input.leftAt?.getTime() ?? Infinity, input.termEnd.getTime()))
  return countScheduledDays(start, end, input.weekdays)
}

export function attendanceKey(sessionId?: string | null) {
  return sessionId ? `SESSION:${sessionId}` : 'DAY'
}

export function calculateRemainingDays(entitledDays: number, adjustment: number, checkedInDates: Iterable<string>) {
  const usedDays = new Set(checkedInDates).size
  return {
    entitledDays,
    adjustment,
    usedDays,
    remainingDays: Math.max(0, entitledDays + adjustment - usedDays),
  }
}

export function calculatePurchasedDayBalance(
  purchasedDays: number | null,
  adjustedDays: number,
  checkedInDates: Iterable<string>,
) {
  const usedDays = new Set(checkedInDates).size
  const totalDays = purchasedDays == null ? null : Math.max(0, purchasedDays + adjustedDays)
  return {
    purchasedDays,
    adjustedDays,
    totalDays,
    usedDays,
    remainingDays: totalDays == null ? null : Math.max(0, totalDays - usedDays),
    quotaState: totalDays == null ? 'UNSET' : usedDays >= totalDays ? 'EXPIRED' : totalDays - usedDays <= 3 ? 'LOW' : 'ACTIVE',
  } as const
}
