export function getTodayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return { start, end }
}
