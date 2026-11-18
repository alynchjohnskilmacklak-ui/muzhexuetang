// 题库统一导出
import { mathQuestions } from './math-questions'
import { advancedMathQuestions } from './advanced-math-questions'
import { chineseQuestions } from './chinese-questions'
import { englishQuestions } from './english-questions'
import { englishZhongkaoQuestionRevisions2026A } from './english-zhongkao-revisions-2026-a'
import { englishZhongkaoQuestionRevisions2026B } from './english-zhongkao-revisions-2026-b'
import { englishZhongkaoQuestionRevisions2026C } from './english-zhongkao-revisions-2026-c'
import { physicsQuestions } from './physics-questions'
import { physicsZhongkaoQuestionRevisions2026A } from './physics-zhongkao-revisions-2026-a'
import { chemistryQuestions } from './chemistry-questions'
import { historyQuestions } from './history-questions'
import { geographyQuestions } from './geography-questions'
import { biologyQuestions } from './biology-questions'
import { politicsQuestions } from './politics-questions'
import { realExamQuestions } from './real-exam-questions'
import { currentEditionRebuildSets } from './current-edition-rebuild-2026'
import { currentTextbookGapSets } from './current-textbook-gaps-2026'
import { currentDeepStemSets, currentDeepStemExplanationImprovements } from './current-deep-stem-2026'
import { physicsExpansionSets202610, physicsExplanationRevisions202610 } from './physics-expansion-2026-10'
import { chemistryExpansionSets202610, chemistryExplanationRevisions202610 } from './chemistry-expansion-2026-10'
import { biologyExpansionSets202610, biologyExplanationRevisions202610 } from './biology-expansion-2026-10'
import { mathExpansionSets202610, mathExplanationRevisions202610 } from './math-expansion-2026-10'
import { zhongkaoVisualExpansionSets202610 } from './zhongkao-visual-expansion-2026-10'
import { visualQuestionExpansionSets202610 } from './visual-question-expansion-2026-10'
import { languageZhongkaoQuestionRevisions2026 } from './language-zhongkao-revisions-2026'
import { languageZhongkaoQuestionRevisions2026B } from './language-zhongkao-revisions-2026-b'
import { languageZhongkaoQuestionRevisions2026C } from './language-zhongkao-revisions-2026-c'
import { languageZhongkaoQuestionRevisions2026D } from './language-zhongkao-revisions-2026-d'
import { languageZhongkaoQuestionRevisions2026E } from './language-zhongkao-revisions-2026-e'
import { languageZhongkaoQuestionRevisions2026F } from './language-zhongkao-revisions-2026-f'
import { languageZhongkaoQuestionRevisions2026G } from './language-zhongkao-revisions-2026-g'
import { languageZhongkaoQuestionRevisions2026H } from './language-zhongkao-revisions-2026-h'
import { chineseQ4Revisions2026Grade8 } from './chinese-q4-revisions-2026-8'
import { chineseQ4Revisions2026Grade9 } from './chinese-q4-revisions-2026-9'
import { chineseQualityRevisions2026 } from './chinese-quality-revisions-2026'
import { chineseQualityRevisions2026B } from './chinese-quality-revisions-2026-b'
import { chineseQualityRevisions2026C } from './chinese-quality-revisions-2026-c'
import { humanitiesZhongkaoQuestionRevisions2026 } from './humanities-zhongkao-revisions-2026'
import { humanitiesZhongkaoQuestionRevisions2026B } from './humanities-zhongkao-revisions-2026-b'
import { humanitiesZhongkaoQuestionRevisions2026C } from './humanities-zhongkao-revisions-2026-c'
import { humanitiesZhongkaoQuestionRevisions2026D } from './humanities-zhongkao-revisions-2026-d'
import { humanitiesZhongkaoQuestionRevisions2026E } from './humanities-zhongkao-revisions-2026-e'
import { humanitiesZhongkaoQuestionRevisions2026F } from './humanities-zhongkao-revisions-2026-f'
import { humanitiesZhongkaoQuestionRevisions2026G } from './humanities-zhongkao-revisions-2026-g'
import { politicsQuestionQualityRevisions2026 } from './politics-quality-revisions-2026'
import { stemZhongkaoQuestionRevisions2026 } from './stem-zhongkao-revisions-2026'
import { stemZhongkaoQuestionRevisions2026B } from './stem-zhongkao-revisions-2026-b'
import { mathZhongkaoQuestionRevisions2026B } from './math-zhongkao-revisions-2026-b'
import { mathZhongkaoQuestionRevisions2026C } from './math-zhongkao-revisions-2026-c'
import { mathZhongkaoQuestionRevisions2026D } from './math-zhongkao-revisions-2026-d'
import { mathZhongkaoQuestionRevisions2026E } from './math-zhongkao-revisions-2026-e'
import { mathZhongkaoQuestionRevisions2026F } from './math-zhongkao-revisions-2026-f'
import { mathZhongkaoQuestionRevisions2026G } from './math-zhongkao-revisions-2026-g'
import { mathZhongkaoQuestionRevisions2026H } from './math-zhongkao-revisions-2026-h'
import { mathZhongkaoQuestionRevisions2026I } from './math-zhongkao-revisions-2026-i'
import { stemZhongkaoQuestionRevisions2026C } from './stem-zhongkao-revisions-2026-c'
import { stemZhongkaoQuestionRevisions2026D } from './stem-zhongkao-revisions-2026-d'
import { stemZhongkaoQuestionRevisions2026E } from './stem-zhongkao-revisions-2026-e'
import { stemZhongkaoQuestionRevisions2026F } from './stem-zhongkao-revisions-2026-f'
import { stemZhongkaoQuestionRevisions2026I } from './stem-zhongkao-revisions-2026-i'
import { stemZhongkaoQuestionRevisions2026J } from './stem-zhongkao-revisions-2026-j'
import { stemZhongkaoQuestionRevisions2026K } from './stem-zhongkao-revisions-2026-k'
import { stemZhongkaoQuestionRevisions2026L } from './stem-zhongkao-revisions-2026-l'
import { stemZhongkaoQuestionRevisions2026M } from './stem-zhongkao-revisions-2026-m'
import { stemZhongkaoQuestionRevisions2026N } from './stem-zhongkao-revisions-2026-n'
import { textbookGapRebuildSets } from './textbook-gap-rebuild-2026'
import { stemDeepLearningKnowledgePoints, stemDeepLearningQuestions, stemQuestionImprovements2026 } from './stem-deep-learning-2026'
import { visualQuestionAdditions202610 } from './visual-question-additions-2026-10'

