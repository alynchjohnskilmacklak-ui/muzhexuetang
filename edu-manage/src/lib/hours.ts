// Keep calculation precision separate from presentation precision. In
// particular, 40 minutes is 0.66666667 hours, not 0.7 hours.
export function roundHours(value: number, digits = 8) {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(digits))
}

export function minutesToHours(minutes: number, digits = 8) {
  return roundHours(Number(minutes || 0) / 60, digits)
}
