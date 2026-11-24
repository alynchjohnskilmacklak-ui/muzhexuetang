import type { VocabEntry } from '@/data/vocab-sets'
import type { PrismaClient } from '@prisma/client'

export interface VocabDatabaseRecord {
  id: string
  grade: string
  volume: string
  unit: string
  section: string
  headword: string
  phonetic: string | null
  pos: string
  note: string | null
  meanings: string[]
  phrase: boolean
  bookPage: number | null
  sourcePage: number | null
}

export interface VocabBookSummary {
  grade: string
  volume: string
  count: number
}

/** Only allow the bundled catalog fallback when the catalog table itself is absent. */
export function isMissingVocabWordTable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const value = error as {
    code?: unknown
    message?: unknown
    meta?: { code?: unknown; message?: unknown; table?: unknown; modelName?: unknown }
  }
  const code = typeof value.code === 'string' ? value.code : ''
  const databaseCode = typeof value.meta?.code === 'string' ? value.meta.code : ''
  const message = [value.message, value.meta?.message, value.meta?.table, value.meta?.modelName]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')

  if (code === 'P2021') return /VocabWord/i.test(message)
  return code === 'P2010' && databaseCode === '42P01' && /VocabWord/i.test(message)
}

export function summarizeVocabBooks(entries: VocabEntry[]): VocabBookSummary[] {
  const counts = new Map<string, VocabBookSummary>()
  for (const entry of entries) {
    const key = `${entry.grade}\u001f${entry.volume}`
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { grade: entry.grade, volume: entry.volume, count: 1 })
  }
  return [...counts.values()].sort((a, b) => a.grade.localeCompare(b.grade, 'zh-CN') || a.volume.localeCompare(b.volume, 'zh-CN'))
}

export function normalizeVocabHeadword(headword: string): string {
  return headword.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'")
}

function identity(entry: Pick<VocabEntry, 'grade' | 'volume' | 'unit' | 'headword'>): string {
  return [entry.grade, entry.volume, entry.unit, normalizeVocabHeadword(entry.headword)].join('\u001f')
}

