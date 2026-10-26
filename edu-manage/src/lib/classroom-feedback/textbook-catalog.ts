import juniorCatalog from '../../../data/textbooks/current-junior-textbook-catalog-2026.json'
import editionPolicy from '../../../data/textbooks/edition-policy.json'
import { normalizeTextbookGrade } from './textbook-editions'

type TextbookCatalogEntry = {
  id: string
  title: string
  depth: number
  path: string[]
}

type TextbookCatalogVolume = {
  subject: string
  title: string
  publisher: string
  termLabel: string
  directoryStatus: string
  entries: TextbookCatalogEntry[]
}

type TextbookCatalogSource = {
  volumes: TextbookCatalogVolume[]
}

export type TextbookCatalogOption = { label: string; value: string }
export type TextbookCatalogOptionGroup = { label: string; options: TextbookCatalogOption[] }
export type TextbookCatalogSelection = {
  value: string
  volumeTitle: string
  entryId: string
  entryTitle: string
  depth: number
  path: string[]
  relatedEntryIds: string[]
}

const catalog = juniorCatalog as TextbookCatalogSource
const publisherPolicy = editionPolicy.junior as Record<string, string>
const SUBJECT_ALIASES: Record<string, string> = {
  政治: '道德与法治',
  道德与法治: '道德与法治',
  生物学: '生物',
}
const GRADE_LABELS: Record<string, string> = {
  初一: '七年级',
  初二: '八年级',
  初三: '九年级',
}

function getVolumes(subjectValue: string, gradeValue: string) {
  const grade = normalizeTextbookGrade(gradeValue)
  const gradeLabel = GRADE_LABELS[grade]
  const subject = SUBJECT_ALIASES[subjectValue.trim()] || subjectValue.trim()
  if (!gradeLabel || !subject) return []
  return catalog.volumes.filter((volume) => volume.subject === subject && volume.title.startsWith(gradeLabel))
}

function entryPath(entry: TextbookCatalogEntry) {
  const path = entry.path.map((part) => part.trim()).filter(Boolean)
  return path.length ? path : [entry.title]
}

function displayPath(volume: TextbookCatalogVolume, entry: TextbookCatalogEntry) {
  return `${volume.title} · ${entryPath(entry).join(' › ')}`
}

function displayVolumeLabel(volume: TextbookCatalogVolume, subject: string) {
  const preview = volume.directoryStatus === 'PUBLIC_PREVIEW_AWAITING_PRINTED_BOOK_REVIEW'
  const configuredPublisher = publisherPolicy[subject] || volume.publisher
  const publisher = configuredPublisher.startsWith('统编版') ? '人教版（统编教材）' : configuredPublisher
  const status = preview
    ? ' · 九下预排'
    : volume.directoryStatus === 'CURRENT_PUBLIC_DIRECTORY_CHECKED'
      ? ' · 公开目录已核'
    : volume.directoryStatus === 'USER_SUPPLIED_UNVERIFIED'
      ? ' · 目录待核'
      : ' · 来源待核'
  return `${volume.title}（${publisher} · ${volume.termLabel}${status}）`
}

/** Institution-specific junior-school directory options, grouped by book volume. */
export function getTextbookCatalogSelectOptions(subject: string, grade: string): TextbookCatalogOptionGroup[] {
  return getVolumes(subject, grade).map((volume) => {
    const seen = new Set<string>()
    const options = volume.entries.flatMap((entry) => {
      const label = displayPath(volume, entry)
      if (seen.has(label)) return []
      seen.add(label)
      return [{ label, value: label }]
    })
    return { label: displayVolumeLabel(volume, SUBJECT_ALIASES[subject.trim()] || subject.trim()), options }
  }).filter((volume) => volume.options.length > 0)
}

/** Resolve only exact chapters present in the selected grade and subject's local textbook directory. */
export function resolveTextbookCatalogSelectionValues(
  subject: string,
  grade: string,
  values: unknown,
): TextbookCatalogSelection[] {
  if (!Array.isArray(values)) return []
  const requestedValues = [...new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean))].slice(0, 12)
  if (!requestedValues.length) return []

  const requested = new Set(requestedValues)
  const resolved = new Map<string, TextbookCatalogSelection>()
  for (const volume of getVolumes(subject, grade)) {
    for (const entry of volume.entries) {
      const value = displayPath(volume, entry)
      if (!requested.has(value) || resolved.has(value)) continue
      const path = entryPath(entry)
      const relatedEntryIds = volume.entries
        .filter((candidate) => {
          if (candidate.id === entry.id) return true
          if (entry.depth !== 0 || candidate.path.length <= path.length) return false
          return path.every((part, index) => candidate.path[index]?.trim() === part)
        })
        .map((candidate) => candidate.id)
      resolved.set(value, {
        value,
        volumeTitle: volume.title,
        entryId: entry.id,
        entryTitle: entry.title,
        depth: entry.depth,
        path,
        relatedEntryIds,
      })
    }
  }

  return requestedValues.flatMap((value) => {
    const selection = resolved.get(value)
    return selection ? [selection] : []
  })
}

/** Accept only chapters present in the selected grade and subject's local textbook directory. */
export function validateTextbookCatalogSelectionValues(subject: string, grade: string, values: unknown): string[] {
  return resolveTextbookCatalogSelectionValues(subject, grade, values).map((selection) => selection.value)
}

