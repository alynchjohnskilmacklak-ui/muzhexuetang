import { randomInt, randomUUID } from 'node:crypto'
import { apiHandler } from '@/lib/api-handler'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { buildVocabDeck } from '@/lib/vocab-bank'
import { loadVocabEntries } from '@/lib/vocab-catalog'
import { getVocabExpansion } from '@/data/vocab-expansions'

export const dynamic = 'force-dynamic'

function shuffleEntries<T>(entries: T[]): T[] {
  const shuffled = [...entries]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

export const GET = apiHandler(async (request: Request) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')?.trim()
  if (!studentId) return NextResponse.json({ error: '缺少studentId参数' }, { status: 400 })

  const scope = searchParams.get('scope') === 'review' ? 'review' : 'new'
  const unit = searchParams.get('unit')?.trim() || undefined
  const requestedGrade = searchParams.get('grade')?.trim()
  const requestedVolume = searchParams.get('volume')?.trim()
  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 0

  try {
    const prisma = await getRequestPrisma()
    const children = await getParentChildren(prisma, session.user.id)
    const child = findParentChild(children, studentId)
    if (!child) return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })

    const studentGrade = normalizeTextbookGrade(child.grade)
    const selectedGrade = normalizeTextbookGrade(requestedGrade || studentGrade || '初一')
    const selectedVolume = requestedVolume || '上册'
    if (!['初一', '初二', '初三'].includes(selectedGrade)) {
      return NextResponse.json({ error: '教材年级无效，请重新选择' }, { status: 400 })
    }
    if (!['上册', '下册', '全一册', '全部'].includes(selectedVolume)) {
      return NextResponse.json({ error: '教材册次无效，请重新选择' }, { status: 400 })
    }

    const catalogEntries = await loadVocabEntries(prisma, {
      grade: selectedGrade,
      volume: selectedVolume === '全部' ? undefined : selectedVolume,
    })
    const entries = unit ? catalogEntries.filter((entry) => entry.unit === unit) : catalogEntries
    const entryIds = entries.map((entry) => entry.id)

    const progressRows = entryIds.length
      ? await prisma.vocabProgress.findMany({
        where: { studentId: { in: child.recordIds }, wordId: { in: entryIds } },
        select: { wordId: true, status: true },
      })
      : []
    const statusById = new Map(progressRows.map((row) => [row.wordId, row.status]))

    const pool = entries.filter((entry) => {
      const status = statusById.get(entry.id) ?? 'LEARNING'
      if (scope === 'review') return status === 'WRONG' || status === 'LEARNING'
      return status !== 'MASTERED'
    })

    const sessionNonce = randomUUID()
    const seed = `${child.id}\u001f${selectedGrade}\u001f${selectedVolume}\u001f${unit ?? 'all'}\u001f${scope}\u001f${sessionNonce}`
    const shuffledPool = shuffleEntries(pool)
    const deckEntries = limit > 0 ? shuffledPool.slice(0, limit) : shuffledPool
    const questions = buildVocabDeck(deckEntries, seed).map((question, index) => {
      const expansion = getVocabExpansion(deckEntries[index])
      return expansion ? { ...question, expansion } : question
    })

    return NextResponse.json({
      success: true,
      scope,
      unit: unit ?? null,
      seed,
      questions,
      poolSize: pool.length,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[parent-vocab-deck] build failed', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: '题目暂时无法生成，请稍后重试' }, { status: 503 })
  }
})
