import { juniorDb, readVolunteerJson, requiredInt } from './volunteer-master-import-utils'

type Row = { score: number; count: number; cumulative: number }

async function main() {
  const { filePath, year, rows: rawRows } = readVolunteerJson<Row>('data/volunteer/yifenyidang_2025.json')
  const rows = rawRows.map((row) => ({ year, score: requiredInt(row.score, 'score'), count: requiredInt(row.count, 'count'), cumulative: requiredInt(row.cumulative, 'cumulative') }))
  for (const [score, expected] of [[678, 23718], [624, 37118]] as const) {
    const actual = rows.find((row) => row.score === score)?.cumulative
    if (actual !== expected) throw new Error(`校验失败：${score}分应为${expected}名，实际${actual ?? '缺失'}`)
  }
  const db = juniorDb()
  await db.$transaction([db.yifenYidang.deleteMany({ where: { year } }), db.yifenYidang.createMany({ data: rows })])
  console.log(`[yifenyidang] ${filePath}：导入${rows.length}档，678/624关键档位校验通过`)
}
main().catch((error) => { console.error(error); process.exit(1) })
