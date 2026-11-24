import 'server-only'
import master2025 from '../../data/volunteer/MASTER_schools_2025.json'
import cutoffs2025 from '../../data/volunteer/admission_cutoffs_2025.json'
import cutoffs2026 from '../../data/volunteer/admission_cutoffs_2026.json'
import {
  legacySchoolAdmissionHistory,
  normalizeSchoolAdmissionHistory,
  type SchoolAdmissionLine,
  type SchoolAdmissionYearRecord,
} from '@/lib/school-admission-history'

type SchoolRecord = {
  name?: unknown
  fullName?: unknown
  yiTong?: unknown
  tongZhao?: unknown
  allocationLine?: unknown
  xinleLine?: unknown
  admissionHistory?: unknown
}

const SCHOOL_ALIASES: string[][] = [
  ['二中西校区', '五中（二中西校区）'],
  ['新伏羲中学', '新乐市新伏羲中学'],
  ['河北外国语学院附中', '河北外国语学院附属中学有限公司'],
  ['云德高级中学', '云德高级中学有限公司'],
  ['云臻高级中学', '云臻高级中学有限责任公司'],
  ['浩文高级中学', '浩文高级中学有限公司'],
]

function stripRegionSuffix(value: string): { name: string; scope: string | null } {
  const normalized = value.normalize('NFC').replace(/[\s\u3000]/g, '').replace(/[（]/g, '(').replace(/[）]/g, ')')
  const match = normalized.match(new RegExp(`\\((市内五区|其他县区|新三区|高新区|鹿泉|新乐|藁城|正定|行唐|无极|平山|赞皇|高邑|灵寿|矿区|县|市)\\)$`))
  return {
    name: match ? normalized.slice(0, match.index) : normalized,
    scope: match?.[1] ?? null,
  }
}

function canonicalSchoolName(value: unknown): string {
  if (typeof value !== 'string') return ''
  const name = stripRegionSuffix(value).name
    .replace(/^石家庄市?/, '')
    .replace(/[（）()\s\u3000]/g, '')
  for (const group of SCHOOL_ALIASES) {
    if (group.some((alias) => alias.replace(/[（）()\s\u3000]/g, '') === name)) {
      return group[0].replace(/[（）()\s\u3000]/g, '')
    }
  }
  return name
}

function getSchoolKeys(school: SchoolRecord): Set<string> {
  const keys = new Set<string>()
  for (const candidate of [school.name, school.fullName]) {
    const key = canonicalSchoolName(candidate)
    if (key) keys.add(key)
  }
  return keys
}

function targetScope(school: SchoolRecord): string | null {
  if (typeof school.fullName !== 'string') return null
  return stripRegionSuffix(school.fullName).scope
}

function selectScope<T extends { scope: string | null }>(rows: T[], scope: string | null): T[] {
  if (!scope) return rows
  const exact = rows.filter((row) => row.scope === scope)
  return exact.length ? exact : rows
}

function make2025History(school: SchoolRecord, keys: Set<string>): SchoolAdmissionYearRecord | null {
  const linesByKey = new Map<string, SchoolAdmissionLine>()
  const schoolData = master2025.data.filter((item) => keys.has(canonicalSchoolName(item.schoolName)))

  for (const item of schoolData) {
    for (const row of item.allLines) {
      if (row.yiTong != null) {
        const line: SchoolAdmissionLine = { label: '一统线', scope: row.scope, sourceScope: row.scope, comparisonScope: row.scope, score: row.yiTong }
        linesByKey.set(`${line.label}|${line.scope}`, line)
      }
      if (row.tongZhao != null) {
        const line: SchoolAdmissionLine = { label: '统招线', scope: row.scope, sourceScope: row.scope, comparisonScope: row.scope, score: row.tongZhao }
        linesByKey.set(`${line.label}|${line.scope}`, line)
      }
    }
  }

  for (const row of cutoffs2025) {
    if (!keys.has(canonicalSchoolName(row.baseName ?? row.schoolName))) continue
    const lineScope = row.regionLabel
    if (row.yiTong != null) {
      const line: SchoolAdmissionLine = { label: '一统线', scope: lineScope, sourceScope: lineScope, comparisonScope: lineScope, score: row.yiTong }
      linesByKey.set(`${line.label}|${line.scope}`, line)
    }
    if (row.tongZhao != null) {
      const line: SchoolAdmissionLine = { label: '统招线', scope: lineScope, sourceScope: lineScope, comparisonScope: lineScope, score: row.tongZhao }
      linesByKey.set(`${line.label}|${line.scope}`, line)
    }
  }

  const stored = normalizeSchoolAdmissionHistory(school.admissionHistory).find((record) => record.year === 2025)
  for (const line of stored?.lines ?? []) {
    if (line.scope === '分配生' || line.scope === '新乐') {
      linesByKey.set(`${line.label}|${line.scope}`, line)
    }
  }

  const lines = selectScope([...linesByKey.values()], targetScope(school))
  if (lines.length === 0) return null
  return {
    year: 2025,
    fullScore: 800,
    lines,
    sourceName: '牧哲学堂项目 2025 年学校分数线汇总',
    sourceUrl: null,
    sourceNote: '2025 校线来自项目内 MASTER_schools_2025.json 与补充线表，原逐校官方链接未保存，状态为待核验。只有同校、同范围、同线型的 2025 值用于计算涨跌。',
    confidence: 'unverified',
    verifiedAt: null,
  }
}

