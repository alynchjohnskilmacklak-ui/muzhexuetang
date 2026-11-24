/**
 * 课堂随机提问的抽取算法。
 *
 * 设计要点（与"前端 Math.random"方案的区别）：
 * 1. 抽取在服务端完成，避免多端并发抽出同一人、也无法被前端篡改；
 * 2. 同一轮内不重复抽到同一名学员；全班走完一遍自动进入下一轮；
 * 3. 带权重：越久没被抽到权重越高，上次"需订正"的略微加权，
 *    避免老师反复抽同几个人（这是随机点名最常见的失真来源）。
 *
 * 本文件是纯函数，不依赖 Prisma、不直接引用 Node 内置模块，
 * 便于直接单测和被前端页面复用标签。随机源通过 options.random 注入，
 * 服务端路由可传入 crypto.randomInt，默认使用 Math.random 兜底。
 */

export const PICK_RESULTS = ['CORRECT', 'PARTIAL', 'NEEDS_WORK', 'NO_ANSWER'] as const
export type PickResult = (typeof PICK_RESULTS)[number]

export const PICK_RESULT_LABELS: Record<PickResult, string> = {
  CORRECT: '答对了',
  PARTIAL: '部分正确',
  NEEDS_WORK: '需要订正',
  NO_ANSWER: '未作答',
}

export const ROLL_CALL_STATUSES = ['PRESENT', 'ABSENT', 'LATE'] as const
export type RollCallStatus = (typeof ROLL_CALL_STATUSES)[number]

export const ROLL_CALL_LABELS: Record<RollCallStatus, string> = {
  PRESENT: '已到',
  ABSENT: '缺席',
  LATE: '迟到',
}

export function isPickResult(value: unknown): value is PickResult {
  return typeof value === 'string' && (PICK_RESULTS as readonly string[]).includes(value)
}

export function isRollCallStatus(value: unknown): value is RollCallStatus {
  return typeof value === 'string' && (ROLL_CALL_STATUSES as readonly string[]).includes(value)
}

const DAY_MS = 86_400_000
const BASE_WEIGHT = 100
const STALE_MAX_BONUS = 200
const MAX_STALE_DAYS = 30
const NEEDS_WORK_BONUS = 50
/** 从未被抽到的人，权重等同于"已停滞 30 天以上" */
const NEVER_PICKED_WEIGHT = BASE_WEIGHT + STALE_MAX_BONUS

export type PickHistoryEntry = {
  studentId: string
  round: number
  createdAt: Date
  result?: string | null
}

export type CandidateContext = {
  studentId: string
  lastPickedAt: Date | null
  lastResult: string | null
}

/** 计算单个候选人的抽取权重（整数，避免浮点累积误差）。 */
export function computeWeight(candidate: CandidateContext, now: Date): number {
  if (!candidate.lastPickedAt) return NEVER_PICKED_WEIGHT
  const elapsedMs = now.getTime() - candidate.lastPickedAt.getTime()
  const days = Math.max(0, elapsedMs / DAY_MS)
  const staleRatio = Math.min(days, MAX_STALE_DAYS) / MAX_STALE_DAYS
  let weight = BASE_WEIGHT + Math.round(staleRatio * STALE_MAX_BONUS)
  if (candidate.lastResult === 'NEEDS_WORK') weight += NEEDS_WORK_BONUS
  return weight
}

/** 从历史记录里汇总每名学员"最近一次被抽"的信息。 */
export function buildCandidateContexts(
  rosterIds: string[],
  history: PickHistoryEntry[],
): CandidateContext[] {
  const latest = new Map<string, PickHistoryEntry>()
  for (const entry of history) {
    const current = latest.get(entry.studentId)
    if (!current || entry.createdAt.getTime() > current.createdAt.getTime()) {
      latest.set(entry.studentId, entry)
    }
  }
  return rosterIds.map((studentId) => {
    const entry = latest.get(studentId)
    return {
      studentId,
      lastPickedAt: entry ? entry.createdAt : null,
      lastResult: entry ? entry.result ?? null : null,
    }
  })
}

