import { PGlite } from '@electric-sql/pglite';
import original from '../../supabase/migrations/20261011122438_private_admin_and_submissions.sql?raw';
import universe from '../../supabase/migrations/20261013032801_her_universe_publication.sql?raw';
import dual from '../../supabase/migrations/20261014003040_dual_admin_access.sql?raw';
import { afterAll,beforeAll,expect,it } from 'vitest';
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;grant usage on schema public,auth to anon,authenticated,service_role;`);
  for(const migration of [original,universe,dual])await db.exec(migration);await db.exec(dual);
},30000);
afterAll(async()=>{await db?.close();});
it('runs idempotently and keeps both reporting RPCs inaccessible to public clients',async()=>{
  const result=await db.query<{allowed:boolean}>("select has_function_privilege('anon','public.her_admin_records(text,integer)','execute') or has_function_privilege('authenticated','public.her_admin_overview()','execute') as allowed");expect(result.rows[0].allowed).toBe(false);
});
it('reports actual immutable selected alternatives and 3/4 = 75 without exposing attempt capabilities',async()=>{
  const owner=crypto.randomUUID(),universe=crypto.randomUUID(),publication=crypto.randomUUID();
  await db.query('insert into auth.users(id) values($1)',[owner]);await db.query('insert into her_universe_creators(user_id) values($1)',[owner]);await db.query('insert into her_universes(id,owner_id,document) values($1,$2,$3)',[universe,owner,{}]);
  const questions=Array.from({length:4},(_,i)=>({id:`q${i}`,text:`Pergunta ${i}`,options:['a','b','c','d'].map(letter=>({id:`q${i}-${letter}`,text:letter,correct:letter==='c'}))}));
  await db.query('insert into her_universe_publications(id,universe_id,revision,document) values($1,$2,1,$3)',[publication,universe,{couple:{questions},compatibility:{questions}}]);
  const answers=questions.map((_,i)=>({option:`q${i}-${i===0?'a':'c'}`,points:i===0?0:1,response:i===3?{result:75}:{correct:i!==0}}));
  await db.query('insert into her_universe_attempts(token_hash,publication_id,kind,next_index,answers) values($1,$2,$3,4,$4)',['a'.repeat(64),publication,'couple',answers]);
  await db.exec('set role service_role');const result=await db.query<{score:number;total:number;result:number;answers:string[];questions:unknown[]}>('select * from her_admin_records($1,0)',['couple']);
  expect(result.rows).toHaveLength(1);expect(result.rows[0]).toMatchObject({score:3,total:4,result:75,answers:['q0-a','q1-c','q2-c','q3-c']});expect(result.rows[0].questions).toEqual(questions);expect(JSON.stringify(result.rows)).not.toContain('token_hash');expect((await db.query<{overview:unknown}>('select her_admin_overview() as overview')).rows[0].overview).toEqual({quizzes:1,wishes:0,proposals:0});await db.exec('reset role');
});
