import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { PARENT_PRACTICE_SETS } from '@/data/parent-practice-bank'

export const dynamic = 'force-dynamic'

const setMap = new Map(PARENT_PRACTICE_SETS.map((set) => [set.id, set]))

type SnapshotQuestion = {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation?: string
  imageUrl?: string
  answerImageUrl?: string
  imageQuestion?: boolean
}

export type PracticeAttemptDetail = {
  id: string
  setId: string
  setTitle: string
  subject: string
  grade: string
  chapter: string
  score: number
  total: number
  accuracy: number
  wrongCount: number
  finishedAt: string
  wrongQuestions: Array<{
    prompt: string
    userAnswer: string
    correctAnswer: string
    explanation: string
    imageUrl?: string
  }>
}

function extractWrongQuestions(attempt: {
  wrongIds: string[]
  answers: unknown
  questionSnapshot: unknown
}): PracticeAttemptDetail['wrongQuestions'] {
  const answers = (attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {}) as Record<string, number>
  const snapshot = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot as SnapshotQuestion[] : []
  const byId = new Map(snapshot.map((question) => [question.id, question]))
  return attempt.wrongIds.map((id) => {
    const question = byId.get(id)
    if (!question) {
      return { prompt: '题目内容已更新，无法回放', userAnswer: '', correctAnswer: '', explanation: '' }
    }
    const userIndex = answers[id]
    const safeUserIndex = Number.isInteger(userIndex) && userIndex >= 0 && userIndex < question.options.length ? userIndex : -1
    const safeAnswerIndex = question.answerIndex >= 0 && question.answerIndex < question.options.length ? question.answerIndex : -1
    return {
      prompt: question.prompt,
      userAnswer: safeUserIndex >= 0 ? question.options[safeUserIndex] : '未作答',
      correctAnswer: safeAnswerIndex >= 0 ? question.options[safeAnswerIndex] : '答案已更新',
      explanation: question.explanation || '',
      ...(question.imageUrl ? { imageUrl: question.imageUrl } : {}),
    }
  })
}

export const GET = apiHandler(async (request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) => {
  const admin = await requireAdminUser()
  const { studentId } = await params

  const student = await admin.prisma.student.findFirst({
    where: { id: studentId, division: admin.division, deletedAt: null },
    select: {
      id: true, name: true, grade: true, gender: true, membershipLevel: true,
      school: true, phone: true, remainHours: true, totalHours: true, enrolledAt: true,
    },
  })
  if (!student) {
    return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  }

  const requestedPage = Number(request.nextUrl.searchParams.get('page') || 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 30

  const [attemptRows, totalCount, aggregate] = await Promise.all([
    admin.prisma.practiceAttempt.findMany({
      where: { studentId },
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, setId: true, score: true, total: true, wrongIds: true,
        answers: true, questionSnapshot: true, finishedAt: true,
      },
    }),
    admin.prisma.practiceAttempt.count({ where: { studentId } }),
    admin.prisma.practiceAttempt.aggregate({
      where: { studentId },
      _count: { _all: true },
      _sum: { score: true, total: true },
    }),
  ])

  const totalAttempts = aggregate._count._all
  const totalQuestions = aggregate._sum.total ?? 0
  const totalCorrect = aggregate._sum.score ?? 0

  // 学科分布
  const subjectAgg = new Map<string, { attempts: number; questions: number; correct: number }>()
  const allAttemptsForSubject = await admin.prisma.practiceAttempt.findMany({
    where: { studentId },
    select: { setId: true, score: true, total: true },
  })
  for (const attempt of allAttemptsForSubject) {
    const set = setMap.get(attempt.setId)
    const subject = set?.subject || '其他'
    const current = subjectAgg.get(subject) || { attempts: 0, questions: 0, correct: 0 }
    current.attempts += 1
    current.questions += attempt.total
    current.correct += attempt.score
    subjectAgg.set(subject, current)
  }
  const subjectStats = [...subjectAgg.entries()].map(([subject, stat]) => ({
    subject,
    attempts: stat.attempts,
    questions: stat.questions,
    correct: stat.correct,
    accuracy: stat.questions > 0 ? Math.round((stat.correct / stat.questions) * 100) : 0,
  })).sort((a, b) => b.questions - a.questions)

  // 近14天每日趋势
  const today = new Date()
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13)
  const dailyAgg = new Map<string, { questions: number; correct: number; attempts: number }>()
  const recentAttempts = await admin.prisma.practiceAttempt.findMany({
    where: { studentId, finishedAt: { gte: startDay } },
    select: { score: true, total: true, finishedAt: true },
  })
  for (const attempt of recentAttempts) {
    const key = attempt.finishedAt.toLocaleDateString('sv-SE')
    const current = dailyAgg.get(key) || { questions: 0, correct: 0, attempts: 0 }
    current.questions += attempt.total
    current.correct += attempt.score
    current.attempts += 1
    dailyAgg.set(key, current)
  }
  const dailyTrend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + index)
    const key = date.toLocaleDateString('sv-SE')
    const stat = dailyAgg.get(key)
    return {
      date: key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      questions: stat?.questions || 0,
      attempts: stat?.attempts || 0,
      accuracy: stat && stat.questions > 0 ? Math.round((stat.correct / stat.questions) * 100) : 0,
    }
  })

  const attempts: PracticeAttemptDetail[] = attemptRows.map((attempt) => {
    const set = setMap.get(attempt.setId)
    const wrongCount = attempt.wrongIds.length
    return {
      id: attempt.id,
      setId: attempt.setId,
      setTitle: set ? `${set.chapter} · ${set.section}` : attempt.setId,
      subject: set?.subject || '其他',
      grade: set?.grade || '',
      chapter: set?.chapter || '',
      score: attempt.score,
      total: attempt.total,
      accuracy: attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0,
      wrongCount,
      finishedAt: attempt.finishedAt.toISOString(),
      wrongQuestions: extractWrongQuestions(attempt),
    }
  })

  return NextResponse.json({
    student,
    stats: {
      totalAttempts,
      totalQuestions,
      totalCorrect,
      totalWrong: totalQuestions - totalCorrect,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      lastPracticeAt: attempts.length > 0 ? attempts[0].finishedAt : null,
    },
    subjectStats,
    dailyTrend,
    attempts,
    hasMore: page * pageSize < totalCount,
    nextPage: page * pageSize < totalCount ? page + 1 : null,
  }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})