/**
 * 计算当前应处在第几轮：本轮全班都抽过一遍就进入下一轮。
 * 以"本轮已覆盖人数 >= 名单人数"判断，名单临时增删也不会错乱。
 */
export function nextRound(history: PickHistoryEntry[], rosterIds: string[]): number {
  if (history.length === 0 || rosterIds.length === 0) return 1
  let round = 1
  for (const entry of history) {
    if (entry.round > round) round = entry.round
  }
  const roster = new Set(rosterIds)
  const pickedThisRound = new Set(
    history.filter((entry) => entry.round === round).map((entry) => entry.studentId),
  )
  let covered = 0
  for (const studentId of pickedThisRound) {
    if (roster.has(studentId)) covered += 1
  }
  return covered >= roster.size ? round + 1 : round
}

export type PickOptions = {
  now?: Date
  /** 注入随机源，便于单测；服务端可传 crypto.randomInt，缺省用 Math.random */
  random?: (maxExclusive: number) => number
}

const defaultRandom = (maxExclusive: number) => Math.floor(Math.random() * maxExclusive)

export type PickOutcome = {
  studentId: string
  round: number
  /** 本轮剩余可抽人数（含刚抽中的这名） */
  remainingThisRound: number
}

/**
 * 带权随机抽取一名学员。
 * 返回 null 表示名单为空；本模块不会返回"同一轮内已抽过的人"，
 * 需要重抽请调用方在下一轮进行。
 */
export function pickWeighted(
  rosterIds: string[],
  history: PickHistoryEntry[],
  options: PickOptions = {},
): PickOutcome | null {
  if (rosterIds.length === 0) return null
  const now = options.now ?? new Date()
  const random = options.random ?? defaultRandom
  const round = nextRound(history, rosterIds)
  const pickedThisRound = new Set(
    history.filter((entry) => entry.round === round).map((entry) => entry.studentId),
  )
  const pool = rosterIds.filter((studentId) => !pickedThisRound.has(studentId))
  if (pool.length === 0) return null

  const contexts = buildCandidateContexts(pool, history)
  const weights = contexts.map((candidate) => computeWeight(candidate, now))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let target = random(total)
  let index = 0
  for (; index < weights.length; index += 1) {
    if (target < weights[index]) break
    target -= weights[index]
  }
  if (index >= weights.length) index = weights.length - 1

  return {
    studentId: contexts[index].studentId,
    round,
    remainingThisRound: pool.length,
  }
}

/**
 * 纯等概率随机抽取一名学员（每个人被抽到的概率严格相等，均为 1/N）。
 * 不设任何基于历史提问或作答表现的权重倾斜，实现完全公平公正的课堂随机点名。
 */
export function pickUniform(
  candidates: string[],
  options: PickOptions = {},
): string | null {
  if (candidates.length === 0) return null
  const random = options.random ?? defaultRandom
  const raw = random(candidates.length)
  const index = Math.floor(raw)
  const safeIndex = Math.max(0, Math.min(candidates.length - 1, Number.isNaN(index) ? 0 : index))
  return candidates[safeIndex]
}

export type ParticipationSummary = {
  totalPicks: number
  correctCount: number
  needsWorkCount: number
  lastPickedAt: string | null
}

/** 家长端所用的汇总口径：只统计自己的孩子，不与他人比较。 */
export function summarizeParticipation(
  records: Array<{ result?: string | null; createdAt: Date }>,
): ParticipationSummary {
  let correctCount = 0
  let needsWorkCount = 0
  let lastPickedAt: Date | null = null
  for (const record of records) {
    if (record.result === 'CORRECT') correctCount += 1
    if (record.result === 'NEEDS_WORK') needsWorkCount += 1
    if (!lastPickedAt || record.createdAt.getTime() > lastPickedAt.getTime()) {
      lastPickedAt = record.createdAt
    }
  }
  return {
    totalPicks: records.length,
    correctCount,
    needsWorkCount,
    lastPickedAt: lastPickedAt ? lastPickedAt.toISOString() : null,
  }
}
