/** Read-only, whole-database audit of parent ownership and repeated student records. */
import type { PrismaClient } from '@prisma/client'
import { loadDotEnv } from './lib/load-dotenv'

async function audit(label: string, prisma: PrismaClient) {
  const { groupParentStudentRecords } = await import('../src/lib/parent-student-selection')
  const students = await prisma.student.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, grade: true, gender: true, birthYear: true,
      parentId: true, parentUserId: true, parentPhone: true, updatedAt: true,
      termMemberships: { select: { grade: true, status: true, joinedAt: true, term: { select: { status: true, startDate: true, name: true } } } },
    },
  })
  const byParent = new Map<string, typeof students>()
  const phoneOwners = new Map<string, Set<string>>()
  let inconsistentParentFields = 0
  let unbound = 0
  for (const student of students) {
    if (student.parentId && student.parentUserId && student.parentId !== student.parentUserId) inconsistentParentFields++
    const owners = [...new Set([student.parentId, student.parentUserId].filter((id): id is string => Boolean(id)))]
    if (!owners.length) unbound++
    for (const owner of owners) {
      const rows = byParent.get(owner) || []
      rows.push(student)
      byParent.set(owner, rows)
      if (student.parentPhone) {
        const linked = phoneOwners.get(student.parentPhone.trim()) || new Set<string>()
        linked.add(owner)
        phoneOwners.set(student.parentPhone.trim(), linked)
      }
    }
  }
  let multiChildParents = 0
  let repeatedIdentityGroups = 0
  let repeatedIdentityRecords = 0
  const samples: Array<{ parentId: string; studentName: string; recordIds: string[] }> = []
  for (const [parentId, rows] of byParent) {
    const groups = groupParentStudentRecords(rows)
    if (groups.length > 1) multiChildParents++
    for (const group of groups) {
      if (group.recordIds.length < 2) continue
      repeatedIdentityGroups++
      repeatedIdentityRecords += group.recordIds.length
      if (samples.length < 20) samples.push({ parentId, studentName: group.student.name, recordIds: group.recordIds })
    }
  }
  const report = {
    database: label,
    students: students.length,
    parentAccountsWithStudents: byParent.size,
    multiChildParents,
    unboundStudents: unbound,
    inconsistentParentFields,
    repeatedIdentityGroups,
    repeatedIdentityRecords,
    parentPhonesWithMultipleAccounts: [...phoneOwners.values()].filter((owners) => owners.size > 1).length,
    samples,
  }
  console.log(JSON.stringify(report, null, 2))
}

async function main() {
  loadDotEnv()
  const { getPrismaForDivision, isDualDbEnabled, prisma } = await import('../src/lib/prisma')
  if (isDualDbEnabled()) {
    for (const division of ['JUNIOR', 'SENIOR'] as const) {
      const client = getPrismaForDivision(division)
      try { await audit(division, client) } finally { await client.$disconnect() }
    }
  } else {
    try { await audit('default', prisma) } finally { await prisma.$disconnect() }
  }
}

main().catch((error) => {
  console.error('Parent/student audit failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
