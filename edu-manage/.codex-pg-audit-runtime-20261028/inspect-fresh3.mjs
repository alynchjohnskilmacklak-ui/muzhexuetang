import pg from 'pg';
import fs from 'node:fs';
const conf = fs.readFileSync('.codex-pg-audit-runtime-20261028/start-audit-pg.mjs','utf8');
const password = conf.match(/password:\s*["']([^"']+)["']/)?.[1];
if (!password || !conf.includes('port: 55432')) throw new Error('Audit connection guard failed');
const client = new pg.Client({host:'127.0.0.1',port:55432,user:'audit_runner',password,database:'edu_manage_codex_audit_fresh3_20261028'});
await client.connect();
try { const r=await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name='teacherId' ORDER BY table_name"); for(const row of r.rows) console.log(`${row.table_name}.${row.column_name}`); } finally { await client.end(); }