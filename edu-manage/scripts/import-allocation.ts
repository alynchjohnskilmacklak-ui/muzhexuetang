import { juniorDb, readVolunteerJson, requiredInt, requiredText } from './volunteer-master-import-utils'

type Row = { juniorSchool: string; seniorSchool: string; quota: number }
async function main() {
  const { filePath, year, rows: rawRows } = readVolunteerJson<Row>('data/volunteer/allocation_2025.json')
  const rows = rawRows.map((row) => ({ year, juniorSchool: requiredText(row.juniorSchool, 'juniorSchool'), seniorSchool: requiredText(row.seniorSchool, 'seniorSchool'), quota: requiredInt(row.quota, 'quota') }))
  const uniqueKeys = new Set(rows.map((row) => `${row.juniorSchool}\u0000${row.seniorSchool}`))
  if (uniqueKeys.size !== rows.length) throw new Error(`分配生数据存在${rows.length - uniqueKeys.size}条重复的初中×高中记录`)
  if (rows.some((row) => row.quota <= 0)) throw new Error('分配生名额必须为正整数')

  const xinleFirstRows = rows.filter((row) => row.seniorSchool === '新乐一中')
  const xinleFirstQuota = xinleFirstRows.reduce((sum, row) => sum + row.quota, 0)
  if (xinleFirstRows.length === 0 || xinleFirstQuota !== 1130) {
    throw new Error(`新乐一中精确名额校验失败：${xinleFirstRows.length}所初中、合计${xinleFirstQuota}个`)
  }

  const db = juniorDb()
  await db.$transaction([db.allocationQuota.deleteMany({ where: { year } }), db.allocationQuota.createMany({ data: rows })])
  console.log(`[allocation] ${filePath}：导入${rows.length}条，覆盖${new Set(rows.map((row) => row.juniorSchool)).size}所初中、${new Set(rows.map((row) => row.seniorSchool)).size}所高中`)
  console.log(`[allocation] 新乐一中：${xinleFirstRows.length}所初中，合计${xinleFirstQuota}个精确名额`)
}
main().catch((error) => { console.error(error); process.exit(1) })
