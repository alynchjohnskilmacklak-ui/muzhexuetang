export type ReportRange = { top: number; bottom: number }

/** Keep text lines and normal-sized images intact; oversized blocks still advance. */
export function reportPageEnd(start: number, limit: number, height: number, ranges: ReportRange[]) {
  let end = Math.min(height, start + limit)
  if (end === height) return end
  for (let i = 0; i <= ranges.length; i += 1) {
    const crossing = ranges.filter((range) => range.top < end && range.bottom > end && range.top > start)
    if (!crossing.length) break
    end = Math.min(...crossing.map((range) => range.top))
  }
  return end > start + 1 ? end : Math.min(height, start + limit)
}
