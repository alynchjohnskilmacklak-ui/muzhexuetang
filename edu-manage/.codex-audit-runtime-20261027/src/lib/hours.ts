export function roundHours(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(digits))
}

export function minutesToHours(minutes: number, digits = 1) {
  return roundHours(Number(minutes || 0) / 60, digits)
}
