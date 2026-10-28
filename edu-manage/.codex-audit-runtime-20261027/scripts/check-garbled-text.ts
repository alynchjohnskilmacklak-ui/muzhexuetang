/**
 * 扫描源码中的乱码（连续 3 个以上问号）。
 * 用法：npx tsx scripts/check-garbled-text.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const GARBLED_RE = /\?{3,}/
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.prisma', '.json'])
const DIRS = ['src', 'prisma', 'scripts']

let found = 0

function walk(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      walk(full)
    } else if (st.isFile() && SOURCE_EXTS.has(extname(entry))) {
      const content = readFileSync(full, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        if (GARBLED_RE.test(line)) {
          console.log(`${full}:${idx + 1}: ${line.trim()}`)
          found++
        }
      })
    }
  }
}

for (const d of DIRS) walk(d)

if (found > 0) {
  console.log(`\nFOUND ${found} garbled text occurrences. Fix before committing.`)
  process.exit(1)
} else {
  console.log('No garbled text found. All clean.')
}
