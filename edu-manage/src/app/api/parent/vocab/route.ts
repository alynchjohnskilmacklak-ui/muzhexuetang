import { apiHandler } from '@/lib/api-handler'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { allVocab, listVocabUnits, type VocabStatus } from '@/lib/vocab-bank'
import { isMissingVocabWordTable, loadVocabBookSummaries, loadVocabEntries, summarizeVocabBooks, type VocabBookSummary } from '@/lib/vocab-catalog'
import type { VocabEntry } from '@/data/vocab-sets'

export const dynamic = 'force-dynamic'
let warnedAboutBundledCatalog = false

function storageError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : ''
  console.error('[parent-vocab] catalog load failed', code || (error instanceof Error ? error.name : 'unknown'))
  if (code === 'P2021' || code === 'P2022') {
    return NextResponse.json({ error: '背单词记录数据库尚未完成更新，请联系管理员完成数据库迁移后重试。', code: 'SCHEMA_NOT_READY' }, { status: 503 })
  }
  return NextResponse.json({ error: '词表与学习记录暂时无法读取，请稍后重试' }, { status: 503 })
}

export const GET = apiHandler(async (request: Request) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')?.trim()
  if (!studentId) return NextResponse.json({ error: '缺少studentId参数' }, { status: 400 })

  const requestedGrade = searchParams.get('grade')?.trim()
  const requestedVolume = searchParams.get('volume')?.trim()
  if (requestedGrade && !['初一', '初二', '初三'].includes(normalizeTextbookGrade(requestedGrade))) {
    return NextResponse.json({ error: '教材年级无效，请重新选择' }, { status: 400 })
  }
  if (requestedVolume && !['上册', '下册', '全一册', '全部'].includes(requestedVolume)) {
    return NextResponse.json({ error: '教材册次无效，请重新选择' }, { status: 400 })
  }

  try {
    const prisma = await getRequestPrisma()
    const children = await getParentChildren(prisma, session.user.id)
    const child = findParentChild(children, studentId)
    if (!child) return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })

    const studentGrade = normalizeTextbookGrade(child.grade)
    const selectedGrade = normalizeTextbookGrade(requestedGrade || studentGrade || '初一')
    const selectedVolume = requestedVolume || '上册'

    let availableBooks: VocabBookSummary[]
    let entries: VocabEntry[]
    try {
      const catalog = await Promise.all([
        loadVocabBookSummaries(prisma),
        loadVocabEntries(prisma, {
          grade: selectedGrade,
          volume: selectedVolume === '全部' ? undefined : selectedVolume,
        }),
      ])
      availableBooks = catalog[0]
      entries = catalog[1]
    } catch (error) {
      if (!isMissingVocabWordTable(error)) throw error
      if (!warnedAboutBundledCatalog) {
        console.warn('[parent-vocab] VocabWord table is missing; serving the bundled catalog until database sync completes')
        warnedAboutBundledCatalog = true
      }
      const bundledEntries = allVocab()
      availableBooks = summarizeVocabBooks(bundledEntries)
      entries = bundledEntries.filter((entry) =>
        entry.grade === selectedGrade && (selectedVolume === '全部' || entry.volume === selectedVolume),
      )
    }
    const entryById = new Map(entries.map((entry) => [entry.id, entry]))

    const entryIds = entries.map((entry) => entry.id)
    const progressRows = entryIds.length
      ? await prisma.vocabProgress.findMany({
        where: { studentId: { in: child.recordIds }, wordId: { in: entryIds } },
        select: { wordId: true, status: true, correctCount: true, wrongCount: true, lastResult: true },
      })
      : []
    const progress: Record<string, { status: VocabStatus; correctCount: number; wrongCount: number; lastResult: string | null }> = {}
    const stats: Record<VocabStatus, number> = { MASTERED: 0, LEARNING: 0, WRONG: 0 }

    for (const row of progressRows) {
      if (!entryById.has(row.wordId)) continue
      progress[row.wordId] = {
        status: row.status as VocabStatus,
        correctCount: row.correctCount,
        wrongCount: row.wrongCount,
        lastResult: row.lastResult,
      }
      stats[row.status as VocabStatus] = (stats[row.status as VocabStatus] ?? 0) + 1
    }
    // 未作答的词计入 LEARNING。
    for (const entry of entries) {
      if (!progress[entry.id]) stats.LEARNING += 1
    }

    const units = listVocabUnits(entries).map((unit) => {
      const unitEntries = entries.filter((entry) => entry.unit === unit.unit)
      const unitStats: Record<VocabStatus, number> = { MASTERED: 0, LEARNING: 0, WRONG: 0 }
      for (const entry of unitEntries) {
        const status = progress[entry.id]?.status ?? 'LEARNING'
        unitStats[status] += 1
      }
      return { ...unit, stats: unitStats }
    })

    const recentSessions = await prisma.vocabSession.findMany({
      where: { studentId: { in: child.recordIds }, grade: selectedGrade, volume: selectedVolume === '全部' ? undefined : selectedVolume },
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { id: true, grade: true, volume: true, unit: true, total: true, correct: true, wrongIds: true, finishedAt: true },
    })

    return NextResponse.json({
      success: true,
      grade: selectedGrade,
      volume: selectedVolume,
      availableBooks,
      units,
      progress,
      stats: {
        total: entries.length,
        mastered: stats.MASTERED,
        learning: stats.LEARNING,
        wrong: stats.WRONG,
      },
      recentSessions: recentSessions.map((session) => ({
        ...session,
        finishedAt: session.finishedAt.toISOString(),
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return storageError(error)
  }
})
