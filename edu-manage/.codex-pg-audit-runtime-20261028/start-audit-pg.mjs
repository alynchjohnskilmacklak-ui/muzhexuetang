import EmbeddedPostgres from 'embedded-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.dirname(fileURLToPath(import.meta.url))
const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, 'pgdata-c'),
  user: 'audit_runner',
  password: 'codex_audit_local_20261028',
  port: 55432,
  persistent: true,
  authMethod: 'scram-sha-256',
  initdbFlags: ['--locale=C', '--encoding=UTF8'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
})
let stopping = false
process.on('SIGINT', async () => {
  if (stopping) return
  stopping = true
  try { await pg.stop(); console.log('AUDIT_POSTGRES_STOPPED') }
  finally { process.exit(0) }
})
await pg.initialise()
await pg.start()
await pg.createDatabase('edu_manage_codex_audit_fresh_20261028')
console.log('AUDIT_POSTGRES_READY 127.0.0.1:55432/edu_manage_codex_audit_fresh_20261028')
process.stdin.resume()
