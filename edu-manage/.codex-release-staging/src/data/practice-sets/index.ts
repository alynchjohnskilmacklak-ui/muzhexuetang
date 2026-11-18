// 题库统一导出
import { mathQuestions } from './math-questions'
import { advancedMathQuestions } from './advanced-math-questions'
import { chineseQuestions } from './chinese-questions'
import { englishQuestions } from './english-questions'
import { physicsQuestions } from './physics-questions'
import { chemistryQuestions } from './chemistry-questions'
import { historyQuestions } from './history-questions'
import { geographyQuestions } from './geography-questions'
import { biologyQuestions } from './biology-questions'
import { politicsQuestions } from './politics-questions'
import { realExamQuestions } from './real-exam-questions'
import { currentEditionRebuildSets } from './current-edition-rebuild-2026'
import { textbookGapRebuildSets } from './textbook-gap-rebuild-2026'

export { mathQuestions, advancedMathQuestions, chineseQuestions, englishQuestions, physicsQuestions, chemistryQuestions, historyQuestions, geographyQuestions, biologyQuestions, politicsQuestions, realExamQuestions, currentEditionRebuildSets, textbookGapRebuildSets }

// 合并所有题库。统一修复历史空题目 ID 与学科别名，
// 前端、服务端判分、练习历史由此共享同一套稳定题目标识。
import type { PracticeQuestionType } from '../parent-practice-bank'
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
  ...textbookGapRebuildSets,
]

function canonicalSubject(subject: string) {
  return subject === '道德与法治' ? '政治' : subject
}

export const ALL_PRACTICE_SETS = SOURCE_PRACTICE_SETS.map((set) => {
  const seenIds = new Set<string>()
  return {
    ...set,
    subject: canonicalSubject(set.subject),
    questions: set.questions.map((question, questionIndex) => {
      const originalId = typeof question.id === 'string' ? question.id.trim() : ''
      const candidateId = originalId && !seenIds.has(originalId) ? originalId : `${set.id}-question-${questionIndex + 1}`
      let id = candidateId
      let collisionSuffix = 2
      while (seenIds.has(id)) {
        id = `${candidateId}-${collisionSuffix}`
        collisionSuffix += 1
      }
      seenIds.add(id)

      return {
        ...question,
        id,
        // Preserve the authored question type. The historical implementation
        // forced every question to single-choice and silently corrupted fills.
        type: ((question as { type?: PracticeQuestionType }).type) ?? 'single_choice',
      }
    }),
  }
})
