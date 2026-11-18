import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { PARENT_PRACTICE_SETS } from '@/data/parent-practice-bank'

export const dynamic = 'force-dynamic'

const setMap = new Map(PARENT_PRACTICE_SETS.map((set) => [set.id, set]))

export type SubjectStat = {
  subject: string
  attempts: number
  questions: number
  correct: number
  accuracy: number
}

export type StudentPracticeStat = {
  studentId: string
  name: string
  grade: string | null
  gender: string | null
  membershipLevel: string
  totalAttempts: number
  totalQuestions: number
  totalCorrect: number
  accuracy: number
  lastPracticeAt: string | null
  subjectStats: SubjectStat[]
}

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()

  const students = await admin.prisma.student.findMany({
    where: {
      division: admin.division,
      status: { not: 'LEFT' },
      deletedAt: null,
    },
    select: { id: true, name: true, grade: true, gender: true, membershipLevel: true },
    orderBy: { createdAt: 'asc' },
  })
  const studentIds = students.map((student) => student.id)

  const attempts = await admin.prisma.practiceAttempt.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, setId: true, score: true, total: true, finishedAt: true },
  })

  const list: StudentPracticeStat[] = students.map((student) => {
    const own = attempts.filter((attempt) => attempt.studentId === student.id)
    const bySet = new Map<string, { attempts: number; questions: number; correct: number }>()
    let totalAttempts = 0
    let totalQuestions = 0
    let totalCorrect = 0
    let lastPracticeAt: string | null = null
    for (const attempt of own) {
      totalAttempts += 1
      totalQuestions += attempt.total
      totalCorrect += attempt.score
      if (!lastPracticeAt || attempt.finishedAt.toISOString() > lastPracticeAt) {
        lastPracticeAt = attempt.finishedAt.toISOString()
      }
      const current = bySet.get(attempt.setId) || { attempts: 0, questions: 0, correct: 0 }
      current.attempts += 1
      current.questions += attempt.total
      current.correct += attempt.score
      bySet.set(attempt.setId, current)
    }

    const subjectAgg = new Map<string, SubjectStat>()
    for (const [setId, stat] of bySet) {
      const set = setMap.get(setId)
      const subject = set?.subject || '其他'
      const current = subjectAgg.get(subject) || { subject, attempts: 0, questions: 0, correct: 0, accuracy: 0 }
      current.attempts += stat.attempts
      current.questions += stat.questions
      current.correct += stat.correct
      subjectAgg.set(subject, current)
    }
    const subjectStats: SubjectStat[] = [...subjectAgg.values()].map((item) => ({
      ...item,
      accuracy: item.questions > 0 ? Math.round((item.correct / item.questions) * 100) : 0,
    })).sort((a, b) => b.questions - a.questions)

    return {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      gender: student.gender,
      membershipLevel: student.membershipLevel,
      totalAttempts,
      totalQuestions,
      totalCorrect,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      lastPracticeAt,
      subjectStats,
    }
  }).filter((item) => item.totalAttempts > 0)

  const practicingStudents = list.length
  const overview = {
    practicingStudents,
    totalAttempts: list.reduce((sum, item) => sum + item.totalAttempts, 0),
    totalQuestions: list.reduce((sum, item) => sum + item.totalQuestions, 0),
    totalCorrect: list.reduce((sum, item) => sum + item.totalCorrect, 0),
    accuracy: list.reduce((sum, item) => sum + item.totalQuestions, 0) > 0
      ? Math.round(list.reduce((sum, item) => sum + item.totalCorrect, 0) / list.reduce((sum, item) => sum + item.totalQuestions, 0) * 100)
      : 0,
  }

  return NextResponse.json({ overview, list }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})
