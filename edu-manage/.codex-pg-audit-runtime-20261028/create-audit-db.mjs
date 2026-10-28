import pg from 'pg'
const name = 'edu_manage_codex_audit_fresh2_20261028'
const client = new pg.Client({ host: '127.0.0.1', port: 55432, user: 'audit_runner', password: 'codex_audit_local_20261028', database: 'postgres' })
try {
  await client.connect()
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
  if (existing.rowCount) throw new Error('The requested audit database already exists; refusing to overwrite it')
  await client.query(`CREATE DATABASE "${name}"`)
  console.log(`AUDIT_DATABASE_CREATED ${name} on 127.0.0.1:55432`)
} finally { await client.end() }
