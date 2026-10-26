import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Row = { score: number; count: number; cumulative: number }

const SOURCE_PATH = path.resolve('data/source/2026石家庄中考17县一分一档_整理数据.csv')
const OUTPUT_PATH = path.resolve('data/volunteer/yifenyidang_2026.json')
const KEY_RANKS = new Map([
  [678, 23517],
  [624, 36762],
  [660, 28293],
  [474, 65428],
])

function parseCsvLine(line: string) {
  const values: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += char
    }
  }
  values.push(value.trim())
  return values
}

function parseInteger(value: string, field: string, lineNumber: number) {
  const normalized = value.replaceAll(',', '').trim()
  const parsed = Number(normalized)
  if (!Number.isInteger(parsed)) throw new Error(`第 ${lineNumber} 行${field}必须为整数，实际为“${value}”`)
  return parsed
}

function main() {
  const content = readFileSync(SOURCE_PATH, 'utf8').replace(/^\uFEFF/, '').trim()
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) throw new Error('CSV 没有可转换的数据行')

  const headers = parseCsvLine(lines[0])
  const scoreIndex = headers.indexOf('分数')
  const countIndex = headers.indexOf('人数')
  const cumulativeIndex = headers.indexOf('累计人数')
  if ([scoreIndex, countIndex, cumulativeIndex].some(index => index < 0)) {
    throw new Error('CSV 必须包含“分数、人数、累计人数”三列')
  }

  const rows: Row[] = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const lineNumber = index + 2
    const score = parseInteger(values[scoreIndex] ?? '', '分数', lineNumber)
    const count = parseInteger(values[countIndex] ?? '', '人数', lineNumber)
    const cumulative = parseInteger(values[cumulativeIndex] ?? '', '累计人数', lineNumber)
    if (count < 0) throw new Error(`第 ${lineNumber} 行人数不能为负数`)
    if (cumulative <= 0) throw new Error(`第 ${lineNumber} 行累计人数必须为正整数`)
    if (cumulative < count) throw new Error(`第 ${lineNumber} 行累计人数不能小于本分人数`)
    return { score, count, cumulative }
  })

  if (rows.length !== 480 || rows[0]?.score !== 779) {
    throw new Error(`2026 数据应为 779 至 300 分连续 480 档，实际首档 ${rows[0]?.score ?? '缺失'} 分、共 ${rows.length} 档`)
  }

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]
    const row = rows[index]
    if (previous.score - row.score !== 1) throw new Error(`${previous.score} 分与 ${row.score} 分之间不连续`)
    if (row.cumulative < previous.cumulative) throw new Error(`${row.score} 分累计人数未保持单调递增`)
  }

  const last = rows.at(-1)
  if (last?.score !== 300 || last.cumulative !== 88959) {
    throw new Error(`末档必须为 300 分、累计 88959 人，实际为 ${last?.score ?? '缺失'} 分、${last?.cumulative ?? '缺失'} 人`)
  }
  for (const [score, expected] of KEY_RANKS) {
    const actual = rows.find(row => row.score === score)?.cumulative
    if (actual !== expected) throw new Error(`${score} 分累计人数应为 ${expected}，实际为 ${actual ?? '缺失'}`)
  }

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    year: 2026,
    source: '石家庄17县市区一分一档',
    note: '完整连续300-779分，共88959人',
    data: rows,
  }, null, 2)}\n`, 'utf8')
  console.log('2026 一分一档转换完成：480档，参考总人数 88959 人')
}

main()
