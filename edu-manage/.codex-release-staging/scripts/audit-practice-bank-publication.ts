import {
  QUESTION_REVIEW_CANDIDATES,
  RETIRED_INCOMPLETE_CANDIDATE_QUESTION_COUNT,
  RETIRED_INCOMPLETE_CANDIDATE_SET_COUNT,
  RETIRED_UNLOCATABLE_CANDIDATE_SET_COUNT,
  REVIEWED_QUESTION_SETS,
} from '../src/data/parent-practice-bank'
import { PUBLISHED_PRACTICE_SETS } from '../src/data/published-practice-bank'

const published = PUBLISHED_PRACTICE_SETS.filter((set) => set.reviewedBy === '用户确认')
const counts: Record<string, { sets: number; questions: number }> = {}
const setIds = new Set<string>()
const questionIds = new Map<string, string>()
const duplicateQuestionSamples: Array<{ questionId: string; previousSetId: string; duplicateSetId: string }> = []
let duplicateSets = 0
let duplicateQuestions = 0
let questionsMissingSource = 0
let questionsMissingExplanation = 0
let questionsMissingAnswer = 0

for (const set of published) {
  const key = `${set.grade}/${set.subject}/${set.volume}`
  counts[key] ??= { sets: 0, questions: 0 }
  counts[key].sets += 1
  counts[key].questions += set.questions.length
  if (setIds.has(set.id)) duplicateSets += 1
  setIds.add(set.id)

  for (const question of set.questions) {
    const previousSetId = questionIds.get(question.id)
    if (previousSetId) {
      duplicateQuestions += 1
      if (duplicateQuestionSamples.length < 10) {
        duplicateQuestionSamples.push({ questionId: question.id, previousSetId, duplicateSetId: set.id })
      }
    } else questionIds.set(question.id, set.id)
    if (!question.sourceRef?.trim()) questionsMissingSource += 1
    if (!question.explanation?.trim()) questionsMissingExplanation += 1
    if (question.type === 'single_choice'
      ? !Number.isInteger(question.answerIndex) || question.answerIndex! < 0 || question.answerIndex! >= (question.options?.length ?? 0)
      : !question.answerIndices?.length && question.correctAnswer === undefined) questionsMissingAnswer += 1
  }
}

const candidateCounts: Record<string, { sets: number; questions: number }> = {}
const candidateSamples: Record<string, Array<{ id: string; grade: string; volume: string; chapter: string; section: string }>> = {}
for (const set of QUESTION_REVIEW_CANDIDATES) {
  const key = `${set.grade}/${set.subject}/${set.volume}`
  candidateCounts[key] ??= { sets: 0, questions: 0 }
  candidateCounts[key].sets += 1
  candidateCounts[key].questions += set.questions.length
  const subject = set.subject
  candidateSamples[subject] ??= []
  if (candidateSamples[subject].length < 4) {
    candidateSamples[subject].push({ id: set.id, grade: set.grade, volume: set.volume, chapter: set.chapter, section: set.section })
  }
}

console.log(JSON.stringify({
  reviewedSets: REVIEWED_QUESTION_SETS.length,
  publishedSets: published.length,
  publishedQuestions: published.reduce((total, set) => total + set.questions.length, 0),
  pendingSets: QUESTION_REVIEW_CANDIDATES.length,
  pendingQuestions: QUESTION_REVIEW_CANDIDATES.reduce((total, set) => total + set.questions.length, 0),
  retiredUnlocatableCandidateSets: RETIRED_UNLOCATABLE_CANDIDATE_SET_COUNT,
  retiredIncompleteCandidateSets: RETIRED_INCOMPLETE_CANDIDATE_SET_COUNT,
  retiredIncompleteCandidateQuestions: RETIRED_INCOMPLETE_CANDIDATE_QUESTION_COUNT,
  duplicateSets,
  duplicateQuestions,
  duplicateQuestionSamples,
  questionsMissingSource,
  questionsMissingExplanation,
  questionsMissingAnswer,
  publishedByGradeSubjectVolume: counts,
  pendingByGradeSubjectVolume: candidateCounts,
  pendingExamplesBySubject: candidateSamples,
}, null, 2))
