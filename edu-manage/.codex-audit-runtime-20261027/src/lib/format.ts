export function formatHours(value: number | string | null | undefined, digits = 1): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'

  const rounded = Number(n.toFixed(digits))
  if (Number.isInteger(rounded)) return String(rounded)

  return rounded.toFixed(digits).replace(/\.0$/, '')
}

export function formatHourPair(
  used: number | string | null | undefined,
  total: number | string | null | undefined,
  digits = 1
): string {
  return `${formatHours(used, digits)}/${formatHours(total, digits)}`
}

export function formatPercent(value: number | string | null | undefined, digits = 0): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0%'

  return `${Number(n.toFixed(digits))}%`
}
