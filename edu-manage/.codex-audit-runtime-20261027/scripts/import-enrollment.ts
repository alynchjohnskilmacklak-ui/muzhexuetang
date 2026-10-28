import { juniorDb, readVolunteerJson, requiredInt, requiredText } from './volunteer-master-import-utils'

type Row = { juniorSchool: string; count: number }
async function main() {
  const { filePath, year, rows: rawRows } = readVolunteerJson<Row>('data/volunteer/enrollment_2025.json')
  const rows = rawRows.map((row) => ({ year, juniorSchool: requiredText(row.juniorSchool, 'juniorSchool'), count: requiredInt(row.count, 'count') }))
  const db = juniorDb()
  await db.$transaction([db.juniorEnrollment.deleteMany({ where: { year } }), db.juniorEnrollment.createMany({ data: rows })])
  console.log(`[enrollment] ${filePath}：导入${rows.length}所初中`)
}
main().catch((error) => { console.error(error); process.exit(1) })