function uniqueText(values: string[]): string[] {
  const seen = new Set<string>()
  return values.map((value) => value.trim()).filter((value) => {
    if (!value) return false
    const key = value.toLocaleLowerCase('zh-CN')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 合并同年级、同册、同单元、同词头的多义词记录。
 * 输入顺序有意保持“旧静态词表在前、教材原始词条在后”，因此沿用旧 ID 保护进度记录。
 */
export function mergeVocabCatalog(entries: VocabEntry[]): VocabEntry[] {
  const merged = new Map<string, VocabEntry>()

  for (const entry of entries) {
    const key = identity(entry)
    const current = merged.get(key)
    if (!current) {
      merged.set(key, { ...entry, meanings: uniqueText(entry.meanings) })
      continue
    }

    const notes = uniqueText([current.note ?? '', entry.note ?? ''])
    merged.set(key, {
      ...current,
      section: current.section || entry.section,
      // 后入的教材词条通常包含更完整的词性标注。
      pos: entry.pos || current.pos,
      phonetic: current.phonetic || entry.phonetic,
      note: notes.length ? notes.join('；') : undefined,
      meanings: uniqueText([...current.meanings, ...entry.meanings]),
      phrase: Boolean(current.phrase || entry.phrase) || undefined,
      bookPage: entry.bookPage ?? current.bookPage,
      sourcePage: entry.sourcePage ?? current.sourcePage,
    })
  }

  return [...merged.values()]
}

export function vocabDatabaseData(entry: VocabEntry) {
  return {
    id: entry.id,
    grade: entry.grade,
    volume: entry.volume,
    unit: entry.unit,
    section: entry.section,
    headword: entry.headword,
    normalizedHeadword: normalizeVocabHeadword(entry.headword),
    phonetic: entry.phonetic ?? null,
    pos: entry.pos,
    note: entry.note ?? null,
    meanings: entry.meanings,
    phrase: Boolean(entry.phrase),
    bookPage: entry.bookPage ?? null,
    sourcePage: entry.sourcePage ?? null,
  }
}

export function vocabEntryFromDatabase(row: VocabDatabaseRecord): VocabEntry {
  return {
    id: row.id,
    grade: row.grade,
    volume: row.volume,
    unit: row.unit,
    section: row.section,
    headword: row.headword,
    ...(row.phonetic ? { phonetic: row.phonetic } : {}),
    pos: row.pos,
    ...(row.note ? { note: row.note } : {}),
    meanings: row.meanings,
    ...(row.phrase ? { phrase: true } : {}),
    ...(row.bookPage === null ? {} : { bookPage: row.bookPage }),
    ...(row.sourcePage === null ? {} : { sourcePage: row.sourcePage }),
  }
}

/** Read compact book options for the selector without materializing every vocabulary word. */
export async function loadVocabBookSummaries(reader: Pick<PrismaClient, '$queryRaw'>): Promise<VocabBookSummary[]> {
  return reader.$queryRaw<VocabBookSummary[]>`
    SELECT "grade", "volume", COUNT(*)::int AS "count"
    FROM "VocabWord"
    GROUP BY "grade", "volume"
    ORDER BY "grade" ASC, "volume" ASC
  `
}

/** Read the requested slice of the catalog using the generated Prisma raw-query API. */
export async function loadVocabEntries(
  reader: Pick<PrismaClient, '$queryRaw'>,
  filter?: string | { grade?: string; volume?: string },
): Promise<VocabEntry[]> {
  const normalizedFilter: { grade?: string; volume?: string } = typeof filter === 'string'
    ? { volume: filter }
    : filter ?? {}
  const { grade, volume } = normalizedFilter

  let rows: VocabDatabaseRecord[]
  if (grade && volume) {
    rows = await reader.$queryRaw<VocabDatabaseRecord[]>`
        SELECT "id", "grade", "volume", "unit", "section", "headword", "phonetic", "pos", "note",
               "meanings", "phrase", "bookPage", "sourcePage"
        FROM "VocabWord"
        WHERE "grade" = ${grade} AND "volume" = ${volume}
        ORDER BY "grade" ASC, "volume" ASC, "sourcePage" ASC NULLS LAST, "unit" ASC, "headword" ASC
      `
  } else if (grade) {
    rows = await reader.$queryRaw<VocabDatabaseRecord[]>`
        SELECT "id", "grade", "volume", "unit", "section", "headword", "phonetic", "pos", "note",
               "meanings", "phrase", "bookPage", "sourcePage"
        FROM "VocabWord"
        WHERE "grade" = ${grade}
        ORDER BY "grade" ASC, "volume" ASC, "sourcePage" ASC NULLS LAST, "unit" ASC, "headword" ASC
      `
  } else if (volume) {
    rows = await reader.$queryRaw<VocabDatabaseRecord[]>`
        SELECT "id", "grade", "volume", "unit", "section", "headword", "phonetic", "pos", "note",
               "meanings", "phrase", "bookPage", "sourcePage"
        FROM "VocabWord"
        WHERE "volume" = ${volume}
        ORDER BY "grade" ASC, "volume" ASC, "sourcePage" ASC NULLS LAST, "unit" ASC, "headword" ASC
      `
  } else {
    rows = await reader.$queryRaw<VocabDatabaseRecord[]>`
        SELECT "id", "grade", "volume", "unit", "section", "headword", "phonetic", "pos", "note",
               "meanings", "phrase", "bookPage", "sourcePage"
        FROM "VocabWord"
        ORDER BY "grade" ASC, "volume" ASC, "sourcePage" ASC NULLS LAST, "unit" ASC, "headword" ASC
      `
  }
  return rows.map(vocabEntryFromDatabase)
}
