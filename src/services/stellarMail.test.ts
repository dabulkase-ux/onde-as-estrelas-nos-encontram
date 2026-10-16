import {afterAll,beforeAll,expect,it} from 'vitest';
import {createMailFixture} from '../../scripts/stellar-mail-fixture';
let fixture:Awaited<ReturnType<typeof createMailFixture>>;
const arthur='arthur',carol='carol';
const request=async(body:unknown,actor='arthur',origin='http://localhost:5186')=>fixture.handler(new Request('https://fixture.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({universe:actor,...(body as Record<string,unknown>)})}));
beforeAll(async()=>{fixture=await createMailFixture();await fixture.db.exec(`create table public.her_universes(id text,document jsonb);insert into her_universes values('preserved','{"compatibility":{"questions":5,"options":20}}');`);},30000);
afterAll(async()=>fixture?.db.close());
const id=crypto.randomUUID();
it('uses the galaxy without any session and rejects invalid actions and override fields',async()=>{
 expect((await request({action:'mailbox',folder:'received',page:0})).status).toBe(200);
 expect((await request({action:'mailbox',folder:'received',page:0},'unknown')).status).toBe(400);
 expect((await request({action:'mailbox',folder:'received',page:0},arthur,'https://other.invalid')).status).toBe(403);
 expect((await request({action:'send',id,title:'',content:'Invalid override',sender:'carol'},arthur)).status).toBe(400);
 expect((await (await request({action:'mailbox',folder:'received',page:0},arthur)).json()).actor).toBe('arthur');
 expect((await (await request({action:'mailbox',folder:'received',page:0},carol)).json()).actor).toBe('carol');
 expect((await request({action:'login'})).status).toBe(400);expect((await request({action:'session'})).status).toBe(400);
});
it('deduplicates sends, chooses the opposite recipient on the server and supports the reverse direction',async()=>{
 const send={action:'send',id,title:'',content:'<script>literal text</script>\nMinha carta.'};expect((await request(send,arthur)).status).toBe(200);expect((await request(send,arthur)).status).toBe(200);
 const inbox=await (await request({action:'mailbox',folder:'received',page:0},carol)).json();expect(inbox.unread).toBe(1);expect(inbox.rows).toHaveLength(1);expect(inbox.rows[0]).toMatchObject({id,sender:'arthur',recipient:'carol',title:'',revision:1});
 expect((await (await request({action:'mailbox',folder:'sent',page:0},carol)).json()).rows).toHaveLength(0);
 expect((await request({action:'send',id:crypto.randomUUID(),title:'Resposta',content:'De Carol para Arthur.'},carol)).status).toBe(200);
 expect((await (await request({action:'mailbox',folder:'received',page:0},arthur)).json()).rows[0].sender).toBe('carol');
});
it('claims each arrival once across browsers and separates arrival from reading',async()=>{
 const arrivals=await Promise.all([request({action:'arrival'},carol),request({action:'arrival'},carol)]);expect((await Promise.all(arrivals.map(r=>r.json()))).filter(r=>r.id===id)).toHaveLength(1);
 expect((await (await request({action:'mailbox',folder:'received',page:0},carol)).json()).unread).toBe(1);
 expect((await request({action:'read',id,revision:1},arthur)).status).toBe(403);expect((await request({action:'read',id,revision:1},carol)).status).toBe(200);
 expect((await (await request({action:'mailbox',folder:'received',page:0},carol)).json()).unread).toBe(0);
});
it('restricts editing and deletion to the sender, preserves revisions and never repeats arrival for an edit',async()=>{
 expect((await request({action:'edit',id,revision:1,title:'Inválido',content:'Não permitido'},carol)).status).toBe(403);
 expect((await request({action:'edit',id,revision:1,title:'Revisada',content:'Novo texto'},arthur)).status).toBe(200);
 expect((await request({action:'edit',id,revision:1,title:'Perda',content:'Não sobrescrever'},arthur)).status).toBe(409);
 expect((await request({action:'read',id,revision:1},carol)).status).toBe(409);
 const box=await (await request({action:'mailbox',folder:'received',page:0},carol)).json();expect(box.rows[0]).toMatchObject({title:'Revisada',content:'Novo texto',revision:2,read_at:null});expect((await (await request({action:'arrival'},carol)).json()).id).toBeNull();
 expect((await request({action:'delete',id,revision:2},carol)).status).toBe(403);expect((await request({action:'delete',id,revision:1},arthur)).status).toBe(409);expect((await request({action:'delete',id,revision:2},arthur)).status).toBe(200);expect((await request({action:'delete',id,revision:2},arthur)).status).toBe(200);
 expect((await (await request({action:'mailbox',folder:'received',page:0},carol)).json()).rows).toHaveLength(0);
 expect((await fixture.db.query<{document:unknown}>('select document from her_universes')).rows[0].document).toEqual({compatibility:{questions:5,options:20}});
});
it('enforces RLS/table privileges, rejects oversized input and invalid galaxies',async()=>{
 for(const role of ['anon','authenticated']){expect((await fixture.db.query<{ok:boolean}>(`select has_table_privilege('${role}','public.stellar_letters','SELECT') ok`)).rows[0].ok).toBe(false);expect((await fixture.db.query<{ok:boolean}>(`select has_function_privilege('${role}','public.stellar_mail(text,text,jsonb)','EXECUTE') ok`)).rows[0].ok).toBe(false);}
 expect((await fixture.db.query<{ok:boolean}>("select relrowsecurity ok from pg_class where oid='public.stellar_letters'::regclass")).rows[0].ok).toBe(true);
 expect((await request({action:'send',id:crypto.randomUUID(),title:'',content:'a'.repeat(20001)},arthur)).status).toBe(400);
 expect((await request({action:'mailbox',universe:null,folder:'received',page:0})).status).toBe(400);
});

it('executes the dedicated SQL limiter and never accepts admin or quiz buckets',async()=>{
 const isolated=await createMailFixture();try{const check=async()=>{return (await isolated.db.query<{ok:boolean}>('select public.stellar_mail_rate_limit($1,2,60) ok',['stellar-mail:arthur'])).rows[0].ok;};expect(await check()).toBe(true);expect(await check()).toBe(true);expect(await check()).toBe(false);await expect(isolated.db.query("select public.stellar_mail_rate_limit('admin-login',2,60)")).rejects.toThrow();expect((await isolated.db.query<{ok:boolean}>("select has_function_privilege('anon','public.stellar_mail_rate_limit(text,integer,integer)','EXECUTE') ok")).rows[0].ok).toBe(false);}finally{await isolated.db.close();}
});