export { mathQuestions, advancedMathQuestions, chineseQuestions, englishQuestions, physicsQuestions, chemistryQuestions, historyQuestions, geographyQuestions, biologyQuestions, politicsQuestions, realExamQuestions, currentEditionRebuildSets, currentTextbookGapSets, currentDeepStemSets, currentDeepStemExplanationImprovements, physicsExpansionSets202610, physicsExplanationRevisions202610, chemistryExpansionSets202610, chemistryExplanationRevisions202610, biologyExpansionSets202610, biologyExplanationRevisions202610, mathExpansionSets202610, mathExplanationRevisions202610, languageZhongkaoQuestionRevisions2026, languageZhongkaoQuestionRevisions2026B, languageZhongkaoQuestionRevisions2026C, languageZhongkaoQuestionRevisions2026D, languageZhongkaoQuestionRevisions2026E, languageZhongkaoQuestionRevisions2026F, humanitiesZhongkaoQuestionRevisions2026, humanitiesZhongkaoQuestionRevisions2026B, humanitiesZhongkaoQuestionRevisions2026C, humanitiesZhongkaoQuestionRevisions2026D, stemZhongkaoQuestionRevisions2026, stemZhongkaoQuestionRevisions2026B, stemZhongkaoQuestionRevisions2026C, stemZhongkaoQuestionRevisions2026D, stemZhongkaoQuestionRevisions2026E, stemZhongkaoQuestionRevisions2026F, mathZhongkaoQuestionRevisions2026B, mathZhongkaoQuestionRevisions2026C, mathZhongkaoQuestionRevisions2026D, mathZhongkaoQuestionRevisions2026E, mathZhongkaoQuestionRevisions2026F, mathZhongkaoQuestionRevisions2026G, textbookGapRebuildSets, stemDeepLearningKnowledgePoints, stemDeepLearningQuestions, visualQuestionExpansionSets202610 }
export { languageZhongkaoQuestionRevisions2026G, languageZhongkaoQuestionRevisions2026H, mathZhongkaoQuestionRevisions2026H, mathZhongkaoQuestionRevisions2026I, humanitiesZhongkaoQuestionRevisions2026E, humanitiesZhongkaoQuestionRevisions2026F, humanitiesZhongkaoQuestionRevisions2026G, englishZhongkaoQuestionRevisions2026A, englishZhongkaoQuestionRevisions2026B, englishZhongkaoQuestionRevisions2026C, physicsZhongkaoQuestionRevisions2026A, stemZhongkaoQuestionRevisions2026I, stemZhongkaoQuestionRevisions2026J, stemZhongkaoQuestionRevisions2026K, stemZhongkaoQuestionRevisions2026L, stemZhongkaoQuestionRevisions2026M, stemZhongkaoQuestionRevisions2026N, visualQuestionAdditions202610 }

