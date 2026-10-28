import EmbeddedPostgres from 'embedded-postgres'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const runtime = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(runtime, '..')
const setup = fs.readFileSync(path.join(runtime, 'start-audit-pg.mjs'), 'utf8')
const password = setup.match(/password:\s*'([^']+)'/)?.[1]
if (!password) throw new Error('Missing local audit database credential')
const db = 'edu_manage_codex_audit_fresh7_20261028'
const url = `postgresql://audit_runner:${password}@127.0.0.1:55433/${db}?schema=public`
const pg = new EmbeddedPostgres({ databaseDir: path.join(runtime, 'pgdata-c'), user: 'audit_runner', password, port: 55433, persistent: true, authMethod: 'scram-sha-256', postgresFlags: ['-h', '127.0.0.1'], onLog: () => {} })
let result
await pg.start()
try {
  result = spawnSync(process.execPath, [path.join(runtime, 'seed-mobile-fixture.mjs')], { cwd: repo, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  await pg.stop()
  console.log('AUDIT_POSTGRES_STOPPED')
}
