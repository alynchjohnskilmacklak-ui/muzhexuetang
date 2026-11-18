import { PARENT_PRACTICE_SETS } from './parent-practice-bank'
import type { PracticeQuestion, PracticeSet } from './parent-practice-bank'
import currentJuniorCatalog from '../../data/textbooks/current-junior-textbook-catalog-2026.json'

/**
 * Publication gate: a question set is not public merely because it exists in
 * the repository. It must be explicitly marked publishable and carry edition
 * evidence plus source references for every question. Historical sets without
 * a confirmed current-book mapping remain private review candidates.
 */

function validQuestion(question: PracticeQuestion, knowledgePointIds: Set<string>) {
  if (question.needsReview || !question.sourceRef?.trim() || !question.prompt?.trim()
    || !question.explanation?.trim() || !knowledgePointIds.has(question.knowledgePointId)) return false
  const type = question.type || 'single_choice'
  if (type === 'single_choice') {
    return Array.isArray(question.options) && question.options.length >= 2
      && Number.isInteger(question.answerIndex)
      && question.answerIndex! >= 0 && question.answerIndex! < question.options.length
  }
  if (type === 'multiple_choice') {
    return Array.isArray(question.options) && question.options.length >= 2
      && Array.isArray(question.answerIndices) && question.answerIndices.length >= 2
      && new Set(question.answerIndices).size === question.answerIndices.length
      && question.answerIndices.every((index) => Number.isInteger(index) && index >= 0 && index < question.options!.length)
  }
  if (type === 'fill_blank' || question.gradingMode === 'exact') {
    const correctAnswer = question.correctAnswer
    return Boolean((correctAnswer !== undefined && String(correctAnswer).trim())
      || question.acceptedAnswers?.some((answer) => String(answer).trim()))
  }
  return Boolean(question.gradingMode === 'self_check')
}

const catalogGradeLabels: Record<string, string> = { 初一: '七年级', 初二: '八年级', 初三: '九年级' }
const catalogGradeNames: Record<string, string> = { 七年级: '初一', 八年级: '初二', 九年级: '初三' }
const currentCatalogLocations = new Set(
  currentJuniorCatalog.volumes.flatMap((volume) => {
    const gradeLabel = Object.keys(catalogGradeNames).find((label) => volume.title.startsWith(label))
    const grade = gradeLabel ? catalogGradeNames[gradeLabel] : ''
    const book = gradeLabel ? volume.title.slice(gradeLabel.length) : ''
    const subject = volume.subject === '道德与法治' ? '政治' : volume.subject
    return volume.entries.map((entry) => {
      const path = entry.path?.length ? entry.path : [entry.title]
      return [grade, subject, book, path.join(' / ')].join('|')
    })
  }),
)

function hasExactCatalogLocation(set: PracticeSet) {
  const gradeLabel = catalogGradeLabels[set.grade]
  if (!gradeLabel || !set.catalogEvidence?.locator) return false
  return currentCatalogLocations.has([
    set.grade,
    set.subject === '道德与法治' ? '政治' : set.subject,
    set.volume,
    set.catalogEvidence.locator,
  ].join('|'))
}

function isPublishable(set: PracticeSet) {
  const pointIds = new Set(set.knowledgePoints.map((point) => point.id))
  return set.publishable === true && set.needsReview !== true && set.catalogOnly !== true
    && Boolean(set.edition?.trim() && set.catalogEvidence?.ref?.trim() && set.chapter?.trim() && set.section?.trim())
    && hasExactCatalogLocation(set)
    && set.questions.length > 0
    && set.questions.every((question) => validQuestion(question, pointIds))
}

export const PUBLISHED_PRACTICE_SETS = PARENT_PRACTICE_SETS.filter(isPublishable)
