import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { groupParentStudentRecords } from '@/lib/parent-student-selection'

export const dynamic = 'force-dynamic'

function optionalParam(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed !== '全部' ? trimmed : undefined
}

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  const grade = optionalParam(request.nextUrl.searchParams.get('grade'))
  const volume = optionalParam(request.nextUrl.searchParams.get('volume'))
  const query = optionalParam(request.nextUrl.searchParams.get('q'))?.toLocaleLowerCase()

  const [studentRecords, catalogOptions, words] = await Promise.all([
    admin.prisma.student.findMany({
      where: {
        division: admin.division,
        status: { notIn: ['LEFT', 'INACTIVE'] },
        deletedAt: null,
      },
      select: {
        id: true,
        identityId: true,
        name: true,
        grade: true,
        gender: true,
        birthYear: true,
        updatedAt: true,
        termMemberships: {
          select: {
            grade: true,
            status: true,
            joinedAt: true,
            term: { select: { status: true, startDate: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    admin.prisma.vocabWord.groupBy({
      by: ['grade', 'volume'],
    }),
    admin.prisma.vocabWord.findMany({
      where: {
        ...(grade ? { grade } : {}),
        ...(volume ? { volume } : {}),
      },
      select: { id: true },
    }),
  ])

  const gradeOptions = [...new Set(catalogOptions.map((item) => item.grade))].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
  const volumeOptions = [...new Set(catalogOptions
    .filter((item) => !grade || item.grade === grade)
    .map((item) => item.volume))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

  const logicalStudents = groupParentStudentRecords(studentRecords)
  const matchingGroups = query
    ? logicalStudents.filter(({ student }) => student.name.toLocaleLowerCase().includes(query))
    : logicalStudents
  const identityIds = [...new Set(matchingGroups
    .map(({ student }) => student.identityId)
    .filter((identityId) => identityId.trim().length > 0))]
  const historicalRecords = identityIds.length
    ? await admin.prisma.student.findMany({
      where: {
        division: admin.division,
        deletedAt: null,
        identityId: { in: identityIds },
      },
      select: { id: true, identityId: true },
    })
    : []
  const historicalIdsByIdentity = new Map<string, string[]>()
  for (const record of historicalRecords) {
    const ids = historicalIdsByIdentity.get(record.identityId) || []
    ids.push(record.id)
    historicalIdsByIdentity.set(record.identityId, ids)
  }
  const matchingStudents = matchingGroups.map(({ student, recordIds }) => ({
    id: student.id,
    name: student.name,
    grade: student.grade,
    recordIds: [...new Set([
      student.id,
      ...recordIds,
      ...(student.identityId.trim() ? historicalIdsByIdentity.get(student.identityId) || [] : []),
    ])],
  }))
  const studentIds = matchingStudents.flatMap((student) => student.recordIds)
  const representativeByRecordId = new Map<string, string>()
  for (const student of matchingStudents) {
    for (const recordId of student.recordIds) representativeByRecordId.set(recordId, student.id)
  }
  const wordIds = words.map((word) => word.id)

  const [sessionGroups, progressGroups] = await Promise.all([
    studentIds.length
      ? admin.prisma.vocabSession.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          ...(grade ? { grade } : {}),
          ...(volume ? { volume } : {}),
        },
        _count: { _all: true },
        _sum: { total: true, correct: true },
        _max: { finishedAt: true },
      })
      : Promise.resolve([]),
    studentIds.length && wordIds.length
      ? admin.prisma.vocabProgress.groupBy({
        by: ['studentId', 'wordId', 'status'],
        where: {
          studentId: { in: studentIds },
          wordId: { in: wordIds },
        },
        _max: { lastAt: true },
      })
      : Promise.resolve([]),
  ])

  const sessionsByStudent = new Map<string, { totalSessions: number; totalQuestions: number; totalCorrect: number; lastAt: Date | null }>()
  for (const item of sessionGroups) {
    const representativeId = representativeByRecordId.get(item.studentId)
    if (!representativeId) continue
    const current = sessionsByStudent.get(representativeId) || { totalSessions: 0, totalQuestions: 0, totalCorrect: 0, lastAt: null }
    current.totalSessions += item._count._all
    current.totalQuestions += item._sum.total ?? 0
    current.totalCorrect += item._sum.correct ?? 0
    if (item._max.finishedAt && (!current.lastAt || item._max.finishedAt > current.lastAt)) current.lastAt = item._max.finishedAt
    sessionsByStudent.set(representativeId, current)
  }
  const progressRowsByStudent = new Map<string, Map<string, { status: string; lastAt: Date | null }>>()
  for (const item of progressGroups) {
    const representativeId = representativeByRecordId.get(item.studentId)
    if (!representativeId) continue
    const rows = progressRowsByStudent.get(representativeId) || new Map<string, { status: string; lastAt: Date | null }>()
    const current = rows.get(item.wordId)
    if (!current || (item._max.lastAt && (!current.lastAt || item._max.lastAt > current.lastAt))) {
      rows.set(item.wordId, { status: item.status, lastAt: item._max.lastAt })
    }
    progressRowsByStudent.set(representativeId, rows)
  }
  const progressByStudent = new Map<string, { words: number; mastered: number; lastAt: Date | null }>()
  for (const [studentId, rows] of progressRowsByStudent) {
    const progress = { words: rows.size, mastered: 0, lastAt: null as Date | null }
    for (const row of rows.values()) {
      if (row.status === 'MASTERED') progress.mastered += 1
      if (row.lastAt && (!progress.lastAt || row.lastAt > progress.lastAt)) progress.lastAt = row.lastAt
    }
    progressByStudent.set(studentId, progress)
  }

  const list = matchingStudents.map((student) => {
    const session = sessionsByStudent.get(student.id)
    const progress = progressByStudent.get(student.id)
    const totalSessions = session?.totalSessions ?? 0
    const totalQuestions = session?.totalQuestions ?? 0
    const totalCorrect = session?.totalCorrect ?? 0
    const sessionLastAt = session?.lastAt ?? null
    const progressLastAt = progress?.lastAt ?? null
    const lastStudyAt = sessionLastAt && progressLastAt
      ? (sessionLastAt > progressLastAt ? sessionLastAt : progressLastAt)
      : sessionLastAt || progressLastAt

    return {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      totalSessions,
      totalQuestions,
      totalCorrect,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      progressWords: progress?.words ?? 0,
      masteredWords: progress?.mastered ?? 0,
      reviewWords: Math.max(0, (progress?.words ?? 0) - (progress?.mastered ?? 0)),
      lastStudyAt: lastStudyAt?.toISOString() ?? null,
    }
  }).filter((student) => student.totalSessions > 0 || student.progressWords > 0)
    .sort((a, b) => (b.lastStudyAt || '').localeCompare(a.lastStudyAt || '') || a.name.localeCompare(b.name, 'zh-CN'))

  const totalQuestions = list.reduce((sum, item) => sum + item.totalQuestions, 0)
  const totalCorrect = list.reduce((sum, item) => sum + item.totalCorrect, 0)
  const overview = {
    activeLearners: list.filter((item) => item.totalSessions > 0).length,
    totalSessions: list.reduce((sum, item) => sum + item.totalSessions, 0),
    progressWords: list.reduce((sum, item) => sum + item.progressWords, 0),
    masteredWords: list.reduce((sum, item) => sum + item.masteredWords, 0),
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
  }

  return NextResponse.json({
    overview,
    list,
    filters: { gradeOptions, volumeOptions },
  }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  })
})