// 合并所有题库。统一修复历史空题目 ID 与学科别名，
// 前端、服务端判分、练习历史由此共享同一套稳定题目标识。
import type { PracticeQuestion, PracticeQuestionType, PracticeSet } from '../parent-practice-bank'

const visualQuestionTargetSetIds: Record<string, string> = {
  'visual-math-9-similarity-materials-202610-ratio': 'math-9-3-2',
  'visual-math-9-similarity-materials-202610-judgment': 'math-9-3-5',
  'visual-math-9-similarity-materials-202610-properties': 'math-9-3-6',
  'visual-physics-zk-diagram-2024-hebei-202610-circuit': 'physics-9q-15-3',
  'visual-physics-zk-diagram-2024-hebei-202610-lens': 'physics-8a-5-3',
  'visual-physics-zk-diagram-2024-hebei-202610-lever': 'physics-8b-12-1',
  'visual-physics-zk-diagram-2024-hebei-202610-magnetic-force': 'physics-9q-20-4',
}

const visualQuestionGroupsByTarget = new Map<string, PracticeSet[]>()
for (const visualSet of visualQuestionExpansionSets202610) {
  const targetSetId = visualQuestionTargetSetIds[visualSet.id]
  if (!targetSetId) continue
  visualQuestionGroupsByTarget.set(targetSetId, [
    ...(visualQuestionGroupsByTarget.get(targetSetId) ?? []),
    visualSet,
  ])
}

const SOURCE_PRACTICE_SETS = [
  ...mathQuestions,
  ...advancedMathQuestions,
  ...realExamQuestions,
  ...chineseQuestions,
  ...englishQuestions,
  ...physicsQuestions,
  ...chemistryQuestions,
  ...historyQuestions,
  ...geographyQuestions,
  ...biologyQuestions,
  ...politicsQuestions,
  ...currentEditionRebuildSets,
  ...currentTextbookGapSets,
  ...textbookGapRebuildSets,
  ...currentDeepStemSets,
  ...physicsExpansionSets202610,
  ...chemistryExpansionSets202610,
  ...biologyExpansionSets202610,
  ...mathExpansionSets202610,
  ...zhongkaoVisualExpansionSets202610,
  ...visualQuestionExpansionSets202610.filter((set) => set.id.startsWith('visual-biology-textbook-figure-reading-')
    || set.id.startsWith('visual-history-hebei-2024-image-reading-')
    || set.id.startsWith('visual-geography-textbook-map-chart-reading-')),
]

function canonicalSubject(subject: string) {
  return subject === '道德与法治' ? '政治' : subject
}

