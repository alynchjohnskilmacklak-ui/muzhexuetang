import { juniorDb, readVolunteerJson, requiredInt } from './volunteer-master-import-utils'

type Row = { score: number; count: number; cumulative: number }

const KEY_RANKS: Record<number, ReadonlyArray<readonly [score: number, cumulative: number]>> = {
  2025: [[678, 23718], [624, 37118]],
  2026: [[678, 23517], [624, 36762]],
}

async function main() {
  const { filePath, year, rows: rawRows } = readVolunteerJson<Row>('data/volunteer/yifenyidang_2025.json')
  const rows = rawRows.map((row) => ({ year, score: requiredInt(row.score, 'score'), count: requiredInt(row.count, 'count'), cumulative: requiredInt(row.cumulative, 'cumulative') }))
  if (rows.length === 0) throw new Error('校验失败：数据为空')
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    if (row.count < 0 || row.cumulative < row.count) throw new Error(`校验失败：${row.score}分人数或累计人数无效`)
    if (index === 0) continue
    const previous = rows[index - 1]
    if (previous.score - row.score !== 1) throw new Error(`校验失败：${previous.score}分与${row.score}分之间不连续`)
    if (row.cumulative < previous.cumulative) throw new Error(`校验失败：${row.score}分累计人数未保持单调递增`)
  }
  for (const [score, expected] of KEY_RANKS[year] || []) {
    const actual = rows.find((row) => row.score === score)?.cumulative
    if (actual !== expected) throw new Error(`校验失败：${score}分应为${expected}名，实际${actual ?? '缺失'}`)
  }
  const db = juniorDb()
  await db.$transaction([db.yifenYidang.deleteMany({ where: { year } }), db.yifenYidang.createMany({ data: rows })])
  const keyCheckMessage = KEY_RANKS[year]?.length ? '，678/624关键档位校验通过' : ''
  console.log(`[yifenyidang] ${filePath}：导入${rows.length}档${keyCheckMessage}`)
}
main().catch((error) => { console.error(error); process.exit(1) })
