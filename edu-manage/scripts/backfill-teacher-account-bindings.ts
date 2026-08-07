import type { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '../src/lib/prisma'
import { teacherAccountMatchScore } from '../src/lib/teacher-account-binding'
import { isUserActive } from '../src/lib/user-status'

type Division = 'JUNIOR' | 'SENIOR'

const apply = process.argv.includes('--apply')

type BindingProposal = {
  userId: string
  userEmail: string
  userName: string
  teacherId: string
  teacherName: string
}

async function auditDivision(division: Division, db: PrismaClient) {
  const [users, teachers, alreadyBound] = await Promise.all([
    db.user.findMany({
      where: { role: 'teacher', teacherId: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        teacherId: true,
      },
      orderBy: { email: 'asc' },
    }),
    db.teacher.findMany({
      where: { status: { not: 'RESIGNED' } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        division: true,
      },
    }),
    db.user.findMany({
      where: { role: 'teacher', teacherId: { not: null } },
      select: { teacherId: true },
    }),
  ])

  const occupiedTeacherIds = new Set(
    alreadyBound.flatMap(account => account.teacherId ? [account.teacherId] : []),
  )
  const proposals: BindingProposal[] = []
  const unresolved: Array<{ email: string; name: string; reason: string }> = []

  for (const user of users) {
    if (!isUserActive(user.status)) {
      unresolved.push({ email: user.email, name: user.name, reason: '账号非启用状态' })
      continue
    }

    const rankedCandidates = teachers
      .filter(teacher => !occupiedTeacherIds.has(teacher.id))
      .map(teacher => ({ teacher, score: teacherAccountMatchScore(user, teacher) }))
      .filter(candidate => candidate.score > 0)
    const bestScore = Math.max(0, ...rankedCandidates.map(candidate => candidate.score))
    const candidates = rankedCandidates
      .filter(candidate => candidate.score === bestScore)
      .map(candidate => candidate.teacher)

    if (candidates.length !== 1) {
      unresolved.push({
        email: user.email,
        name: user.name,
        reason: candidates.length === 0 ? '未找到唯一教师档案' : `匹配到${candidates.length}个教师档案`,
      })
      continue
    }

    proposals.push({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      teacherId: candidates[0].id,
      teacherName: candidates[0].name,
    })
  }

  const duplicateTargets = new Set<string>()
  const targetCounts = new Map<string, number>()
  for (const proposal of proposals) {
    const count = (targetCounts.get(proposal.teacherId) || 0) + 1
    targetCounts.set(proposal.teacherId, count)
    if (count > 1) duplicateTargets.add(proposal.teacherId)
  }

  const safeProposals = proposals.filter(proposal => !duplicateTargets.has(proposal.teacherId))
  for (const proposal of proposals.filter(item => duplicateTargets.has(item.teacherId))) {
    unresolved.push({
      email: proposal.userEmail,
      name: proposal.userName,
      reason: `多个账号指向教师档案 ${proposal.teacherName}，禁止自动绑定`,
    })
  }

  console.log(`\n===== ${division} 教师账号绑定审计 =====`)
  console.log(`未绑定教师账号：${users.length}`)
  console.log(`可安全绑定：${safeProposals.length}`)
  console.log(`需人工核对：${unresolved.length}`)
  if (safeProposals.length > 0) {
    console.table(safeProposals.map(item => ({
      account: item.userEmail,
      accountName: item.userName,
      teacher: item.teacherName,
      teacherId: item.teacherId,
    })))
  }
  if (unresolved.length > 0) console.table(unresolved)

  if (!apply) return { audited: users.length, updated: 0, unresolved: unresolved.length }

  let updated = 0
  for (const proposal of safeProposals) {
    const result = await db.user.updateMany({
      where: {
        id: proposal.userId,
        teacherId: null,
      },
      data: { teacherId: proposal.teacherId },
    })
    updated += result.count
    if (result.count !== 1) {
      console.error('[teacher-account-binding] skipped changed account', {
        division,
        userId: proposal.userId,
        teacherId: proposal.teacherId,
      })
    }
  }

  console.log(`${division} 已写入绑定：${updated}`)
  return { audited: users.length, updated, unresolved: unresolved.length }
}

async function main() {
  console.log(apply
    ? '执行模式：APPLY（仅写入唯一且无冲突的teacherId绑定）'
    : '执行模式：DRY RUN（不会修改数据库；加 --apply 才会写入）')

  const divisions: Division[] = isDualDbEnabled() ? ['JUNIOR', 'SENIOR'] : ['JUNIOR']
  const clients = new Set<PrismaClient>()
  const totals = { audited: 0, updated: 0, unresolved: 0 }

  try {
    for (const division of divisions) {
      const db = isDualDbEnabled() ? getPrismaForDivision(division) : prisma
      clients.add(db)
      const result = await auditDivision(division, db)
      totals.audited += result.audited
      totals.updated += result.updated
      totals.unresolved += result.unresolved
    }
  } finally {
    await Promise.all([...clients].map(client => client.$disconnect()))
  }

  console.log('\n===== 汇总 =====')
  console.table(totals)
  if (totals.unresolved > 0) process.exitCode = 2
}

main().catch((error) => {
  console.error('[teacher-account-binding] audit failed', error)
  process.exitCode = 1
})
