const fs = require('fs')
const s = fs.readFileSync('src/lib/classroom-feedback/subject-knowledge-points.ts', 'utf8')
const start = s.indexOf('export const GRADE_SUBJECT_KNOWLEDGE_POINTS')
const head = s.slice(start, start + 40)
console.log('HEAD:', head)
// 找对象起始大括号
const braceIdx = s.indexOf('{', start)
let depth = 0, end = -1
for (let i = braceIdx; i < s.length; i++) {
  if (s[i] === '{') depth++
  else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break } }
}
const objText = s.slice(braceIdx, end + 1)
const obj = eval('(' + objText + ')')
for (const g of Object.keys(obj)) {
  const subs = Object.keys(obj[g])
  console.log(g + ': ' + subs.join(', '))
  for (const sub of subs) {
    console.log('   ' + sub + ': ' + obj[g][sub].length + ' 个知识点')
  }
}
