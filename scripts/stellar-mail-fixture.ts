import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {makeStellarMailHandler} from '../supabase/functions/_shared/stellarMailHandler.ts';
import {HttpError} from '../supabase/functions/_shared/security.ts';
import type {Database} from '../supabase/functions/_shared/handler.ts';
export async function createMailFixture(dataDir?:string,origins=['http://localhost:5186']){
 const db=new PGlite(dataDir);await db.exec(`do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;create role authenticated;create role service_role bypassrls;end if;end$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261016112535_stellar_mail.sql',import.meta.url),'utf8'));
 await db.exec('create table if not exists public.request_limits(bucket text primary key,window_start timestamptz not null,requests integer not null)');
 await db.exec(await readFile(new URL('../supabase/migrations/20261016112835_stellar_mail_rate_limit.sql',import.meta.url),'utf8'));
 const database:Database=async(_method,path,input)=>{
  const body=input as Record<string,unknown>;
  if(path==='rpc/stellar_mail_rate_limit')return (await db.query<{ok:boolean}>('select public.stellar_mail_rate_limit($1,$2,$3) ok',[body.bucket_name,body.max_requests,body.window_seconds])).rows[0].ok;
  if(path==='rpc/stellar_mail')try{return (await db.query<{result:unknown}>('select public.stellar_mail($1,$2,$3) result',[body.p_actor,body.p_action,body.p_payload])).rows[0].result;}catch(e){const code=(e as {code?:string}).code;throw new HttpError(code==='40001'?409:code==='42501'?403:400,code==='40001'?'A carta mudou. Atualize antes de salvar novamente.':'Operação indisponível.');}
  throw Error('Unexpected fixture route');
 };
 return {db,origins,handler:makeStellarMailHandler({db:database,origins})};
}
