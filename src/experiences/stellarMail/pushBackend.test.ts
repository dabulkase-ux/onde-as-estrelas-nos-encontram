import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createMailFixture} from '../../../scripts/stellar-mail-fixture';
import {dispatchLetterPush,makeStellarPushHandler,pushDestination,validSubscription,type DeviceState,type PushDelivery} from '../../../supabase/functions/_shared/stellarPushHandler';
import {HttpError} from '../../../supabase/functions/_shared/security';
import type {Database} from '../../../supabase/functions/_shared/handler';
let fixture:Awaited<ReturnType<typeof createMailFixture>>;
let handler:ReturnType<typeof makeStellarPushHandler>;
const ids=[crypto.randomUUID(),crypto.randomUUID()],secret='ab'.repeat(32);
const subscription=(n=1)=>({endpoint:`https://fcm.googleapis.com/fcm/send/isolated-${n}`,keys:{p256dh:btoa('a'.repeat(65)),auth:btoa('b'.repeat(16))}});
const database:Database=async(method,path,payload)=>{
 const b=payload as Record<string,unknown>;
 try{
  if(path==='rpc/stellar_push_limit')return (await fixture.db.query<{v:boolean}>('select public.stellar_push_limit($1,$2,$3) v',[b.p_bucket,b.p_max,b.p_seconds])).rows[0].v;
  if(path==='rpc/stellar_push_device')return (await fixture.db.query<{v:unknown}>('select public.stellar_push_device($1,$2,$3,$4,$5,$6,$7) v',[b.p_id,b.p_hash,b.p_action,b.p_identity,b.p_expected,b.p_subscription,b.p_replace])).rows[0].v;
  if(path==='rpc/stellar_push_claim')return (await fixture.db.query<{v:unknown}>('select public.stellar_push_claim($1) v',[b.p_letter])).rows[0].v;
  const params=new URLSearchParams(path.split('?')[1]);const val=(k:string)=>params.get(k)?.replace('eq.','');
  if(path.startsWith('stellar_push_devices?')&&method==='GET')return (await fixture.db.query('select id from stellar_push_devices where id=$1 and generation=$2 and identity=$3 and enabled',[val('id'),val('generation'),val('identity')])).rows;
  if(path.startsWith('stellar_push_devices?')&&method==='PATCH'){await fixture.db.query('update stellar_push_devices set enabled=false,identity=null,endpoint=null,subscription=null,generation=$3 where id=$1 and generation=$2',[val('id'),val('generation'),b.generation]);return [];}
  if(path.startsWith('stellar_push_deliveries?')){await fixture.db.query('update stellar_push_deliveries set state=$4 where letter_id=$1 and device_id=$2 and generation=$3',[val('letter_id'),val('device_id'),val('generation'),b.state]);return [];}
  throw Error('Unexpected fixture route');
 }catch(e){if(e instanceof HttpError)throw e;const code=(e as {code?:string}).code;throw new HttpError(code==='P0001'||code==='23505'?409:code==='42501'?403:400,'Inscrição mudou.');}
};
const request=async(action:string,extra:Record<string,unknown>={},device=ids[0])=>handler(new Request('https://fixture.invalid',{method:'POST',headers:{origin:'http://localhost:5186','content-type':'application/json'},body:JSON.stringify({action,...(action==='config'?{}:{device,secret}),...extra})}));
const status=async(device=ids[0])=>(await (await request('status',{},device)).json()) as DeviceState;
const subscribe=async(identity:string,device=ids[0],n=1,expected=0)=>request('subscribe',{identity,expected,subscription:subscription(n),replace:true},device);
const letter=async(actor='carol')=>{const id=crypto.randomUUID();await fixture.db.query('select stellar_mail($1,$2,$3)',[actor,'send',{id,title:'Isolated test',content:'Never real data'}]);return id;};
beforeAll(async()=>{fixture=await createMailFixture();await fixture.db.exec(await readFile('supabase/migrations/20261016124503_stellar_push.sql','utf8'));handler=makeStellarPushHandler({db:database,origins:['http://localhost:5186'],publicKey:'public-only'});},30000);
afterAll(async()=>fixture?.db.close());
it('validates public push hosts and cryptographic key lengths, rejecting SSRF',()=>{
 expect(validSubscription(subscription())).toBe(true);
 for(const endpoint of ['http://localhost:8080','https://127.0.0.1','https://fcm.googleapis.com.attacker.invalid/send','https://u:p@fcm.googleapis.com/send','https://fcm.googleapis.com:444/send'])expect(validSubscription({...subscription(),endpoint})).toBe(false);
 expect(validSubscription({...subscription(),keys:{auth:'wrong',p256dh:'wrong'}})).toBe(false);
});
it('supports configuration/status without enrolling or choosing an identity',async()=>{
 expect((await (await request('config')).json()).publicKey).toBe('public-only');expect(await status()).toMatchObject({identity:null,generation:0,enabled:false});
 expect((await fixture.db.query('select * from stellar_push_devices')).rows).toHaveLength(0);
});
it('binds Arthur once and navigation/status requests cannot change identity',async()=>{
 expect((await subscribe('arthur')).status).toBe(200);
 expect(await status()).toMatchObject({identity:'arthur',generation:1,enabled:true});
 expect((await request('status',{identity:'carol'})).status).toBe(400);
 expect(await status()).toMatchObject({identity:'arthur',generation:1});
 expect((await request('status',{secret:'cd'.repeat(32)})).status).toBe(403);
});
it('sends exactly once, only to the recipient, even with concurrent dispatch and mail retries',async()=>{
 await subscribe('carol',ids[1],2);
 const id=await letter(),send=vi.fn<(d:PushDelivery,p:unknown)=>Promise<void>>(async()=>{});
 await Promise.all([dispatchLetterPush(database,id,send),dispatchLetterPush(database,id,send)]);
 await fixture.db.query('select stellar_mail($1,$2,$3)',['carol','send',{id,title:'Isolated test',content:'Never real data'}]);await dispatchLetterPush(database,id,send);
 expect(send).toHaveBeenCalledTimes(1);expect(send.mock.calls[0]).toMatchObject([{device_id:ids[0],recipient:'arthur',generation:1},{recipient:'arthur',id}]);
 expect(JSON.stringify(send.mock.calls)).not.toContain('Never real data');
 const reply=await letter('arthur');await dispatchLetterPush(database,reply,send);expect(send).toHaveBeenCalledTimes(2);expect(send.mock.calls[1][0].device_id).toBe(ids[1]);
});
it('edits, reading, deleting, and old synchronization never generate a push',async()=>{
 const id=await letter('arthur');await dispatchLetterPush(database,id,async()=>{});
 await fixture.db.query('select stellar_mail($1,$2,$3)',['arthur','edit',{id,revision:1,title:'Updated',content:'Updated'}]);
 await fixture.db.query('select stellar_mail($1,$2,$3)',['carol','read',{id,revision:2}]);
 const send=vi.fn<(d:PushDelivery,p:unknown)=>Promise<void>>(async()=>{});await dispatchLetterPush(database,id,send);
 await fixture.db.query('select stellar_mail($1,$2,$3)',['arthur','delete',{id,revision:2}]);await dispatchLetterPush(database,id,send);expect(send).not.toHaveBeenCalled();
});
it('identity replacement cancels pending deliveries and CAS rejects competing tabs',async()=>{
 const queued=await letter();expect((await subscribe('carol',ids[0],1,0)).status).toBe(409);
 const results=await Promise.all([subscribe('carol',ids[0],1,1),subscribe('carol',ids[0],3,1)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
 const current=await status();expect(current).toMatchObject({identity:'carol',generation:2});
 const send=vi.fn<(d:PushDelivery,p:unknown)=>Promise<void>>(async()=>{});await dispatchLetterPush(database,queued,send);expect(send).not.toHaveBeenCalled();
 expect((await fixture.db.query('select identity from stellar_push_devices where id=$1 and enabled',[ids[0]])).rows).toEqual([{identity:'carol'}]);
});
it('cancels on the backend before unsubscribing; cannot hijack an endpoint',async()=>{
 const current=await status();expect((await request('cancel',{expected:current.generation})).status).toBe(200);expect(await status()).toMatchObject({enabled:false,identity:null,generation:3});
 expect((await subscribe('arthur',crypto.randomUUID(),2,0)).status).toBe(409);
 const id=await letter(),send=vi.fn<(d:PushDelivery,p:unknown)=>Promise<void>>(async()=>{});await dispatchLetterPush(database,id,send);expect(send).not.toHaveBeenCalled();
});
it('removes expired subscriptions without touching other devices or blocking letters',async()=>{
 const id=await letter('arthur');await dispatchLetterPush(database,id,async()=>{throw {statusCode:410};});expect(await status(ids[1])).toMatchObject({enabled:false,identity:null});
 expect((await fixture.db.query('select * from stellar_letters where id=$1',[id])).rows).toHaveLength(1);
});
it('keeps server tables and RPCs inaccessible to public database clients',async()=>{
 for(const table of ['stellar_push_devices','stellar_push_deliveries','stellar_push_limits']){
  expect((await fixture.db.query<{v:boolean}>("select has_table_privilege('anon',$1,'SELECT') v",[`public.${table}`])).rows[0].v).toBe(false);
  expect((await fixture.db.query<{v:boolean}>('select relrowsecurity v from pg_class where oid=$1::regclass',[table])).rows[0].v).toBe(true);
 }
 expect((await fixture.db.query<{v:boolean}>("select has_function_privilege('authenticated','stellar_push_device(uuid,text,text,text,integer,jsonb,boolean)','EXECUTE') v")).rows[0].v).toBe(false);
 expect(pushDestination('arthur','id')).toContain('/?stellar-letter=id');expect(pushDestination('carol','id')).toContain('/universo-dela/visao?stellar-letter=id');
});

it('limits push abuse without limiting or rolling back the correspondence itself',async()=>{
 const device=crypto.randomUUID();expect((await subscribe('carol',device,999)).status).toBe(200);
 await fixture.db.exec("delete from stellar_push_limits where bucket='delivery:carol'");
 const query=()=>fixture.db.query<{v:boolean}>("select stellar_push_limit('isolated-budget',2,60) v");
 expect((await query()).rows[0].v).toBe(true);expect((await query()).rows[0].v).toBe(true);expect((await query()).rows[0].v).toBe(false);
 const ids=[];for(let i=0;i<21;i++)ids.push(await letter('arthur'));
 expect((await fixture.db.query('select * from stellar_push_deliveries where device_id=$1',[device])).rows).toHaveLength(20);
 expect((await fixture.db.query('select * from stellar_letters where id=any($1::uuid[])',[ids])).rows).toHaveLength(21);
});
