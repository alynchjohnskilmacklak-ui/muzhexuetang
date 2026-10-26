import { resolve } from 'node:path'
import type { HighSchoolInfo, Prisma } from '@prisma/client'

import { highschoolSeedDetails, type HighSchoolSeedDetail } from './highschool-seed-details'
import { createJuniorPrisma, isMissingString, writeJsonReport } from './lib/highschool-restore-utils'

const RESTORE_NOTE = 'details restored from seed-schools.ts'
const RESTORE_USER = 'restore-highschool-details-from-seed'

const aliasMap: Record<string, string[]> = {
  '二中实验学校（其他县区）': ['二南', '石家庄二中实验学校', '二中实验'],
  '正中实验中学（其他县区）': ['正中实验', '河北正中实验中学'],
  '精英中学（其他县区）': ['精英中学', '石家庄精英中学'],
  '一中实验学校（其他县区）': ['一中实验', '石家庄一中实验学校'],
  '联邦外国语学校（其他县区）': ['联邦外国语', '河北联邦外国语学校'],
  '润德学校（其他县区）': ['润德学校', '石家庄润德学校'],
  '卓越中学东校区（其他县区）': ['卓越东校区', '卓越中学东校区'],
  '卓越中学西校区（其他县区）': ['卓越西校区', '卓越中学西校区'],
  '精英新华中学（其他县区）': ['精英新华', '精英新华中学'],
  '行唐启明中学（其他县区）': ['行唐启明', '行唐启明中学'],
  '河北正定中学（正定）': ['河北正定中学', '正定中学'],
  '新伏羲中学（新乐）': ['新伏羲', '新伏羲中学', '新乐市新伏羲中学'],
  '金石高级中学（其他县区）': ['金石中学'],
  '一中滨河校区': ['一中滨河'],
  '二中铭德校区': ['二中铭德'],
  '私立第一中学（其他县区）': ['私立一中'],
  '新世纪外国语学校（其他县区）': ['新世纪外国语'],
  '瀚林学校（其他县区）': ['翰林学校'],
  '藁城区第一中学': ['藁城一中'],
  '行唐县第一中学': ['行唐一中'],
  '晋州市第一中学': ['晋州一中'],
  '元氏县第一中学': ['元氏一中'],
  '正定县第一中学': ['正定一中'],
  '鹿泉区第一中学': ['鹿泉一中'],
  '深泽县中学': ['深泽中学'],
  '井陉县第一中学': ['井陉一中'],
  '精英未来高级中学（其他县区）': ['精英未来'],
  '云臻实验高级中学（其他县区）': ['云臻实验'],
  '麒麟私立中学（其他县区）': ['麒麟高中'],
}

type MatchMethod = 'schoolId' | 'exactName' | 'alias' | 'normalized'
type MatchResult = { method: MatchMethod; school: HighSchoolInfo } | { ambiguous: HighSchoolInfo[] } | null

function normalizeName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\s·•、，,.。—\-_]/g, '')
    .replace(/[（(](?:其他县区|新乐|正定|市)[）)]/g, '')
    .replace(/^(河北省|石家庄市|新乐市)/, '')
    .trim()
}

function nameValues(school: Pick<HighSchoolInfo, 'name' | 'fullName'> | HighSchoolSeedDetail): string[] {
  return Array.from(new Set([school.name, school.fullName].filter(Boolean)))
}

function uniqueResult(candidates: HighSchoolInfo[], method: MatchMethod): MatchResult {
  const unique = Array.from(new Map(candidates.map(school => [school.id, school])).values())
  if (unique.length === 1) return { method, school: unique[0] }
  if (unique.length > 1) return { ambiguous: unique }
  return null
}

function matchSeed(seed: HighSchoolSeedDetail, dbSchools: HighSchoolInfo[]): MatchResult {
  const byId = uniqueResult(dbSchools.filter(school => school.schoolId === seed.schoolId), 'schoolId')
  if (byId) return byId

  const seedNames = nameValues(seed)
  const exact = uniqueResult(dbSchools.filter(school => nameValues(school).some(name => seedNames.includes(name))), 'exactName')
  if (exact) return exact

  const aliasGroup = Object.entries(aliasMap).find(([canonical, aliases]) =>
    [canonical, ...aliases].some(name => seedNames.includes(name)),
  )
  if (aliasGroup) {
    const names = new Set([aliasGroup[0], ...aliasGroup[1]])
    const alias = uniqueResult(dbSchools.filter(school => nameValues(school).some(name => names.has(name))), 'alias')
    if (alias) return alias
  }

  const normalizedSeed = new Set(seedNames.map(normalizeName).filter(Boolean))
  return uniqueResult(
    dbSchools.filter(school => nameValues(school).some(name => normalizedSeed.has(normalizeName(name)))),
    'normalized',
  )
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = old
    }
  }
  return row[b.length]
}

