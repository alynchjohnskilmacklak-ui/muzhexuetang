import dayjs from 'dayjs'

export type RelativeDateGrouping = 'today-week-earlier' | 'today-yesterday-earlier'

export type RelativeDateGroup<T> = {
  key: string
  label: string
  items: T[]
}

export function groupByRelativeDate<T>(
  items: T[],
  getDate: (item: T) => string | Date,
  grouping: RelativeDateGrouping,
): RelativeDateGroup<T>[] {
  const today = dayjs().startOf('day')
  const groups = new Map<string, RelativeDateGroup<T>>()

  items.forEach((item) => {
    const itemDate = dayjs(getDate(item)).startOf('day')
    const daysAgo = today.diff(itemDate, 'day')
    let key = 'earlier'
    let label = '更早'

    if (daysAgo === 0) {
      key = 'today'
      label = '今天'
    } else if (grouping === 'today-yesterday-earlier' && daysAgo === 1) {
      key = 'yesterday'
      label = '昨天'
    } else if (grouping === 'today-week-earlier' && daysAgo > 0 && daysAgo < 7) {
      key = 'this-week'
      label = '本周'
    }

    const group = groups.get(key)
    if (group) group.items.push(item)
    else groups.set(key, { key, label, items: [item] })
  })

  return [...groups.values()]
}