function make2026History(school: SchoolRecord, keys: Set<string>): SchoolAdmissionYearRecord | null {
  const sourceRows = cutoffs2026.data.filter((row) => keys.has(canonicalSchoolName(row.baseName)))
  const rows = selectScope(sourceRows, targetScope(school))
  const lines: SchoolAdmissionLine[] = []

  for (const row of rows) {
    const specialCategory = row.schoolName.includes('美术职业实验学校')
    const displayScope = row.scope
      || (row.comparisonScope ? `原表未注明（按“${row.comparisonScope}”口径比较）` : '原表未注明招生范围')
    const yiTongDelta = row.comparison?.yiTongDelta ?? null
    const tongZhaoDelta = row.comparison?.tongZhaoDelta ?? null
    if (row.yiTong != null) {
      lines.push({
        label: '一统线',
        scope: displayScope,
        sourceScope: row.scope,
        comparisonScope: row.comparisonScope,
        score: row.yiTong,
        reviewRequired: yiTongDelta != null && Math.abs(yiTongDelta) >= 100,
      })
    }
    lines.push({
      label: specialCategory ? `统招线（${row.schoolName.match(/[（(]([^）)]+)[）)]/)?.[1] ?? '其他类别'}）` : '统招线',
      scope: displayScope,
      sourceScope: row.scope,
      comparisonScope: row.comparisonScope,
      score: row.tongZhao,
      reviewRequired: tongZhaoDelta != null && Math.abs(tongZhaoDelta) >= 100,
    })
  }

  if (lines.length === 0) return null
  return {
    year: 2026,
    fullScore: 800,
    lines,
    sourceName: cutoffs2026.sourceName,
    sourceUrl: cutoffs2026.sourceUrl,
    sourceNote: cutoffs2026.sourceNote,
    confidence: cutoffs2026.confidence,
    verifiedAt: null,
  }
}

function isSavedManualRecord(record: SchoolAdmissionYearRecord | undefined): record is SchoolAdmissionYearRecord {
  if (!record || record.lines.length === 0) return false
  if (record.year === 2025 && record.lines.every((line) =>
    line.scope === '原学校资料口径' || line.scope === '分配生' || line.scope === '新乐',
  )) return false
  return true
}

/** Combine the imported year sources with saved/admin-edited history for the school API. */
export function getSchoolAdmissionHistoryWithImportedSources(
  school: SchoolRecord,
  savedHistory: unknown,
): SchoolAdmissionYearRecord[] {
  const stored = normalizeSchoolAdmissionHistory(savedHistory)
  const fallback = stored.length ? stored : legacySchoolAdmissionHistory(school)
  const keys = getSchoolKeys(school)
  const imported2025 = make2025History({ ...school, admissionHistory: savedHistory }, keys)
  const imported2026 = make2026History(school, keys)
  const storedByYear = new Map(stored.map((record) => [record.year, record]))
  const records = new Map(fallback.map((record) => [record.year, record]))

  if (imported2025 && !isSavedManualRecord(storedByYear.get(2025))) records.set(2025, imported2025)
  if (imported2026 && !isSavedManualRecord(storedByYear.get(2026))) records.set(2026, imported2026)

  return [...records.values()].sort((a, b) => b.year - a.year)
}
