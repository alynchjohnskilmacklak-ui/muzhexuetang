import referenceCatalog from '../../../data/textbooks/knowledge-references-junior-math-7a-ch1.json'
import publishedBankReferenceCatalog from '../../../data/textbooks/knowledge-references-published-bank-2026.json'
import supplementalReferenceCatalog from '../../../data/textbooks/knowledge-references-supplemental-2026.json'
import type { TextbookCatalogSelection } from './textbook-catalog'

export type TextbookKnowledgeReferencePoint = {
  title: string
  content: string
  practiceNotes?: Array<{ content: string; questionId?: string; setId?: string; sourceRef?: string }>
}

export type TextbookKnowledgeReference = {
  chapterTitle: string
  reviewStatus: string
  sourceReference: string
  knowledgePoints: TextbookKnowledgeReferencePoint[]
}

type StoredKnowledgeReferenceCollection = {
  subject: string
  grade: string
  volumeTitle: string
  reviewStatus: string
  sourceReference: string
  records: Array<{
    entryId: string
    entryTitle: string
    sourceReference?: string
    knowledgePoints: TextbookKnowledgeReferencePoint[]
  }>
}

const catalogs = [
  ...referenceCatalog.collections,
  ...publishedBankReferenceCatalog.collections,
  ...supplementalReferenceCatalog.collections,
] as StoredKnowledgeReferenceCollection[]

function normalizeSubject(subject: string) {
  return subject === '政治' ? '道德与法治' : subject
}

/**
 * Return only local knowledge summaries that belong to the exact selected
 * textbook entries. Selecting a whole chapter expands to its child entries.
 */
export function getSelectedTextbookKnowledgeReferences(
  subject: string,
  grade: string,
  selections: TextbookCatalogSelection[],
): TextbookKnowledgeReference[] {
  if (!selections.length) return []

  const selectedEntryIdsByVolume = new Map<string, Set<string>>()
  for (const selection of selections) {
    const entryIds = selectedEntryIdsByVolume.get(selection.volumeTitle) || new Set<string>()
    selection.relatedEntryIds.forEach((entryId) => entryIds.add(entryId))
    selectedEntryIdsByVolume.set(selection.volumeTitle, entryIds)
  }

  const references: TextbookKnowledgeReference[] = []
  const includedEntries = new Set<string>()
  const normalizedSubject = normalizeSubject(subject)
  for (const catalog of catalogs) {
    if (normalizeSubject(catalog.subject) !== normalizedSubject || catalog.grade !== grade) continue
    const selectedEntryIds = selectedEntryIdsByVolume.get(catalog.volumeTitle)
    if (!selectedEntryIds) continue

    for (const record of catalog.records) {
      const recordKey = `${catalog.subject}|${catalog.grade}|${catalog.volumeTitle}|${record.entryId}`
      if (!selectedEntryIds.has(record.entryId) || includedEntries.has(recordKey)) continue
      includedEntries.add(recordKey)
      references.push({
        chapterTitle: record.entryTitle,
        reviewStatus: catalog.reviewStatus,
        sourceReference: record.sourceReference || catalog.sourceReference,
        knowledgePoints: record.knowledgePoints,
      })
    }
  }

  return references
}
