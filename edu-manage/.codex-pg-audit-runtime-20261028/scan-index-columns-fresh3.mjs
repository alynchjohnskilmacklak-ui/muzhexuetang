import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const conf=fs.readFileSync(path.join(root,'.codex-pg-audit-runtime-20261028','start-audit-pg.mjs'),'utf8');
const password=conf.match(/password:\s*["']([^"']+)["']/)?.[1];
if(!password||!conf.includes('port: 55432'))throw new Error('Audit connection guard failed');
const sql=fs.readFileSync(path.join(root,'prisma','migrations','20260520162000_add_performance_indexes','migration.sql'),'utf8');
const indexes=[...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"\s+ON\s+"([^"]+)"\s*\(([^)]+)\)/g)].map(m=>({name:m[1],table:m[2],cols:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const client=new pg.Client({host:'127.0.0.1',port:55432,user:'audit_runner',password,database:'edu_manage_codex_audit_fresh3_20261028'});
await client.connect();
try{const r=await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'");const have=new Map();for(const x of r.rows){if(!have.has(x.table_name))have.set(x.table_name,new Set());have.get(x.table_name).add(x.column_name)};const missing=indexes.flatMap(i=>{const miss=i.cols.filter(c=>!have.get(i.table)?.has(c));return miss.length?[`${i.name}: ${i.table}.${miss.join(',')}`]:[]});console.log(`indexes=${indexes.length} missingIndexes=${missing.length}`);console.log(missing.join('\n'))}finally{await client.end()}