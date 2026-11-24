import starterUnit1 from './grade7a-starter-unit1.json'
import starterUnit2 from './grade7a-starter-unit2.json'
import starterUnit3 from './grade7a-starter-unit3.json'
import unit1 from './grade7a-unit1.json'
import unit2 from './grade7a-unit2.json'
import unit3 from './grade7a-unit3.json'
import unit4 from './grade7a-unit4.json'
import unit5 from './grade7a-unit5.json'
import unit6 from './grade7a-unit6.json'
import unit7 from './grade7a-unit7.json'
import referenceCardinal from './grade7a-reference-cardinal.json'
import referenceWeekdays from './grade7a-reference-weekdays.json'
import referenceOrdinal from './grade7a-reference-ordinal.json'
import referenceMonths from './grade7a-reference-months.json'
import grade7bUnit1 from './grade7b-unit1.json'
import grade7bUnit2 from './grade7b-unit2.json'
import grade7bUnit3 from './grade7b-unit3.json'
import grade7bUnit4 from './grade7b-unit4.json'
import grade7bUnit5 from './grade7b-unit5.json'
import grade7bUnit6 from './grade7b-unit6.json'
import grade7bUnit7 from './grade7b-unit7.json'
import grade7bUnit8 from './grade7b-unit8.json'
import grade8aUnit1 from './grade8a-unit1.json'
import grade8aUnit2 from './grade8a-unit2.json'
import grade8aUnit3 from './grade8a-unit3.json'
import grade8aUnit4 from './grade8a-unit4.json'
import grade8aUnit5 from './grade8a-unit5.json'
import grade8aUnit6 from './grade8a-unit6.json'
import grade8aUnit7 from './grade8a-unit7.json'
import grade8aUnit8 from './grade8a-unit8.json'
import grade8bUnit1 from './grade8b-unit1.json'
import grade8bUnit2 from './grade8b-unit2.json'
import grade8bUnit3 from './grade8b-unit3.json'
import grade8bUnit4 from './grade8b-unit4.json'
import grade8bUnit5 from './grade8b-unit5.json'
import grade8bUnit6 from './grade8b-unit6.json'
import grade8bUnit7 from './grade8b-unit7.json'
import grade8bUnit8 from './grade8b-unit8.json'
import grade9aUnit1 from './grade9a-unit1.json'
import grade9aUnit2 from './grade9a-unit2.json'
import grade9aUnit3 from './grade9a-unit3.json'
import grade9aUnit4 from './grade9a-unit4.json'
import grade9aUnit5 from './grade9a-unit5.json'
import grade9aUnit6 from './grade9a-unit6.json'
import grade9aUnit7 from './grade9a-unit7.json'
import grade9aUnit8 from './grade9a-unit8.json'
import grade9bUnit1 from './grade9b-unit1.json'
import grade9bUnit2 from './grade9b-unit2.json'
import grade9bUnit3 from './grade9b-unit3.json'
import grade9bUnit4 from './grade9b-unit4.json'
import grade9bUnit5 from './grade9b-unit5.json'
import type { VocabEntry } from '@/data/vocab-sets'
import type { VocabExpansion } from '@/lib/vocab-bank'

type ExpansionRecord = VocabExpansion & { word: string }
type ExpansionSource = { grade: string; volume: string; unit: string; entries: ExpansionRecord[] }

const sources: ExpansionSource[] = [
  {
    grade: '初一',
    volume: '上册',
    unit: 'Starter Unit 1 Hello!',
    entries: starterUnit1 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Starter Unit 2 Keep Tidy!',
    entries: starterUnit2 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Starter Unit 3 Welcome!',
    entries: starterUnit3 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 1 You and Me',
    entries: unit1 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: "Unit 2 We're Family!",
    entries: unit2 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 3 My School',
    entries: unit3 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 4 My Favourite Subject',
    entries: unit4 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 5 Fun Clubs',
    entries: unit5 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 6 A Day in the Life',
    entries: unit6 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: 'Unit 7 Happy Birthday!',
    entries: unit7 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: '参考词表·基数词',
    entries: referenceCardinal as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: '参考词表·星期',
    entries: referenceWeekdays as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: '参考词表·序数词',
    entries: referenceOrdinal as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '上册',
    unit: '参考词表·月份',
    entries: referenceMonths as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 1',
    entries: grade7bUnit1 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 2',
    entries: grade7bUnit2 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 3',
    entries: grade7bUnit3 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 4',
    entries: grade7bUnit4 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 5',
    entries: grade7bUnit5 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 6',
    entries: grade7bUnit6 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 7',
    entries: grade7bUnit7 as ExpansionRecord[],
  },
  {
    grade: '初一',
    volume: '下册',
    unit: 'Unit 8',
    entries: grade7bUnit8 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 1',
    entries: grade8aUnit1 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 2',
    entries: grade8aUnit2 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 3',
    entries: grade8aUnit3 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 4',
    entries: grade8aUnit4 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 5',
    entries: grade8aUnit5 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 6',
    entries: grade8aUnit6 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 7',
    entries: grade8aUnit7 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '上册',
    unit: 'Unit 8',
    entries: grade8aUnit8 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 1',
    entries: grade8bUnit1 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 2',
    entries: grade8bUnit2 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 3',
    entries: grade8bUnit3 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 4',
    entries: grade8bUnit4 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 5',
    entries: grade8bUnit5 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 6',
    entries: grade8bUnit6 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 7',
    entries: grade8bUnit7 as ExpansionRecord[],
  },
  {
    grade: '初二',
    volume: '下册',
    unit: 'Unit 8',
    entries: grade8bUnit8 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 1',
    entries: grade9aUnit1 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 2',
    entries: grade9aUnit2 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 3',
    entries: grade9aUnit3 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 4',
    entries: grade9aUnit4 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 5',
    entries: grade9aUnit5 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 6',
    entries: grade9aUnit6 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 7',
    entries: grade9aUnit7 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '上册',
    unit: 'Unit 8',
    entries: grade9aUnit8 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '下册',
    unit: 'Unit 1',
    entries: grade9bUnit1 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '下册',
    unit: 'Unit 2',
    entries: grade9bUnit2 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '下册',
    unit: 'Unit 3',
    entries: grade9bUnit3 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '下册',
    unit: 'Unit 4',
    entries: grade9bUnit4 as ExpansionRecord[],
  },
  {
    grade: '初三',
    volume: '下册',
    unit: 'Unit 5',
    entries: grade9bUnit5 as ExpansionRecord[],
  },
]

const expansionByScope = new Map(
  sources.map((source) => [
    `${source.grade}\u001f${source.volume}\u001f${source.unit}`,
    new Map(source.entries.map((entry) => [entry.word.trim().toLocaleLowerCase(), entry])),
  ]),
)

/** 按年级、册次、单元和词头返回教研拓展，未配置拓展的词保持原流程。 */
export function getVocabExpansion(entry: Pick<VocabEntry, 'grade' | 'volume' | 'unit' | 'headword'>) {
  const scopeKey = `${entry.grade}\u001f${entry.volume}\u001f${entry.unit}`
  return expansionByScope.get(scopeKey)?.get(entry.headword.trim().toLocaleLowerCase())
}
