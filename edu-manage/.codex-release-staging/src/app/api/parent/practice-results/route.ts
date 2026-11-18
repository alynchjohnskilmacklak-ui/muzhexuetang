import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { PUBLISHED_PRACTICE_SETS } from '@/data/published-practice-bank'
import { isPracticeAnswerCorrect, isValidPracticeAnswer, mergePracticeProgress, practiceQuestionRevision, selectPracticeQuestions, snapshotPracticeQuestions, type PracticeAnswer, type PracticeMode } from '@/lib/practice-bank'

export const dynamic = 'force-dynamic'

const practiceSetsById = new Map(PUBLISHED_PRACTICE_SETS.map((set) => [set.id, set]))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function storageError(error: unknown) {
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
  console.error('[parent-practice-results] storage failure', code || (error instanceof Error ? error.name : 'unknown'))
  if (code === 'P2021' || code === 'P2022') {
    return NextResponse.json({ error: '练习记录数据库尚未完成更新，请联系管理员完成数据库迁移后重试。你的作答不要清除', code: 'SCHEMA_NOT_READY' }, { status: 503 })
  }
  return NextResponse.json({ error: '练习记录暂时无法读写，请保留作答后重试', code: 'STORAGE_UNAVAILABLE' }, { status: 503 })
}

function gradeSubmission(setId: string, requestedMode: unknown, submittedAnswers: unknown, questionIds?: unknown, revision?: unknown) {
  const set = practiceSetsById.get(setId)
  if (!set) return { error: '找不到对应的正式题组，请刷新页面后重新练习' as const }
  if (requestedMode !== undefined && requestedMode !== 'challenge' && requestedMode !== 'all' && requestedMode !== 'wrong') {
    return { error: '练习模式无效，请重新进入题组' as const }
  }
  const mode: PracticeMode = requestedMode === 'wrong' ? 'wrong' : requestedMode === 'challenge' ? 'challenge' : 'all'
  if (!isRecord(submittedAnswers)) return { error: '答题内容不完整，请检查作答后重新提交' as const }

  if (mode === 'wrong' && (!Array.isArray(questionIds) || !questionIds.length
    || questionIds.some((id) => typeof id !== 'string') || new Set(questionIds).size !== questionIds.length)) {
    return { error: '错题范围无效，请重新进入错题重练' as const }
  }
  const questions = selectPracticeQuestions(set.questions, mode).filter((question) => mode !== 'wrong' || (questionIds as string[]).includes(question.id))
  if (questionIds !== undefined && (!Array.isArray(questionIds)
    || canonicalJson(questionIds) !== canonicalJson(questions.map((question) => question.id)))) {
    return { error: '题目范围已经变化，请返回题组重新开始' as const }
  }
  if (revision !== undefined && revision !== practiceQuestionRevision(questions)) {
    return { error: '题库内容已经更新，请返回题组重新开始；旧作答不会被当成新题目判分', code: 'QUESTION_CHANGED' as const }
  }
  const answerIds = Object.keys(submittedAnswers)
  if (!questions.length || answerIds.length !== questions.length || questions.some((question) => !Object.prototype.hasOwnProperty.call(submittedAnswers, question.id))) {
    return { error: '题目答案不完整或已过期，请重新进入题组完成作答' as const }
  }

  for (const question of questions) {
    const answer = submittedAnswers[question.id]
    if (!isValidPracticeAnswer(question, answer)) {
      return { error: '答案格式无效，请检查每道题的作答后重新提交' as const }
    }
  }

  const answers = Object.fromEntries(questions.map((question) => [question.id, submittedAnswers[question.id] as PracticeAnswer]))
  const wrongIds = questions.filter((question) => !isPracticeAnswerCorrect(question, answers[question.id])).map((question) => question.id)
  return {
    mode,
    answers,
    wrongIds,
    score: questions.length - wrongIds.length,
    total: questions.length,
    questionSnapshot: snapshotPracticeQuestions(questions),
  }
}

