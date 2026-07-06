import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPrismaForDivision } from '../src/lib/prisma'
import { hasSchoolNameScope, normalizeSchoolNameWithoutScope } from '../src/lib/volunteer-school-names'

type MasterSchool = { schoolName: string }
type MasterFile = { data: MasterSchool[] }

async function main() {
  const apply = process.argv.includes('--apply')
  const prisma = getPrismaForDivision('JUNIOR')
  const masterPath = path.join(process.cwd(), 'data', 'volunteer', 'MASTER_schools_2025.json')
  const master = JSON.parse(await readFile(masterPath, 'utf8')) as MasterFile
  const masterNames = new Set(master.data.map((school) => school.schoolName.trim()))
  const schools = await prisma.highSchoolInfo.findMany({
    select: { id: true, name: true, tongZhao: true },
    orderBy: { name: 'asc' },
  })

  const grouped = new Map<string, typeof schools>()
  for (const school of schools) {
    const key = normalizeSchoolNameWithoutScope(school.name)
    const group = grouped.get(key) || []
    group.push(school)
    grouped.set(key, group)
  }

  const duplicates = [...grouped.entries()].filter(([, group]) =>
    group.length > 1 && group.some((school) => hasSchoolNameScope(school.name)),
  )
  console.log(`[dedupe-high-schools] mode=${apply ? 'APPLY' : 'DRY-RUN'}，疑似重复组=${duplicates.length}`)

  let deleted = 0
  for (const [normalizedName, group] of duplicates) {
    console.log(`\n[${normalizedName}]`)
    for (const school of group) {
      console.log(`  id=${school.id} name=${school.name} tongZhao=${school.tongZhao}`)
    }

    const keeper = group.find((school) => masterNames.has(school.name.trim()))
    if (!keeper) {
      console.warn('  跳过：MASTER_schools_2025.json 中没有精确匹配项，需人工核对')
      continue
    }
    const removals = group.filter((school) => school.id !== keeper.id)
    console.log(`  保留：${keeper.name} (${keeper.id})`)
    for (const school of removals) console.log(`  ${apply ? '删除' : '拟删除'}：${school.name} (${school.id})`)

    if (apply && removals.length > 0) {
      const result = await prisma.highSchoolInfo.deleteMany({ where: { id: { in: removals.map((school) => school.id) } } })
      deleted += result.count
    }
  }

  console.log(`\n[dedupe-high-schools] 完成，${apply ? `已删除 ${deleted} 条` : '未修改数据库；确认后使用 --apply'}`)
}

main().catch((error) => {
  console.error('[dedupe-high-schools] failed', error)
  process.exitCode = 1
})
