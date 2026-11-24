import { apiHandler } from '@/lib/api-handler'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { normalizeTextbookGrade } from '@/lib/classroom-feedback/textbook-editions'
import { applyVocabResult, filterVocabCumulative, gradeVocabAnswer, type VocabMode, type VocabProgressSnapshot, type VocabStatus } from '@/lib/vocab-bank'
import { loadVocabEntries } from '@/lib/vocab-catalog'

export const dynamic = 'force-dynamic'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface VocabSubmissionResult {
  wordId: string
  mode: VocabMode
  selected: string
}

export const POST = apiHandler(async (request: Request) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求内容不是有效JSON' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ error: '请求内容格式无效' }, { status: 400 })

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  const requestedGrade = typeof body.grade === 'string' ? normalizeTextbookGrade(body.grade) : null
  const volume = typeof body.volume === 'string' ? body.volume.trim() : '上册'
  const unit = typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : null
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : ''
  if (!studentId) return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  if (requestedGrade && !['初一', '初二', '初三'].includes(requestedGrade)) {
    return NextResponse.json({ error: '教材年级无效，请重新选择' }, { status: 400 })
  }
  if (!['上册', '下册', '全一册'].includes(volume)) {
    return NextResponse.json({ error: '教材册次无效，请重新选择' }, { status: 400 })
  }

  const submitted = body.results
  if (!Array.isArray(submitted) || submitted.length === 0) {
    return NextResponse.json({ error: '答题结果为空，请完成本次练习后提交' }, { status: 400 })
  }

  const results: VocabSubmissionResult[] = []
  for (const item of submitted) {
    if (!isRecord(item) || typeof item.wordId !== 'string' || typeof item.selected !== 'string') {
      return NextResponse.json({ error: '答案格式无效，请检查每道题的作答后重新提交' }, { status: 400 })
    }
    const mode: VocabMode = item.mode === 'cn-to-en' ? 'cn-to-en' : 'en-to-cn'
    results.push({ wordId: item.wordId, mode, selected: item.selected.trim() })
  }

  try {
    const prisma = await getRequestPrisma()
    const children = await getParentChildren(prisma, session.user.id)
    const child = findParentChild(children, studentId)
    if (!child) return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })

    const grade = requestedGrade || normalizeTextbookGrade(child.grade)
    const catalogEntries = await loadVocabEntries(prisma, volume)
    const entries = filterVocabCumulative(grade, { volume, ...(unit ? { unit } : {}) }, catalogEntries)
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
    if (results.some((result) => !entriesById.has(result.wordId))) {
      return NextResponse.json({ error: '题目已经更新，请重新进入本次练习' }, { status: 409 })
    }

    const outcome = await prisma.$transaction(async (tx) => {
      if (submissionId) {
        const existing = await tx.vocabSession.findUnique({ where: { id: submissionId } })
        if (existing) {
          return { kind: 'duplicate' as const, session: existing }
        }
      }

      const graded = results.map((result) => {
        const entry = entriesById.get(result.wordId)!
        const correct = gradeVocabAnswer(entry, result.mode, result.selected)
        return { ...result, headword: entry.headword, correct }
      })

      const updatedProgress: Record<string, { status: VocabStatus; correctCount: number; wrongCount: number; lastResult: string | null }> = {}
      for (const item of graded) {
        const previous = await tx.vocabProgress.findFirst({
          where: { studentId: { in: child.recordIds }, wordId: item.wordId },
        })
        const previousSnapshot: VocabProgressSnapshot | null = previous
          ? {
              correctCount: previous.correctCount,
              wrongCount: previous.wrongCount,
              lastResult: previous.lastResult as 'CORRECT' | 'WRONG' | null,
            }
          : null
        const next = applyVocabResult(previousSnapshot, item.correct)
        if (previous) {
          await tx.vocabProgress.update({
            where: { id: previous.id },
            data: {
              status: next.status,
              correctCount: next.correctCount,
              wrongCount: next.wrongCount,
              lastResult: next.lastResult,
              lastAt: new Date(),
            },
          })
        } else {
          await tx.vocabProgress.create({
            data: {
              studentId: child.id,
              wordId: item.wordId,
              status: next.status,
              correctCount: next.correctCount,
              wrongCount: next.wrongCount,
              lastResult: next.lastResult,
            },
          })
        }
        updatedProgress[item.wordId] = {
          status: next.status,
          correctCount: next.correctCount,
          wrongCount: next.wrongCount,
          lastResult: next.lastResult,
        }
      }

      const wrongIds = graded.filter((item) => !item.correct).map((item) => item.wordId)
      const correct = graded.length - wrongIds.length
      const session = await tx.vocabSession.create({
        data: {
          id: submissionId || undefined,
          studentId: child.id,
          grade,
          volume,
          unit,
          total: graded.length,
          correct,
          wrongIds,
          answers: graded.map((item) => ({
            wordId: item.wordId,
            headword: item.headword,
            mode: item.mode,
            selected: item.selected,
            correct: item.correct,
          })),
        },
      })

      return { kind: 'saved' as const, session, wrongIds, updatedProgress, correct, total: graded.length }
    }, { isolationLevel: 'Serializable' })

    if (outcome.kind === 'duplicate') {
      return NextResponse.json({ success: true, duplicate: true, session: outcome.session }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    return NextResponse.json({
      success: true,
      session: outcome.session,
      wrongIds: outcome.wrongIds,
      updatedProgress: outcome.updatedProgress,
      correct: outcome.correct,
      total: outcome.total,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const code = isRecord(error) && 'code' in error ? String((error as { code: unknown }).code) : ''
    console.error('[parent-vocab-session] persist failed', code || (error instanceof Error ? error.name : 'unknown'))
    if (code === 'P2021' || code === 'P2022') {
      return NextResponse.json({ error: '背单词记录数据库尚未完成更新，请联系管理员完成数据库迁移后重试。你的作答不要清除', code: 'SCHEMA_NOT_READY' }, { status: 503 })
    }
    return NextResponse.json({ error: '练习记录暂时无法保存，请保留作答后重试', code: 'STORAGE_UNAVAILABLE' }, { status: 503 })
  }
})