// 获取某个学生的所有做题记录
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  if (!studentId) {
    return NextResponse.json({ error: '缺少studentId参数' }, { status: 400 })
  }

  try {
  const prisma = await getRequestPrisma()

  const children = await getParentChildren(prisma, session.user.id)
  const child = findParentChild(children, studentId)
  if (!child) {
    return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })
  }

  const submissionId = searchParams.get('submissionId')
  if (submissionId) {
    const attempt = await prisma.practiceAttempt.findUnique({ where: { id: submissionId } })
    if (!attempt || !child.recordIds.includes(attempt.studentId)) {
      return NextResponse.json({ error: '尚未找到本次提交记录', code: 'NOT_SAVED' }, { status: 404 })
    }
    return NextResponse.json({ success: true, result: attempt }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const requestedPage = Number(searchParams.get('page') || 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 30
  const summaryOnly = searchParams.get('summaryOnly') === '1'

  const [results, attempts, aggregate] = await Promise.all([
    prisma.practiceResult.findMany({
      where: { studentId: { in: child.recordIds } },
      orderBy: { finishedAt: 'desc' },
    }),
    summaryOnly ? Promise.resolve([]) : prisma.practiceAttempt.findMany({
      where: { studentId: { in: child.recordIds } },
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    }),
    summaryOnly ? Promise.resolve(null) : prisma.practiceAttempt.aggregate({
      where: { studentId: { in: child.recordIds } },
      _count: { _all: true },
      _sum: { score: true, total: true },
    }),
  ])
  const hasMoreAttempts = attempts.length > pageSize
  const pageAttempts = hasMoreAttempts ? attempts.slice(0, pageSize) : attempts

  // 转换成Record<setId, SavedResult>格式，方便前端使用
  const resultMap: Record<string, { score: number; total: number; wrongIds: string[]; finishedAt: string; answers?: Record<string, PracticeAnswer> | null }> = {}
  for (const r of results) {
    if (resultMap[r.setId]) continue
    resultMap[r.setId] = {
      score: r.score,
      total: r.total,
      wrongIds: r.wrongIds,
      finishedAt: r.finishedAt.toISOString(),
      answers: (r.answers as Record<string, PracticeAnswer> | null) ?? null,
    }
  }

  if (summaryOnly) return NextResponse.json({ results: resultMap }, { headers: { 'Cache-Control': 'private, no-store' } })

  return NextResponse.json({
    results: resultMap,
    attemptStats: {
      totalAttempts: aggregate?._count._all ?? 0,
      totalQuestions: aggregate?._sum.total ?? 0,
      totalCorrect: aggregate?._sum.score ?? 0,
      totalWrong: (aggregate?._sum.total ?? 0) - (aggregate?._sum.score ?? 0),
    },
    attemptHistoryEnabled: true,
    attempts: pageAttempts.map((attempt) => ({
      id: attempt.id,
      setId: attempt.setId,
      score: attempt.score,
      total: attempt.total,
      wrongIds: attempt.wrongIds,
      finishedAt: attempt.finishedAt.toISOString(),
      answers: (attempt.answers as Record<string, PracticeAnswer> | null) ?? null,
      questionSnapshot: Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : null,
    })),
    nextPage: hasMoreAttempts ? page + 1 : null,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return storageError(error) }
}

// 保存做题记录
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求内容不是有效JSON' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: '请求内容格式无效' }, { status: 400 })
  }

  const { studentId, setId, answers: submittedAnswers, submissionId, practiceMode, questionIds, questionRevision } = body
  if (typeof studentId !== 'string' || !studentId.trim()
    || typeof setId !== 'string' || !setId.trim()
  ) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  }
  if (typeof submissionId !== 'string' || !/^practice_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return NextResponse.json({ error: '缺少有效的本次提交编号，请重新进入题组后提交' }, { status: 400 })
  }
  try {
  const prisma = await getRequestPrisma()

  const children = await getParentChildren(prisma, session.user.id)
  const child = findParentChild(children, studentId)
  if (!child) {
    return NextResponse.json({ error: '学生不存在或无权访问' }, { status: 403 })
  }

  const persist = () => prisma.$transaction(async (tx) => {
    // Resolve retries before consulting the current bank. A deployment must not
    // turn an already-saved submission into a conflicting/new attempt.
    const existing = await tx.practiceAttempt.findUnique({ where: { id: submissionId } })
    if (existing) {
      return child.recordIds.includes(existing.studentId) && existing.setId === setId
        && canonicalJson(existing.answers) === canonicalJson(submittedAnswers)
        && (questionIds === undefined || canonicalJson(questionIds) === canonicalJson(
          Array.isArray(existing.questionSnapshot) ? existing.questionSnapshot.map((question) => isRecord(question) ? question.id : null) : [],
        ))
        ? { kind: 'duplicate' as const, result: existing }
        : { kind: 'conflict' as const }
    }
    const grade = gradeSubmission(setId, practiceMode, submittedAnswers, questionIds, questionRevision)
    if ('error' in grade) return { kind: 'invalid' as const, error: grade.error, code: 'code' in grade ? grade.code : 'INVALID_SUBMISSION' }
    const { score, total, wrongIds, answers, questionSnapshot } = grade
    const previous = await tx.practiceResult.findFirst({
      where: { studentId: { in: child.recordIds }, setId }, orderBy: { finishedAt: 'desc' },
    })
    if (grade.mode === 'wrong' && (!previous || questionSnapshot.some((question) => !previous.wrongIds.includes(question.id)))) {
      return { kind: 'invalid' as const, error: '错题记录已经变化，请刷新章节列表后重新选择错题', code: 'WRONG_SCOPE_CHANGED' }
    }
    const finishedAt = new Date()
    const attemptData = {
      // The client-generated UUID is also the primary key. Retrying the same
      // completed session therefore cannot append a second history record.
      id: submissionId,
      studentId: child.id,
      setId,
      score,
      total,
      wrongIds,
      answers,
      questionSnapshot,
      finishedAt,
    }
    const inserted = await tx.practiceAttempt.createMany({ data: [attemptData], skipDuplicates: true })

    if (inserted.count === 0) {
      // Concurrent inserts are retried under serializable isolation below.
      throw Object.assign(new Error('Concurrent practice submission'), { code: 'P2034' })
    }

    // The summary tracks the latest answer to each covered question. The attempt
    // records only THIS submission. A subset cannot clear unrelated wrong answers.
    const progress = mergePracticeProgress(previous, practiceSetsById.get(setId)!.questions, answers)
    await tx.practiceResult.upsert({
      where: {
        studentId_setId: {
          studentId: child.id,
          setId,
        },
      },
      update: {
        ...progress,
        finishedAt,
      },
      create: {
        studentId: child.id,
        setId,
        ...progress,
        finishedAt,
      },
    })
    return { kind: 'saved' as const, result: attemptData }
  }, { isolationLevel: 'Serializable' })
  let outcome: Awaited<ReturnType<typeof persist>> | undefined
  for (let retry = 0; retry < 3; retry += 1) {
    try { outcome = await persist(); break }
    catch (error) { if (!isRecord(error) || error.code !== 'P2034' || retry === 2) throw error }
  }
  if (!outcome) throw new Error('Missing practice transaction result')

  if (outcome.kind === 'invalid') {
    return NextResponse.json({ error: outcome.error, code: outcome.code }, { status: outcome.code === 'INVALID_SUBMISSION' ? 400 : 409 })
  }

  if (outcome.kind === 'conflict') {
    return NextResponse.json({ error: '提交编号与已有记录不匹配，请重新进入题组后提交' }, { status: 409 })
  }

  return NextResponse.json({ success: true, duplicate: outcome.kind === 'duplicate', result: outcome.result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return storageError(error) }
}
