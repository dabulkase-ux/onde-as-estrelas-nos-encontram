// PostgreSQL WASM isolado. Não conecta ao Supabase nem grava banco em disco.
// Passe o caminho do pacote @electric-sql/pglite instalado temporariamente.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
const moduleUrl = process.argv[2] ? pathToFileURL(resolve(process.argv[2], 'dist/index.js')).href : '@electric-sql/pglite';
const { PGlite } = await import(moduleUrl);
const db = new PGlite();
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for (const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(resolve('supabase/migrations',file),'utf8'));
 }
 const names=['quiz_attempts','romantic_responses','wishes','admin_sessions','request_limits'];
 const {rows:rls}=await db.query("select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'");
 for(const name of names) assert.equal(rls.find(r=>r.relname===name)?.relrowsecurity,true);
 for(const role of ['anon','authenticated']) for(const table of names) {
  const {rows}=await db.query('select has_table_privilege($1,$2,\'SELECT\') as allowed',[role,`public.${table}`]);
  assert.equal(rows[0].allowed,false);
 }
 await db.exec('set role anon');
 await assert.rejects(()=>db.query('select * from public.quiz_attempts'),e=>e.code==='42501');
 await assert.rejects(()=>db.query('select public.admin_overview()'),e=>e.code==='42501');
 await assert.rejects(()=>db.query("select public.consume_rate_limit('admin-login',5,300)"),e=>e.code==='42501');
 await db.exec('reset role; set role service_role');
 const empty=await db.query('select public.admin_overview() as totals');
 assert.deepEqual(empty.rows[0].totals,{quizzes:0,wishes:0,proposals:0});
 await db.query("insert into public.wishes (submission_id,text,consent_version) values (gen_random_uuid(),'Teste isolado',1)");
 for(let i=0;i<7;i++) {const {rows}=await db.query("select public.consume_rate_limit('admin-login',5,300) as allowed");assert.equal(rows[0].allowed,i<5);}
 await db.exec('reset role');
 // Defesa RLS mesmo que SELECT seja concedido acidentalmente no futuro.
 await db.exec('grant select on public.wishes to anon; set role anon');
 assert.equal((await db.query('select * from public.wishes')).rows.length,0);
 await db.exec('reset role');
 console.log('OK: migration executada; 5 tabelas com RLS; roles públicas sem leitura; RPCs privadas; RLS filtra mesmo com GRANT; limite real 5/300s.');
} finally {await db.close();}
