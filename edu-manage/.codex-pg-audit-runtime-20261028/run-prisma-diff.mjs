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
const pg = new EmbeddedPostgres({ databaseDir: path.join(runtime, 'pgdata-c'), user: 'audit_runner', password, port: 55433, persistent: true, authMethod: 'scram-sha-256', postgresFlags: ['-h', '127.0.0.1'], onLog: message => process.stdout.write(message) })
let result
await pg.start()
const net = await import('node:net')
await new Promise(resolve => {
  const socket = net.createConnection({ host: '127.0.0.1', port: 55433 })
  const timer = setTimeout(() => { console.log('AUDIT_TCP_TIMEOUT'); socket.destroy(); resolve() }, 3000)
  socket.once('connect', () => { clearTimeout(timer); console.log('AUDIT_TCP_CONNECT_OK'); socket.destroy(); resolve() })
  socket.once('error', error => { clearTimeout(timer); console.log(`AUDIT_TCP_CONNECT_ERROR ${error.code}`); resolve() })
})
try {
  result = spawnSync(process.execPath, [path.join(repo, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-url', url, '--to-schema-datamodel', path.join(repo, 'prisma/schema.prisma'), '--exit-code'], { cwd: repo, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  await pg.stop()
  console.log('AUDIT_POSTGRES_STOPPED')
}

