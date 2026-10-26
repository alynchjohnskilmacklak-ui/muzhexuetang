import { eachDayOfInterval, format, parseISO } from 'date-fns'

export const SUMMER_MEAL_PERIOD = {
  startDate: '2026-07-09',
  endDate: '2026-08-08',
  label: '2026暑期课程',
} as const

const SUMMER_TEACHING_RANGES = [
  ['2026-07-09', '2026-07-11'],
  ['2026-07-13', '2026-07-17'],
  ['2026-07-20', '2026-07-24'],
  ['2026-07-27', '2026-07-31'],
  ['2026-08-03', '2026-08-08'],
] as const

const summerTeachingDates = new Set(
  SUMMER_TEACHING_RANGES.flatMap(([start, end]) => (
    eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
      .map((date) => format(date, 'yyyy-MM-dd'))
  )),
)

export function isSummerTeachingDate(date: string): boolean {
  return summerTeachingDates.has(date)
}

export function getMealPeriodDates(
  startDate = SUMMER_MEAL_PERIOD.startDate,
  endDate = SUMMER_MEAL_PERIOD.endDate,
) {
  return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((date) => {
    const key = format(date, 'yyyy-MM-dd')
    return {
      date: key,
      isTeachingDay: isSummerTeachingDate(key),
    }
  })
}

export function getSummerTeachingDayCount(): number {
  return summerTeachingDates.size
}
