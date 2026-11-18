/**
 * Mechanical transcription of the user's outline, not a factual verification or
 * publication of knowledge points. Run:
 *   node scripts/import-junior-textbook-outline.mjs "D:/Downloads/....md" --audit
 *   node scripts/import-junior-textbook-outline.mjs "D:/Downloads/....md" --write
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const sourcePath = process.argv[2]
const mode = process.argv[3] || '--audit'
if (!sourcePath || !['--audit', '--write'].includes(mode)) {
  console.error('Usage: node scripts/import-junior-textbook-outline.mjs <source.md> --audit|--write')
  process.exit(2)
}

const source = fs.readFileSync(sourcePath, 'utf8')
const lines = source.split(/\r?\n/)
const subjects = new Set(['语文', '数学', '英语', '物理', '化学', '道德与法治', '历史', '生物', '地理'])
const nextSpringSubjects = new Set(['语文', '数学', '英语', '道德与法治', '历史'])
const volumes = []
const unknown = []
let subject = ''
let volume = null
let inDirectory = false
let parents = []

const clean = (value) => value
  .replace(/\\([.!_+*])/g, '$1')
  .replace(/\*\*/g, '')
  .trim()

for (let index = 0; index < lines.length; index += 1) {
  const raw = lines[index]
  const subjectMatch = raw.match(/^## (语文|数学|英语|物理|化学|道德与法治|历史|生物|地理)课本目录/)
  if (subjectMatch) {
    subject = subjectMatch[1]
    volume = null
    inDirectory = false
    continue
  }
  const volumeMatch = raw.match(/^#### ((?:七|八|九)年级(?:上|下)册|九年级全一册)(.*)$/)
  if (volumeMatch && subjects.has(subject)) {
    volume = {
      subject, title: volumeMatch[1], heading: clean(raw.slice(5)),
      sourceHeadingLine: index + 1, directoryHeadingLine: null, entries: [], directoryNotes: [],
      sourceStatus: volumeMatch[1] === '九年级下册' && nextSpringSubjects.has(subject)
        ? 'NOT_YET_IN_USE_OR_OLD_EDITION'
        : /待核实|现行旧|2027春/.test(raw) ? 'NEEDS_CURRENT_EDITION_CHECK' : 'USER_SUPPLIED_UNVERIFIED',
    }
    volumes.push(volume)
    parents = []
    inDirectory = false
    continue
  }
  if (!volume) continue
  if (/^\*\*(?:完整)?目录/.test(raw)) {
    volume.directoryHeadingLine = index + 1
    if (/待核实|现行旧|据备课/.test(raw) && volume.sourceStatus === 'USER_SUPPLIED_UNVERIFIED') volume.sourceStatus = 'NEEDS_CURRENT_EDITION_CHECK'
    inDirectory = true
    parents = []
    continue
  }
  if (!inDirectory) continue
  if (/^(?:---|#{2,4} |\*\*(?:来源|注意|待核实))/.test(raw) || /^\s*-\s*\*\*(?:目录来源|版本来源|来源|待核实)/.test(raw)) {
    inDirectory = false
    continue
  }
  if (!raw.trim()) continue
  if (/^>/.test(raw)) {
    if (raw.replace(/^>\s*/, '').trim()) volume.directoryNotes.push({ sourceLine: index + 1, text: clean(raw.replace(/^>\s*/, '')) })
    continue
  }
  const bullet = raw.match(/^(\s*)-\s+(.+)$/)
  if (!bullet) {
    unknown.push({ subject, volume: volume.title, line: index + 1, raw })
    continue
  }
  const depth = Math.floor(bullet[1].length / 4)
  const title = clean(bullet[2])
  if (!title) {
    unknown.push({ subject, volume: volume.title, line: index + 1, raw })
    continue
  }
  parents = parents.slice(0, depth)
  const parentTitles = parents.map((entry) => entry.title)
  const entry = {
    id: `${volume.subject}-${volume.title}-${index + 1}`,
    title, depth, path: [...parentTitles, title], sourceLine: index + 1,
    sourceText: raw.trim(), knowledgePoints: [], knowledgeStatus: 'PENDING_REVIEW',
  }
  volume.entries.push(entry)
  parents[depth] = entry
}

const counts = Object.fromEntries([...subjects].map((name) => [name, {
  volumes: volumes.filter((volume) => volume.subject === name).length,
  entries: volumes.filter((volume) => volume.subject === name).reduce((sum, volume) => sum + volume.entries.length, 0),
}]))
const missingMarkers = volumes.filter((volume) => !volume.directoryHeadingLine || volume.entries.length === 0)
console.log(JSON.stringify({ sourceLines: lines.length, volumes: volumes.length, entries: volumes.reduce((sum, volume) => sum + volume.entries.length, 0), directoryNotes: volumes.reduce((sum, volume) => sum + volume.directoryNotes.length, 0), counts, missingMarkers: missingMarkers.map((volume) => `${volume.subject}/${volume.title}`), unknown: unknown.slice(0, 20), unknownCount: unknown.length }, null, 2))

if (mode === '--write') {
  if (missingMarkers.length || unknown.length || volumes.length !== 43) {
    console.error('Refusing to write: outline transcription is incomplete.')
    process.exit(1)
  }
  const output = path.resolve('data/textbooks/user-supplied-junior-outline-2026.json')
  const payload = {
    schema: 'user-supplied-junior-outline-v1',
    warning: 'User supplied, not independently verified. No entry has approved knowledge points; never publish this file directly to students.',
    sourceFileName: path.basename(sourcePath),
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    sourceLineCount: lines.length,
    subjectCounts: counts,
    volumes,
  }
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${output}`)
}
