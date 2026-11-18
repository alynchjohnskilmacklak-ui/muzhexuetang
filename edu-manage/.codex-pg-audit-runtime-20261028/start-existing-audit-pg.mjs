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
  onLog: message => process.stdout.write(message),
})
let stopping = false
process.on('SIGINT', async () => {
  if (stopping) return
  stopping = true
  try { await pg.stop(); console.log('AUDIT_POSTGRES_STOPPED') }
  finally { process.exit(0) }
})

await pg.start()
console.log('AUDIT_POSTGRES_READY_EXISTING 127.0.0.1:55432')
process.stdin.resume()



