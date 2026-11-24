export type SchoolAdmissionLine = {
  label: string
  scope: string
  score: number
  /** Scope used only when a source omitted a region but an exact 2025 baseline exists. */
  comparisonScope?: string | null
  /** Original scope wording from the source; null means the source did not state one. */
  sourceScope?: string | null
  reviewRequired?: boolean
}

export type SchoolAdmissionYearRecord = {
  year: number
  fullScore: number
  lines: SchoolAdmissionLine[]
  sourceName: string | null
  sourceUrl: string | null
  sourceNote: string | null
  confidence: string | null
  verifiedAt: string | null
}

type LegacySchoolScores = {
  yiTong?: unknown
  tongZhao?: unknown
  allocationLine?: unknown
  xinleLine?: unknown
  name?: unknown
}

function positiveInteger(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export function normalizeSchoolAdmissionHistory(value: unknown): SchoolAdmissionYearRecord[] {
  if (!Array.isArray(value)) return []

  const records: SchoolAdmissionYearRecord[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const year = positiveInteger(record.year)
    const fullScore = positiveInteger(record.fullScore)
    if (!year || !fullScore || !Array.isArray(record.lines)) continue

    const lines = record.lines.flatMap((rawLine) => {
      if (!rawLine || typeof rawLine !== 'object') return []
      const line = rawLine as Record<string, unknown>
      const label = typeof line.label === 'string' ? line.label.trim().slice(0, 40) : ''
      const scope = typeof line.scope === 'string' ? line.scope.trim().slice(0, 80) : ''
      const score = positiveInteger(line.score)
      if (!label || !scope || !score || score > fullScore) return []
      const comparisonScope = typeof line.comparisonScope === 'string' && line.comparisonScope.trim()
        ? line.comparisonScope.trim().slice(0, 80)
        : null
      const sourceScope = typeof line.sourceScope === 'string' && line.sourceScope.trim()
        ? line.sourceScope.trim().slice(0, 80)
        : null
      return [{ label, scope, score, comparisonScope, sourceScope, reviewRequired: line.reviewRequired === true }]
    })

    const optionalText = (key: string, maxLength = 1000) =>
      typeof record[key] === 'string' && (record[key] as string).trim()
        ? (record[key] as string).trim().slice(0, maxLength)
        : null

    records.push({
      year,
      fullScore,
      lines,
      sourceName: optionalText('sourceName', 160),
      sourceUrl: optionalText('sourceUrl', 500),
      sourceNote: optionalText('sourceNote', 1000),
      confidence: optionalText('confidence', 30),
      verifiedAt: optionalText('verifiedAt', 40),
    })
  }

  return records.sort((a, b) => b.year - a.year)
}

/**
 * Existing installs keep a single set of score columns. Until annual data has
 * been migrated/entered, expose them as a clearly marked 2025 history record.
 */
export function legacySchoolAdmissionHistory(school: LegacySchoolScores): SchoolAdmissionYearRecord[] {
  const lines: SchoolAdmissionLine[] = []
  const push = (label: string, scope: string, rawScore: unknown) => {
    const score = positiveInteger(rawScore)
    if (score && score <= 800) lines.push({ label, scope, score })
  }

  push('一统线 / 市区统招分', '原学校资料口径', school.yiTong)
  push('统招线', '原学校资料口径', school.tongZhao)
  push('分配生录取线', '分配生', school.allocationLine)
  push('新乐参考线', '新乐', school.xinleLine)

  return [
    {
      year: 2026,
      fullScore: 800,
      lines: [],
      sourceName: '学校实际录取线待按 2026 年官方原表录入',
      sourceUrl: null,
      sourceNote: '本条仅显示当年满分口径；学校实际录取线请从官方录取分数线原表逐校录入，不得以市级控制线代替。',
      confidence: 'unverified',
      verifiedAt: null,
    },
    {
      year: 2025,
      fullScore: 800,
      lines,
      sourceName: '项目现有 2025 年学校分数表',
      sourceUrl: null,
      sourceNote: '学校具体录取线来自项目原有分数数据，原始官方校线链接未随数据保存，请按教育考试院录取资料逐条复核。满分口径请看下方官方年度说明。',
      confidence: 'unverified',
      verifiedAt: null,
    },
    {
      year: 2024,
      fullScore: 670,
      lines: [],
      sourceName: '学校实际录取线待补录',
      sourceUrl: null,
      sourceNote: '此条仅显示当年中考满分口径，学校实际录取线暂未录入。',
      confidence: 'unverified',
      verifiedAt: null,
    },
  ]
}

export function getSchoolAdmissionHistory(
  school: LegacySchoolScores & { admissionHistory?: unknown },
): SchoolAdmissionYearRecord[] {
  const history = normalizeSchoolAdmissionHistory(school.admissionHistory)
  return history.length > 0 ? history : legacySchoolAdmissionHistory(school)
}
