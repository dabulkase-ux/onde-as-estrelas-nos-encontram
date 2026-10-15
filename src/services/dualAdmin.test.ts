import { describe,expect,it } from 'vitest';
import { dualAdminMock } from '../../tests/helpers/dualAdminMock';
import { makeHandler } from '../../supabase/functions/_shared/handler';
describe('dual admin server isolation',()=>{
  it('binds distinct principals to opaque sessions, not a frontend role',async()=>{
    const f=await dualAdminMock();const tokens:string[]=[];
    for(const username of ['admin','meu-universo-dela']){const response=await f.request({action:'login',username,password:'audit-fixture-password-only'});expect(response.status).toBe(200);const data=await response.json();expect(data.username).toBe(username);tokens.push(data.token);expect(f.sessions.get(await f.sessionKey(data.token))?.username).toBe(username);}
    expect(tokens[0]).not.toBe(tokens[1]);
  });
  it('rejects wrong credentials and role/username injection in authenticated requests',async()=>{
    const f=await dualAdminMock();for(const username of ['admin','meu-universo-dela','unknown'])expect((await f.request({action:'login',username,password:'wrong'})).status).toBe(401);
    const login=await (await f.request({action:'login',username:'meu-universo-dela',password:'audit-fixture-password-only'})).json();
    for(const payload of [{username:'admin'},{scope:'original'},{table:'quiz_attempts'},{ownerId:'other'}])expect((await f.request({action:'data',kind:'couple',page:0,...payload},login.token)).status).toBe(400);
  });
  it('retains original records and excludes her attempts from the original admin',async()=>{
    const f=await dualAdminMock(),login=await (await f.request({action:'login',username:'admin',password:'audit-fixture-password-only'})).json();f.calls.length=0;
    const data=await (await f.request({action:'data',kind:'compatibility',page:0},login.token)).json();expect(data.rows[0].id).toBe('original-attempt');expect(data.overview).toEqual({quizzes:1,wishes:1,proposals:1});expect(f.calls).not.toContain('rpc/her_admin_records');
  });
  it('uses immutable her question snapshots, scores and history; other sections stay empty',async()=>{
    const f=await dualAdminMock(),login=await (await f.request({action:'login',username:'meu-universo-dela',password:'audit-fixture-password-only'})).json();f.calls.length=0;
    for(const kind of ['couple','compatibility','wish','proposal']){const data=await (await f.request({action:'data',kind,page:0},login.token)).json();expect(data.overview).toEqual({quizzes:2,wishes:0,proposals:0});if(kind==='wish'||kind==='proposal')expect(data.rows).toEqual([]);else expect(data.rows[0].questions[0].text).toBe('Pergunta dela 1');}
    expect(f.calls.some(path=>path.startsWith('quiz_attempts?')||path.startsWith('wishes?')||path==='rpc/admin_overview')).toBe(false);
    expect((await (await f.request({action:'data',kind:'couple',page:1},login.token)).json()).rows).toEqual([]);
  });
  it('expires, logs out, and invalidates swapped principal sessions',async()=>{
    const f=await dualAdminMock(),login=await (await f.request({action:'login',username:'meu-universo-dela',password:'audit-fixture-password-only'})).json();const session=f.sessions.get(await f.sessionKey(login.token))!;session.username='admin';expect((await f.request({action:'data',kind:'couple',page:0},login.token)).status).toBe(401);session.username='meu-universo-dela';await f.request({action:'logout'},login.token);expect((await f.request({action:'data',kind:'couple',page:0},login.token)).status).toBe(401);
  });
  it('keeps both credentials valid after the former deadline and years later',async()=>{
    const f=await dualAdminMock();let now=Date.parse('2026-10-15T00:30:00Z');
    const handler=makeHandler('admin',{db:async()=>true,passwordHash:f.hash,herPasswordHash:f.hash,origins:['https://site.invalid'],now:()=>now});
    for(const date of ['2026-10-15T00:30:00Z','2036-10-15T00:30:00Z']){
      now=Date.parse(date);
      for(const username of ['admin','meu-universo-dela']){
        const response=await handler(new Request('https://api.invalid',{method:'POST',headers:{Origin:'https://site.invalid','Content-Type':'application/json'},body:JSON.stringify({action:'login',username,password:'audit-fixture-password-only'})}));
        expect(response.status).toBe(200);const data=await response.json();expect(data.username).toBe(username);expect(Date.parse(data.expiresAt)-now).toBe(15*60*1000);
      }
    }
  });
});
