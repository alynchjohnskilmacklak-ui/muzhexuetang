import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

function optionalParam(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed !== '全部' ? trimmed : undefined
}

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const admin = await requireAdminUser()
  const { studentId } = await params
  const grade = optionalParam(request.nextUrl.searchParams.get('grade'))
  const volume = optionalParam(request.nextUrl.searchParams.get('volume'))

  const student = await admin.prisma.student.findFirst({
    where: {
      id: studentId,
      division: admin.division,
      status: { notIn: ['LEFT', 'INACTIVE'] },
      deletedAt: null,
    },
    select: { id: true, identityId: true, name: true, grade: true },
  })
  if (!student) {
    return NextResponse.json({ error: '学员不存在' }, { status: 404 })
  }

  const identityRecords = student.identityId.trim()
    ? await admin.prisma.student.findMany({
      where: {
        identityId: student.identityId,
        division: admin.division,
        deletedAt: null,
      },
      select: { id: true },
    })
    : []
  const recordIds = [...new Set([student.id, ...identityRecords.map((record) => record.id)])]
  const sessionWhere = {
    studentId: { in: recordIds },
    ...(grade ? { grade } : {}),
    ...(volume ? { volume } : {}),
  }
  const [words, sessions, sessionStats] = await Promise.all([
    admin.prisma.vocabWord.findMany({
      where: {
        ...(grade ? { grade } : {}),
        ...(volume ? { volume } : {}),
      },
      select: { id: true, grade: true, volume: true, unit: true },
    }),
    admin.prisma.vocabSession.findMany({
      where: sessionWhere,
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { id: true, grade: true, volume: true, unit: true, total: true, correct: true, finishedAt: true },
    }),
    admin.prisma.vocabSession.aggregate({
      where: sessionWhere,
      _count: { _all: true },
      _sum: { total: true, correct: true },
    }),
  ])

  const wordIds = words.map((word) => word.id)
  const progress = wordIds.length
    ? await admin.prisma.vocabProgress.findMany({
      where: { studentId: { in: recordIds }, wordId: { in: wordIds } },
      select: { wordId: true, status: true, lastAt: true },
    })
    : []

  type UnitProgress = {
    grade: string
    volume: string
    unit: string
    totalWords: number
    mastered: number
    learning: number
    wrong: number
  }
  const unitByWord = new Map<string, string>()
  const units = new Map<string, UnitProgress>()
  for (const word of words) {
    const unit = word.unit.trim() || '未分单元'
    const key = `${word.grade}\u0000${word.volume}\u0000${unit}`
    unitByWord.set(word.id, key)
    const current = units.get(key) || { grade: word.grade, volume: word.volume, unit, totalWords: 0, mastered: 0, learning: 0, wrong: 0 }
    current.totalWords += 1
    units.set(key, current)
  }

  const latestProgressByWord = new Map<string, (typeof progress)[number]>()
  for (const item of progress) {
    const current = latestProgressByWord.get(item.wordId)
    if (!current || item.lastAt > current.lastAt) latestProgressByWord.set(item.wordId, item)
  }

  for (const item of latestProgressByWord.values()) {
    const key = unitByWord.get(item.wordId)
    if (!key) continue
    const current = units.get(key)
    if (!current) continue
    if (item.status === 'MASTERED') current.mastered += 1
    else if (item.status === 'WRONG') current.wrong += 1
    else current.learning += 1
  }

  const unitProgress = [...units.values()]
    .map((item) => ({
      ...item,
      studiedWords: item.mastered + item.learning + item.wrong,
      masteryRate: item.totalWords > 0 ? Math.round((item.mastered / item.totalWords) * 100) : 0,
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade, 'zh-CN', { numeric: true })
      || a.volume.localeCompare(b.volume, 'zh-CN', { numeric: true })
      || a.unit.localeCompare(b.unit, 'zh-CN', { numeric: true }))

  const totalQuestions = sessionStats._sum.total ?? 0
  const totalCorrect = sessionStats._sum.correct ?? 0
  return NextResponse.json({
    student,
    overview: {
      totalSessions: sessionStats._count._all,
      totalQuestions,
      totalCorrect,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      progressWords: latestProgressByWord.size,
      masteredWords: [...latestProgressByWord.values()].filter((item) => item.status === 'MASTERED').length,
      lastSessionAt: sessions[0]?.finishedAt.toISOString() ?? null,
    },
    units: unitProgress,
    sessions: sessions.map((session) => ({
      id: session.id,
      grade: session.grade,
      volume: session.volume,
      unit: session.unit,
      total: session.total,
      correct: session.correct,
      wrong: Math.max(0, session.total - session.correct),
      finishedAt: session.finishedAt.toISOString(),
    })),
  }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})
