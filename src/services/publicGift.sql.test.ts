import {blankHole} from '../experiences/herUniverse/elements/repository';
import {PGlite} from '@electric-sql/pglite';
import dual from '../../supabase/migrations/20261014003040_dual_admin_access.sql?raw';
import base from '../../supabase/migrations/20261013032801_her_universe_publication.sql?raw';
import gift from '../../supabase/migrations/20261014111421_public_gift_publication.sql?raw';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {readyDocument} from '../../tests/helpers/herUniverseMock';
let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;`);
 await db.exec(base);await db.exec('create table public.admin_sessions(token_hash text primary key)');await db.exec(dual);await db.exec(gift);await db.exec(gift);
},30000);
afterAll(async()=>{await db?.close();});
it('keeps RLS and denies public table writes and direct publication RPC execution',async()=>{
 for(const role of ['anon','authenticated']){
  expect((await db.query<{ok:boolean}>(`select has_function_privilege('${role}','public.her_publish_gift(integer,jsonb)','EXECUTE') as ok`)).rows[0].ok).toBe(false);
  expect((await db.query<{ok:boolean}>(`select has_table_privilege('${role}','public.her_universes','UPDATE') as ok`)).rows[0].ok).toBe(false);
 }
 expect((await db.query<{ok:boolean}>("select bool_and(relrowsecurity) as ok from pg_class where relname like 'her_universe%' and relkind='r'")).rows[0].ok).toBe(true);
});
it('atomically publishes and republishes without accounts; retries retain history and stale edits fail',async()=>{
 await db.exec('set role service_role');const doc=readyDocument();const first=(await db.query<{p:{id:string,revision:number}}>('select public.her_publish_gift(0,$1) as p',[doc])).rows[0].p;
 expect((await db.query<{p:unknown}>('select public.her_publish_gift(0,$1) as p',[doc])).rows[0].p).toEqual(first);
 doc.galaxy.colors=['azul'];await expect(db.query('select public.her_publish_gift(0,$1)',[doc])).rejects.toThrow(/Conflict/);const second=(await db.query<{p:{id:string,revision:number}}>('select public.her_publish_gift(1,$1) as p',[doc])).rows[0].p;expect(second.revision).toBe(2);expect(second.id).not.toBe(first.id);
 await db.exec('reset role');expect((await db.query<{n:number}>('select count(*)::int as n from auth.users')).rows[0].n).toBe(0);expect((await db.query<{n:number}>('select count(*)::int as n from her_universe_creators')).rows[0].n).toBe(0);expect((await db.query<{n:number}>('select count(*)::int as n from her_universe_publications')).rows[0].n).toBe(2);
});
it('grades both published quizzes and delivers actual selected answers to her admin',async()=>{
 await db.exec('set role service_role');const pub=(await db.query<{p:{id:string}}>('select public.her_read_publication() as p')).rows[0].p;
 for(const kind of ['couple','compatibility']){
  const hash=(kind==='couple'?'a':'b').repeat(64);await db.query('select public.her_start_attempt($1,$2,$3)',[pub.id,kind,hash]);
  for(let index=0;index<5;index++)await db.query('select public.her_answer($1,$2,$3)',[hash,index,`${kind==='couple'?'c':'q'}${index}-${kind==='couple'&&index===0?1:4}`]);
  const records=(await db.query<{result:number;score:number;answers:string[]}>('select * from public.her_admin_records($1,0)',[kind])).rows;expect(records).toHaveLength(1);expect(records[0].result).toBe(kind==='couple'?80:100);expect(records[0].score).toBe(kind==='couple'?4:20);expect(records[0].answers).toHaveLength(5);
 }
 await db.exec('reset role');
});

it('does not take over a legacy authorized creator universe',async()=>{
 await db.exec('begin');try{
  const owner=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[owner]);await db.query('insert into her_universe_creators(user_id) values($1)',[owner]);await db.query('update her_universes set owner_id=$1',[owner]);await db.exec('set local role service_role');await expect(db.query('select public.her_publish_gift(2,$1)',[readyDocument()])).rejects.toThrow(/Legacy universe protected/);
 }finally{await db.exec('rollback');}
});

it('stores letters in the published JSON document with positions unchanged in isolated PostgreSQL',async()=>{
 await db.exec('begin');try{
  await db.exec('set local role service_role');
  const doc={...readyDocument(),letters:[{id:'her-letter-sql',title:'Uma cartinha',paragraphs:['Mensagem preservada.'],position:[4.5,0,-1]}],blackHoles:[blankHole([6,0,-2]),blankHole([-6,0,-2])]};
  await db.query('select public.her_publish_gift(2,$1)',[doc]);
  const stored=(await db.query<{p:{document:typeof doc}}>('select public.her_read_publication() as p')).rows[0].p.document;
  expect(stored.letters).toEqual(doc.letters);expect(stored.blackHoles).toEqual(doc.blackHoles);expect(stored.compatibility).toEqual(doc.compatibility);expect(stored.couple).toEqual(doc.couple);
 }finally{await db.exec('rollback');}
});


it('edits and deletes only selected elements while preserving quizzes and published history in isolated PostgreSQL',async()=>{
 await db.exec('begin');try{
  await db.exec('set local role service_role');
  const doc={...readyDocument(),letters:[1,2].map(i=>({id:`her-letter-lifecycle-${i}`,title:`Carta ${i}`,paragraphs:[`Mensagem ${i}`],position:[i*5,0,-1]})),blackHoles:[blankHole([7,0,-2]),blankHole([-7,0,-2])]};
  for(const [index,hole] of doc.blackHoles.entries()){hole.crystals.forEach((c,i)=>{c.title=`Nota ${index}-${i}`;c.text=`Mensagem ${index}-${i}`;});hole.starLetter={title:`Estrela ${index}`,paragraphs:[`Carta ${index}`]};}
  const initial=structuredClone(doc);
  const first=(await db.query<{p:{id:string;revision:number}}>('select public.her_publish_gift(2,$1) as p',[doc])).rows[0].p;
  doc.letters[0].title='Carta revisada';doc.blackHoles[0].crystals[0].text='Nota revisada';doc.blackHoles[0].starLetter=null;
  const edited=(await db.query<{p:{revision:number}}>('select public.her_publish_gift($1,$2) as p',[first.revision,doc])).rows[0].p;
  doc.letters.splice(0,1);doc.blackHoles.splice(0,1);
  await db.query('select public.her_publish_gift($1,$2)',[edited.revision,doc]);
  const visible=(await db.query<{p:{document:typeof doc}}>('select public.her_read_publication() as p')).rows[0].p.document;
  expect(visible.letters).toEqual([initial.letters[1]]);expect(visible.blackHoles).toEqual([initial.blackHoles[1]]);expect(visible.compatibility).toEqual(initial.compatibility);expect(visible.couple).toEqual(initial.couple);
  const archived=(await db.query<{document:typeof doc}>('select document from public.her_universe_publications where id=$1',[first.id])).rows[0].document;expect(archived).toEqual(initial);
 }finally{await db.exec('rollback');}
});
