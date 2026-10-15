import { PGlite } from '@electric-sql/pglite';
import migration from '../../supabase/migrations/20261013032801_her_universe_publication.sql?raw';
import rateLimitMigration from '../../supabase/migrations/20261013090000_her_universe_rate_limits.sql?raw';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateDocument, publicPublication } from '../../supabase/functions/_shared/herUniverseDomain';
const creator='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const document=()=>validateDocument({version:1,configuration:{generator:'spiral-v1'},galaxy:{version:1,accepted:true,created:true,stage:'ready',colors:['rosa','turquesa']},compatibility:{version:1,introSeen:true,status:'completed',questions:Array.from({length:5},(_,i)=>({id:`q${i}`,text:`Pergunta ${i}`,options:[1,2,3,4].map(weight=>({id:`q${i}-${weight}`,text:`Opção ${weight}`,weight}))}))},couple:{version:1,introSeen:true,status:'completed',questions:Array.from({length:5},(_,i)=>({id:`c${i}`,text:`Pergunta ${i}`,comment:'Comentário privado até confirmar.',options:[1,2,3,4].map(n=>({id:`c${i}-${n}`,text:`Opção ${n}`,correct:n===2||n===4}))}))}});
let db:PGlite;
async function value(sql:string,args:unknown[]=[]){return (await db.query<{value:unknown}>(sql,args)).rows[0]?.value;}
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.request_limits(bucket text primary key,window_start timestamptz not null,requests integer not null);grant select,insert,update on public.request_limits to service_role;
    grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated;
    insert into auth.users values('${creator}'),('${other}');`);
  await db.exec(migration);await db.exec(rateLimitMigration);await db.exec(rateLimitMigration);
  await db.query('insert into public.her_universe_creators(user_id) values($1)',[creator]);
},30000);
afterAll(async()=>{await db?.close();});
describe('real isolated PostgreSQL: universe RLS, publication and grading',()=>{
  it('enables RLS, denies direct visitor reads/writes and RPC execution',async()=>{
    expect(await value("select bool_and(relrowsecurity) as value from pg_class where relname like 'her_universe%' and relkind='r'")).toBe(true);
    for(const role of ['anon','authenticated']){
      expect(await value(`select has_function_privilege('${role}','public.her_save_draft(uuid,integer,jsonb)','EXECUTE') as value`)).toBe(false);
      expect(await value(`select has_function_privilege('${role}','public.her_consume_rate_limit(text,integer,integer)','EXECUTE') as value`)).toBe(false);
      expect(await value(`select has_table_privilege('${role}','public.her_universe_attempts','SELECT') as value`)).toBe(false);
      expect(await value(`select has_table_privilege('${role}','public.her_universes','UPDATE') as value`)).toBe(false);
    }
  });
  it('limits only well-formed per-action buckets and exposes the RPC to the server role',async()=>{
    await db.exec('set role service_role');const bucket=`her:public:${'a'.repeat(64)}`;
    expect(await value('select public.her_consume_rate_limit($1,2,60) as value',[bucket])).toBe(true);
    expect(await value('select public.her_consume_rate_limit($1,2,60) as value',[bucket])).toBe(true);
    expect(await value('select public.her_consume_rate_limit($1,2,60) as value',[bucket])).toBe(false);
    await db.exec('reset role');
    await expect(value("select public.her_consume_rate_limit('her:unknown:'||repeat('a',64),2,60) as value")).rejects.toThrow(/invalid bucket/);
  });
  it('authorizes only a provisioned creator, protects revisions and repeated imports',async()=>{
    await db.exec('set role service_role');
    await expect(value('select public.her_save_draft($1,0,$2) as value',[other,document()])).rejects.toThrow(/Forbidden/);
    const saved=await value('select public.her_save_draft($1,0,$2) as value',[creator,document()]) as {id:string;revision:number};expect(saved.revision).toBe(1);
    const repeated=await value('select public.her_save_draft($1,1,$2) as value',[creator,document()]) as {revision:number};expect(repeated.revision).toBe(1);
    await expect(value('select public.her_save_draft($1,0,$2) as value',[creator,document()])).rejects.toThrow(/Conflict/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated');expect((await db.query('select * from public.her_universes')).rows).toHaveLength(0);await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[creator]);await db.exec('set role authenticated');expect((await db.query('select * from public.her_universes')).rows).toHaveLength(1);await db.exec('reset role');
  });
  it('freezes published versions; draft edits stay private until republication',async()=>{
    await db.exec('set role service_role');const first=await value('select public.her_publish($1,1) as value',[creator]) as {id:string};
    const doc=document();doc.galaxy.colors=['azul'];doc.couple.status='draft';
    await value('select public.her_save_draft($1,1,$2) as value',[creator,doc]);
    const old=await value('select public.her_read_publication() as value') as {id:string;universeId:string;document:unknown};expect(old.id).toBe(first.id);expect(publicPublication(old.id,old.universeId,old.document).galaxy.colors).toEqual(['rosa','turquesa']);
    const second=await value('select public.her_publish($1,2) as value',[creator]) as {id:string};expect(second.id).not.toBe(first.id);
    expect(await value('select count(*)::int as value from public.her_universe_publications')).toBe(2);
    const latest=await value('select public.her_read_publication() as value') as typeof old;const publicData=publicPublication(latest.id,latest.universeId,latest.document);expect(publicData.couple).toBeNull();expect(JSON.stringify(publicData)).not.toMatch(/weight|correct|Comentário/);
    const third=document();await value('select public.her_save_draft($1,2,$2) as value',[creator,third]);await value('select public.her_publish($1,3) as value',[creator]);await db.exec('reset role');
  });
  it('grades one accepted option, hides later answers, rejects skips, and retries idempotently',async()=>{
    await db.exec('set role service_role');const published=await value('select public.her_read_publication() as value') as {id:string};
    const hash='a'.repeat(64);await value('select public.her_start_attempt($1,$2,$3) as value',[published.id,'couple',hash]);
    await expect(value('select public.her_answer($1,4,$2) as value',[hash,'c4-2'])).rejects.toThrow(/Confirm in order/);
    let last: {correct:boolean;result?:number;comment?:string}|undefined;
    for(let i=0;i<5;i++){last=await value('select public.her_answer($1,$2,$3) as value',[hash,i,`c${i}-${i===2?1:i===1?4:2}`]) as typeof last;expect(last?.correct).toBe(i!==2);if(i<4)expect(last?.result).toBeUndefined();}
    expect(last?.result).toBe(80);expect(last?.comment).toBe('Comentário privado até confirmar.');
    expect(await value('select public.her_answer($1,4,$2) as value',[hash,'c4-2'])).toEqual(last);
    await expect(value('select public.her_answer($1,4,$2) as value',[hash,'c4-4'])).rejects.toThrow(/Confirm in order/);
    await db.exec('reset role');
  });
  it('calculates compatibility with server weights and checks invalid/expired attempts',async()=>{
    await db.exec('set role service_role');const pub=await value('select public.her_read_publication() as value') as {id:string};
    for(const weight of [1,4]){
      const hash=String(weight).repeat(64);await value('select public.her_start_attempt($1,$2,$3) as value',[pub.id,'compatibility',hash]);
      await expect(value('select public.her_answer($1,0,$2) as value',[hash,'fake'])).rejects.toThrow(/Unknown option/);
      for(let i=0;i<5;i++){const correction=await value('select public.her_answer($1,$2,$3) as value',[hash,i,`q${i}-${weight}`]);expect(correction).toEqual(i===4?{confirmed:true,result:weight===1?25:100}:{confirmed:true});}
    }
    await db.query("update public.her_universe_attempts set expires_at=now()-interval '1 second'");await expect(value('select public.her_answer($1,0,$2) as value',['a'.repeat(64),'c0-2'])).rejects.toThrow(/Attempt expired/);
    await db.exec('reset role');
  });
  it('blocks a revoked creator without deleting the universe',async()=>{
    await db.query('update public.her_universe_creators set enabled=false where user_id=$1',[creator]);await db.exec('set role service_role');await expect(value('select public.her_publish($1,3) as value',[creator])).rejects.toThrow(/Forbidden/);await db.exec('reset role');expect(await value('select count(*)::int as value from public.her_universes')).toBe(1);
  });
});