function fuzzySuggestions(seed: HighSchoolSeedDetail, dbSchools: HighSchoolInfo[]) {
  const seedName = normalizeName(seed.name)
  return dbSchools
    .map(school => {
      const dbName = normalizeName(school.name)
      const maxLength = Math.max(seedName.length, dbName.length, 1)
      return { schoolId: school.schoolId, name: school.name, score: 1 - levenshtein(seedName, dbName) / maxLength }
    })
    .filter(item => item.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

function buildUpdate(seed: HighSchoolSeedDetail, current: HighSchoolInfo): { data: Prisma.HighSchoolInfoUpdateInput; fields: string[] } {
  const data: Prisma.HighSchoolInfoUpdateInput = {}
  const fields: string[] = []
  const stringFields = [
    'address', 'distanceFromXinle', 'boardingFee', 'tuitionFee', 'keyFeature', 'gaokaoRate',
    'intro', 'tips', 'website', 'phone',
  ] as const

  for (const field of stringFields) {
    const seedValue = seed[field]
    if (isMissingString(current[field]) && !isMissingString(seedValue)) {
      data[field] = seedValue
      fields.push(field)
    }
  }
  if ((current.enrollment == null || current.enrollment === 0) && seed.enrollment && seed.enrollment > 0) {
    data.enrollment = seed.enrollment
    fields.push('enrollment')
  }
  if ((current.yiTong == null || current.yiTong === 0) && seed.yiTong && seed.yiTong > 0) {
    data.yiTong = seed.yiTong
    fields.push('yiTong')
  }
  if ((current.tongZhao == null || current.tongZhao === 0) && seed.tongZhao > 0) {
    data.tongZhao = seed.tongZhao
    fields.push('tongZhao')
  }

  if (fields.length > 0) {
    data.sourceNote = current.sourceNote?.includes(RESTORE_NOTE)
      ? current.sourceNote
      : [current.sourceNote?.trim(), RESTORE_NOTE].filter(Boolean).join(' | ')
    data.updatedBy = RESTORE_USER
    data.infoVerifiedAt = new Date()
    if (isMissingString(current.infoConfidence) || current.infoConfidence === 'unknown') data.infoConfidence = 'seed'
  }
  return { data, fields }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (apply && process.argv.includes('--dry-run')) throw new Error('不能同时使用 --apply 和 --dry-run')

  const prisma = createJuniorPrisma()
  try {
    const dbSchools = await prisma.highSchoolInfo.findMany({ orderBy: { schoolId: 'asc' } })
    const report = {
      generatedAt: new Date().toISOString(),
      mode: apply ? 'apply' : 'dry-run',
      totalSeed: highschoolSeedDetails.length,
      totalDb: dbSchools.length,
      matched: 0,
      updated: 0,
      unmatched: [] as Array<{ schoolId: string; name: string; fuzzySuggestions: ReturnType<typeof fuzzySuggestions> }>,
      ambiguous: [] as Array<{ schoolId: string; name: string; candidates: Array<{ schoolId: string; name: string }> }>,
      changedFieldsBySchool: [] as Array<{ seedSchoolId: string; dbSchoolId: string; name: string; matchMethod: MatchMethod; fields: string[] }>,
      restoredFields: {} as Record<string, number>,
      overwrittenExistingFields: [] as Array<{ schoolId: string; field: string }>,
      protectedFields: ['xinleLine', 'xinleStatus', 'xinleFenpeiQuota', 'allocationLine', 'xinleAccessible', 'acceptsOtherCounty'],
    }

    for (const seed of highschoolSeedDetails) {
      const match = matchSeed(seed, dbSchools)
      if (!match) {
        report.unmatched.push({ schoolId: seed.schoolId, name: seed.name, fuzzySuggestions: fuzzySuggestions(seed, dbSchools) })
        continue
      }
      if ('ambiguous' in match) {
        report.ambiguous.push({
          schoolId: seed.schoolId,
          name: seed.name,
          candidates: match.ambiguous.map(({ schoolId, name }) => ({ schoolId, name })),
        })
        continue
      }

      report.matched += 1
      const update = buildUpdate(seed, match.school)
      if (update.fields.length === 0) continue
      report.updated += 1
      report.changedFieldsBySchool.push({
        seedSchoolId: seed.schoolId,
        dbSchoolId: match.school.schoolId,
        name: match.school.name,
        matchMethod: match.method,
        fields: update.fields,
      })
      for (const field of update.fields) report.restoredFields[field] = (report.restoredFields[field] || 0) + 1

      if (apply) {
        await prisma.highSchoolInfo.update({ where: { id: match.school.id }, data: update.data })
      }
    }

    const output = resolve(process.cwd(), apply
      ? 'tmp/highschool-seed-restore-apply.json'
      : 'tmp/highschool-seed-restore-dry-run.json')
    writeJsonReport(output, report)
    console.log(JSON.stringify({
      output,
      mode: report.mode,
      totalSeed: report.totalSeed,
      totalDb: report.totalDb,
      matched: report.matched,
      updated: report.updated,
      unmatched: report.unmatched.map(item => item.name),
      ambiguous: report.ambiguous.map(item => item.name),
      restoredFields: report.restoredFields,
      overwrittenExistingFields: report.overwrittenExistingFields,
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
