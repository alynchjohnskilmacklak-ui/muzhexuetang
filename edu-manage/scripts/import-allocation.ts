import { juniorDb, readVolunteerJson, requiredInt, requiredText } from './volunteer-master-import-utils'
import { normalizeSeniorSchoolName, SENIOR_SCHOOL_NAME_ALIASES } from '../src/lib/volunteer-school-names'

type Row = { juniorSchool: string; seniorSchool: string; quota: number }
async function main() {
  const { filePath, year, rows: rawRows } = readVolunteerJson<Row>('data/volunteer/allocation_2025.json')
  const rows = rawRows.map((row) => ({
    year,
    juniorSchool: requiredText(row.juniorSchool, 'juniorSchool'),
    seniorSchool: normalizeSeniorSchoolName(requiredText(row.seniorSchool, 'seniorSchool')),
    quota: requiredInt(row.quota, 'quota'),
  }))
  const uniqueKeys = new Set(rows.map((row) => `${row.juniorSchool}\u0000${row.seniorSchool}`))
  if (uniqueKeys.size !== rows.length) throw new Error(`分配生数据存在${rows.length - uniqueKeys.size}条重复的初中×高中记录`)
  if (rows.some((row) => row.quota <= 0)) throw new Error('分配生名额必须为正整数')

  const xinleFirstRows = rows.filter((row) => row.seniorSchool === '新乐市第一中学')
  const xinleFirstQuota = xinleFirstRows.reduce((sum, row) => sum + row.quota, 0)
  const expectedXinleFirstQuota = year === 2025 ? 1130 : year === 2026 ? 1200 : null
  if (xinleFirstRows.length === 0 || (expectedXinleFirstQuota != null && xinleFirstQuota !== expectedXinleFirstQuota)) {
    throw new Error(`新乐市第一中学精确名额校验失败：${xinleFirstRows.length}所初中、合计${xinleFirstQuota}个`)
  }

  const db = juniorDb()
  await db.$transaction([
    ...Object.entries(SENIOR_SCHOOL_NAME_ALIASES).map(([oldName, newName]) => db.allocationQuota.updateMany({
      where: { year: 2025, seniorSchool: oldName },
      data: { seniorSchool: newName },
    })),
    db.allocationQuota.deleteMany({ where: { year } }),
    db.allocationQuota.createMany({ data: rows }),
  ])
  console.log(`[allocation] ${filePath}：导入${rows.length}条，覆盖${new Set(rows.map((row) => row.juniorSchool)).size}所初中、${new Set(rows.map((row) => row.seniorSchool)).size}所高中`)
  console.log(`[allocation] 新乐市第一中学：${xinleFirstRows.length}所初中，合计${xinleFirstQuota}个精确名额`)
}
main().catch((error) => { console.error(error); process.exit(1) })