export const ALL_PRACTICE_SETS = SOURCE_PRACTICE_SETS.map((set) => {
  const seenIds = new Set<string>()
  const visualQuestionGroups = visualQuestionGroupsByTarget.get(set.id) ?? []
  const questionsToNormalize = [
    ...set.questions,
    ...visualQuestionGroups.flatMap((group) => group.questions),
  ]
  return {
    ...set,
    subject: canonicalSubject(set.subject),
    knowledgePoints: [
      ...set.knowledgePoints,
      ...visualQuestionGroups.flatMap((group) => group.knowledgePoints),
      ...(stemDeepLearningKnowledgePoints[set.id] ?? []),
    ],
    questions: [
      ...questionsToNormalize.map((question, questionIndex) => {
      const originalId = typeof question.id === 'string' ? question.id.trim() : ''
      const candidateId = originalId && !seenIds.has(originalId) ? originalId : `${set.id}-question-${questionIndex + 1}`
      let id = candidateId
      let collisionSuffix = 2
      while (seenIds.has(id)) {
        id = `${candidateId}-${collisionSuffix}`
        collisionSuffix += 1
      }
      seenIds.add(id)
      const revisionId = originalId || id

      const revisedQuestion = {
        ...question,
        ...(stemQuestionImprovements2026[originalId] ?? {}),
        ...(currentDeepStemExplanationImprovements[originalId] ?? {}),
        ...(physicsExplanationRevisions202610[originalId] ?? {}),
        ...(chemistryExplanationRevisions202610[originalId] ?? {}),
        ...(biologyExplanationRevisions202610[originalId] ?? {}),
        ...(mathExplanationRevisions202610[originalId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026B[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026C[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026D[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026E[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026F[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026E[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026F[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026G[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026I[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026J[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026K[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026L[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026M[revisionId] ?? {}),
        ...(stemZhongkaoQuestionRevisions2026N[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026B[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026C[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026D[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026E[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026F[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026G[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026H[revisionId] ?? {}),
        ...(mathZhongkaoQuestionRevisions2026I[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026C[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026D[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026E[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026F[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026G[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026H[revisionId] ?? {}),
        ...(chineseQ4Revisions2026Grade8[revisionId] ?? {}),
        ...(chineseQ4Revisions2026Grade9[revisionId] ?? {}),
        ...((chineseQualityRevisions2026 as unknown as Record<string, Partial<PracticeQuestion>>)[revisionId] ?? {}),
        ...(chineseQualityRevisions2026B[revisionId] ?? {}),
        ...(chineseQualityRevisions2026C[revisionId] ?? {}),
        ...(englishZhongkaoQuestionRevisions2026A[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026B[revisionId] ?? {}),
        ...(languageZhongkaoQuestionRevisions2026[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026B[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026C[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026D[revisionId] ?? {}),
        ...(humanitiesZhongkaoQuestionRevisions2026[revisionId] ?? {}),
        ...(politicsQuestionQualityRevisions2026[revisionId] ?? {}),
        ...(englishZhongkaoQuestionRevisions2026B[revisionId] ?? {}),
        ...(englishZhongkaoQuestionRevisions2026C[revisionId] ?? {}),
        ...(physicsZhongkaoQuestionRevisions2026A[revisionId] ?? {}),
        id,
        // Keep an explicit review override when a legacy source question has the wrong type.
        type: physicsZhongkaoQuestionRevisions2026A[revisionId]?.type
          ?? englishZhongkaoQuestionRevisions2026C[revisionId]?.type
          ?? englishZhongkaoQuestionRevisions2026B[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026B[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026C[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026D[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026B[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026C[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026D[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026E[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026F[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026G[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026H[revisionId]?.type
          ?? englishZhongkaoQuestionRevisions2026A[revisionId]?.type
          ?? languageZhongkaoQuestionRevisions2026[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026E[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026F[revisionId]?.type
          ?? humanitiesZhongkaoQuestionRevisions2026G[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026I[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026J[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026K[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026L[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026M[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026N[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026B[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026C[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026D[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026E[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026F[revisionId]?.type
          ?? stemZhongkaoQuestionRevisions2026[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026B[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026C[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026D[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026E[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026F[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026G[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026H[revisionId]?.type
          ?? mathZhongkaoQuestionRevisions2026I[revisionId]?.type
          ?? mathExplanationRevisions202610[originalId]?.type
          ?? biologyExplanationRevisions202610[originalId]?.type
          ?? chemistryExplanationRevisions202610[originalId]?.type
          ?? physicsExplanationRevisions202610[originalId]?.type
          ?? ((question as { type?: PracticeQuestionType }).type)
          ?? 'single_choice',
      }
      const { options, answerIndex, answerIndices } = revisedQuestion
      delete revisedQuestion.options
      delete revisedQuestion.answerIndex
      delete revisedQuestion.answerIndices

      return {
        ...revisedQuestion,
        ...(revisedQuestion.type === 'single_choice' || revisedQuestion.type === 'multiple_choice' ? { options } : {}),
        ...(revisedQuestion.type === 'single_choice' ? { answerIndex } : {}),
        ...(revisedQuestion.type === 'multiple_choice' ? { answerIndices } : {}),
      }
      }),
      ...(stemDeepLearningQuestions[set.id] ?? []).map((question) => ({
        ...question,
        sourceRef: question.sourceRef || `牧哲学堂原创拓展题/2026-10/${set.subject}/${set.grade}/${set.volume}/${set.section}#${question.id}`,
      })),
      ...(visualQuestionAdditions202610[set.id] ?? []),
    ],
  }
})
