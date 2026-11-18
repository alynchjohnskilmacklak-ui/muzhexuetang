import outline from '../data/textbooks/user-supplied-junior-outline-2026.json'
import { PARENT_PRACTICE_SETS } from '../src/data/parent-practice-bank'

const gradeMap: Record<string, string> = { 初一: '七年级', 初二: '八年级', 初三: '九年级' }
const problems: string[] = []
const seenIds = new Set<string>()
let matched = 0

for (const set of PARENT_PRACTICE_SETS) {
  if (seenIds.has(set.id)) problems.push(`${set.id}: duplicate set ID`)
  seenIds.add(set.id)
  const volume = outline.volumes.find((candidate) =>
    candidate.subject === set.subject && candidate.title === `${gradeMap[set.grade] || set.grade}${set.volume}`)
  if (!volume) {
    problems.push(`${set.id}: no matching volume for ${set.subject}/${set.grade}/${set.volume}`)
    continue
  }
  const section = volume.entries.find((entry) => entry.title === set.section)
  if (!section) {
    problems.push(`${set.id}: section not in supplied outline: ${set.section}`)
    continue
  }
  if (!section.path.includes(set.chapter)) problems.push(`${set.id}: chapter mismatch: ${set.chapter} vs ${section.path.join(' / ')}`)
  else matched += 1
  if (set.catalogEvidence?.kind === 'local_pdf_sha256' && set.catalogEvidence.ref && !/^[a-f0-9]{64}$/.test(set.catalogEvidence.ref)) {
    problems.push(`${set.id}: source ref is not a SHA-256: ${set.catalogEvidence.ref}`)
  }
  const pointIds = new Set(set.knowledgePoints.map((point) => point.id))
  for (const question of set.questions) if (!pointIds.has(question.knowledgePointId)) {
    problems.push(`${set.id}/${question.id}: knowledge point not found: ${question.knowledgePointId}`)
  }
}

console.log(JSON.stringify({ totalSets: PARENT_PRACTICE_SETS.length, exactOutlineMatches: matched, problemCount: problems.length, problems: problems.slice(0, 100) }, null, 2))
if (problems.length) process.exitCode = 1
